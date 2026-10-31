"""
Dynamic, Auto-Detecting Bank Statement CSV Parser for Financial Decision Lab (FDL).
Supports:
- Encodings: UTF-8, UTF-8-SIG (BOM), UTF-16, Windows-1252, ISO-8859-1.
- Delimiters: Comma (,), Semicolon (;), Tab (\\t), Pipe (|).
- Header detection, preamble metadata stripping, and headerless files.
- Column mapping: automatic synonym matching, data type inference, and explicit user overrides.
- Amount conventions: split Debit/Credit columns, signed Amount, Amount + Dr/Cr indicator.
- Number formatting: Indian numbering (1,23,456.78), currency symbols (₹, Rs., $), parentheses, DR/CR.
- Date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-Mon-YYYY, YYYY-MM-DD, Month DD YYYY.
- Balance reconciliation: opening-to-closing balance and row-by-row running balance verification.
- Integer paise precision: 100% exact integer paise (MinorAmount) with zero floating-point drift.
- Meaningful row-level errors and warnings.
"""

import csv
import io
import re
from typing import Dict, Any, List, Optional, Union, Tuple

from parsers.amount_parser import parse_indian_amount_to_paise
from parsers.date_parser import parse_date_to_iso, infer_date_format_from_samples
from parsers.encoding_detector import detect_and_decode_bytes
from parsers.delimiter_detector import detect_delimiter
from parsers.column_mapper import detect_column_mapping, ColumnMappingResult, CANONICAL_HEADER_SYNONYMS
from parsers.normalizer import normalize_transaction_description
from parsers.reconciliation import verify_balance_reconciliation


def find_header_and_mapping(lines: List[List[str]]) -> Tuple[int, Dict[str, int]]:
    """
    Backward-compatible helper for finding header row and column mapping.
    Used by pdf_parser and older test utilities.
    """
    res = detect_column_mapping(lines)
    return res.header_row_index, res.mapping



FOOTER_PATTERNS = [
    r"^\s*total",
    r"^\s*grand total",
    r"^\s*statement summary",
    r"^\s*closing balance as on",
    r"^\s*opening balance as on",
    r"^\s*end of statement",
    r"^\s*page\s+\d+",
    r"^\s*note\s*:",
    r"^\s*\*{3,}",
]


def is_footer_or_summary_row(row: List[str]) -> bool:
    """Detects whether a row is a summary or footer row rather than a transaction."""
    first_non_empty = next((c.strip().lower() for c in row if c.strip()), "")
    if not first_non_empty:
        return False
    for pat in FOOTER_PATTERNS:
        if re.search(pat, first_non_empty):
            return True
    return False


def parse_csv_statement(
    csv_content: Union[str, bytes],
    account_id: str = "default_acct",
    column_mapping: Optional[Dict[str, Union[int, str]]] = None,
    delimiter: Optional[str] = None,
    encoding: Optional[str] = None,
    has_header: Optional[bool] = None
) -> Dict[str, Any]:
    """
    Parses a CSV bank statement (string or bytes) into canonical FDL transactions.
    Supports auto-detection and explicit configuration overrides.
    """
    # 1. Decode bytes if needed and detect encoding
    detected_encoding = "utf-8"
    if isinstance(csv_content, bytes):
        text_content, detected_encoding = detect_and_decode_bytes(csv_content, explicit_encoding=encoding)
    else:
        text_content = str(csv_content)
        if text_content.startswith("\ufeff"):
            text_content = text_content[1:]
            detected_encoding = "utf-8-sig"

    if not text_content or not text_content.strip():
        raise ValueError("CSV statement file is empty.")

    # 2. Detect Delimiter
    detected_delimiter = detect_delimiter(text_content, explicit_delimiter=delimiter)

    # 3. Read CSV Lines with RFC 4180 quote handling
    try:
        reader = csv.reader(io.StringIO(text_content), delimiter=detected_delimiter)
        raw_lines = [row for row in reader if any(cell.strip() for cell in row)]
    except Exception as e:
        raise ValueError(f"Failed to read CSV content: {str(e)}")

    if not raw_lines:
        raise ValueError("CSV statement file is empty.")

    # 4. Detect Column Mapping & Headers
    mapping_result: ColumnMappingResult = detect_column_mapping(
        lines=raw_lines,
        explicit_mapping=column_mapping,
        explicit_has_header=has_header
    )

    col_map = mapping_result.mapping
    header_idx = mapping_result.header_row_index
    data_rows = raw_lines[header_idx + 1:] if mapping_result.has_header else raw_lines

    # 5. Determine Date Order (DMY vs MDY) from sample data
    date_col = col_map.get("date")
    date_samples = []
    if date_col is not None:
        for r in data_rows[:20]:
            if date_col < len(r) and r[date_col].strip():
                date_samples.append(r[date_col])
    preferred_date_order = infer_date_format_from_samples(date_samples)

    # 6. Parse Transactions
    transactions = []
    warnings = []
    errors = []
    running_sum = 0
    opening_balance_minor = None
    closing_balance_minor = None

    for row_idx, row in enumerate(data_rows, start=1):
        actual_line_no = (header_idx + 1 + row_idx) if mapping_result.has_header else row_idx

        # Check for footer/summary rows
        if is_footer_or_summary_row(row):
            continue

        # Check minimum column count
        max_needed_col = max(col_map.values()) if col_map else 0
        if len(row) <= max_needed_col:
            # Row has fewer columns than mapped
            msg = f"Row {actual_line_no}: Incomplete row with only {len(row)} columns (expected at least {max_needed_col + 1})."
            errors.append({"row": actual_line_no, "field": "row", "message": msg, "raw": str(row)})
            warnings.append(msg)
            continue

        # Extract Date
        posted_date = None
        if "date" in col_map and col_map["date"] < len(row):
            raw_date_str = row[col_map["date"]].strip()
            posted_date = parse_date_to_iso(raw_date_str, preferred_order=preferred_date_order)

        if not posted_date:
            raw_val = row[col_map["date"]] if "date" in col_map and col_map["date"] < len(row) else ""
            msg = f"Row {actual_line_no}: Could not parse date '{raw_val}', skipping."
            errors.append({"row": actual_line_no, "field": "date", "message": msg, "raw": str(row)})
            warnings.append(msg)
            continue

        # Extract Description
        raw_desc = ""
        if "description" in col_map and col_map["description"] < len(row):
            raw_desc = row[col_map["description"]].strip()

        cleaned_raw_desc = raw_desc
        if cleaned_raw_desc.lower().startswith("paid to "):
            cleaned_raw_desc = cleaned_raw_desc[8:].strip()
        elif cleaned_raw_desc.lower().startswith("received from "):
            cleaned_raw_desc = cleaned_raw_desc[14:].strip()

        norm_desc, channel, merchant = normalize_transaction_description(cleaned_raw_desc)

        # Extract Amount
        amount_minor = None
        has_amount = "amount" in col_map and col_map["amount"] < len(row)
        has_txn_type = "txn_type" in col_map and col_map["txn_type"] < len(row)
        has_withdrawal = "withdrawal" in col_map and col_map["withdrawal"] < len(row)
        has_deposit = "deposit" in col_map and col_map["deposit"] < len(row)

        if has_amount and has_txn_type:
            raw_amt_paise = parse_indian_amount_to_paise(row[col_map["amount"]])
            txn_type = row[col_map["txn_type"]].strip().upper()
            if raw_amt_paise is not None:
                clean_type = re.sub(r"[^A-Z]", "", txn_type)
                if clean_type in ("DEBIT", "DR", "D", "OUT", "WITHDRAWAL", "W"):
                    amount_minor = -abs(raw_amt_paise)
                elif clean_type in ("CREDIT", "CR", "C", "IN", "DEPOSIT", "DEP"):
                    amount_minor = abs(raw_amt_paise)
                elif "DEBIT" in clean_type or "WITHDRAW" in clean_type or clean_type.startswith("DR"):
                    amount_minor = -abs(raw_amt_paise)
                elif "CREDIT" in clean_type or "DEPOSIT" in clean_type or clean_type.startswith("CR"):
                    amount_minor = abs(raw_amt_paise)
                else:
                    amount_minor = raw_amt_paise

        elif has_withdrawal and has_deposit:
            w_paise = parse_indian_amount_to_paise(row[col_map["withdrawal"]])
            d_paise = parse_indian_amount_to_paise(row[col_map["deposit"]])

            if w_paise is not None and w_paise != 0:
                amount_minor = -abs(w_paise)  # Debits/Withdrawals are negative
            elif d_paise is not None and d_paise != 0:
                amount_minor = abs(d_paise)   # Credits/Deposits are positive

        elif has_amount:
            amount_minor = parse_indian_amount_to_paise(row[col_map["amount"]])

        elif has_withdrawal:
            w_paise = parse_indian_amount_to_paise(row[col_map["withdrawal"]])
            if w_paise is not None and w_paise != 0:
                amount_minor = -abs(w_paise)

        elif has_deposit:
            d_paise = parse_indian_amount_to_paise(row[col_map["deposit"]])
            if d_paise is not None and d_paise != 0:
                amount_minor = abs(d_paise)

        if amount_minor is None or amount_minor == 0:
            msg = f"Row {actual_line_no}: Zero or unparseable amount, skipping."
            errors.append({"row": actual_line_no, "field": "amount", "message": msg, "raw": str(row)})
            warnings.append(msg)
            continue

        # Extract Running Balance if available
        balance_after = None
        if "balance" in col_map and col_map["balance"] < len(row):
            balance_after = parse_indian_amount_to_paise(row[col_map["balance"]])

        if opening_balance_minor is None and balance_after is not None:
            opening_balance_minor = balance_after - amount_minor

        if balance_after is not None:
            closing_balance_minor = balance_after

        running_sum += amount_minor

        transactions.append({
            "source_row": actual_line_no,
            "posted_date": posted_date,
            "amount_minor": amount_minor,
            "raw_description": raw_desc,
            "normalized_description": norm_desc,
            "channel": channel,
            "merchant": merchant,
            "balance_after_minor": balance_after
        })

    # 7. Financial Data Validation & Reconciliation
    recon_result = verify_balance_reconciliation(
        opening_balance_minor=opening_balance_minor,
        closing_balance_minor=closing_balance_minor,
        net_cash_flow_minor=running_sum,
        transactions=transactions
    )

    dates = [t["posted_date"] for t in transactions]
    period_start = min(dates) if dates else None
    period_end = max(dates) if dates else None

    # Merge ambiguity reasons into warnings if any
    for amb in mapping_result.ambiguity_reasons:
        warnings.append(f"Column Mapping Notice: {amb}")

    return {
        "rows_detected": len(transactions),
        "total_raw_rows": len(data_rows),
        "period_start": period_start,
        "period_end": period_end,
        "opening_balance_minor": opening_balance_minor,
        "closing_balance_minor": closing_balance_minor,
        "net_cash_flow_minor": running_sum,
        "reconciliation_status": recon_result["reconciliation_status"],
        "reconciliation_delta_minor": recon_result["reconciliation_delta_minor"],
        "running_balance_status": recon_result["running_balance_status"],
        "running_balance_breaks": recon_result["running_balance_breaks"],
        "detected_delimiter": detected_delimiter,
        "detected_encoding": detected_encoding,
        "has_header": mapping_result.has_header,
        "headers": mapping_result.headers,
        "column_mapping": mapping_result.mapping,
        "mapping_confidence": mapping_result.confidence,
        "is_ambiguous": mapping_result.is_ambiguous,
        "ambiguity_reasons": mapping_result.ambiguity_reasons,
        "warnings": warnings,
        "errors": errors,
        "transactions": transactions
    }

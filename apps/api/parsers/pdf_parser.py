"""
Bank Statement PDF Parser using pdfplumber & pypdf
Extracts tables from bordered bank statements (HDFC, SBI, ICICI)
and uses pattern-based layout extraction for borderless app statements (PhonePe, GPay).
Includes automated password decryption handling.
"""

import io
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import pdfplumber

from parsers.csv_parser import (
    parse_indian_amount_to_paise,
    parse_date_to_iso,
    find_header_and_mapping
)
from parsers.normalizer import normalize_transaction_description

MONTH_REGEX = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}"

def parse_phonepe_pdf_text(full_text: str) -> List[Dict[str, Any]]:
    """
    Parses PhonePe-style text statement layout:
    Matches blocks starting with Date, Type (CREDIT/DEBIT), Amount, and Merchant.
    """
    transactions = []
    lines = full_text.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i].strip()
        date_match = re.match(r"^(" + MONTH_REGEX + r")\s+(Paid to|Received from)\s+(DEBIT|CREDIT)\s+[₹Rs\.\s]*([0-9,]+(?:\.[0-9]+)?)", line, re.IGNORECASE)
        if date_match:
            date_str = date_match.group(1)
            txn_direction = date_match.group(3).upper()
            amt_str = date_match.group(4)
            posted_date = parse_date_to_iso(date_str)

            amt_paise = parse_indian_amount_to_paise(amt_str)
            if amt_paise is not None:
                amount_minor = -abs(amt_paise) if txn_direction == "DEBIT" else abs(amt_paise)
            else:
                amount_minor = 0

            # Next line(s) contain description until Transaction ID or next date
            desc_lines = []
            j = i + 1
            while j < len(lines) and j < i + 6:
                next_line = lines[j].strip()
                if re.match(r"^(" + MONTH_REGEX + r")", next_line, re.IGNORECASE) or next_line.startswith("Transaction ID"):
                    break
                if next_line and not next_line.startswith("UTR") and not next_line.startswith("Date"):
                    desc_lines.append(next_line)
                j += 1

            raw_desc = " ".join(desc_lines) if desc_lines else "PhonePe Transaction"
            norm_desc, channel, merchant = normalize_transaction_description(raw_desc)

            transactions.append({
                "source_row": len(transactions) + 1,
                "posted_date": posted_date,
                "amount_minor": amount_minor,
                "raw_description": raw_desc,
                "normalized_description": norm_desc,
                "channel": channel,
                "merchant": merchant,
                "balance_after_minor": None
            })
            i = j
        else:
            i += 1

    return transactions

def parse_pdf_statement(
    pdf_bytes: bytes,
    password: Optional[str] = None,
    account_id: str = "default_acct"
) -> Dict[str, Any]:
    """
    Extracts tabular statements from digital bank PDFs using pdfplumber.
    Supports bordered bank tables and borderless app statements.
    Handles encrypted PDFs with password unlocking.
    """
    raw_table_lines = []
    full_text_pages = []

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            for page in pdf.pages:
                # 1. Try table extraction first
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        clean_row = [str(cell).strip() if cell is not None else "" for cell in row]
                        if any(clean_row):
                            raw_table_lines.append(clean_row)
                
                # 2. Also keep text for pattern extraction
                txt = page.extract_text()
                if txt:
                    full_text_pages.append(txt)
    except Exception as exc:
        exc_type = type(exc).__name__.lower()
        ctx_type = type(exc.__context__).__name__.lower() if getattr(exc, "__context__", None) else ""
        cause_type = type(exc.__cause__).__name__.lower() if getattr(exc, "__cause__", None) else ""
        all_types = f"{exc_type} {ctx_type} {cause_type}"
        err_msg = str(exc).lower()

        if "password" in all_types or "filenotdecrypted" in all_types or "password" in err_msg or "encrypted" in err_msg:
            if not password:
                raise ValueError("PASSWORD_REQUIRED: This bank statement is password protected. Please enter the password.")
            else:
                raise ValueError("PASSWORD_INCORRECT: The password provided for this PDF statement is incorrect.")
        raise ValueError(f"Failed to read PDF document: {str(exc) or exc_type}")

    # If bordered tables were found, parse via table mapping
    if raw_table_lines:
        try:
            header_idx, col_map = find_header_and_mapping(raw_table_lines)
            data_rows = raw_table_lines[header_idx + 1:]
            transactions = []
            running_sum = 0
            opening_balance_minor = None
            closing_balance_minor = None

            for row_idx, row in enumerate(data_rows, start=1):
                if not any(row):
                    continue

                posted_date = None
                if "date" in col_map and col_map["date"] < len(row):
                    posted_date = parse_date_to_iso(row[col_map["date"]])
                if not posted_date:
                    continue

                raw_desc = row[col_map["description"]] if "description" in col_map and col_map["description"] < len(row) else ""
                norm_desc, channel, merchant = normalize_transaction_description(raw_desc)

                # Amounts
                amount_minor = 0
                has_debit_credit_cols = "debit" in col_map and "credit" in col_map
                if has_debit_credit_cols:
                    debit_val = parse_indian_amount_to_paise(row[col_map["debit"]]) if col_map["debit"] < len(row) else 0
                    credit_val = parse_indian_amount_to_paise(row[col_map["credit"]]) if col_map["credit"] < len(row) else 0
                    if debit_val:
                        amount_minor = -abs(debit_val)
                    elif credit_val:
                        amount_minor = abs(credit_val)
                elif "amount" in col_map:
                    raw_amt = parse_indian_amount_to_paise(row[col_map["amount"]]) if col_map["amount"] < len(row) else 0
                    if "type" in col_map:
                        typ = row[col_map["type"]].upper()
                        amount_minor = -abs(raw_amt) if "DR" in typ or "DEBIT" in typ else abs(raw_amt)
                    else:
                        amount_minor = raw_amt or 0

                balance_after = None
                if "balance" in col_map and col_map["balance"] < len(row):
                    balance_after = parse_indian_amount_to_paise(row[col_map["balance"]])

                if opening_balance_minor is None and balance_after is not None:
                    opening_balance_minor = balance_after - amount_minor
                if balance_after is not None:
                    closing_balance_minor = balance_after

                running_sum += amount_minor

                transactions.append({
                    "source_row": row_idx + header_idx + 1,
                    "posted_date": posted_date,
                    "amount_minor": amount_minor,
                    "raw_description": raw_desc,
                    "normalized_description": norm_desc,
                    "channel": channel,
                    "merchant": merchant,
                    "balance_after_minor": balance_after
                })

            dates = [t["posted_date"] for t in transactions]
            return {
                "rows_detected": len(transactions),
                "period_start": min(dates) if dates else None,
                "period_end": max(dates) if dates else None,
                "opening_balance_minor": opening_balance_minor,
                "closing_balance_minor": closing_balance_minor,
                "net_cash_flow_minor": running_sum,
                "reconciliation_status": "PASSED" if (opening_balance_minor and closing_balance_minor and closing_balance_minor == opening_balance_minor + running_sum) else "UNVERIFIED",
                "warnings": [],
                "transactions": transactions
            }
        except ValueError:
            pass  # Fall through to pattern extraction

    # Pattern-based extraction fallback (PhonePe, GPay, etc.)
    all_text = "\n".join(full_text_pages)
    txns = parse_phonepe_pdf_text(all_text)
    if not txns:
        raise ValueError("Could not extract transactions from this PDF. Please verify it is a valid bank statement.")

    dates = [t["posted_date"] for t in txns]
    running_sum = sum(t["amount_minor"] for t in txns)

    return {
        "rows_detected": len(txns),
        "period_start": min(dates) if dates else None,
        "period_end": max(dates) if dates else None,
        "opening_balance_minor": None,
        "closing_balance_minor": None,
        "net_cash_flow_minor": running_sum,
        "reconciliation_status": "UNVERIFIED",
        "warnings": [],
        "transactions": txns
    }

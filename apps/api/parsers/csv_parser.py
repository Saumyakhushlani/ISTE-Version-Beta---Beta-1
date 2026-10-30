"""
Auto-Detecting Bank Statement CSV Parser
Handles PhonePe, Google Pay, Paytm, HDFC, SBI, ICICI, Axis, and generic layouts.
Parses Indian date and number formatting directly into integer paise (MinorAmount).
Performs automatic opening-to-closing balance reconciliation when balances are present.
"""

import csv
import io
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from parsers.normalizer import normalize_transaction_description

# Synonyms for header detection
HEADER_SYNONYMS = {
    "date": ["date", "txn date", "transaction date", "value date", "post date"],
    "description": ["transaction details", "narration", "description", "particulars", "transaction remarks", "details"],
    "withdrawal": ["withdrawal amt", "withdrawal amount", "withdrawal", "debit amount", "debit amt", "debit", "dr amount", "dr"],
    "deposit": ["deposit amt", "deposit amount", "deposit", "credit amount", "credit amt", "credit", "cr amount", "cr"],
    "amount": ["amount", "txn amount", "transaction amount"],
    "txn_type": ["transaction type", "type", "dr/cr", "cr/dr"],
    "balance": ["closing balance", "balance", "running balance", "net balance"],
    "ref_no": ["utr", "transaction id", "chq/ref no", "ref no", "reference no", "cheque no"]
}

# Words that indicate a column is NOT a numerical amount column
EXCLUDE_AMOUNT_KEYWORDS = ["instrument", "mode", "type", "channel", "status", "remarks", "details", "desc"]

def parse_indian_amount_to_paise(val: Any) -> Optional[int]:
    """
    Converts currency string (e.g. '1,23,456.78', '₹15,000.00', '(500.00)', '100.00 Cr', '5000')
    directly into signed integer paise.
    1 INR = 100 paise.
    """
    if val is None:
        return None
    s = str(val).strip()
    if not s or s == "-" or s.lower() == "nan":
        return None

    is_paren_neg = s.startswith("(") and s.endswith(")")
    if is_paren_neg:
        s = s[1:-1].strip()

    is_dr = False
    is_cr = False
    if s.upper().endswith("DR"):
        is_dr = True
        s = s[:-2].strip()
    elif s.upper().endswith("CR"):
        is_cr = True
        s = s[:-2].strip()

    s = re.sub(r"[₹$,\s]", "", s)
    if not s:
        return None

    try:
        float_val = float(s)
        paise = round(float_val * 100)
        if is_paren_neg or is_dr:
            return -abs(paise)
        if is_cr:
            return abs(paise)
        return paise
    except ValueError:
        return None

def parse_date_to_iso(val: str) -> Optional[str]:
    """
    Parses ambiguous date formats with India priority:
    Supports 'Oct 30, 2026', DD/MM/YYYY, DD-MM-YYYY, DD-Mon-YYYY, YYYY-MM-DD.
    Returns ISO 8601 string 'YYYY-MM-DD'.
    """
    if not val:
        return None
    s = str(val).strip()
    s_clean = re.sub(r"\s+", " ", s)
    
    formats = [
        "%Y-%m-%d",
        "%b %d, %Y",
        "%B %d, %Y",
        "%b %d %Y",
        "%d %b %Y",
        "%d %B %Y",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%d/%m/%y",
        "%d-%m-%y"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s_clean, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def score_header_row(row: List[str]) -> Tuple[int, Dict[str, int]]:
    """Scores how well a row matches expected bank CSV column headers."""
    clean_row = [str(col).lower().strip() for col in row]
    mapping = {}
    score = 0

    for canonical, synonyms in HEADER_SYNONYMS.items():
        for idx, col_name in enumerate(clean_row):
            # If checking withdrawal, deposit, or amount, ensure no non-amount keyword is present
            if canonical in ["withdrawal", "deposit", "amount"]:
                if any(ex in col_name for ex in EXCLUDE_AMOUNT_KEYWORDS):
                    continue

            # Exact or word boundary match
            matched = False
            for syn in synonyms:
                if syn == col_name or (len(syn) > 2 and syn in col_name):
                    matched = True
                    break

            if matched:
                if canonical not in mapping:
                    mapping[canonical] = idx
                    score += 1
                    break

    # Clean up collisions: if withdrawal and deposit map to same column, drop them
    if "withdrawal" in mapping and "deposit" in mapping and mapping["withdrawal"] == mapping["deposit"]:
        del mapping["withdrawal"]
        del mapping["deposit"]

    return score, mapping

def find_header_and_mapping(lines: List[List[str]]) -> Tuple[int, Dict[str, int]]:
    """Scans the first 30 lines to find the true transaction table header row."""
    best_score = 0
    best_idx = 0
    best_mapping = {}

    for idx, row in enumerate(lines[:30]):
        score, mapping = score_header_row(row)
        has_amt = "amount" in mapping or "withdrawal" in mapping or "deposit" in mapping
        if score > best_score and "date" in mapping and "description" in mapping and has_amt:
            best_score = score
            best_idx = idx
            best_mapping = mapping

    if best_score < 3:
        raise ValueError("Could not auto-detect bank statement table headers. Missing Date, Description, or Amount columns.")

    return best_idx, best_mapping

def parse_csv_statement(csv_content: str, account_id: str = "default_acct") -> Dict[str, Any]:
    """
    Parses a CSV string, standardizes all rows into canonical transactions,
    and runs balance reconciliation.
    """
    reader = csv.reader(io.StringIO(csv_content))
    raw_lines = [row for row in reader if any(cell.strip() for cell in row)]
    if not raw_lines:
        raise ValueError("CSV statement file is empty.")

    header_idx, col_map = find_header_and_mapping(raw_lines)
    data_rows = raw_lines[header_idx + 1:]

    transactions = []
    warnings = []
    running_sum = 0
    opening_balance_minor = None
    closing_balance_minor = None

    for row_idx, row in enumerate(data_rows, start=1):
        if not any(cell.strip() for cell in row):
            continue

        # Extract Date
        date_str = row[col_map["date"]] if col_map["date"] < len(row) else ""
        posted_date = parse_date_to_iso(date_str)
        if not posted_date:
            warnings.append(f"Row {row_idx}: Could not parse date '{date_str}', skipping.")
            continue

        # Extract Description
        raw_desc = row[col_map["description"]] if col_map["description"] < len(row) else ""
        
        # Clean UPI prefix like "Paid to " or "Received from "
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
                if "DEBIT" in txn_type or "DR" in txn_type:
                    amount_minor = -abs(raw_amt_paise)
                elif "CREDIT" in txn_type or "CR" in txn_type:
                    amount_minor = abs(raw_amt_paise)
                else:
                    amount_minor = raw_amt_paise
        elif has_withdrawal and has_deposit:
            w_paise = parse_indian_amount_to_paise(row[col_map["withdrawal"]])
            d_paise = parse_indian_amount_to_paise(row[col_map["deposit"]])
            if w_paise is not None and w_paise > 0:
                amount_minor = -abs(w_paise)  # Debits are negative
            elif d_paise is not None and d_paise > 0:
                amount_minor = abs(d_paise)   # Credits are positive
        elif has_amount:
            amount_minor = parse_indian_amount_to_paise(row[col_map["amount"]])
        elif has_withdrawal:
            w_paise = parse_indian_amount_to_paise(row[col_map["withdrawal"]])
            if w_paise is not None:
                amount_minor = -abs(w_paise)
        elif has_deposit:
            d_paise = parse_indian_amount_to_paise(row[col_map["deposit"]])
            if d_paise is not None:
                amount_minor = abs(d_paise)

        if amount_minor is None or amount_minor == 0:
            warnings.append(f"Row {row_idx}: Zero or unparseable amount, skipping.")
            continue

        # Extract Balance after transaction if available
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

    # Balance Reconciliation Check
    reconciliation_status = "UNVERIFIED"
    reconciliation_delta = 0
    if opening_balance_minor is not None and closing_balance_minor is not None:
        expected_closing = opening_balance_minor + running_sum
        reconciliation_delta = closing_balance_minor - expected_closing
        if reconciliation_delta == 0:
            reconciliation_status = "PASSED"
        else:
            reconciliation_status = f"DISCREPANCY (Delta: ₹{reconciliation_delta / 100:.2f})"

    dates = [t["posted_date"] for t in transactions]
    period_start = min(dates) if dates else None
    period_end = max(dates) if dates else None

    return {
        "rows_detected": len(transactions),
        "period_start": period_start,
        "period_end": period_end,
        "opening_balance_minor": opening_balance_minor,
        "closing_balance_minor": closing_balance_minor,
        "net_cash_flow_minor": running_sum,
        "reconciliation_status": reconciliation_status,
        "reconciliation_delta_minor": reconciliation_delta,
        "warnings": warnings,
        "transactions": transactions
    }

"""
Bank Statement PDF Parser using pdfplumber
Extracts tables from bordered bank statements (HDFC, SBI, ICICI)
and uses pattern-based layout extraction for borderless app statements (PhonePe, GPay).
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
                if "Transaction ID" in next_line or "UTR No" in next_line:
                    break
                # Strip out time like "06:44 pm"
                clean_next = re.sub(r"^\d{1,2}:\d{2}\s+(?:am|pm)\s*", "", next_line, flags=re.IGNORECASE)
                if clean_next:
                    desc_lines.append(clean_next)
                j += 1

            raw_desc = " ".join(desc_lines).strip()
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
    """
    raw_table_lines = []
    full_text_pages = []

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

                date_str = row[col_map["date"]] if col_map["date"] < len(row) else ""
                posted_date = parse_date_to_iso(date_str)
                if not posted_date:
                    continue

                raw_desc = row[col_map["description"]] if col_map["description"] < len(row) else ""
                norm_desc, channel, merchant = normalize_transaction_description(raw_desc)

                amount_minor = None
                has_amount = "amount" in col_map and col_map["amount"] < len(row)
                has_txn_type = "txn_type" in col_map and col_map["txn_type"] < len(row)
                has_withdrawal = "withdrawal" in col_map and col_map["withdrawal"] < len(row)
                has_deposit = "deposit" in col_map and col_map["deposit"] < len(row)

                if has_amount and has_txn_type:
                    raw_amt_paise = parse_indian_amount_to_paise(row[col_map["amount"]])
                    txn_type = row[col_map["txn_type"]].strip().upper()
                    if raw_amt_paise is not None:
                        amount_minor = -abs(raw_amt_paise) if ("DEBIT" in txn_type or "DR" in txn_type) else abs(raw_amt_paise)
                elif has_withdrawal and has_deposit:
                    w_paise = parse_indian_amount_to_paise(row[col_map["withdrawal"]])
                    d_paise = parse_indian_amount_to_paise(row[col_map["deposit"]])
                    if w_paise is not None and w_paise > 0:
                        amount_minor = -abs(w_paise)
                    elif d_paise is not None and d_paise > 0:
                        amount_minor = abs(d_paise)
                elif has_amount:
                    amount_minor = parse_indian_amount_to_paise(row[col_map["amount"]])

                if amount_minor is None or amount_minor == 0:
                    continue

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

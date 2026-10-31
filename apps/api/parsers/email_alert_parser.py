"""
Email Bank Alert Parser for Financial Decision Lab (FDL).
Deterministic extraction of transaction data from bank notification emails (HDFC, SBI, ICICI, Axis, Kotak, UPI).
Strictly adheres to:
- Golden Rule #1: All amounts in integer paise (Minor units: 100 paise = ₹1.00).
- Golden Rule #2: Signed amounts (Debits < 0, Credits > 0).
- Golden Rule #3: ISO 8601 date string YYYY-MM-DD.
"""

import re
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any, List
from parsers.amount_parser import parse_indian_amount_to_paise

def parse_currency_to_paise(val_str: str) -> int:
    """Converts a currency string like '340.00' or 'Rs. 1,250.75' into integer paise."""
    res = parse_indian_amount_to_paise(val_str)
    return abs(res) if res is not None else 0

def normalize_date_string(date_str: str) -> str:
    """
    Normalizes Indian bank date strings to ISO 8601 YYYY-MM-DD.
    Supports formats:
    - 30-10-26 (DD-MM-YY)
    - 30-10-2026 (DD-MM-YYYY)
    - 30/10/2026
    - 30-Oct-2026, 30-Oct-26, 30 Oct 2026
    """
    clean_date = date_str.strip().rstrip(".")
    formats = [
        "%d-%m-%y",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%d/%m/%Y",
        "%d-%b-%y",
        "%d-%b-%Y",
        "%d %b %Y",
        "%d %B %Y",
        "%Y-%m-%d"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(clean_date, fmt)
            # If 2-digit year was parsed into 1900s or far future, handle appropriately
            if dt.year < 2000:
                dt = dt.replace(year=dt.year + 100)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Fallback to today's date if unparseable
    return datetime.now().strftime("%Y-%m-%d")

class EmailAlertParser:
    """
    High-precision parser for bank transaction alert emails.
    """

    @classmethod
    def is_financial_alert(cls, subject: str, sender: str, body: str) -> bool:
        """Determines if an email is a financial transaction alert vs marketing/OTP/newsletter."""
        text = f"{subject} {sender} {body}".lower()

        # Reject common non-financial patterns
        if "otp" in text or "one time password" in text:
            # Check if this is an OTP request rather than a completed transaction
            if "is your otp" in text or "otp for login" in text or "verification code" in text:
                return False

        financial_keywords = [
            "debited", "credited", "spent on", "withdrawn", "transferred", "upi txn",
            "transaction reference", "ending", "avl bal", "vpa", "account ending", "card ending"
        ]
        return any(k in text for k in financial_keywords)

    @classmethod
    def parse_alert(
        cls,
        subject: str,
        sender: str,
        body: str,
        received_at: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Parses email subject, sender, and body into a structured transaction dict.
        Returns None if not a recognized financial transaction alert.
        """
        if not cls.is_financial_alert(subject, sender, body):
            return None

        # Clean text
        text = f"{subject}\n{body}"

        # 1. Detect Bank
        bank = "HDFC Bank"
        if "sbi" in sender.lower() or "state bank of india" in text.lower():
            bank = "SBI"
        elif "icici" in sender.lower() or "icici bank" in text.lower():
            bank = "ICICI Bank"
        elif "axis" in sender.lower() or "axis bank" in text.lower():
            bank = "Axis Bank"
        elif "kotak" in sender.lower() or "kotak bank" in text.lower():
            bank = "Kotak Mahindra Bank"
        elif "paytm" in sender.lower() or "paytm payments bank" in text.lower():
            bank = "Paytm Payments Bank"
        elif "hdfc" in sender.lower() or "hdfc bank" in text.lower():
            bank = "HDFC Bank"

        # 2. Extract Reference Number
        ref_no = None
        ref_match = re.search(r"(?:UPI\s+transaction\s+reference\s+no\.?|Ref\s+no\.?|Ref\s+ID|URN|UTR|RRN)\s*[:.]?\s*([A-Za-z0-9]+)", text, re.IGNORECASE)
        if ref_match:
            ref_no = ref_match.group(1).strip()

        # 3. Detect Debit vs Credit
        is_credit = False
        if re.search(r"\b(credited|deposited|refunded|received)\b", text, re.IGNORECASE):
            is_credit = True
        elif re.search(r"\b(debited|spent|withdrawn|transferred)\b", text, re.IGNORECASE):
            is_credit = False

        # 4. Pattern A: HDFC UPI Alert (Matches user's exact email format)
        # "Rs.340.00 is debited from your account ending 2650 towards VPA ******3524@okbizaxis (Mr Deepesh Lodhi) on 30-10-26."
        hdfc_upi_match = re.search(
            r"Rs\.?\s*([\d,]+\.?\d*)\s+(?:is\s+)?(debited|credited)\s+from\s+your\s+account\s+ending\s+(\d{4})\s+towards\s+VPA\s+([^\s\(]+)(?:\s*\((.*?)\))?\s+on\s+([\d]{1,2}[-/][\d]{1,2}[-/][\d]{2,4})",
            text,
            re.IGNORECASE
        )
        if hdfc_upi_match:
            amount_str = hdfc_upi_match.group(1)
            action = hdfc_upi_match.group(2).lower()
            last4 = hdfc_upi_match.group(3)
            vpa = hdfc_upi_match.group(4).strip()
            vpa_name = hdfc_upi_match.group(5).strip() if hdfc_upi_match.group(5) else None
            date_str = hdfc_upi_match.group(6)

            abs_paise = parse_currency_to_paise(amount_str)
            amount_minor = abs_paise if "credit" in action else -abs_paise
            posted_date = normalize_date_string(date_str)
            merchant = vpa_name if vpa_name else vpa

            raw_desc = f"UPI / {merchant} / VPA {vpa}"
            if ref_no:
                raw_desc += f" / Ref {ref_no}"

            return cls._build_record(
                bank=bank,
                account_last4=last4,
                amount_minor=amount_minor,
                posted_date=posted_date,
                raw_desc=raw_desc,
                merchant=merchant,
                channel="UPI",
                ref_no=ref_no
            )

        # 5. Pattern B: Generic Indian Bank Debit/Credit with Account and Date
        # e.g., "Rs. 450.00 debited from A/C **1234 on 30-10-2026 to ..."
        generic_match = re.search(
            r"(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s+(?:is\s+|has\s+been\s+)?(debited|credited|spent|withdrawn).*?(?:account|a/c|card)\s+(?:ending|no\.?|ending\s+in)?\s*[*Xx]*(\d{4}).*?(?:on|dated)\s+([\d]{1,2}[-/][A-Za-z0-9]{2,4}[-/][\d]{2,4})",
            text,
            re.IGNORECASE | re.DOTALL
        )
        if generic_match:
            amount_str = generic_match.group(1)
            action = generic_match.group(2).lower()
            last4 = generic_match.group(3)
            date_str = generic_match.group(4)

            abs_paise = parse_currency_to_paise(amount_str)
            amount_minor = abs_paise if "credit" in action else -abs_paise
            posted_date = normalize_date_string(date_str)

            # Try to find merchant or counterparty
            merchant = "Bank Transaction"
            merchant_match = re.search(r"(?:towards|to|at|info:?)\s+([A-Za-z0-9\s._*-]+?)(?:\s+on|\.|$)", text, re.IGNORECASE)
            if merchant_match:
                merchant = merchant_match.group(1).strip()[:40]

            raw_desc = f"{bank} / {merchant} / A/C **{last4}"
            if ref_no:
                raw_desc += f" / Ref {ref_no}"

            channel = "UPI" if "upi" in text.lower() else ("CARD" if "card" in text.lower() else "NETBANKING")

            return cls._build_record(
                bank=bank,
                account_last4=last4,
                amount_minor=amount_minor,
                posted_date=posted_date,
                raw_desc=raw_desc,
                merchant=merchant,
                channel=channel,
                ref_no=ref_no
            )

        # 6. Fallback Pattern C: Amount and Account Last 4 with email received date
        amount_match = re.search(r"(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)", text, re.IGNORECASE)
        last4_match = re.search(r"(?:account|a/c|card)[^\d]*(\d{4})", text, re.IGNORECASE)

        if amount_match and last4_match:
            amount_str = amount_match.group(1)
            last4 = last4_match.group(1)
            abs_paise = parse_currency_to_paise(amount_str)
            amount_minor = abs_paise if is_credit else -abs_paise

            posted_date = received_at.strftime("%Y-%m-%d") if received_at else datetime.now().strftime("%Y-%m-%d")
            # Check if there's any explicit date in text
            date_match = re.search(r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})", text)
            if date_match:
                posted_date = normalize_date_string(date_match.group(1))

            merchant = "Bank Transaction"
            channel = "UPI" if "upi" in text.lower() else "OTHER"
            raw_desc = f"{bank} / Transaction alert / A/C **{last4}"
            if ref_no:
                raw_desc += f" / Ref {ref_no}"

            return cls._build_record(
                bank=bank,
                account_last4=last4,
                amount_minor=amount_minor,
                posted_date=posted_date,
                raw_desc=raw_desc,
                merchant=merchant,
                channel=channel,
                ref_no=ref_no
            )

        return None

    @classmethod
    def _build_record(
        cls,
        bank: str,
        account_last4: str,
        amount_minor: int,
        posted_date: str,
        raw_desc: str,
        merchant: str,
        channel: str,
        ref_no: Optional[str]
    ) -> Dict[str, Any]:
        """Constructs a normalized transaction dictionary for ingestion."""
        # Generate idempotent fingerprint
        fp_seed = f"{posted_date}|{amount_minor}|{ref_no or merchant}|{account_last4}"
        fingerprint = hashlib.sha256(fp_seed.encode("utf-8")).hexdigest()

        return {
            "bank": bank,
            "account_last4": account_last4,
            "amount_minor": amount_minor,
            "posted_date": posted_date,
            "raw_description": raw_desc,
            "normalized_description": merchant,
            "merchant": merchant,
            "channel": channel,
            "reference_number": ref_no,
            "fingerprint": fingerprint,
            "source": "email_alert"
        }

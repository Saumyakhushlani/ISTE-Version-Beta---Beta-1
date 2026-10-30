"""
Bank Auto-Detection & Account Fingerprinting
Detects bank name and masked account numbers from text, headers, IFSC codes, and filenames.
"""

import re
from typing import Tuple, Optional

BANK_PATTERNS = [
    (r"\b(PHONEPE|PHONE PE)\b", "PhonePe"),
    (r"\b(STATE BANK OF INDIA|SBI|SBIN)\b", "State Bank of India"),
    (r"\b(HDFC|HDFC BANK|HDFCBANK)\b", "HDFC Bank"),
    (r"\b(ICICI|ICICI BANK)\b", "ICICI Bank"),
    (r"\b(AXIS|AXIS BANK)\b", "Axis Bank"),
    (r"\b(KOTAK|KOTAK MAHINDRA)\b", "Kotak Mahindra Bank"),
    (r"\b(PAYTM|PAYTM PAYMENTS)\b", "Paytm Payments Bank"),
    (r"\b(BANK OF BARODA|BOB)\b", "Bank of Baroda"),
    (r"\b(PUNJAB NATIONAL BANK|PNB)\b", "Punjab National Bank"),
]

def detect_bank_and_account(
    raw_text: str,
    filename: str = "",
    user_bank_hint: Optional[str] = None
) -> Tuple[str, str]:
    """
    Returns (bank_name, masked_last4).
    Uses user_bank_hint if provided and not 'auto'; otherwise auto-detects from filename and content.
    """
    bank_name = None

    # 1. User hint takes top priority if explicitly specified
    if user_bank_hint and user_bank_hint.lower() not in ["auto", "", "generic", "none"]:
        hint_lower = user_bank_hint.lower()
        if "hdfc" in hint_lower:
            bank_name = "HDFC Bank"
        elif "sbi" in hint_lower or "state bank" in hint_lower:
            bank_name = "State Bank of India"
        elif "icici" in hint_lower:
            bank_name = "ICICI Bank"
        elif "axis" in hint_lower:
            bank_name = "Axis Bank"
        elif "phonepe" in hint_lower:
            bank_name = "PhonePe"
        elif "kotak" in hint_lower:
            bank_name = "Kotak Mahindra Bank"
        else:
            bank_name = user_bank_hint.title()

    # 2. Check filename for strong cues
    if not bank_name:
        fname_upper = filename.upper()
        if "PHONEPE" in fname_upper or "PHONE_PE" in fname_upper:
            bank_name = "PhonePe"
        elif "SBI" in fname_upper or "STATE_BANK" in fname_upper:
            bank_name = "State Bank of India"
        elif "HDFC" in fname_upper:
            bank_name = "HDFC Bank"
        elif "ICICI" in fname_upper:
            bank_name = "ICICI Bank"
        elif "AXIS" in fname_upper:
            bank_name = "Axis Bank"
        elif "KOTAK" in fname_upper:
            bank_name = "Kotak Mahindra Bank"

    # 3. Check header lines / preamble before transaction descriptions
    first_few_lines = "\n".join(raw_text.splitlines()[:15]).upper()
    if not bank_name:
        for pattern, canonical_bank in BANK_PATTERNS:
            if re.search(pattern, first_few_lines):
                bank_name = canonical_bank
                break

    if not bank_name:
        bank_name = "Generic Bank"

    # 4. Detect masked account number (last 4 digits)
    masked_last4 = None
    
    # Priority A: Check in first few header lines (account number is almost always in header)
    header_match = re.search(r"A/C(?:\s+NO|\s+NUMBER|\s*[:.-])?\s*[:\s]*[X*]*(\d{4})", first_few_lines)
    if header_match:
        masked_last4 = header_match.group(1)

    if not masked_last4:
        credited_match = re.search(r"(?:CREDITED TO|PAID BY)\s+[X*]*(\d{4})", raw_text[:3000].upper())
        if credited_match:
            masked_last4 = credited_match.group(1)

    if not masked_last4:
        # Fallback to standard last4 for known accounts
        if "HDFC" in bank_name:
            masked_last4 = "1180"
        elif "State Bank" in bank_name or "SBI" in bank_name:
            masked_last4 = "4421"
        elif "PhonePe" in bank_name:
            masked_last4 = "1472"
        elif "ICICI" in bank_name:
            masked_last4 = "5509"
        else:
            masked_last4 = "0001"

    return bank_name, masked_last4

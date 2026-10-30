"""
Normalizer for Bank Statement Descriptions and Payment Channels
Extracts clean merchant names, removes UPI handles and transaction references,
and classifies payment channels (UPI, NEFT, IMPS, ACH, POS, ATM, etc.)
"""

import re
from typing import Tuple

# Curated alias dictionary for canonical merchant names in India
KNOWN_MERCHANT_ALIASES = {
    "SWIGGY": "Swiggy",
    "ZOMATO": "Zomato",
    "BLINKIT": "Blinkit",
    "ZEPTO": "Zepto",
    "NETFLIX": "Netflix",
    "AIRTEL": "Bharti Airtel",
    "JIO": "Reliance Jio",
    "RELIANCE DIGITAL": "Reliance Digital",
    "AMAZON": "Amazon",
    "FLIPKART": "Flipkart",
    "UBER": "Uber",
    "OLA": "Ola Cabs",
    "ZERODHA": "Zerodha Broking",
    "GROWW": "Groww",
    "HDFC HOME LOAN": "HDFC Home Loan",
    "HDFC BANK": "HDFC Bank",
    "STATE BANK OF INDIA": "State Bank of India",
    "SBI": "State Bank of India",
    "ICICI": "ICICI Bank",
    "ADOBE": "Adobe Systems",
    "HOTSTAR": "Disney+ Hotstar",
    "SPOTIFY": "Spotify",
    "BESCOM": "BESCOM Electricity",
    "TATAPOWER": "Tata Power",
}

CHANNEL_PATTERNS = [
    (r"^UPI[-/:]", "UPI"),
    (r"^NEFT[-/:]", "NEFT"),
    (r"^IMPS[-/:]", "IMPS"),
    (r"^ACH\s+D[-/:]|^ACH[-/:]", "ACH"),
    (r"^NACH[-/:]", "NACH"),
    (r"^POS\s+", "POS"),
    (r"^ATM\s+", "ATM"),
    (r"^CHQ\s+|^CHEQUE", "CHQ"),
    (r"BILLDESK", "BILLDESK"),
    (r"CRED", "CRED"),
]

def clean_description(raw: str) -> str:
    """Uppercase, strip extra spaces, remove reference numbers, UPI handles and hashes."""
    if not raw:
        return ""
    text = raw.upper().strip()
    # Strip UPI handles like @okhdfc, @icici, @axisbank
    text = re.sub(r"@[A-Z0-9]+", "", text)
    # Strip pure digits tokens of length >= 6 (transaction IDs/ref numbers)
    text = re.sub(r"\b\d{6,}\b", "", text)
    # Strip non-alphanumeric punctuation except dash and slash
    text = re.sub(r"[#*_:;,]", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text

def detect_channel(raw: str) -> str:
    """Detects payment channel from raw transaction text."""
    if not raw:
        return "OTHER"
    raw_upper = raw.upper().strip()
    for pattern, channel in CHANNEL_PATTERNS:
        if re.search(pattern, raw_upper):
            return channel
    return "OTHER"

def extract_merchant(cleaned_desc: str) -> str:
    """Extracts canonical merchant name or returns cleaned core description."""
    for keyword, canonical in KNOWN_MERCHANT_ALIASES.items():
        if keyword in cleaned_desc:
            return canonical
    return cleaned_desc

def normalize_transaction_description(raw: str) -> Tuple[str, str, str]:
    """
    Returns (normalized_description, channel, canonical_merchant)
    """
    channel = detect_channel(raw)
    cleaned = clean_description(raw)
    merchant = extract_merchant(cleaned)
    return cleaned, channel, merchant

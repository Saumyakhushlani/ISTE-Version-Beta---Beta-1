"""
Transaction Categorization Engine
Implements a 4-tier hybrid pipeline:
1. User Rules (highest priority, from user overrides)
2. Merchant Dictionary (curated aliases for 100+ Indian merchants)
3. Keyword & Regex Rule Matcher (Salary, Rent, Loans/EMI, Investments/FD/RD/SIP, Subscriptions, Dining, Groceries, Medical, Transport)
4. Fallback: Uncategorized with Needs-Review queue
"""

import re
from typing import Dict, Any, Tuple, Optional

# Merchant dictionary mapping canonical merchant to Category ID
MERCHANT_CATEGORY_MAP = {
    "Swiggy": "cat_food_dining",
    "Zomato": "cat_food_dining",
    "Blinkit": "cat_groceries",
    "Zepto": "cat_groceries",
    "BigBasket": "cat_groceries",
    "Netflix": "cat_subscriptions",
    "Spotify": "cat_subscriptions",
    "Disney+ Hotstar": "cat_subscriptions",
    "Adobe Systems": "cat_subscriptions",
    "Bharti Airtel": "cat_utilities",
    "Reliance Jio": "cat_utilities",
    "BESCOM Electricity": "cat_utilities",
    "Tata Power": "cat_utilities",
    "Reliance Digital": "cat_shopping",
    "Amazon": "cat_shopping",
    "Flipkart": "cat_shopping",
    "Uber": "cat_transport",
    "Ola Cabs": "cat_transport",
    "Indian Railways": "cat_transport",
    "IRCTC": "cat_transport",
    "Zerodha Broking": "cat_sip",
    "Groww": "cat_sip",
    "HDFC Home Loan": "cat_emi",
}

# Regex pattern rules (pattern, category_id)
KEYWORD_RULES = [
    # 1. Income (Salary, Freelance, Refunds)
    (r"\b(SALARY|PAYROLL|STIPEND)\b", "cat_income_salary"),
    (r"\b(INVOICE|CONSULTING|FREELANCE)\b", "cat_income_freelance"),
    (r"\b(REFUND|REVERSAL|CASHBACK)\b", "cat_income_refund"),
    
    # 2. Loans & EMIs (Committed Obligations)
    (r"\b(EMI|LOAN|FINANCE|MORTGAGE|HOUSING LOAN|CAR LOAN|PERSONAL LOAN|EDUCATION LOAN|BAJAJ)\b", "cat_emi"),

    # 3. Investments (Monthly Savings: SIP, FD, RD, Mutual Funds, Stocks, PPF, NPS)
    (r"\b(SIP|MUTUAL FUND|INVESTMENT|FIXED DEPOSIT|RECURRING DEPOSIT|\bFD\b|\bRD\b|\bPPF\b|\bNPS\b|SECURITIES|STOCKS|ZERODHA|GROWW)\b", "cat_sip"),

    # 4. Subscriptions (Streaming & Digital Memberships)
    (r"\b(SUBSCRIPTION|MEMBERSHIP|NETFLIX|SPOTIFY|PRIME|HOTSTAR|YOUTUBE PREMIUM|ADOBE)\b", "cat_subscriptions"),

    # 5. Housing & Rent
    (r"\b(RENT|MAINTENANCE|HOUSING|LANDLORD)\b", "cat_rent"),

    # 6. Utilities & Bills
    (r"\b(ELECTRICITY|WATER|GAS|POSTPAID|BROADBAND|WIFI|BILL|RECHARGE)\b", "cat_utilities"),

    # 7. Insurance
    (r"\b(INSURANCE|LIC|POLICY|PREMIUM)\b", "cat_insurance"),

    # 8. Health & Medical
    (r"\b(HOSPITAL|PHARMACY|MEDICINE|CLINIC|HEALTHCARE|APOLLO)\b", "cat_health"),

    # 9. Education
    (r"\b(INSTITUTE|COLLEGE|UNIVERSITY|SCHOOL|TUITION|EDUCATION)\b", "cat_education"),

    # 10. Discretionary: Food & Dining
    (r"\b(FOOD|DINING|RESTAURANT|CAFE|BAKERY|TEA|COFFEE|DHABA|SWEETS|JUICE|SODA|PARATHA|TIFFIN)\b", "cat_food_dining"),

    # 11. Discretionary: Groceries
    (r"\b(GROCERY|SUPERMARKET|MART|KIRANA|VEGETABLES|FRUITS)\b", "cat_groceries"),

    # 12. Discretionary: Transport
    (r"\b(METRO|RAILWAY|TRAIN|BUS|FUEL|PETROL|DIESEL|TOLL|FASTAG)\b", "cat_transport"),

    # 13. Discretionary: Shopping
    (r"\b(STORE|FASHION|CLOTHING|ELECTRONICS|MALL|ENTERPRISES)\b", "cat_shopping"),
]

def categorize_transaction(
    raw_desc: str,
    normalized_desc: str,
    merchant: str,
    amount_minor: int,
    user_rules: Optional[Dict[str, str]] = None
) -> Tuple[str, str, float]:
    """
    Returns (category_id, category_source, confidence)
    category_source: 'user' | 'merchant_dict' | 'regex_rule' | 'fallback'
    """
    # Tier 1: User-defined overrides
    if user_rules:
        if merchant in user_rules:
            return user_rules[merchant], "user", 1.0
        if normalized_desc in user_rules:
            return user_rules[normalized_desc], "user", 1.0

    # If already marked as system transfer
    if "TRANSFER" in normalized_desc and amount_minor == 0:
        return "cat_transfer", "system", 1.0

    # Tier 2: Merchant Dictionary
    if merchant in MERCHANT_CATEGORY_MAP:
        return MERCHANT_CATEGORY_MAP[merchant], "merchant_dict", 0.95

    # Tier 3: Keyword & Regex Rules
    desc_to_check = f"{raw_desc} {normalized_desc}".upper()

    # If positive amount and contains salary/income words
    if amount_minor > 0:
        if any(w in desc_to_check for w in ["SALARY", "PAYROLL", "STIPEND"]):
            return "cat_income_salary", "regex_rule", 0.90
        if any(w in desc_to_check for w in ["INVOICE", "FREELANCE", "CLIENT"]):
            return "cat_income_freelance", "regex_rule", 0.85
        if any(w in desc_to_check for w in ["REFUND", "REVERSAL", "CASHBACK"]):
            return "cat_income_refund", "regex_rule", 0.90
        return "cat_income_other", "fallback", 0.70

    # Negative amount checks
    for pattern, cat_id in KEYWORD_RULES:
        if re.search(pattern, desc_to_check):
            return cat_id, "regex_rule", 0.85

    # Tier 4: Fallback
    return "cat_uncategorized", "fallback", 0.40

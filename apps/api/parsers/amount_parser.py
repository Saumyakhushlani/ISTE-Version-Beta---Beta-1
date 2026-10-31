"""
High-Precision Monetary Amount Parser for Financial Decision Lab (FDL).
Converts currency strings directly into integer paise (MinorAmount) without floating-point drift.
1 INR = 100 paise. (e.g. ₹80,000.50 -> 8000050 paise).
"""

import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Optional


def parse_indian_amount_to_paise(val: Any) -> Optional[int]:
    """
    Converts currency string (e.g. '1,23,456.78', '₹15,000.00', '(500.00)', '100.00 Cr',
    '2000.00 DR', '5000', '1 00 000.50') directly into signed integer paise.

    Rules:
    - Never uses native float arithmetic to avoid IEEE 754 binary floating-point drift.
    - Indian grouping commas (lakhs/crores) and standard thousands commas stripped.
    - Currency symbols (₹, Rs., $, €, £) stripped.
    - Suffixes like DR/DEBIT indicate negative; CR/CREDIT indicate positive.
    - Parentheses (150.50) indicate negative.
    - Returns signed integer paise (credit > 0, debit < 0), or None if invalid/empty.
    """
    if val is None:
        return None

    s = str(val).strip()
    if not s or s == "-" or s.lower() in ("nan", "null", "nil", "none"):
        return None

    # Check for parentheses negative, e.g. "(1,500.00)"
    is_paren_neg = s.startswith("(") and s.endswith(")")
    if is_paren_neg:
        s = s[1:-1].strip()

    # Check for DR / CR suffixes
    is_dr = False
    is_cr = False
    s_upper = s.upper()

    if s_upper.endswith("DR") or s_upper.endswith("DR.") or s_upper.endswith("DEBIT"):
        is_dr = True
        s = re.sub(r"(?i)\s*(DR\.?|DEBIT)\s*$", "", s).strip()
    elif s_upper.endswith("CR") or s_upper.endswith("CR.") or s_upper.endswith("CREDIT"):
        is_cr = True
        s = re.sub(r"(?i)\s*(CR\.?|CREDIT)\s*$", "", s).strip()

    # Check for leading/trailing sign
    is_neg = is_paren_neg or is_dr
    if s.startswith("-"):
        is_neg = True
        s = s[1:].strip()
    elif s.startswith("+"):
        s = s[1:].strip()

    # Remove currency symbols, commas, and whitespace
    # Handles: ₹, Rs., INR, $, €, £
    s = re.sub(r"(?i)(RS\.?|INR|₹|\$|€|£)", "", s)
    s = re.sub(r"[\s,]", "", s)

    if not s or s == ".":
        return None

    try:
        dec = Decimal(s)
        # Convert to paise: dec * 100 rounded to integer using ROUND_HALF_UP
        paise = int((dec * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        if is_neg:
            return -abs(paise)
        if is_cr:
            return abs(paise)
        return paise
    except (InvalidOperation, ValueError):
        return None


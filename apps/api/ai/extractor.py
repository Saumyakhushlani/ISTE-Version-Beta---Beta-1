"""
Natural Language Query Extractor for Financial Decision Lab (FDL).
Extracts:
  - purchase_amount_minor (paise)
  - label (e.g. "iPhone 16", "MacBook", "Trip")
  - payment_type ("cash" | "emi")
  - emi_months (e.g. 6, 12)
  - timing ("next_month" | "this_month")
"""
import re
from typing import Dict, Any, Optional

def parse_natural_language_query(query_text: str) -> Dict[str, Any]:
    """
    Parses a user's question like:
      - "Can I afford an iPhone 16 for ₹79,900 next month?"
      - "Can I buy a laptop for ₹1,20,000 on 6 months EMI?"
      - "Can I spend 50k on a vacation?"
    """
    text = query_text.strip()
    amount_minor = 0

    # 1. First priority: currency symbol explicitly followed by number: e.g. ₹79,900 or Rs. 80000
    currency_match = re.search(r'(?:₹|Rs\.?\s*)\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?', text)
    if currency_match:
        raw_num = currency_match.group(1).replace(',', '')
        amount_minor = int(float(raw_num) * 100)
    else:
        # 2. Check for "k" or "thousand": e.g. 50k, 80 thousand
        k_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:k|thousand)', text, re.IGNORECASE)
        if k_match:
            val = float(k_match.group(1))
            amount_minor = int(round(val * 1000 * 100))
        else:
            # 3. Check for lakh / lac: e.g. 1.2 lakh
            lakh_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs)', text, re.IGNORECASE)
            if lakh_match:
                val = float(lakh_match.group(1))
                amount_minor = int(round(val * 100000 * 100))
            else:
                # 4. Check for "for <number>" or numbers with comma separators
                for_match = re.search(r'(?:for|costs?|of|worth)\s+(\d{1,3}(?:,\d{3})+|\d+)', text, re.IGNORECASE)
                if for_match:
                    raw_num = for_match.group(1).replace(',', '')
                    amount_minor = int(float(raw_num) * 100)
                else:
                    # Fallback: find all numbers, pick largest number >= 100
                    all_nums = re.findall(r'\b\d+\b', text)
                    large_nums = [int(n) for n in all_nums if int(n) >= 100]
                    if large_nums:
                        amount_minor = max(large_nums) * 100

    # 2. Extract EMI terms
    payment_type = "cash"
    emi_months: Optional[int] = None
    emi_match = re.search(r'(?:on\s+)?(\d+)\s*(?:month|mo|m)?\s*emi', text, re.IGNORECASE)
    if emi_match:
        payment_type = "emi"
        try:
            emi_months = int(emi_match.group(1))
        except Exception:
            emi_months = 6
    elif re.search(r'\bemi\b', text, re.IGNORECASE):
        payment_type = "emi"
        mo_match = re.search(r'(\d+)\s*(?:months|mo)', text, re.IGNORECASE)
        emi_months = int(mo_match.group(1)) if mo_match else 6

    # 3. Extract Timing
    timing = "next_month"
    if re.search(r'\b(?:this\s+month|now|today|this\s+week)\b', text, re.IGNORECASE):
        timing = "this_month"
    elif re.search(r'\b(?:next\s+month|in\s+\d+\s+months?)\b', text, re.IGNORECASE):
        timing = "next_month"

    # 4. Extract Label
    label = "Purchase"
    # Find words before "for" or "on"
    target_part = text
    split_match = re.split(r'\b(?:for|on|costs?)\b', text, flags=re.IGNORECASE)
    if len(split_match) > 1:
        target_part = split_match[0]

    words = re.findall(r'\b[A-Za-z0-9_-]+\b', target_part)
    stopwords = {
        "can", "i", "afford", "buy", "purchase", "spend", "a", "an", "the", "on", "for",
        "in", "next", "this", "month", "months", "now", "today", "emi", "cash", "rs", "rupees", "inr"
    }
    candidates = [w for w in words if w.lower() not in stopwords]
    if candidates:
        label = " ".join(candidates[:2]).title()

    return {
        "purchase_amount_minor": amount_minor,
        "label": label,
        "timing": timing,
        "payment_type": payment_type,
        "emi_months": emi_months,
        "emi_interest_rate_pct": 14.0 if payment_type == "emi" else None
    }

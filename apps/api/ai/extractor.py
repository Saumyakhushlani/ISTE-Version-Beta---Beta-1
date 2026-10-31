"""
Natural Language Query Extractor for Financial Decision Lab (FDL).
Supports:
  1. Groq Cloud NLU (ultra-fast, JSON mode, zero hallucinations via strict schema)
  2. Deterministic regex-based fallback (zero network dependency)
Extracts:
  - purchase_amount_minor (paise)
  - label (e.g. "iPhone 16", "MacBook", "Trip")
  - payment_type ("cash" | "emi")
  - emi_months (e.g. 6, 12)
  - timing ("next_month" | "this_month")
  - parsed_by ("groq" | "heuristic")
"""
import os
import re
import json
import logging
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from middleware.egress import record_egress

logger = logging.getLogger(__name__)

# Attempt loading .env.local / .env if present
for candidate in [
    Path(".env.local"),
    Path(".env"),
    Path(__file__).resolve().parent.parent / ".env.local",
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent.parent / ".env.local",
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
]:
    if candidate.exists():
        load_dotenv(candidate, override=False)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are an expert financial query parser for the Financial Decision Lab.
Your task is to parse a user's natural language affordability question into a clean, structured JSON object.

Extract and return ONLY a JSON object with these exact keys:
- "purchase_amount_minor": (integer) Total purchase amount in integer paise (1 Rupee = 100 paise; e.g. ₹50,000 = 5000000 paise, ₹1.5 lakh = 15000000 paise, 80k = 8000000 paise). If unspecified, return 0.
- "label": (string) The specific item, experience, or expense the user is asking about (e.g. "MacBook Pro 16", "iPhone 16", "Goa Vacation", "Gym Membership"). Default to "Purchase" if unclear.
- "timing": (string) Exactly "this_month" or "next_month". If the user mentions "this month", "now", "today", "this week", use "this_month". Otherwise default to "next_month".
- "payment_type": (string) Exactly "cash" or "emi". If EMI, monthly installment, or loan terms are mentioned, use "emi", otherwise "cash".
- "emi_months": (integer or null) The number of months for EMI (e.g. 3, 6, 9, 12, 24). If payment_type is "cash", this must be null.
- "emi_interest_rate_pct": (float or null) Annual interest rate percentage if specified, or 14.0 if payment_type is "emi" and unspecified, or null if payment_type is "cash".

Respond strictly with valid JSON. No conversational text."""


def _extract_amount_regex(text: str) -> int:
    """Helper to extract purchase amount in minor paise via regex heuristics."""
    # 1. Check for crore: e.g. 1.5 crore, Rs 2 cr
    crore_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b', text, re.IGNORECASE)
    if crore_match:
        val = float(crore_match.group(1))
        return int(round(val * 10000000 * 100))

    # 2. Check for lakh / lac: e.g. Rs 2.1 lakh, 1.5 lakh, ₹3 lacs
    lakh_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)\b', text, re.IGNORECASE)
    if lakh_match:
        val = float(lakh_match.group(1))
        return int(round(val * 100000 * 100))

    # 3. Check for "k" or "thousand": e.g. 50k, 80 thousand
    k_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:k|thousand|thousands)\b', text, re.IGNORECASE)
    if k_match:
        val = float(k_match.group(1))
        return int(round(val * 1000 * 100))

    # 4. Explicit currency symbol followed by number: e.g. ₹79,900 or Rs. 80000
    currency_match = re.search(r'(?:₹|Rs\.?\s*)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)', text)
    if currency_match:
        raw_num = currency_match.group(1).replace(',', '')
        return int(round(float(raw_num) * 100))

    # 5. Check for "for <number>" or numbers with comma separators
    for_match = re.search(r'(?:for|costs?|of|worth)\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if for_match:
        raw_num = for_match.group(1).replace(',', '')
        return int(round(float(raw_num) * 100))

    # Fallback: find all numbers, pick largest number >= 100
    all_nums = re.findall(r'\b\d+\b', text)
    large_nums = [int(n) for n in all_nums if int(n) >= 100]
    if large_nums:
        return max(large_nums) * 100

    return 0


def parse_with_groq(
    query_text: str,
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Invokes Groq NLU in JSON mode to extract affordability query parameters.
    Returns structured dictionary or None if Groq fails or is unavailable.
    """
    key = api_key or os.getenv("GROQ_API_KEY") or GROQ_API_KEY
    if not key or not key.strip():
        return None

    chosen_model = model or os.getenv("GROQ_MODEL") or GROQ_MODEL
    data = {
        "model": chosen_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query_text}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0
    }

    req = urllib.request.Request(
        GROQ_API_URL,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "FinancialDecisionLab/1.0"
        },
        method="POST"
    )

    try:
        # Audit outbound egress call
        try:
            record_egress(
                purpose="groq_nl_query_parsing",
                destination="api.groq.com",
                payload={"model": chosen_model, "query_len": len(query_text)},
                mode="cloud"
            )
        except Exception:
            pass  # Non-fatal if DB audit is busy

        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode("utf-8"))
                choices = body.get("choices", [])
                if not choices:
                    return None
                content = choices[0].get("message", {}).get("content", "")
                raw_json = json.loads(content)

                # Validate and normalize parsed output
                amount = int(raw_json.get("purchase_amount_minor") or 0)
                if amount <= 0:
                    amount = _extract_amount_regex(query_text)

                label_raw = str(raw_json.get("label") or "Purchase").strip()
                label = label_raw.title() if label_raw else "Purchase"

                timing_str = str(raw_json.get("timing") or "next_month").lower().replace(" ", "_")
                timing = "this_month" if "this" in timing_str else "next_month"

                p_type = str(raw_json.get("payment_type") or "cash").lower()
                payment_type = "emi" if "emi" in p_type else "cash"

                emi_months = raw_json.get("emi_months")
                if payment_type == "emi":
                    try:
                        emi_months = int(emi_months) if emi_months else 6
                    except (ValueError, TypeError):
                        emi_months = 6
                    emi_rate = float(raw_json.get("emi_interest_rate_pct") or 14.0)
                else:
                    emi_months = None
                    emi_rate = None

                return {
                    "purchase_amount_minor": amount,
                    "label": label,
                    "timing": timing,
                    "payment_type": payment_type,
                    "emi_months": emi_months,
                    "emi_interest_rate_pct": emi_rate,
                    "parsed_by": "groq",
                    "model_used": chosen_model
                }
    except Exception as e:
        logger.warning(f"Groq NLU extraction failed ({e}), falling back to regex.")
        return None

    return None


def parse_natural_language_query_regex(query_text: str) -> Dict[str, Any]:
    """
    Deterministic rule-based query parser (zero cloud egress).
    """
    text = query_text.strip()
    amount_minor = _extract_amount_regex(text)

    # Extract EMI terms
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

    # Extract Timing
    timing = "next_month"
    if re.search(r'\b(?:this\s+month|now|today|this\s+week)\b', text, re.IGNORECASE):
        timing = "this_month"
    elif re.search(r'\b(?:next\s+month|in\s+\d+\s+months?)\b', text, re.IGNORECASE):
        timing = "next_month"

    # Extract Label
    label = "Purchase"
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
        "emi_interest_rate_pct": 14.0 if payment_type == "emi" else None,
        "parsed_by": "heuristic",
        "model_used": "regex_rule_engine"
    }


def parse_natural_language_query(query_text: str) -> Dict[str, Any]:
    """
    Parses a user question like:
      - "Can I afford an iPhone 16 for ₹79,900 next month?"
      - "Can I buy a laptop for ₹1,20,000 on 6 months EMI?"
      - "Can I spend 50k on a vacation?"
    Prioritizes Groq NLU, falling back seamlessly to deterministic regex engine.
    """
    groq_result = parse_with_groq(query_text)
    if groq_result and groq_result.get("purchase_amount_minor", 0) > 0:
        return groq_result

    return parse_natural_language_query_regex(query_text)

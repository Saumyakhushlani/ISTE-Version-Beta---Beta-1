"""
Goal Parser for Financial Decision Lab (FDL).
Parses user's natural language goal input (e.g. "a bike of 55k", "save 2 lakh for emergency fund")
into a strict structured JSON schema via Google Gemini REST API, with robust deterministic fallback.
"""

import os
import re
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-1.5-flash"


def parse_inr_amount_to_minor(text: str) -> Optional[int]:
    """
    Parses natural language Indian monetary expressions into integer paise.
    e.g.
      '55k' -> 5,500,000 paise (₹55,000)
      '1.2 lakh' -> 12,000,000 paise (₹1,20,000)
      '₹85,000' -> 8,500,000 paise (₹85,000)
    """
    cleaned = text.lower().replace(",", "").strip()

    # 1. Lakhs: e.g. "1.5 lakh", "2lacs", "1.25 l"
    lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|\bl\b)", cleaned)
    if lakh_match:
        try:
            val = float(lakh_match.group(1))
            return int(round(val * 100_000 * 100))
        except (ValueError, TypeError):
            pass

    # 2. Crores: e.g. "1.2 crore", "1 cr"
    cr_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:crores?|\bcr\b)", cleaned)
    if cr_match:
        try:
            val = float(cr_match.group(1))
            return int(round(val * 10_000_000 * 100))
        except (ValueError, TypeError):
            pass

    # 3. 'k' suffix: e.g. "55k", "75 k"
    k_match = re.search(r"(\d+(?:\.\d+)?)\s*k\b", cleaned)
    if k_match:
        try:
            val = float(k_match.group(1))
            return int(round(val * 1_000 * 100))
        except (ValueError, TypeError):
            pass

    # 4. Standard currency: e.g. "₹55,000", "rs 55000", "55000 inr"
    curr_match = re.search(r"(?:₹|rs\.?|inr)?\s*(\d{3,9})(?:\s*(?:rs|inr|rupees))?", cleaned)
    if curr_match:
        try:
            val = int(curr_match.group(1))
            return val * 100
        except (ValueError, TypeError):
            pass

    return None


def detect_goal_category(text: str) -> str:
    """
    Infers goal category from keyword clues.
    """
    low = text.lower()
    if re.search(r"\b(bike|motorcycle|scooter|bullet|car|activa|vehicle|auto|cycle|bicycle)\b", low):
        return "vehicle"
    if re.search(r"\b(laptop|macbook|iphone|phone|ipad|tablet|camera|ps5|playstation|xbox|tv|gadget|watch)\b", low):
        return "gadget"
    if re.search(r"\b(trip|travel|vacation|tour|flight|holiday|goa|japan|europe|bali|dubai|kashmir)\b", low):
        return "travel"
    if re.search(r"\b(emergency|buffer|cushion|rainy day|safety net|security)\b", low):
        return "emergency_fund"
    if re.search(r"\b(house|flat|apartment|home|downpayment|property|land|renovation)\b", low):
        return "house"
    if re.search(r"\b(education|course|mba|degree|college|school|tuition|upskill)\b", low):
        return "education"
    if re.search(r"\b(wedding|marriage|ring|jewellery|gold|watch)\b", low):
        return "lifestyle"
    return "lifestyle"


def extract_goal_title(prompt: str) -> str:
    """
    Extracts a clean, human-readable goal title from input prompt.
    e.g. "a bike of 55k" -> "Bike"
         "save for goa trip 35000" -> "Goa Trip"
         "buy a MacBook Air 1.2L" -> "MacBook Air"
    """
    # Remove filler starter phrases
    cleaned = re.sub(
        r"^(i want to|want to|save for|saving for|buy|purchase|planning for|plan to buy|a|an)\s+",
        "",
        prompt.strip(),
        flags=re.IGNORECASE
    ).strip()

    # Strip trailing amount and connective words
    cleaned = re.sub(r"\b(?:of|for|worth|costing|around|approx|by|in)\s+.*$", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*(?:k|lakhs?|lacs?|crores?|cr|rupees)?.*$", "", cleaned, flags=re.IGNORECASE).strip()

    # Title-case clean output
    title = cleaned.strip(" -:,.")
    if not title:
        return "Financial Goal"
    return title.title()


def parse_goal_prompt_fallback(prompt: str) -> Dict[str, Any]:
    """
    Deterministic rule-based fallback parser.
    """
    amount_minor = parse_inr_amount_to_minor(prompt)
    if not amount_minor or amount_minor <= 0:
        # Default fallback reasonable target
        amount_minor = 5_000_000  # ₹50,000

    title = extract_goal_title(prompt)
    category = detect_goal_category(prompt)

    # Detect optional target date if specified (YYYY-MM-DD or year/month)
    date_match = re.search(r"\b(202[5-9]-\d{2}-\d{2})\b", prompt)
    target_date = date_match.group(1) if date_match else None

    return {
        "title": title,
        "target_amount_minor": amount_minor,
        "category": category,
        "target_date": target_date,
        "priority": 1,
        "notes": f"Created via quick goal setup: '{prompt}'"
    }


def parse_goal_prompt_gemini(prompt: str) -> Optional[Dict[str, Any]]:
    """
    Calls Google Gemini REST API to extract structured goal JSON.
    """
    api_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not api_key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"

    system_instruction = (
        "You are a financial goal extractor for an Indian personal finance app. "
        "Extract the user's intended goal into a STRICT JSON object with no markdown fences, no explanation.\n"
        "Schema:\n"
        "{\n"
        '  "title": string (clean title, e.g. "Bike", "MacBook Air", "Goa Vacation"),\n'
        '  "target_amount_rs": integer in Rupees (e.g. 55000 for 55k, 120000 for 1.2 lakh),\n'
        '  "category": string (one of: "vehicle", "gadget", "travel", "emergency_fund", "house", "education", "lifestyle", "other"),\n'
        '  "target_date": string or null (ISO YYYY-MM-DD if user specified a timing, else null),\n'
        '  "priority": integer (1 to 5, default 1)\n'
        "}\n"
        "CRITICAL: If the user writes '55k', that is 55000. '1.5 lakh' is 150000. '2 cr' is 20000000."
    )

    req_body = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 300,
            "responseMimeType": "application/json"
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(req_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=7) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        raw_text = parts[0].get("text", "").strip()
                        parsed = json.loads(raw_text)

                        rs = int(parsed.get("target_amount_rs", 0))
                        if rs <= 0:
                            # Try parsing from prompt
                            parsed_paise = parse_inr_amount_to_minor(prompt) or 5_000_000
                        else:
                            parsed_paise = rs * 100

                        return {
                            "title": parsed.get("title", extract_goal_title(prompt)),
                            "target_amount_minor": parsed_paise,
                            "category": parsed.get("category", detect_goal_category(prompt)),
                            "target_date": parsed.get("target_date"),
                            "priority": int(parsed.get("priority", 1)),
                            "notes": f"Parsed via Gemini from: '{prompt}'"
                        }
    except Exception as e:
        logger.warning(f"Gemini goal parser failed: {e}. Falling back to deterministic parser.")

    return None


def parse_goal_prompt(prompt: str) -> Dict[str, Any]:
    """
    Main goal parsing entry point. Tries Gemini, then falls back to deterministic parsing.
    Guarantees valid structured goal dict with integer paise.
    """
    if not prompt or not prompt.strip():
        return {
            "title": "New Goal",
            "target_amount_minor": 5_000_000,
            "category": "lifestyle",
            "target_date": None,
            "priority": 1,
            "notes": None
        }

    gemini_result = parse_goal_prompt_gemini(prompt.strip())
    if gemini_result:
        return gemini_result

    return parse_goal_prompt_fallback(prompt.strip())

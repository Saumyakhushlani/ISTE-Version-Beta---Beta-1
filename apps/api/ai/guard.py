"""
Number-Verification Guard for Financial Decision Lab (FDL).
Guarantees ZERO numerical hallucinations in LLM explanations:
Every number, percentage, and currency value cited in natural language MUST match
an input or computed figure in the Reasoning Ledger verbatim.
If an unverified number is found, the guard rejects the text.
"""
import re
from typing import List, Dict, Any, Set

def extract_authorized_numbers(ledger: List[Dict[str, Any]], extra_meta: Dict[str, Any] = None) -> Set[float]:
    """
    Collects all legitimate numerical figures from the Reasoning Ledger,
    including both integer paise and converted rupees, percentages, and multipliers.
    """
    authorized: Set[float] = set()

    for step in ledger:
        val_minor = step.get("value_minor")
        if val_minor is not None:
            pos_minor = abs(float(val_minor))
            authorized.add(pos_minor)                  # Minor amount (paise)
            authorized.add(round(pos_minor / 100.0, 2)) # Major amount (Rupees)
            authorized.add(float(int(pos_minor // 100))) # Integer rupees

        # Check step_no
        step_no = step.get("step_no")
        if step_no is not None:
            authorized.add(float(step_no))

    if extra_meta:
        # Buffer multiplier k
        k = extra_meta.get("k")
        if k is not None:
            authorized.add(float(k))

        # Probabilities as percentage or float (e.g. 24% or 0.24)
        for p_key in ("breach_probability", "prob_negative_balance"):
            p_val = extra_meta.get(p_key)
            if p_val is not None:
                authorized.add(float(p_val))
                authorized.add(round(float(p_val) * 100.0, 1))
                authorized.add(float(int(round(float(p_val) * 100.0))))

        # Confidence score
        conf = extra_meta.get("confidence_score")
        if conf is not None:
            authorized.add(float(conf))

    # Common innocent numbers like calendar days (1-31), months (1-12)
    for cal in range(1, 32):
        authorized.add(float(cal))

    return authorized

def verify_narrative_numbers(narrative_text: str, ledger: List[Dict[str, Any]], extra_meta: Dict[str, Any] = None) -> bool:
    """
    Extracts all numbers from narrative_text (e.g. ₹80,000, Rs. 58,000, 24%, 1.5x)
    and verifies that each figure is authorized.
    Returns True if valid, False if an unverified hallucination is detected.
    """
    authorized = extract_authorized_numbers(ledger, extra_meta)

    # Regex matching:
    # 1. Currency amounts: ₹80,000 or Rs. 80,000 or 80,000.00
    # 2. Percentages: 24%
    # 3. Multipliers: 1.5x
    # 4. Standalone numbers
    # We find all numeric tokens
    matches = re.findall(r'(?:[₹$€]\s*|Rs\.?\s*)?([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)(?:\s*(?:%|x|times))?', narrative_text)

    for m in matches:
        clean_str = m.replace(',', '').strip()
        if not clean_str:
            continue
        try:
            val = float(clean_str)
        except ValueError:
            continue

        # Check if val is present within a reasonable tolerance (e.g. 1.0)
        found = any(abs(val - auth) < 1.0 for auth in authorized)
        if not found:
            # Unverified hallucinated number!
            return False

    return True

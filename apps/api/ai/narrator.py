"""
Narrator for Financial Decision Lab (FDL).
Translates structured Reasoning Ledger into plain, comforting English narration.
Guarded by Number-Verification Guard to prevent hallucination.
"""
from typing import Dict, Any, List, Optional
from ai.guard import verify_narrative_numbers

def build_deterministic_narrative(decision: Dict[str, Any]) -> str:
    """
    Template-based, 100% deterministic explanation that references only exact numbers.
    """
    verdict = decision.get("verdict", {})
    code = verdict.get("code", "UNKNOWN")
    headroom = decision.get("headroom", {})
    buffer = decision.get("buffer", {})
    lowest = decision.get("lowest_balance", {})

    p50_headroom_rs = (headroom.get("p50_minor", 0)) // 100
    p10_headroom_rs = (headroom.get("p10_minor", 0)) // 100
    buffer_rs = (buffer.get("value_minor", 0)) // 100
    lowest_rs = (lowest.get("p50_minor", 0)) // 100
    lowest_date = lowest.get("date", "mid-month")

    if code == "AFFORDABLE":
        return (
            f"Verdict: Affordable. Under median conditions, your balance will remain safe with "
            f"₹{p50_headroom_rs:,} in headroom above your required safety buffer of ₹{buffer_rs:,}. "
            f"Even under conservative conditions, you preserve ₹{p10_headroom_rs:,} cushion. "
            f"Your projected lowest balance will be ₹{lowest_rs:,} around {lowest_date}."
        )
    elif code == "TIGHT":
        return (
            f"Verdict: Tight. You can afford this under normal median expectations with ₹{p50_headroom_rs:,} "
            f"remaining above your emergency buffer of ₹{buffer_rs:,}. "
            f"However, in conservative conditions, your headroom drops to ₹{p10_headroom_rs:,}. "
            f"Your balance reaches its lowest point of ₹{lowest_rs:,} around {lowest_date}."
        )
    elif code == "NOT_ADVISABLE":
        deficit_rs = abs(p50_headroom_rs)
        return (
            f"Verdict: Not Advisable. While your account will not go negative (lowest projected balance is ₹{lowest_rs:,} around {lowest_date}), "
            f"this purchase will breach your safety buffer of ₹{buffer_rs:,} by ₹{deficit_rs:,}, "
            f"leaving you exposed to emergencies."
        )
    elif code == "NOT_AFFORDABLE":
        return (
            f"Verdict: Not Affordable. Making this purchase risks overdraft or negative balance. "
            f"Your projected lowest balance dips below zero to ₹{lowest_rs:,} around {lowest_date}."
        )
    elif code == "INSUFFICIENT_DATA":
        return (
            "Verdict: Insufficient Data. We cannot provide a verified decision because your uploaded statements "
            "do not contain enough continuous history or income credits."
        )
    else:
        return verdict.get("headline", "Decision evaluated.")

def generate_guarded_narration(decision: Dict[str, Any], candidate_llm_text: Optional[str] = None) -> str:
    """
    If candidate_llm_text is provided, verifies all numbers against the ledger.
    If valid, returns the LLM text; otherwise falls back to deterministic template.
    If candidate_llm_text is None, tries to query local Ollama / Gemini and verifies output.
    """
    ledger = decision.get("ledger", [])
    extra_meta = {
        "k": decision.get("buffer", {}).get("k"),
        "breach_probability": decision.get("verdict", {}).get("breach_probability"),
        "prob_negative_balance": decision.get("verdict", {}).get("prob_negative_balance"),
        "confidence_score": decision.get("verdict", {}).get("confidence", {}).get("score")
    }

    if candidate_llm_text:
        is_safe = verify_narrative_numbers(candidate_llm_text, ledger, extra_meta)
        if is_safe:
            return candidate_llm_text
    else:
        # Attempt LLM generation
        try:
            from ai.llm_client import generate_guarded_llm_narration
            llm_text = generate_guarded_llm_narration(decision)
            if llm_text:
                return llm_text
        except Exception:
            pass

    # Safe deterministic fallback
    return build_deterministic_narrative(decision)

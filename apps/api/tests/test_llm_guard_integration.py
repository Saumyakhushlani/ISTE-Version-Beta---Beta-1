"""
Unit tests for Live LLM Integration & Number Guard:
  1. Verifies prompt generation from Reasoning Ledger facts.
  2. Verifies that LLM text containing unverified numbers is rejected.
  3. Verifies that offline/unreachable LLM falls back to deterministic template.
"""
from ai.llm_client import build_prompt_from_decision
from ai.narrator import generate_guarded_narration

def test_prompt_generation_and_fallback():
    decision = {
        "verdict": {"code": "AFFORDABLE", "breach_probability": 0.05, "confidence": {"score": 90}},
        "headroom": {"p10_minor": 4_000_000, "p50_minor": 7_000_000, "p90_minor": 10_000_000},
        "buffer": {"value_minor": 3_500_000, "reason": "1.0x monthly essentials", "k": 1.0},
        "lowest_balance": {"p50_minor": 10_500_000, "date": "2026-11-28"},
        "ledger": [
            {"step_no": 1, "value_minor": 15_000_000},
            {"step_no": 5, "value_minor": 3_500_000},
            {"step_no": 8, "value_minor": 7_000_000}
        ]
    }

    # 1. Build prompt
    prompt = build_prompt_from_decision(decision)
    assert "AFFORDABLE" in prompt
    assert "₹70,000" in prompt
    assert "₹35,000" in prompt

    # 2. Test candidate with legitimate numbers
    legit_text = "You can afford this easily! You preserve ₹70,000 in headroom above your ₹35,000 buffer."
    narration_valid = generate_guarded_narration(decision, candidate_llm_text=legit_text)
    assert narration_valid == legit_text

    # 3. Test candidate with hallucinated numbers (e.g. ₹99,999)
    hallucinated_text = "Good news! You have ₹99,999 extra cash lying around."
    narration_fallback = generate_guarded_narration(decision, candidate_llm_text=hallucinated_text)
    # Must reject and return deterministic fallback!
    assert "Verdict: Affordable" in narration_fallback
    assert "99,999" not in narration_fallback

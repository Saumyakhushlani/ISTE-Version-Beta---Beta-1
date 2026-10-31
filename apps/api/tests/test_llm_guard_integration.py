"""
Unit tests for Live LLM Integration & Number Guard:
  1. Verifies prompt generation from Reasoning Ledger facts.
  2. Verifies that LLM text containing unverified numbers is rejected.
  3. Verifies that offline/unreachable LLM falls back to deterministic template.
  4. Verifies prompt generation and number guard for Multi-Bank Liquidity Advice.
"""
from ai.llm_client import build_prompt_from_decision, build_prompt_from_liquidity_plan
from ai.narrator import generate_guarded_narration, generate_guarded_liquidity_narration

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


def test_liquidity_prompt_generation_and_guard():
    plan = {
        "feasible": True,
        "target_amount_paise": 15000000,
        "combined_liquid_paise": 25000000,
        "total_safe_surplus_paise": 18000000,
        "advice_text": "Use HDFC Bank as primary account. Transfer ₹50,000 from SBI.",
        "accounts_surplus_breakdown": [
            {
                "bank": "HDFC Bank",
                "masked_last4": "5521",
                "current_balance_paise": 15000000,
                "upcoming_commitments_paise": 4500000,
                "safety_buffer_paise": 500000,
                "available_surplus_paise": 10000000
            },
            {
                "bank": "State Bank of India",
                "masked_last4": "1192",
                "current_balance_paise": 10000000,
                "upcoming_commitments_paise": 1500000,
                "safety_buffer_paise": 500000,
                "available_surplus_paise": 8000000
            }
        ],
        "allocation": [
            {"bank": "HDFC Bank", "amount_paise": 10000000},
            {"bank": "State Bank of India", "amount_paise": 5000000}
        ],
        "transfers_plan": [
            {
                "from_bank": "State Bank of India",
                "from_masked": "1192",
                "to_bank": "HDFC Bank",
                "to_masked": "5521",
                "transfer_amount_paise": 5000000
            }
        ]
    }

    # 1. Prompt includes facts
    prompt = build_prompt_from_liquidity_plan(plan)
    assert "₹150,000" in prompt
    assert "HDFC Bank" in prompt
    assert "State Bank of India" in prompt

    # 2. Legitimate candidate narrative accepted
    legit_narration = "You can fund this ₹150,000 deployment smoothly: use HDFC Bank as your primary account and transfer ₹50,000 from State Bank of India."
    res_valid = generate_guarded_liquidity_narration(plan, candidate_llm_text=legit_narration)
    assert res_valid == legit_narration

    # 3. Hallucinated numbers rejected, fallback preserved
    hallucinated_narration = "You have ₹888,888 in secret cash, so take ₹77,777 from ICICI."
    res_fallback = generate_guarded_liquidity_narration(plan, candidate_llm_text=hallucinated_narration)
    assert res_fallback == plan["advice_text"]
    assert "888,888" not in res_fallback

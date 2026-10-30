"""
Test Suite for Core Affordability Decision Engine & What-If Simulations:
  1. Dynamic Safety Buffer (Income Volatility & k multiplier)
  2. Monte Carlo 5,000 runs reproducibility (seed=42)
  3. EMI Amortization Math (Paise precision)
  4. Decision Verdict Classification (AFFORDABLE, TIGHT, NOT_AFFORDABLE, INSUFFICIENT_DATA)
  5. Number-Verification Guard (Rejecting Hallucinations)
  6. Natural Language Extractor
  7. Live FastAPI Endpoints (/api/affordability & /api/scenarios/compare)
"""
import os
import pytest
from fastapi.testclient import TestClient
from main import app
from engine.buffer import compute_safety_buffer, compute_income_volatility, calculate_monthly_essentials
from engine.forecast import run_monte_carlo_forecast
from engine.affordability import calculate_emi_paise, evaluate_affordability_decision
from ai.guard import verify_narrative_numbers
from ai.extractor import parse_natural_language_query

client = TestClient(app)
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
SYNTHETIC_DIR = os.path.abspath(os.path.join(TEST_DIR, "..", "..", "..", "data", "synthetic"))

def test_income_volatility_and_buffer_multiplier():
    # Stable salary: ₹80,000 every month (CV ~ 0)
    stable_income = [
        {"amount_minor": 8_000_000},
        {"amount_minor": 8_000_000},
        {"amount_minor": 8_000_000},
        {"amount_minor": 8_000_000}
    ]
    vol_stable = compute_income_volatility(stable_income)
    assert vol_stable["k"] == 1.0
    assert "Stable" in vol_stable["profile"]

    # Variable freelancer income: ₹40k, ₹90k, ₹30k, ₹85k (CV > 0.3)
    volatile_income = [
        {"amount_minor": 4_000_000},
        {"amount_minor": 9_000_000},
        {"amount_minor": 3_000_000},
        {"amount_minor": 8_500_000}
    ]
    vol_variable = compute_income_volatility(volatile_income)
    assert vol_variable["k"] >= 1.5
    assert "Volatile" in vol_variable["profile"]

def test_emi_amortization_paise():
    # ₹1,20,000 loan for 12 months at 14% p.a.
    principal_paise = 120_000_00  # 12,000,000 paise
    emi_calc = calculate_emi_paise(principal_paise, annual_interest_rate_pct=14.0, tenure_months=12)
    
    # Standard formula P * r * (1+r)^n / ((1+r)^n - 1) gives ~₹10,774 / mo
    assert 1070000 <= emi_calc["monthly_emi_paise"] <= 1080000
    assert emi_calc["total_interest_paise"] > 0
    assert emi_calc["total_payment_paise"] == principal_paise + emi_calc["total_interest_paise"]
    assert len(emi_calc["amortization_schedule"]) == 12

def test_monte_carlo_reproducibility():
    # Deterministic seed test
    daily_spend = [150_000, 220_000, 95_000, 310_000, 40_000] * 6  # 30 days
    
    sim1 = run_monte_carlo_forecast(daily_spend, horizon_days=30, n_simulations=5000, seed=42)
    sim2 = run_monte_carlo_forecast(daily_spend, horizon_days=30, n_simulations=5000, seed=42)

    assert sim1["p10_cumulative_minor"] == sim2["p10_cumulative_minor"]
    assert sim1["p50_cumulative_minor"] == sim2["p50_cumulative_minor"]
    assert sim1["p90_cumulative_minor"] == sim2["p90_cumulative_minor"]
    assert sim1["p10_cumulative_minor"] <= sim1["p50_cumulative_minor"] <= sim1["p90_cumulative_minor"]

def test_number_verification_guard_prevents_hallucination():
    allowed_numbers = [
        "12500000", "125000", "1,25,000",   # Starting balance
        "8000000", "80000", "80,000",       # Salary / Purchase
        "2000000", "20000", "20,000",       # Rent
        "5800000", "58000", "58,000",       # Buffer
        "4200000", "42000", "42,000",       # Headroom
    ]

    # Valid narration citing known numbers
    valid_text = (
        "Based on your starting balance of ₹1,25,000 and expected salary of ₹80,000, "
        "your projected headroom after this ₹80,000 purchase is ₹42,000 above the ₹58,000 buffer."
    )
    res_valid = verify_narrative_numbers(valid_text, allowed_numbers)
    assert res_valid["passed"] is True
    assert len(res_valid["unverified_numbers"]) == 0

    # Hallucinated narration mentioning random uncomputed ₹99,999
    invalid_text = (
        "You can afford this easily! You will still have ₹99,999 left over after the purchase."
    )
    res_invalid = verify_narrative_numbers(invalid_text, allowed_numbers)
    assert res_invalid["passed"] is False
    assert any("99" in n for n in res_invalid["unverified_numbers"])

def test_natural_language_extractor():
    # Prompt: "Can I afford an iPhone for ₹80,000 next month?"
    q1 = parse_natural_language_query("Can I afford an iPhone for ₹80,000 next month?")
    assert q1["purchase_amount_minor"] == 8000000
    assert q1["timing"] == "next_month"
    assert q1["payment_type"] == "cash"
    assert "iphone" in q1["label"].lower()

    # Prompt: "Can I buy a Sony TV for 45000 on 6 months EMI at 12%?"
    q2 = parse_natural_language_query("Can I buy a Sony TV for 45000 on 6 months EMI at 12%?")
    assert q2["purchase_amount_minor"] == 4500000
    assert q2["payment_type"] == "emi"
    assert q2["emi_months"] == 6
    assert q2["emi_interest_rate_pct"] == 12.0

def test_affordability_verdict_transitions():
    # Prepare dummy ledger data
    txns = [
        {"posted_date": "2025-01-05", "amount_minor": 8_000_000, "category_id": "cat_salary", "is_transfer": False},
        {"posted_date": "2025-01-10", "amount_minor": -2_000_000, "category_id": "cat_rent", "is_transfer": False},
        {"posted_date": "2025-01-15", "amount_minor": -1_500_000, "category_id": "cat_emi", "is_transfer": False},
        {"posted_date": "2025-01-20", "amount_minor": -500_000, "category_id": "cat_groceries", "is_transfer": False},
        {"posted_date": "2025-02-05", "amount_minor": 8_000_000, "category_id": "cat_salary", "is_transfer": False},
        {"posted_date": "2025-02-10", "amount_minor": -2_000_000, "category_id": "cat_rent", "is_transfer": False},
        {"posted_date": "2025-02-15", "amount_minor": -1_500_000, "category_id": "cat_emi", "is_transfer": False},
        {"posted_date": "2025-02-20", "amount_minor": -600_000, "category_id": "cat_groceries", "is_transfer": False},
        {"posted_date": "2025-03-05", "amount_minor": 8_000_000, "category_id": "cat_salary", "is_transfer": False},
        {"posted_date": "2025-03-10", "amount_minor": -2_000_000, "category_id": "cat_rent", "is_transfer": False},
        {"posted_date": "2025-03-15", "amount_minor": -1_500_000, "category_id": "cat_emi", "is_transfer": False},
    ]
    recurring = [
        {"merchant": "Tech Solutions", "type": "salary", "typical_amount_minor": 8_000_000},
        {"merchant": "Landlord", "type": "rent", "typical_amount_minor": 2_000_000},
        {"merchant": "HDFC Home Loan", "type": "emi", "typical_amount_minor": 1_500_000},
    ]
    balances = {"HDFC Bank": 12_000_000}  # ₹1,20,000

    # 1. Comfortable purchase: ₹30,000
    dec_aff = evaluate_affordability_decision(txns, recurring, balances, purchase_amount_paise=3_000_000)
    assert dec_aff["verdict"]["code"] == "AFFORDABLE"
    assert len(dec_aff["ledger"]) == 8

    # 2. Huge impossible purchase: ₹25,00,000 (exceeds balance + income)
    dec_unaff = evaluate_affordability_decision(txns, recurring, balances, purchase_amount_paise=250_000_000)
    assert dec_unaff["verdict"]["code"] in ("NOT_AFFORDABLE", "NOT_ADVISABLE")

def test_api_affordability_and_whatif_endpoints():
    # Preview and commit synthetic statement to have database state
    csv_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(csv_path, "rb") as f:
        prev_resp = client.post("/api/imports/preview", files={"file": ("hdfc.csv", f, "text/csv")})
    assert prev_resp.status_code == 200
    file_id = prev_resp.json()["file_id"]

    commit_resp = client.post("/api/imports/commit", data={"file_id": file_id})
    assert commit_resp.status_code == 200

    # Test /api/affordability endpoint
    aff_resp = client.post(
        "/api/affordability",
        json={
            "purchase_amount_minor": 5_000_000,  # ₹50,000
            "label": "PlayStation 5",
            "timing": "next_month",
            "payment_type": "cash"
        }
    )
    assert aff_resp.status_code == 200
    data = aff_resp.json()
    assert "verdict" in data
    assert "headroom" in data
    assert "ledger" in data
    assert "narration" in data
    assert len(data["ledger"]) == 8

    # Test /api/affordability/ask natural language
    ask_resp = client.post(
        "/api/affordability/ask",
        json={"question": "Can I buy a TV for ₹40,000 next month?"}
    )
    assert ask_resp.status_code == 200
    ask_data = ask_resp.json()
    assert ask_data["parsed_query"]["purchase_amount_minor"] == 4000000

    # Test /api/scenarios/compare endpoint
    whatif_resp = client.post(
        "/api/scenarios/compare",
        json={
            "purchase_amount_minor": 8_000_000,  # ₹80,000
            "scenarios": [
                {
                    "name": "6-Month EMI",
                    "adjustments": [{"type": "purchase_emi", "params": {"months": 6, "interest_pct": 0.0}}]
                },
                {
                    "name": "Delay by 2 Months",
                    "adjustments": [{"type": "delay_purchase", "params": {"months": 2}}]
                }
            ]
        }
    )
    assert whatif_resp.status_code == 200
    whatif_data = whatif_resp.json()
    assert "baseline" in whatif_data
    assert len(whatif_data["scenarios"]) == 2
    emi_sc = whatif_data["scenarios"][0]
    assert emi_sc["lowest_balance_paise"] > whatif_data["baseline"]["lowest_balance_paise"]

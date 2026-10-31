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
    vol_volatile = compute_income_volatility(volatile_income)
    assert vol_volatile["k"] == 2.0
    assert "Irregular" in vol_volatile["profile"] or "Variable" in vol_volatile["profile"]

def test_emi_amortization_paise():
    # ₹60,000 on 6-month no-cost EMI -> exactly ₹10,000/mo (1,000,000 paise)
    emi_zero = calculate_emi_paise(principal_paise=6_000_000, tenure_months=6, annual_interest_pct=0.0)
    assert emi_zero == 1_000_000

    # ₹1,00,000 at 12% annual interest for 12 months
    # Standard formula: ~ ₹8,885 / mo (888,488 paise)
    emi_interest = calculate_emi_paise(principal_paise=10_000_000, tenure_months=12, annual_interest_pct=12.0)
    assert 880_000 <= emi_interest <= 895_000

def test_monte_carlo_reproducibility():
    starting_bal = 10_000_000  # ₹100,000
    recurring = [
        {"type": "salary", "typical_amount_minor": 8_000_000, "next_expected_date": "2026-11-01", "cadence": "monthly"},
        {"type": "rent", "typical_amount_minor": 2_500_000, "next_expected_date": "2026-11-05", "cadence": "monthly"}
    ]
    txns = [{"posted_date": "2026-10-15", "amount_minor": -150_000, "category_id": "cat_food_dining", "is_transfer": False}]

    run1 = run_monte_carlo_forecast(starting_bal, recurring, txns, horizon_days=30, n_runs=1000, seed=42)
    run2 = run_monte_carlo_forecast(starting_bal, recurring, txns, horizon_days=30, n_runs=1000, seed=42)

    assert run1["lowest_balance"]["p50_minor"] == run2["lowest_balance"]["p50_minor"]
    assert run1["lowest_balance"]["p10_minor"] == run2["lowest_balance"]["p10_minor"]
    assert run1["breach_probability"] == run2["breach_probability"]

def test_number_verification_guard_prevents_hallucination():
    ledger = [
        {"step_no": 1, "value_minor": 10_000_000},  # ₹100,000
        {"step_no": 2, "value_minor": 8_000_000},   # ₹80,000
        {"step_no": 5, "value_minor": 4_000_000},   # ₹40,000
        {"step_no": 6, "value_minor": -3_000_000},  # ₹30,000
    ]
    extra_meta = {"k": 1.0, "breach_probability": 0.05}

    # Legitimate narration citing valid figures: ₹80,000 salary, ₹40,000 buffer, ₹30,000 purchase
    valid_text = "Your salary of ₹80,000 supports the ₹30,000 purchase while preserving your ₹40,000 buffer."
    assert verify_narrative_numbers(valid_text, ledger, extra_meta) is True

    # Hallucinated narration citing numbers never in ledger (e.g. ₹99,999 or ₹1,50,000)
    fake_text = "You can easily buy this because you will receive ₹1,50,000 next week with ₹99,999 spare cash."
    assert verify_narrative_numbers(fake_text, ledger, extra_meta) is False

def test_natural_language_extractor():
    q1 = "Can I afford an iPhone 16 for ₹79,900 next month?"
    p1 = parse_natural_language_query(q1)
    assert p1["purchase_amount_minor"] == 7990000
    assert "Iphone" in p1["label"]
    assert p1["timing"] == "next_month"
    assert p1["payment_type"] == "cash"

    q2 = "Can I buy a laptop for 1.2 lakh on 6 months EMI?"
    p2 = parse_natural_language_query(q2)
    assert p2["purchase_amount_minor"] == 12000000
    assert p2["payment_type"] == "emi"
    assert p2["emi_months"] == 6

def test_affordability_verdict_transitions():
    from datetime import datetime, timedelta

    base_date = datetime(2026, 7, 1)
    txns = []
    # 4 salary credits
    for i, m_day in enumerate([1, 32, 63, 94]):
        dt = (base_date + timedelta(days=m_day)).strftime("%Y-%m-%d")
        txns.append({
            "id": f"sal_{i}",
            "posted_date": dt,
            "amount_minor": 8_000_000,
            "category_id": "cat_income_salary",
            "is_transfer": False
        })
    # Regular daily food spend
    for d in range(100):
        dt = (base_date + timedelta(days=d)).strftime("%Y-%m-%d")
        txns.append({
            "id": f"food_{d}",
            "posted_date": dt,
            "amount_minor": -100_000,
            "category_id": "cat_food_dining",
            "is_transfer": False
        })

    recurring = [
        {"type": "salary", "typical_amount_minor": 8_000_000, "next_expected_date": "2026-11-01", "cadence": "monthly"},
        {"type": "rent", "typical_amount_minor": 2_500_000, "next_expected_date": "2026-11-05", "cadence": "monthly"}
    ]
    balances = {"HDFC": 15_000_000}  # ₹150,000

    # 1. Affordable purchase: ₹10,000
    dec_aff = evaluate_affordability_decision(txns, recurring, balances, purchase_amount_paise=1_000_000)
    assert dec_aff["verdict"]["code"] == "AFFORDABLE"
    assert len(dec_aff["ledger"]) == 8

    # 2. Huge impossible purchase: ₹25,00,000 (exceeds balance + income)
    dec_unaff = evaluate_affordability_decision(txns, recurring, balances, purchase_amount_paise=250_000_000)
    assert dec_unaff["verdict"]["code"] in ("NOT_AFFORDABLE", "NOT_ADVISABLE")

def test_api_affordability_and_whatif_endpoints():
    # Preview and commit synthetic statement to have database state
    csv_path = "data/synthetic/aarav/hdfc_statement.csv"
    if not os.path.exists(csv_path):
        csv_path = os.path.join(os.path.dirname(__file__), "../../../data/synthetic/aarav/hdfc_statement.csv")
        if not os.path.exists(csv_path):
            csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/synthetic/aarav/hdfc_statement.csv"))

    with open(csv_path, "rb") as f:
        prev_resp = client.post("/api/imports/preview", files={"file": ("hdfc.csv", f, "text/csv")})
    assert prev_resp.status_code == 200
    file_id = prev_resp.json()["file_id"]

    commit_resp = client.post("/api/imports/commit", data={"file_id": file_id})
    assert commit_resp.status_code == 200

    from db.database import SessionLocal
    from db.models import Transaction
    _db = SessionLocal()
    _t = _db.query(Transaction).filter_by(status="active").first()
    active_sf_id = _t.source_file_id if _t else commit_resp.json().get("source_file_id")
    _db.close()

    # Test /api/affordability endpoint
    aff_resp = client.post(
        "/api/affordability",
        json={
            "purchase_amount_minor": 5_000_000,  # ₹50,000
            "label": "PlayStation 5",
            "timing": "next_month",
            "payment_type": "cash",
            "source_file_ids": [active_sf_id] if active_sf_id else None
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
            "source_file_ids": [active_sf_id] if active_sf_id else None,
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

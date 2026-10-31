"""
Advanced Tests for Decision Lab: Constructive Helper, What-If Overlays & NL Ask
"""

import os
import pytest
from fastapi.testclient import TestClient

from main import app
from engine.affordability import compute_constructive_helper, evaluate_affordability_decision
from auth import DEMO_USER_ID

client = TestClient(app)

def test_constructive_helper_calculations():
    """
    Verifies that compute_constructive_helper produces deterministic, accurate
    remedial numbers when a purchase is tight or breaches the safety buffer.
    """
    # Purchase of ₹80,000 (8,000,000 paise)
    # Headroom P10 is -₹15,000 (-1,500,000 paise)
    # Headroom P50 is -₹5,000 (-500,000 paise)
    # Monthly net savings = 7,800,000 (income) - 3,000,000 (committed) - 2,000,000 (var) = 2,800,000 paise (₹28,000)
    helper = compute_constructive_helper(
        purchase_amount_paise=8000000,
        actual_outflow_paise=8000000,
        headroom_p10=-1500000,
        headroom_p50=-500000,
        lowest_p50=4500000,
        buffer_paise=5000000,
        expected_income_paise=7800000,
        committed_outflows_paise=3000000,
        variable_spend_paise=2000000,
        current_payment_type="cash"
    )

    # Max affordable today (P50): -500,000 + 8,000,000 = 7,500,000 (₹75,000)
    assert helper["max_affordable_paise"] == 7500000
    # Shortfall to reach safe P10 headroom: 1,500,000 paise (₹15,000)
    assert helper["shortfall_paise"] == 1500000
    # Monthly net savings: ₹28,000
    assert helper["monthly_net_savings_paise"] == 2800000
    # Delay months: ceil(15,000 / 28,000) = 1 month
    assert helper["min_delay_months"] == 1
    # Recommended EMI: Available capacity is -1,500,000 + 8,000,000 = 6,500,000
    # A 3-month EMI (8,000,000 / 3 = 2,666,667) easily fits within 6,500,000!
    assert helper["recommended_emi_months"] == 3
    assert helper["recommended_monthly_emi_paise"] > 0
    # Suggested discretionary cut
    assert helper["suggested_monthly_cut_paise"] == 1500000

def test_api_whatif_advanced_scenarios(db_session):
    """
    Verifies /api/scenarios/compare with diverse adjustment types:
    - cancel_recurring
    - add_recurring
    - income_shock
    - expense_shock
    - delay_purchase
    """
    # Preview and commit statement
    csv_path = "data/synthetic/aarav/hdfc_statement.csv"
    if not os.path.exists(csv_path):
        csv_path = os.path.join(os.path.dirname(__file__), "../../../data/synthetic/aarav/hdfc_statement.csv")
        if not os.path.exists(csv_path):
            csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/synthetic/aarav/hdfc_statement.csv"))

    with open(csv_path, "rb") as f:
        prev = client.post("/api/imports/preview", files={"file": ("hdfc.csv", f, "text/csv")})
    assert prev.status_code == 200
    file_id = prev.json()["file_id"]
    client.post("/api/imports/commit", data={"file_id": file_id})

    # Test compare scenarios
    res = client.post(
        "/api/scenarios/compare",
        json={
            "purchase_amount_minor": 8000000,  # ₹80,000
            "scenarios": [
                {
                    "name": "Cancel Streaming Subs",
                    "adjustments": [{"type": "cancel_recurring", "params": {"merchant": "Netflix"}}]
                },
                {
                    "name": "Delay 2 Months",
                    "adjustments": [{"type": "delay_purchase", "params": {"months": 2}}]
                },
                {
                    "name": "Income Shock -20%",
                    "adjustments": [{"type": "income_shock", "params": {"reduction_pct": 20.0}}]
                },
                {
                    "name": "Cut Variable Expenses 30%",
                    "adjustments": [{"type": "expense_shock", "params": {"cut_pct": 30.0}}]
                }
            ]
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "baseline" in data
    assert len(data["scenarios"]) == 4

    # Delaying by 2 months should significantly increase lowest balance compared to baseline cash purchase
    delay_sc = next(s for s in data["scenarios"] if s["name"] == "Delay 2 Months")
    assert delay_sc["lowest_balance_paise"] >= data["baseline"]["lowest_balance_paise"]

    # Negative income shock should lower headroom compared to baseline
    shock_sc = next(s for s in data["scenarios"] if s["name"] == "Income Shock -20%")
    assert shock_sc["headroom_paise"] <= data["baseline"]["headroom_paise"]

def test_api_affordability_ask_endpoint():
    """
    Verifies that /api/affordability/ask parses natural language questions into parameters,
    computes the decision with constructive helper, and provides number-verified narration.
    """
    res = client.post(
        "/api/affordability/ask",
        json={"question": "Can I buy a laptop for ₹65,000 on 6 months EMI?"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "verdict" in data
    assert "headroom" in data
    assert "ledger" in data
    assert "constructive_helper" in data

    if data["verdict"]["code"] != "INSUFFICIENT_DATA":
        assert len(data["ledger"]) == 8
        assert data["constructive_helper"] is not None

    # Verify parsed query
    parsed = data["parsed_query"]
    assert parsed["purchase_amount_minor"] == 6500000
    assert parsed["payment_type"] == "emi"
    assert parsed["emi_months"] == 6

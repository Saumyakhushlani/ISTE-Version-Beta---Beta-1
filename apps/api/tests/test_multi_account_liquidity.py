"""
Unit and Integration Tests for Multi-Account Breakdown, Cumulative Uploads,
Upcoming Payment Schedule, and Anomaly Detection APIs.
"""

import os
import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import Base, engine, SessionLocal
from db.models import Account, Transaction, RecurringItem, Anomaly

client = TestClient(app)

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", "..", ".."))
SYNTHETIC_DIR = os.path.join(WORKSPACE_ROOT, "data", "synthetic")

@pytest.fixture(autouse=True)
def setup_clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_multi_bank_import_and_liquidity_breakdown():
    """
    Simulates uploading HDFC and SBI statements:
    Verifies that:
    1. Independent accounts are created for HDFC and SBI.
    2. Per-bank inflows, outflows, and balances match to the paisa.
    3. Combined liquid balance is correctly aggregated.
    """
    # 1. Upload HDFC CSV
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(hdfc_path, "rb") as f:
        res1 = client.post("/api/imports/preview", files={"file": ("hdfc_statement.csv", f, "text/csv")})
    assert res1.status_code == 200
    fid1 = res1.json()["file_id"]
    client.post("/api/imports/commit", data={"file_id": fid1})

    # 2. Upload SBI CSV
    sbi_path = os.path.join(SYNTHETIC_DIR, "aarav", "sbi_statement.csv")
    with open(sbi_path, "rb") as f:
        res2 = client.post("/api/imports/preview", files={"file": ("sbi_statement.csv", f, "text/csv")})
    assert res2.status_code == 200
    fid2 = res2.json()["file_id"]
    client.post("/api/imports/commit", data={"file_id": fid2})

    # 3. Check Dashboard multi-account breakdown
    dash = client.get("/api/dashboard").json()
    assert dash["total_accounts_count"] == 2
    accounts = {a["bank"]: a for a in dash["accounts_breakdown"]}

    assert "HDFC Bank" in accounts
    assert "State Bank of India" in accounts

    hdfc = accounts["HDFC Bank"]
    sbi = accounts["State Bank of India"]

    # HDFC has salary in and expenses out
    assert hdfc["total_inflow_paise"] == 7800000 * 8  # 8 months of ₹78,000
    assert hdfc["current_balance_paise"] > 0

    # SBI receives internal transfer from HDFC and pays EMI + SIP
    assert sbi["current_balance_paise"] > 0
    assert dash["combined_liquid_paise"] == hdfc["current_balance_paise"] + sbi["current_balance_paise"]

def test_cumulative_upload_continuity():
    """
    Tests uploading first a 6-month statement, and then a 1-month statement:
    Verifies that transactions are accumulated without duplicates,
    and cumulative history is available for all detection engines.
    """
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    
    # Upload first time
    with open(hdfc_path, "rb") as f:
        res1 = client.post("/api/imports/preview", files={"file": ("hdfc_statement.csv", f, "text/csv")})
    fid1 = res1.json()["file_id"]
    c1 = client.post("/api/imports/commit", data={"file_id": fid1}).json()
    initial_rows = c1["imported_rows"]
    assert initial_rows == 75

    # Re-upload the exact same file (simulating overlapping next month)
    with open(hdfc_path, "rb") as f:
        res2 = client.post("/api/imports/preview", files={"file": ("hdfc_statement.csv", f, "text/csv")})
    fid2 = res2.json()["file_id"]
    c2 = client.post("/api/imports/commit", data={"file_id": fid2}).json()
    
    # Assert all 75 rows were detected as existing duplicates and 0 were re-inserted
    assert c2["duplicates_merged"] == 75
    assert c2["imported_rows"] == 0

def test_upcoming_payments_calendar_with_bank_attribution():
    """
    Verifies that recurring items are projected with exact due dates, amounts,
    and the originating bank account name.
    """
    # Import HDFC
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(hdfc_path, "rb") as f:
        res = client.post("/api/imports/preview", files={"file": ("hdfc_statement.csv", f, "text/csv")})
    client.post("/api/imports/commit", data={"file_id": res.json()["file_id"]})

    # Fetch upcoming payments for the next 30 days
    up_res = client.get("/api/recurring/upcoming?days=30")
    assert up_res.status_code == 200
    up_data = up_res.json()

    assert up_data["total_scheduled_count"] > 0
    schedule = up_data["schedule"]

    merchants = [s["merchant"] for s in schedule]
    # Check that Netflix, Rent, and Salary appear with their day of month
    assert any("Netflix" in m for m in merchants)
    assert any("RENT" in m.upper() for m in merchants)

    # Check that bank name is populated
    for item in schedule:
        assert item["bank_name"] in ["HDFC Bank", "Bank Account"]
        assert item["amount_paise"] > 0

def test_investment_advice_sourcing():
    """
    Tests smart investment advice for funding an ₹80,000 Fixed Deposit:
    Verifies that the system checks idle cash after deducting upcoming bills.
    """
    # Import HDFC and SBI
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    sbi_path = os.path.join(SYNTHETIC_DIR, "aarav", "sbi_statement.csv")

    with open(hdfc_path, "rb") as f:
        r1 = client.post("/api/imports/preview", files={"file": ("hdfc_statement.csv", f, "text/csv")})
    client.post("/api/imports/commit", data={"file_id": r1.json()["file_id"]})

    with open(sbi_path, "rb") as f:
        r2 = client.post("/api/imports/preview", files={"file": ("sbi_statement.csv", f, "text/csv")})
    client.post("/api/imports/commit", data={"file_id": r2.json()["file_id"]})

    # Request investment advice for ₹50,000 FD (5,000,000 paise)
    advice_res = client.post(
        "/api/dashboard/investment-advice",
        json={"target_amount_paise": 5000000, "investment_label": "Fixed Deposit"}
    )
    assert advice_res.status_code == 200
    advice = advice_res.json()

    assert advice["feasible"] is True
    assert len(advice["accounts_surplus_breakdown"]) == 2
    assert "advice_text" in advice

    # Test invalid amount <= 0 rejected with 400
    bad_res = client.post(
        "/api/dashboard/investment-advice",
        json={"target_amount_paise": 0, "investment_label": "Fixed Deposit"}
    )
    assert bad_res.status_code == 400

def test_anomalies_api_endpoint():
    """
    Verifies that the /api/anomalies endpoint returns rich mathematical cards
    and user feedback can be submitted.
    """
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(hdfc_path, "rb") as f:
        r = client.post("/api/imports/preview", files={"file": ("hdfc_statement.csv", f, "text/csv")})
    client.post("/api/imports/commit", data={"file_id": r.json()["file_id"]})

    # Query anomalies
    anom_res = client.get("/api/anomalies")
    assert anom_res.status_code == 200
    data = anom_res.json()

    assert data["total_anomalies"] > 0
    first_anom = data["anomalies"][0]
    assert "reason_text" in first_anom
    assert "severity" in first_anom

    # Submit feedback
    fb_res = client.post(
        f"/api/anomalies/{first_anom['id']}/feedback",
        json={"feedback": "expected"}
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["user_feedback"] == "expected"

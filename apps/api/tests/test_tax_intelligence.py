import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, DEMO_USER_ID, DEMO_USER_EMAIL
from engine.tax_intelligence import analyze_tax_intelligence
from engine.tax_pdf_generator import generate_tax_intelligence_pdf

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token(user_id=DEMO_USER_ID, email=DEMO_USER_EMAIL, expires_in_seconds=3600)
    return {"Authorization": f"Bearer {token}"}

def test_tax_intelligence_engine_analysis():
    mock_accounts = [{"id": "acc_1", "bank": "HDFC Bank", "nickname": "Salary A/C"}]
    mock_txns = [
        # Salary credit
        {"id": "t1", "account_id": "acc_1", "posted_date": "2024-08-01", "amount_minor": 7800000, "raw_description": "ACH/SALARY/TECH SOLUTIONS PVT LTD", "category_id": "cat_income_salary"},
        {"id": "t2", "account_id": "acc_1", "posted_date": "2024-09-01", "amount_minor": 7800000, "raw_description": "ACH/SALARY/TECH SOLUTIONS PVT LTD", "category_id": "cat_income_salary"},
        # Savings interest
        {"id": "t3", "account_id": "acc_1", "posted_date": "2024-09-30", "amount_minor": 125000, "raw_description": "SB INT.PD:01-07-2024 TO 30-09-2024", "category_id": "cat_income_other"},
        # Internal transfer (should be excluded from taxable income)
        {"id": "t4", "account_id": "acc_1", "posted_date": "2024-08-03", "amount_minor": 1500000, "raw_description": "NEFT CR-HDFC BANK-OWN A/C", "category_id": "cat_transfer", "is_transfer": True},
        # Rent payment (HRA indicator)
        {"id": "t5", "account_id": "acc_1", "posted_date": "2024-08-05", "amount_minor": -2000000, "raw_description": "UPI-RENT PAYMENT-MR SHARMA-sharma@icici", "category_id": "cat_rent"},
        # 80C ELSS SIP
        {"id": "t6", "account_id": "acc_1", "posted_date": "2024-08-12", "amount_minor": -500000, "raw_description": "NACH-ZERODHA BROKING LTD SIP", "category_id": "cat_sip"},
        # 80D Health Insurance
        {"id": "t7", "account_id": "acc_1", "posted_date": "2024-09-15", "amount_minor": -1800000, "raw_description": "STAR HEALTH INSURANCE PREMIUM", "category_id": "cat_insurance"},
    ]

    res = analyze_tax_intelligence(mock_txns, mock_accounts, user_name="Aarav Kumar")

    # 1. Salary analysis
    assert res["summary_metrics"]["total_observed_salary_rs"] == 156000
    assert len(res["income_sources"][0]["transactions"]) == 2

    # 2. Excluded internal transfers
    assert res["summary_metrics"]["total_excluded_credits_rs"] == 15000
    assert len(res["excluded_inflows"][0]["transactions"]) == 1

    # 3. Interest analysis
    assert res["summary_metrics"]["total_observed_interest_rs"] == 1250

    # 4. Deductions (80C, 80D, HRA)
    assert res["summary_metrics"]["total_potential_80c_rs"] == 5000
    assert res["summary_metrics"]["total_potential_80d_rs"] == 18000
    assert res["summary_metrics"]["annual_rent_paid_rs"] == 20000

    # 5. Missing information checklist
    docs = [m["document"] for m in res["missing_information"]]
    assert any("Form 16" in d for d in docs)
    assert any("AIS" in d or "26AS" in d for d in docs)
    assert any("Interest" in d for d in docs)

def test_tax_pdf_generation():
    mock_data = {
        "user_name": "Aarav Kumar",
        "assessment_year": "AY 2026-27 (FY 2025-26)",
        "generated_at": "2026-11-01 10:00:00",
        "total_accounts_analyzed": 1,
        "total_transactions_analyzed": 5,
        "income_sources": [
            {
                "category": "Income from Salary",
                "section": "Section 17(1)",
                "observed_total_rs": 624000,
                "transaction_count": 8,
                "sources": ["Tech Solutions Pvt Ltd"],
                "clarification": "Net take-home salary after PF and TDS."
            }
        ],
        "excluded_inflows": [
            {
                "type": "Internal Account Transfers",
                "total_rs": 120000,
                "count": 8,
                "reason": "Own account transfer. Non-taxable."
            }
        ],
        "deductions_guidance": [
            {
                "section": "Section 80C",
                "statute": "Chapter VI-A",
                "max_eligible_rs": 150000,
                "observed_rs": 40000,
                "eligible": True,
                "summary": "ELSS SIP observed.",
                "proof_required": "Fund statement."
            }
        ],
        "missing_information": [
            {
                "document": "Form 16",
                "issuer": "Employer",
                "why_bank_cannot_establish": "Gross salary breakdown.",
                "action": "Collect from HR."
            }
        ],
        "regime_guidance": {}
    }

    pdf_bytes = generate_tax_intelligence_pdf(mock_data)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")

def test_api_tax_endpoints(auth_headers):
    # Test GET /api/tax/summary
    resp = client.get("/api/tax/summary", headers=auth_headers)
    assert resp.status_code == 200, f"Tax summary failed: {resp.text}"
    data = resp.json()
    assert "income_sources" in data
    assert "deductions_guidance" in data
    assert "missing_information" in data
    assert "summary_metrics" in data

    # Test GET /api/tax/pdf
    pdf_resp = client.get("/api/tax/pdf", headers=auth_headers)
    assert pdf_resp.status_code == 200, f"Tax PDF failed: {pdf_resp.text}"
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000
    assert pdf_resp.content.startswith(b"%PDF")

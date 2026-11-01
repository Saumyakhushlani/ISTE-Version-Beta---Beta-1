"""
Unit tests for Investments & Multi-Bank Liquidity Sourcing,
Zero-Savings Validation Gate, and Groq Conversational Advisor.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import get_db, Base, engine
from db.models import User, Account, Transaction, RecurringItem
from engine.investments import compute_investment_telemetry
from ai.investment_chat import generate_investment_advice
from auth import create_access_token


@pytest.fixture(autouse=True)
def setup_test_investments_db():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())

    # Create test user
    user = db.query(User).filter(User.email == "test_invest@fdl.local").first()
    if not user:
        user = User(
            id="usr_test_invest",
            email="test_invest@fdl.local",
            password_hash="test_pw_hash",
            is_active=True,
            is_onboarded=True,
        )
        db.add(user)
        db.commit()

    # Clear existing test accounts & transactions
    db.query(Transaction).filter(Transaction.account_id.in_(["acct_inv_hdfc", "acct_inv_sbi"])).delete(synchronize_session=False)
    db.query(Account).filter(Account.id.in_(["acct_inv_hdfc", "acct_inv_sbi"])).delete(synchronize_session=False)
    db.query(RecurringItem).filter(RecurringItem.user_id == "usr_test_invest").delete(synchronize_session=False)
    db.commit()

    # Create 2 accounts: HDFC and SBI
    hdfc = Account(
        id="acct_inv_hdfc",
        user_id="usr_test_invest",
        nickname="HDFC Salary",
        bank="HDFC Bank",
        masked_last4="1180",
        type="savings",
        opening_balance_minor=10000000,  # ₹1,00,000
        currency="INR",
        status="active",
    )
    sbi = Account(
        id="acct_inv_sbi",
        user_id="usr_test_invest",
        nickname="SBI Emergency",
        bank="SBI",
        masked_last4="4421",
        type="savings",
        opening_balance_minor=5000000,  # ₹50,000
        currency="INR",
        status="active",
    )
    db.add_all([hdfc, sbi])
    db.commit()

    # Add positive cash-flow transactions
    t1 = Transaction(
        id="txn_inv_1",
        account_id="acct_inv_hdfc",
        posted_date="2026-09-01",
        amount_minor=8500000,  # +₹85,000 Salary credit
        raw_description="SALARY CREDIT SEPT",
        normalized_description="Salary",
        category_id="income",
        fingerprint="fp_inv_1",
        is_transfer=False,
        status="active",
        source_row=1,
    )
    t2 = Transaction(
        id="txn_inv_2",
        account_id="acct_inv_hdfc",
        posted_date="2026-09-10",
        amount_minor=-3000000,  # -₹30,000 Rent
        raw_description="UPI/RENT/SEPT",
        normalized_description="Rent",
        category_id="housing",
        fingerprint="fp_inv_2",
        is_transfer=False,
        status="active",
        source_row=2,
    )
    t3 = Transaction(
        id="txn_inv_3",
        account_id="acct_inv_hdfc",
        posted_date="2026-09-20",
        amount_minor=-2000000,  # -₹20,000 Groceries/living
        raw_description="SUPERMARKET",
        normalized_description="Groceries",
        category_id="food",
        fingerprint="fp_inv_3",
        is_transfer=False,
        status="active",
        source_row=3,
    )
    db.add_all([t1, t2, t3])

    # Recurring EMI
    rec = RecurringItem(
        id="rec_inv_1",
        user_id="usr_test_invest",
        account_id="acct_inv_hdfc",
        merchant="SBI Home Loan",
        type="emi",
        cadence="monthly",
        typical_amount_minor=1500000,  # ₹15,000
        amount_min_minor=1500000,
        amount_max_minor=1500000,
        last_paid_date="2026-09-05",
        next_expected_date="2026-10-05",
        status="active",
    )
    db.add(rec)
    db.commit()
    yield
    db.close()


def test_investment_telemetry_positive_savings():
    db = next(get_db())
    telemetry = compute_investment_telemetry(db, user_id="usr_test_invest")

    # Inflow = 85,000, Outflow = 50,000, Savings = 35,000 > 0
    assert telemetry["monthly_inflow_paise"] > 0
    assert telemetry["monthly_outflow_paise"] > 0
    assert telemetry["monthly_savings_paise"] > 0
    assert telemetry["savings_rate_pct"] > 0
    assert telemetry["is_saving"] is True
    assert telemetry["can_invest"] is True
    assert telemetry["validation_status"] == "HEALTHY_SAVINGS"
    db.close()


def test_investment_validation_gate_deficit():
    db = next(get_db())
    # Add a huge expense causing a deficit
    t_deficit = Transaction(
        id="txn_inv_huge_expense",
        account_id="acct_inv_hdfc",
        posted_date="2026-09-25",
        amount_minor=-10000000,  # -₹1,00,000 spend (exceeds ₹85k income)
        raw_description="UNEXPECTED SPEND",
        normalized_description="Major Spend",
        category_id="shopping",
        fingerprint="fp_inv_deficit",
        is_transfer=False,
        status="active",
        source_row=4,
    )
    db.add(t_deficit)
    db.commit()

    telemetry = compute_investment_telemetry(db, user_id="usr_test_invest")
    assert telemetry["monthly_savings_paise"] < 0
    assert telemetry["is_saving"] is False
    assert telemetry["can_invest"] is False
    assert telemetry["validation_status"] == "DEFICIT_OR_NO_SAVINGS"
    assert "Hold Off" in telemetry["validation_message"] or "deficit" in telemetry["validation_message"].lower()

    # Check that advisor warns user firmly not to invest
    advice = generate_investment_advice("Can I invest in stocks?", telemetry=telemetry)
    assert advice["can_invest"] is False
    reply_lower = advice["reply"].lower()
    assert any(term in reply_lower for term in ["hold off", "not invest", "no", "deficit", "emergency", "rule 1"])
    db.close()


def test_investment_api_endpoints():
    token = create_access_token(user_id="usr_test_invest", email="test_invest@fdl.local")
    client = TestClient(app)

    # 1. Summary endpoint
    res = client.get("/api/investments/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "telemetry" in data
    assert "can_invest" in data["telemetry"]

    # 2. Chat endpoint
    chat_res = client.post(
        "/api/investments/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "Can I invest ₹10,000 in Mutual Fund SIP or Gold this month?"},
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "reply" in chat_data
    assert "validation_verdict" in chat_data
    assert len(chat_data["reply"]) > 20

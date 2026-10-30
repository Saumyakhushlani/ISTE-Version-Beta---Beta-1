import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import SessionLocal
from db.models import Account, Transaction, RecurringItem, Anomaly, CorrectionLog, EgressLog

client = TestClient(app)

def test_dashboard_query_parameters():
    res_all = client.get("/api/dashboard")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert "combined_liquid_paise" in data_all
    assert "accounts_breakdown" in data_all
    assert "filter_account_id" in data_all

    # Filter with months=3
    res_3m = client.get("/api/dashboard?months=3")
    assert res_3m.status_code == 200
    data_3m = res_3m.json()
    assert data_3m["filter_months"] == 3

    # Check that accounts breakdown includes both inflow_paise and total_inflow_paise
    for acct in data_all.get("accounts_breakdown", []):
        assert "inflow_paise" in acct
        assert "total_inflow_paise" in acct
        assert "outflow_paise" in acct
        assert "total_outflow_paise" in acct
        assert "current_balance_paise" in acct

def test_transactions_filters_and_pagination():
    res = client.get("/api/transactions?limit=5&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert data["limit"] == 5
    assert data["offset"] == 0
    assert len(data["transactions"]) <= 5

    # Filter debits
    res_debit = client.get("/api/transactions?type=debit&limit=10")
    assert res_debit.status_code == 200
    for t in res_debit.json()["transactions"]:
        assert t["amount_minor"] < 0
        assert "amount_paise" in t

    # Filter credits
    res_credit = client.get("/api/transactions?type=credit&limit=10")
    assert res_credit.status_code == 200
    for t in res_credit.json()["transactions"]:
        assert t["amount_minor"] > 0
        assert "amount_paise" in t

def test_transactions_corrections_listing():
    res = client.get("/api/transactions/corrections?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "corrections" in data
    assert "total" in data

def test_recurring_filters_and_pagination():
    res = client.get("/api/recurring?limit=5&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "recurring_items" in data
    for item in data["recurring_items"]:
        assert "typical_amount_paise" in item
        assert "typical_amount_minor" in item
        assert "amount_paise" in item
        assert "amount_minor" in item

    # Upcoming schedule
    res_up = client.get("/api/recurring/upcoming?days=60&limit=5")
    assert res_up.status_code == 200
    up_data = res_up.json()
    assert "upcoming_payments" in up_data
    for p in up_data["upcoming_payments"]:
        assert "amount_paise" in p
        assert "typical_amount_minor" in p

def test_anomalies_filters_and_pagination():
    res = client.get("/api/anomalies?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "anomalies" in data
    for a in data["anomalies"]:
        assert "amount_paise" in a
        assert "amount_minor" in a

def test_privacy_egress_log_filters():
    res = client.get("/api/privacy/egress-log?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "logs" in data
    assert "total" in data

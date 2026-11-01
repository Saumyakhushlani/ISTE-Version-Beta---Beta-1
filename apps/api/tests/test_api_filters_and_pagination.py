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

    # Verify upcoming payments on dashboard contains distinct payments with no duplicates
    upcoming = data_all.get("upcoming_payments", [])
    assert len(upcoming) > 0
    merchants = [p.get("merchant", "").strip().lower() for p in upcoming if p.get("merchant")]
    assert len(merchants) == len(set(merchants)), f"Dashboard upcoming payments contains duplicates: {merchants}"
    for p in upcoming:
        assert "due_date" in p and p["due_date"]
        assert "amount_paise" in p
        assert "user_tag" in p

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

def test_transactions_sorting():
    # Sort by amount asc (smallest/most negative first)
    res_asc = client.get("/api/transactions?sort_by=amount&sort_order=asc&limit=15")
    assert res_asc.status_code == 200
    data_asc = res_asc.json()
    assert data_asc["sort_by"] == "amount"
    assert data_asc["sort_order"] == "asc"
    amounts_asc = [t["amount_minor"] for t in data_asc["transactions"]]
    assert len(amounts_asc) > 1
    assert amounts_asc == sorted(amounts_asc)

    # Sort by amount desc (largest/most positive credits first)
    res_desc = client.get("/api/transactions?sort_by=amount&sort_order=desc&limit=15")
    assert res_desc.status_code == 200
    data_desc = res_desc.json()
    assert data_desc["sort_by"] == "amount"
    assert data_desc["sort_order"] == "desc"
    amounts_desc = [t["amount_minor"] for t in data_desc["transactions"]]
    assert len(amounts_desc) > 1
    assert amounts_desc == sorted(amounts_desc, reverse=True)

    # Sort by posted_date asc
    res_date_asc = client.get("/api/transactions?sort_by=posted_date&sort_order=asc&limit=10")
    assert res_date_asc.status_code == 200
    dates_asc = [t["posted_date"] for t in res_date_asc.json()["transactions"]]
    assert dates_asc == sorted(dates_asc)

    # Sort by posted_date desc
    res_date_desc = client.get("/api/transactions?sort_by=posted_date&sort_order=desc&limit=10")
    assert res_date_desc.status_code == 200
    dates_desc = [t["posted_date"] for t in res_date_desc.json()["transactions"]]
    assert dates_desc == sorted(dates_desc, reverse=True)

    # Combined sort, filter, and pagination
    res_combined = client.get("/api/transactions?type=debit&sort_by=amount&sort_order=asc&limit=5&offset=5")
    assert res_combined.status_code == 200
    comb_txns = res_combined.json()["transactions"]
    assert len(comb_txns) <= 5
    for t in comb_txns:
        assert t["amount_minor"] < 0

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

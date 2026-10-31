"""
Tests for Account & Profile CRUD, Opening Balance, and Security Updates
"""

import time
import pytest
from fastapi.testclient import TestClient

from main import app
from auth import INTERNAL_SERVICE_KEY
from db.models import Account, Transaction, User

client = TestClient(app)
INTERNAL_HEADERS = {"X-Internal-Secret": INTERNAL_SERVICE_KEY}

def test_account_crud_and_opening_balance_workflow(db_session):
    """
    Verifies:
    1. Creating an account with an explicit opening balance in minor units (paise).
    2. Listing accounts returns opening_balance_minor and current_balance_minor.
    3. Updating the opening balance updates the account and immediately recalculates current balance.
    4. Primary account exclusivity (setting account B as primary unsets account A).
    5. Updating password hash via internal endpoint.
    6. Deleting account cleanly.
    """
    test_email = f"crud_test_{int(time.time() * 1000)}@example.com"

    # Step 1: Create a test user
    user_res = client.post(
        "/api/internal/users/create",
        headers=INTERNAL_HEADERS,
        json={
            "email": test_email,
            "password_hash": "$2b$10$old_initial_hash",
            "full_name": "CRUD Test User",
            "mobile_number": "+91 98765 00000",
            "country": "India",
            "preferred_currency": "INR",
        }
    )
    assert user_res.status_code == 200
    user_id = user_res.json()["id"]

    # Step 2: Create Account A with ₹50,000 opening balance (5,000,000 paise)
    acct_a_res = client.post(
        f"/api/internal/users/{user_id}/accounts",
        headers=INTERNAL_HEADERS,
        json={
            "bank": "HDFC Bank",
            "nickname": "Primary HDFC",
            "type": "savings",
            "masked_last4": "1234",
            "opening_balance_minor": 5000000,
            "currency": "INR",
            "is_primary": True,
            "ifsc": "HDFC0001234"
        }
    )
    assert acct_a_res.status_code == 200
    acct_a = acct_a_res.json()
    assert acct_a["bank"] == "HDFC Bank"
    assert acct_a["opening_balance_minor"] == 5000000
    assert acct_a["current_balance_minor"] == 5000000
    assert acct_a["is_primary"] is True
    acct_a_id = acct_a["id"]

    # Step 3: Create Account B with ₹20,000 opening balance (2,000,000 paise)
    acct_b_res = client.post(
        f"/api/internal/users/{user_id}/accounts",
        headers=INTERNAL_HEADERS,
        json={
            "bank": "State Bank of India",
            "nickname": "SBI Secondary",
            "type": "savings",
            "masked_last4": "5678",
            "opening_balance_minor": 2000000,
            "currency": "INR",
            "is_primary": False,
        }
    )
    assert acct_b_res.status_code == 200
    acct_b = acct_b_res.json()
    assert acct_b["is_primary"] is False
    acct_b_id = acct_b["id"]

    # Step 4: Add a transaction to Account A to verify reconciled math:
    # opening_balance + sum(txns) = current_balance
    txn = Transaction(
        account_id=acct_a_id,
        posted_date="2026-03-01",
        raw_description="SALARY CREDIT",
        normalized_description="Salary Credit",
        amount_minor=8000000, # +₹80,000
        category_id="cat_income",
        fingerprint=f"fp_salary_{acct_a_id}",
        status="active"
    )
    db_session.add(txn)
    db_session.commit()

    # Step 5: List accounts and verify current_balance_minor
    list_res = client.get(
        f"/api/internal/users/{user_id}/accounts",
        headers=INTERNAL_HEADERS
    )
    assert list_res.status_code == 200
    accounts = list_res.json()
    assert len(accounts) == 2
    acct_a_fetched = next(a for a in accounts if a["id"] == acct_a_id)
    assert acct_a_fetched["opening_balance_minor"] == 5000000
    # 5,000,000 (opening) + 8,000,000 (txn) = 13,000,000 paise
    assert acct_a_fetched["current_balance_minor"] == 13000000
    assert acct_a_fetched["transaction_count"] == 1

    # Step 6: Update opening balance of Account A to ₹60,000 (6,000,000 paise)
    update_res = client.put(
        f"/api/internal/users/{user_id}/accounts/{acct_a_id}",
        headers=INTERNAL_HEADERS,
        json={
            "opening_balance_minor": 6000000,
            "nickname": "Renamed HDFC Vault",
        }
    )
    assert update_res.status_code == 200
    updated_acct_a = update_res.json()
    assert updated_acct_a["opening_balance_minor"] == 6000000
    assert updated_acct_a["nickname"] == "Renamed HDFC Vault"
    # New reconciled balance: 6,000,000 + 8,000,000 = 14,000,000
    assert updated_acct_a["current_balance_minor"] == 14000000

    # Step 7: Test 1-click Set Primary on Account B
    primary_res = client.post(
        f"/api/internal/users/{user_id}/accounts/{acct_b_id}/primary",
        headers=INTERNAL_HEADERS
    )
    assert primary_res.status_code == 200
    assert primary_res.json()["is_primary"] is True

    # Verify Account A is no longer primary
    acct_a_after = client.get(f"/api/internal/users/{user_id}/accounts", headers=INTERNAL_HEADERS).json()
    acct_a_status = next(a for a in acct_a_after if a["id"] == acct_a_id)
    acct_b_status = next(a for a in acct_a_after if a["id"] == acct_b_id)
    assert acct_b_status["is_primary"] is True
    assert acct_a_status["is_primary"] is False

    # Step 8: Update Password Hash
    pwd_res = client.put(
        f"/api/internal/users/{user_id}/password",
        headers=INTERNAL_HEADERS,
        json={"new_password_hash": "$2b$10$brand_new_hashed_password"}
    )
    assert pwd_res.status_code == 200
    assert pwd_res.json()["status"] == "success"

    # Verify password was updated in DB
    user_in_db = db_session.query(User).filter_by(id=user_id).first()
    assert user_in_db.password_hash == "$2b$10$brand_new_hashed_password"

    # Step 9: Delete Account B
    del_res = client.delete(
        f"/api/internal/users/{user_id}/accounts/{acct_b_id}",
        headers=INTERNAL_HEADERS
    )
    assert del_res.status_code == 200
    remaining = client.get(f"/api/internal/users/{user_id}/accounts", headers=INTERNAL_HEADERS).json()
    assert len(remaining) == 1
    assert remaining[0]["id"] == acct_a_id

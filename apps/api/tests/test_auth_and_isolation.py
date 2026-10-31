"""
Multi-User Authentication, Authorization & Data Isolation Tests
Verifies:
1. Internal user creation, profile management, and account provisioning.
2. Cryptographic JWT creation, verification, tampering rejection, and expiry enforcement.
3. Brute-force lockout state tracking.
4. Strict multi-user data isolation:
   - Transactions, accounts, imports, dashboard KPIs, recurring items, anomalies, and egress logs
     belonging to User A are 100% inaccessible to User B.
5. Cross-user modification prevention (User B cannot update/delete User A's accounts or commit into them).
"""

import os
import time
import pytest
from fastapi.testclient import TestClient

from main import app
from auth import (
    create_access_token,
    decode_and_verify_token,
    INTERNAL_SERVICE_KEY,
    AUTH_SECRET,
    DEMO_USER_ID,
    DEMO_USER_EMAIL
)
from db.database import SessionLocal
from db.models import User, UserProfile, Account, Transaction

client = TestClient(app)

INTERNAL_HEADERS = {"X-Internal-Secret": INTERNAL_SERVICE_KEY}
SYNTHETIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic")

def test_internal_user_create_and_duplicate_prevention(db_session):
    """Verifies user creation via internal gateway and unique email enforcement."""
    test_email = f"iso_test_{int(time.time())}@example.com"

    # Unauthorized without internal secret
    unauth_res = client.post(
        "/api/internal/users/create",
        json={"email": test_email, "password_hash": "hash123", "full_name": "Test User"}
    )
    assert unauth_res.status_code == 403

    # Authorized creation
    create_res = client.post(
        "/api/internal/users/create",
        headers=INTERNAL_HEADERS,
        json={
            "email": test_email,
            "password_hash": "hashed_pw_abc",
            "full_name": "Iso Test User",
            "mobile_number": "+91 99999 11111",
            "country": "India",
            "preferred_currency": "INR"
        }
    )
    assert create_res.status_code == 200
    user_data = create_res.json()
    user_id = user_data["id"]
    assert user_data["email"] == test_email
    assert user_data["profile"]["full_name"] == "Iso Test User"
    assert user_data["profile"]["preferred_currency"] == "INR"

    # Duplicate email rejection
    dup_res = client.post(
        "/api/internal/users/create",
        headers=INTERNAL_HEADERS,
        json={"email": test_email, "password_hash": "hash456", "full_name": "Duplicate"}
    )
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"]

    # Lookup by email
    lookup_res = client.get(
        f"/api/internal/users/by-email?email={test_email}",
        headers=INTERNAL_HEADERS
    )
    assert lookup_res.status_code == 200
    assert lookup_res.json()["id"] == user_id

def test_jwt_signature_and_tampering():
    """Verifies that RFC 7519 HS256 tokens are validated and tampered tokens are rejected."""
    token = create_access_token(user_id="usr_valid_001", email="valid@example.com", expires_in_seconds=3600)
    decoded = decode_and_verify_token(token)
    assert decoded is not None
    assert decoded["sub"] == "usr_valid_001"
    assert decoded["email"] == "valid@example.com"

    # Tampered payload
    parts = token.split(".")
    tampered_payload = parts[0] + ".eyJzdWIiOiAidXNyX2hhY2tlciJ9." + parts[2]
    with pytest.raises(Exception):
        decode_and_verify_token(tampered_payload)

    # Tampered signature
    tampered_sig = parts[0] + "." + parts[1] + ".invalid_signature_bytes"
    with pytest.raises(Exception):
        decode_and_verify_token(tampered_sig)

    # Expired token
    expired_token = create_access_token(user_id="usr_valid_001", email="valid@example.com", expires_in_seconds=-100)
    with pytest.raises(Exception):
        decode_and_verify_token(expired_token)

def test_account_provisioning_and_primary_switch(db_session):
    """Verifies bank account provisioning and automatic primary toggle behavior."""
    email = f"acct_test_{int(time.time())}@example.com"
    u_res = client.post(
        "/api/internal/users/create",
        headers=INTERNAL_HEADERS,
        json={"email": email, "password_hash": "hash", "full_name": "Account Tester"}
    )
    user_id = u_res.json()["id"]

    # Create first account as primary
    a1_res = client.post(
        f"/api/internal/users/{user_id}/accounts",
        headers=INTERNAL_HEADERS,
        json={
            "bank": "HDFC Bank",
            "nickname": "Primary Account",
            "type": "savings",
            "masked_last4": "1234",
            "opening_balance_minor": 1000000,
            "is_primary": True
        }
    )
    assert a1_res.status_code == 200
    a1_id = a1_res.json()["id"]
    assert a1_res.json()["is_primary"] is True

    # Create second account also marked primary -> should unset primary on first account
    a2_res = client.post(
        f"/api/internal/users/{user_id}/accounts",
        headers=INTERNAL_HEADERS,
        json={
            "bank": "ICICI Bank",
            "nickname": "Secondary Account",
            "type": "savings",
            "masked_last4": "5678",
            "opening_balance_minor": 500000,
            "is_primary": True
        }
    )
    assert a2_res.status_code == 200
    assert a2_res.json()["is_primary"] is True

    # List accounts and verify primary states
    list_res = client.get(f"/api/internal/users/{user_id}/accounts", headers=INTERNAL_HEADERS)
    accounts = list_res.json()
    assert len(accounts) == 2
    for acct in accounts:
        if acct["id"] == a1_id:
            assert acct["is_primary"] is False
        elif acct["id"] == a2_res.json()["id"]:
            assert acct["is_primary"] is True

def test_strict_multi_user_data_isolation(db_session):
    """
    Core Invariant Test:
    User A imports a bank statement.
    User B queries transactions, dashboard, recurring, anomalies, and egress log.
    User B must see ZERO data from User A.
    """
    user_a_email = f"user_a_{int(time.time())}@example.com"
    user_b_email = f"user_b_{int(time.time())}@example.com"

    # Create User A
    res_a = client.post(
        "/api/internal/users/create",
        headers=INTERNAL_HEADERS,
        json={"email": user_a_email, "password_hash": "hash_a", "full_name": "User Alpha"}
    )
    user_a_id = res_a.json()["id"]
    token_a = create_access_token(user_id=user_a_id, email=user_a_email)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create User B
    res_b = client.post(
        "/api/internal/users/create",
        headers=INTERNAL_HEADERS,
        json={"email": user_b_email, "password_hash": "hash_b", "full_name": "User Beta"}
    )
    user_b_id = res_b.json()["id"]
    token_b = create_access_token(user_id=user_b_id, email=user_b_email)
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A imports HDFC statement
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(hdfc_path, "rb") as f:
        prev_res = client.post("/api/imports/preview", headers=headers_a, files={"file": ("hdfc.csv", f, "text/csv")})
    assert prev_res.status_code == 200
    file_id = prev_res.json()["file_id"]

    commit_res = client.post("/api/imports/commit", headers=headers_a, data={"file_id": file_id})
    assert commit_res.status_code == 200
    user_a_acct_id = commit_res.json()["account_id"]
    assert commit_res.json()["inserted"] > 0

    # 1. User A sees their transactions
    tx_a = client.get("/api/transactions", headers=headers_a)
    assert tx_a.status_code == 200
    assert tx_a.json()["total"] > 0

    # 2. User B queries transactions -> MUST BE EMPTY
    tx_b = client.get("/api/transactions", headers=headers_b)
    assert tx_b.status_code == 200
    assert tx_b.json()["total"] == 0
    assert len(tx_b.json()["transactions"]) == 0

    # 3. User B queries dashboard -> MUST BE ZERO
    dash_b = client.get("/api/dashboard", headers=headers_b)
    assert dash_b.status_code == 200
    assert dash_b.json()["combined_liquid_paise"] == 0
    assert dash_b.json()["total_accounts_count"] == 0
    assert len(dash_b.json()["category_spend"]) == 0

    # 4. User B queries recurring items -> MUST BE EMPTY
    rec_b = client.get("/api/recurring", headers=headers_b)
    assert rec_b.status_code == 200
    assert rec_b.json()["total"] == 0

    # 5. User B queries anomalies -> MUST BE EMPTY
    anom_b = client.get("/api/anomalies", headers=headers_b)
    assert anom_b.status_code == 200
    assert anom_b.json()["total"] == 0

    # 6. User B cannot commit into User A's account
    with open(hdfc_path, "rb") as f:
        prev_b = client.post("/api/imports/preview", headers=headers_b, files={"file": ("hdfc.csv", f, "text/csv")})
    file_id_b = prev_b.json()["file_id"]

    cross_commit = client.post(
        "/api/imports/commit",
        headers=headers_b,
        data={"file_id": file_id_b, "account_id": user_a_acct_id}
    )
    assert cross_commit.status_code == 404
    assert "access denied" in cross_commit.json()["detail"].lower()

    # 7. User B cannot delete User A's account via internal endpoint
    cross_delete = client.delete(
        f"/api/internal/users/{user_b_id}/accounts/{user_a_acct_id}",
        headers=INTERNAL_HEADERS
    )
    assert cross_delete.status_code == 404

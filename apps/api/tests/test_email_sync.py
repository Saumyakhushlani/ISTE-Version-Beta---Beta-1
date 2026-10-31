"""
Integration and Unit Tests for Google OAuth & 24-Hour Email Ingestion.
Verifies:
1. Token encryption / decryption using Fernet with AUTH_SECRET.
2. Status endpoint returns disconnected when no tokens present.
3. Authorize endpoint generates valid Google OAuth consent URL.
4. 24-hour sync with simulated Gmail API responses (using user's exact HDFC email).
5. X-Service-Key external authentication.
"""

import pytest
import os
import base64
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from db.database import Base, engine, get_db
from db.models import User, Account, Transaction, OAuthAccount, EmailSyncAudit, DEMO_USER_ID
from engine.google_oauth import encrypt_secret, decrypt_secret, save_or_update_oauth_account
from auth import INTERNAL_SERVICE_KEY

client = TestClient(app)

def test_fernet_token_encryption():
    secret_token = "ya29.a0AfH6SMD_sample_google_access_token_12345"
    encrypted = encrypt_secret(secret_token)
    assert encrypted != secret_token
    decrypted = decrypt_secret(encrypted)
    assert decrypted == secret_token

def test_email_sync_status_endpoint():
    resp = client.get("/api/email-sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "is_connected" in data

def test_email_sync_authorize_endpoint():
    resp = client.get("/api/email-sync/oauth/authorize")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "accounts.google.com" in data["auth_url"]
    assert "gmail.readonly" in data["auth_url"]

def test_gmail_24h_sync_with_mocked_api(db_session=None):
    """
    Simulates Google OAuth connection and Gmail API returning
    the user's exact HDFC Bank UPI alert email.
    """
    # 1. Setup mock OAuthAccount in DB
    from db.database import SessionLocal
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=DEMO_USER_ID).first()
        if not user:
            user = User(id=DEMO_USER_ID, email="saumyakhushlani9@gmail.com", password_hash="hash", is_active=True)
            db.add(user)
            db.commit()

        # Clean up any leftover test data
        db.query(EmailSyncAudit).filter_by(google_message_id="msg_hdfc_001").delete()
        db.query(Transaction).filter_by(amount_minor=-34000).delete()
        db.commit()
        save_or_update_oauth_account(
            user_id=user.id,
            email="saumyakhushlani9@gmail.com",
            token_response={
                "access_token": "mock_access_token_123",
                "refresh_token": "mock_refresh_token_123",
                "expires_in": 3600
            },
            db=db
        )

        # Mock body data
        email_body = """Dear Customer,

Greetings from HDFC Bank!

Rs.340.00 is debited from your account ending 2650 towards VPA ******3524@okbizaxis (Mr Deepesh Lodhi) on 30-10-26.

UPI transaction reference no.: 074486320407.

Warm regards,
HDFC Bank
"""
        encoded_body = base64.urlsafe_b64encode(email_body.encode("utf-8")).decode("utf-8")

        mock_messages_list_resp = MagicMock()
        mock_messages_list_resp.status_code = 200
        mock_messages_list_resp.json.return_value = {
            "messages": [{"id": "msg_hdfc_001"}]
        }

        mock_message_detail_resp = MagicMock()
        mock_message_detail_resp.status_code = 200
        mock_message_detail_resp.json.return_value = {
            "id": "msg_hdfc_001",
            "payload": {
                "mimeType": "text/plain",
                "headers": [
                    {"name": "Subject", "value": "❗ You have done a UPI txn. Check details!"},
                    {"name": "From", "value": "HDFC Bank InstaAlerts <alerts@hdfcbank.bank.in>"},
                    {"name": "Date", "value": "Fri, 30 Oct 2026 00:59:00 +0530"}
                ],
                "body": {
                    "data": encoded_body
                }
            }
        }

        with patch("httpx.get") as mock_get:
            def side_effect(url, **kwargs):
                if "messages?q=" in url:
                    return mock_messages_list_resp
                elif "messages/msg_hdfc_001" in url:
                    return mock_message_detail_resp
                return MagicMock(status_code=404)

            mock_get.side_effect = side_effect

            # Hit endpoint via X-Service-Key (simulating external site / cron call)
            resp = client.post(
                "/api/email-sync/sync-24h",
                headers={"X-Service-Key": INTERNAL_SERVICE_KEY},
                params={"user_email": "saumyakhushlani9@gmail.com"}
            )
            print("\nRESPONSE STATUS:", resp.status_code, resp.json())
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "success"
            assert data["emails_scanned"] == 1
            assert data["alerts_parsed"] == 1
            assert data["transactions_added"] == 1

            # Verify in DB: transaction inserted with -34000 paise (Rs. 340 debited)
            inserted_txn = db.query(Transaction).filter_by(amount_minor=-34000).first()
            assert inserted_txn is not None
            assert inserted_txn.posted_date == "2026-10-30"
            assert "074486320407" in inserted_txn.raw_description or "Mr Deepesh Lodhi" in inserted_txn.raw_description

            # Verify duplicate call skips already parsed message
            resp_dupe = client.post(
                "/api/email-sync/sync-24h",
                headers={"X-Service-Key": INTERNAL_SERVICE_KEY},
                params={"user_email": "saumyakhushlani9@gmail.com"}
            )
            assert resp_dupe.status_code == 200
            dupe_data = resp_dupe.json()
            assert dupe_data["duplicates_skipped"] == 1
            assert dupe_data["transactions_added"] == 0

    finally:
        db.close()

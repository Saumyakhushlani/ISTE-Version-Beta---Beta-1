"""
Google OAuth 2.0 Integration & Token Management for Financial Decision Lab (FDL).
Handles:
- Authorization URL generation with offline refresh tokens
- Token exchange and local Fernet encryption with AUTH_SECRET
- Automatic access token refresh
- Egress logging for all Google API calls
"""

import os
import time
import base64
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from urllib.parse import urlencode
import httpx
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from db.models import OAuthAccount, EgressLog, User

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/email-sync/oauth/callback")
AUTH_SECRET = os.getenv("AUTH_SECRET", "fdl-super-secret-auth-key-minimum-32-chars-long!")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email"
]

def _get_fernet() -> Fernet:
    """Derives a deterministic 32-byte Fernet key from AUTH_SECRET."""
    derived_key = hashlib.sha256(AUTH_SECRET.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(derived_key))

def encrypt_secret(val: str) -> str:
    if not val:
        return ""
    return _get_fernet().encrypt(val.encode("utf-8")).decode("utf-8")

def decrypt_secret(val: str) -> str:
    if not val:
        return ""
    return _get_fernet().decrypt(val.encode("utf-8")).decode("utf-8")

def _log_egress(db: Session, user_id: Optional[str], purpose: str, destination: str, payload: dict):
    """Audits outbound Google API requests in the local EgressLog table."""
    try:
        import json
        log_entry = EgressLog(
            user_id=user_id,
            purpose=purpose,
            payload_json=json.dumps(payload),
            mode="hybrid",
            destination=destination
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        pass

def get_google_auth_url(state: str, redirect_uri: Optional[str] = None) -> str:
    """Constructs Google OAuth 2.0 consent URL."""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri or GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

def exchange_code_for_tokens(code: str, redirect_uri: Optional[str] = None, db: Optional[Session] = None) -> Dict[str, Any]:
    """Exchanges authorization code for access and refresh tokens."""
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri or GOOGLE_REDIRECT_URI
    }

    if db:
        _log_egress(db, None, "Exchange Google OAuth Code", url, {"grant_type": "authorization_code"})

    resp = httpx.post(url, data=data, timeout=15.0)
    if resp.status_code != 200:
        raise ValueError(f"Google OAuth token exchange failed ({resp.status_code}): {resp.text}")

    return resp.json()

def get_google_user_email(access_token: str, db: Optional[Session] = None) -> str:
    """Retrieves user's Google email address using access token."""
    url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}

    if db:
        _log_egress(db, None, "Fetch Google User Profile", url, {})

    resp = httpx.get(url, headers=headers, timeout=15.0)
    if resp.status_code != 200:
        raise ValueError(f"Failed to fetch userinfo from Google ({resp.status_code}): {resp.text}")

    return resp.json().get("email", "").lower()

def refresh_google_access_token(refresh_token: str, db: Optional[Session] = None) -> Dict[str, Any]:
    """Refreshes expired access token using long-lived refresh token."""
    url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }

    if db:
        _log_egress(db, None, "Refresh Google Access Token", url, {"grant_type": "refresh_token"})

    resp = httpx.post(url, data=data, timeout=15.0)
    if resp.status_code != 200:
        raise ValueError(f"Google token refresh failed ({resp.status_code}): {resp.text}")

    return resp.json()

def save_or_update_oauth_account(
    user_id: str,
    email: str,
    token_response: Dict[str, Any],
    db: Session
) -> OAuthAccount:
    """Encrypts tokens and saves/updates OAuthAccount record in DB."""
    access_token = token_response.get("access_token", "")
    refresh_token = token_response.get("refresh_token")
    expires_in = token_response.get("expires_in", 3600)
    scope = token_response.get("scope", " ".join(SCOPES))

    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).replace(tzinfo=None)

    existing = db.query(OAuthAccount).filter_by(user_id=user_id, provider="google").first()
    if existing:
        existing.email_address = email
        existing.encrypted_access_token = encrypt_secret(access_token)
        if refresh_token:
            existing.encrypted_refresh_token = encrypt_secret(refresh_token)
        existing.expires_at = expires_at
        existing.scopes = scope
        existing.is_active = True
        account = existing
    else:
        account = OAuthAccount(
            user_id=user_id,
            provider="google",
            email_address=email,
            encrypted_access_token=encrypt_secret(access_token),
            encrypted_refresh_token=encrypt_secret(refresh_token) if refresh_token else None,
            expires_at=expires_at,
            scopes=scope,
            is_active=True
        )
        db.add(account)

    db.commit()
    db.refresh(account)
    return account

def get_valid_access_token(user_id: str, db: Session) -> Optional[str]:
    """
    Returns a valid, non-expired Google access token for user.
    Automatically refreshes token if expired or about to expire in <= 2 minutes.
    """
    account = db.query(OAuthAccount).filter_by(user_id=user_id, provider="google", is_active=True).first()
    if not account:
        return None

    now_utc = datetime.now(timezone.utc)
    # Check if expiration is within 120 seconds
    expires_at = account.expires_at
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= (now_utc + timedelta(seconds=120)):
            # Refresh token is needed
            if not account.encrypted_refresh_token:
                return None
            decrypted_refresh = decrypt_secret(account.encrypted_refresh_token)
            refreshed = refresh_google_access_token(decrypted_refresh, db=db)

            new_access = refreshed.get("access_token")
            new_expires_in = refreshed.get("expires_in", 3600)

            account.encrypted_access_token = encrypt_secret(new_access)
            account.expires_at = (now_utc + timedelta(seconds=new_expires_in)).replace(tzinfo=None)
            db.commit()
            return new_access

    return decrypt_secret(account.encrypted_access_token)

def disconnect_google_oauth(user_id: str, db: Session) -> bool:
    """Revokes token and deactivates OAuth connection for user."""
    account = db.query(OAuthAccount).filter_by(user_id=user_id, provider="google").first()
    if not account:
        return False

    token_to_revoke = None
    if account.encrypted_refresh_token:
        token_to_revoke = decrypt_secret(account.encrypted_refresh_token)
    elif account.encrypted_access_token:
        token_to_revoke = decrypt_secret(account.encrypted_access_token)

    if token_to_revoke:
        try:
            url = f"https://oauth2.googleapis.com/revoke?token={token_to_revoke}"
            _log_egress(db, user_id, "Revoke Google OAuth Token", url, {})
            httpx.post(url, timeout=10.0)
        except Exception:
            pass

    db.delete(account)
    db.commit()
    return True

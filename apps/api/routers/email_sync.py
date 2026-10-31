"""
Email Ingestion & Google OAuth Router for Financial Decision Lab (FDL).
Provides endpoints to:
1. Authorize Google Mail access via OAuth 2.0 (restricted gmail.readonly).
2. Handle Google OAuth callback and token persistence.
3. Trigger 24-hour bank notification ingestion (callable via frontend or external site/cron).
4. Inspect sync logs and connection status.
"""

import os
import secrets
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Header, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, OAuthAccount, EmailSyncAudit
from auth import get_current_user, INTERNAL_SERVICE_KEY
from engine.google_oauth import (
    get_google_auth_url,
    exchange_code_for_tokens,
    get_google_user_email,
    save_or_update_oauth_account,
    disconnect_google_oauth
)
from engine.gmail_ingestion import run_gmail_24h_sync

router = APIRouter()

# Temporary in-memory state store for CSRF validation: {state_token: user_id}
_OAUTH_STATES: Dict[str, str] = {}

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@router.get("/oauth/authorize")
def authorize_google(
    redirect_uri: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Initiates Google OAuth 2.0 flow.
    Returns the Google Consent URL.
    """
    state = secrets.token_urlsafe(32)
    _OAUTH_STATES[state] = current_user.id

    auth_url = get_google_auth_url(state=state, redirect_uri=redirect_uri)
    return {
        "status": "ok",
        "auth_url": auth_url,
        "state": state
    }

@router.get("/oauth/callback")
def google_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handles Google OAuth redirect callback.
    Exchanges code for tokens, encrypts, and persists credentials.
    Redirects user back to frontend upload page.
    """
    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}/upload?error={error}")

    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing from Google callback")

    # Match state to user
    user_id = _OAUTH_STATES.pop(state, None) if state else None
    user = None
    if user_id:
        user = db.query(User).filter_by(id=user_id).first()

    if not user:
        # Fallback to first active user with demo compatibility
        user = db.query(User).filter_by(is_active=True).first()

    if not user:
        raise HTTPException(status_code=400, detail="No active user found to associate with Google account")

    try:
        # Exchange authorization code for tokens
        tokens = exchange_code_for_tokens(code, db=db)
        access_token = tokens.get("access_token")
        email = get_google_user_email(access_token, db=db)

        # Save tokens
        save_or_update_oauth_account(
            user_id=user.id,
            email=email,
            token_response=tokens,
            db=db
        )

        return RedirectResponse(url=f"{FRONTEND_URL}/upload?google_connected=true&email={email}")
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_URL}/upload?google_error={str(e)}")

@router.get("/status")
def get_email_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns current Google Mail connection status and sync telemetry."""
    account = db.query(OAuthAccount).filter_by(user_id=current_user.id, provider="google", is_active=True).first()
    if not account:
        return {
            "is_connected": False,
            "provider": "google",
            "email": None,
            "last_synced_at": None
        }

    return {
        "is_connected": True,
        "provider": "google",
        "email": account.email_address,
        "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
        "connected_at": account.created_at.isoformat() if account.created_at else None
    }

@router.delete("/disconnect")
def disconnect_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revokes token and disconnects Google Mail account."""
    success = disconnect_google_oauth(current_user.id, db)
    return {"status": "disconnected" if success else "not_connected"}

@router.post("/sync-24h")
def trigger_24h_email_sync(
    hours: int = Query(24, ge=1, le=168, description="Number of trailing hours to scan (default 24h)"),
    user_email: Optional[str] = Query(None, description="Optional user email for automated external calls"),
    x_service_key: Optional[str] = Header(None, alias="X-Service-Key"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Scans and ingests bank notification emails received within the trailing 24 hours.
    Callable by:
    1. Logged in frontend user (via Bearer token or cookie session).
    2. External site / cron job via X-Service-Key header.
    """
    # 1. Authenticate caller
    user = None
    if x_service_key and x_service_key == INTERNAL_SERVICE_KEY:
        # Automated external site / cron call
        if user_email:
            user = db.query(User).filter_by(email=user_email.lower()).first()
            if not user:
                # Also check OAuthAccount email
                oauth = db.query(OAuthAccount).filter_by(email_address=user_email.lower()).first()
                if oauth:
                    user = oauth.user

        if not user:
            # Pick first active user with a connected Google account
            oauth_active = db.query(OAuthAccount).filter_by(provider="google", is_active=True).first()
            if oauth_active:
                user = oauth_active.user
            else:
                user = db.query(User).filter_by(is_active=True).first()
    else:
        # Standard user authentication
        user = get_current_user(authorization=authorization, db=db)

    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized: Valid user session or X-Service-Key required")

    # 2. Run 24-hour sync
    try:
        result = run_gmail_24h_sync(user=user, db=db, hours=hours)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email sync error: {str(e)}")

@router.get("/logs")
def list_email_sync_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns recent audit logs of inspected emails."""
    logs = db.query(EmailSyncAudit).filter_by(user_id=current_user.id).order_by(EmailSyncAudit.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "google_message_id": l.google_message_id,
            "sender": l.sender,
            "subject": l.subject,
            "status": l.status,
            "transactions_extracted": l.transactions_extracted,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]

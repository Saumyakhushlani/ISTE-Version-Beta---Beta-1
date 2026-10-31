"""
Authentication and JWT verification module for Financial Decision Lab (FDL).
Provides standard HS256 JWT creation, verification, and FastAPI dependency injection.
Zero external crypto dependencies (pure Python standard library hmac, hashlib, base64, json).
"""

import os
import time
import hmac
import hashlib
import base64
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User, UserProfile, DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_PASSWORD_HASH

AUTH_SECRET = os.getenv("AUTH_SECRET", "super-secret-default-fdl-jwt-key-2026-min-32-chars")
INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY", "internal-fdl-secret-key-2026")
ALLOW_DEMO_FALLBACK = os.getenv("ALLOW_DEMO_FALLBACK", "true").lower() in ("true", "1", "yes")

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(s: str) -> bytes:
    rem = len(s) % 4
    if rem > 0:
        s += "=" * (4 - rem)
    return base64.urlsafe_b64decode(s)

def create_access_token(user_id: str, email: str, expires_in_seconds: int = 604800, additional_claims: Optional[Dict[str, Any]] = None) -> str:
    """
    Creates an RFC 7519 compliant HS256 JWT access token.
    Default expiry is 7 days (604,800 seconds).
    """
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + expires_in_seconds
    }
    if additional_claims:
        payload.update(additional_claims)

    h_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
    
    sig = hmac.new(AUTH_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)

    return f"{h_b64}.{p_b64}.{sig_b64}"

def decode_and_verify_token(token: str) -> Dict[str, Any]:
    """
    Decodes and cryptographically verifies an HS256 JWT token.
    Raises HTTPException(401) on invalid signature or expiration.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Malformed JWT token format")

    h_b64, p_b64, sig_b64 = parts
    signing_input = f"{h_b64}.{p_b64}".encode("utf-8")

    expected_sig = hmac.new(AUTH_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    try:
        actual_sig = _b64url_decode(sig_b64)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token encoding")

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=401, detail="Invalid token signature")

    try:
        payload = json.loads(_b64url_decode(p_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Check expiration
    exp = payload.get("exp")
    if exp and int(time.time()) > exp:
        raise HTTPException(status_code=401, detail="Authentication token has expired")

    return payload

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to extract and authenticate the current user.
    - If Bearer token is provided: verifies signature and retrieves User.
    - If no token is provided:
        * In dev/test mode (ALLOW_DEMO_FALLBACK=True): falls back to demo user Aarav Kumar (ensures user exists).
        * In production mode (ALLOW_DEMO_FALLBACK=False): raises HTTP 401 Unauthorized.
    """
    if authorization:
        parts = authorization.strip().split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        else:
            token = parts[0]

        payload = decode_and_verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing subject claim")

        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User account does not exist")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="User account is deactivated")
        return user

    # No authorization header supplied
    if ALLOW_DEMO_FALLBACK:
        demo_user = db.query(User).filter_by(id=DEMO_USER_ID).first()
        if not demo_user:
            demo_user = User(
                id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
                password_hash=DEMO_USER_PASSWORD_HASH,
                is_active=True,
                is_onboarded=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            if not demo_user.profile:
                profile = UserProfile(
                    user_id=demo_user.id,
                    full_name="Aarav Kumar",
                    mobile_number="+91 98765 43210",
                    country="India",
                    preferred_currency="INR"
                )
                db.add(profile)
                db.commit()
                db.refresh(demo_user)

        return demo_user

    raise HTTPException(status_code=401, detail="Authentication credentials were not provided")

def get_current_user_strict(
    authorization: str = Header(..., description="Bearer JWT token"),
    db: Session = Depends(get_db)
) -> User:
    """
    Strict authentication dependency: never falls back to demo user.
    Always requires a valid Bearer token.
    """
    parts = authorization.strip().split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1]
    else:
        token = parts[0]

    payload = decode_and_verify_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User account does not exist")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated")
    return user

def verify_internal_secret(
    x_internal_secret: Optional[str] = Header(None)
) -> None:
    """
    Verifies that an incoming request to internal management routes originates from
    the trusted Next.js backend boundary.
    """
    if not x_internal_secret or not hmac.compare_digest(x_internal_secret, INTERNAL_SERVICE_KEY):
        raise HTTPException(status_code=403, detail="Access denied: invalid or missing internal service secret")

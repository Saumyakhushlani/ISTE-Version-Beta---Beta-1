"""
Internal User Management & Persistence Router
Provides trusted, private persistence operations for the Next.js Authentication & Onboarding Gateway.
Protected strictly by the internal service key header (X-Internal-Secret).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from db.database import get_db
from db.models import (
    User, UserProfile, Account,
    DEMO_USER_ID, DEMO_USER_EMAIL,
    PRIYA_USER_ID, PRIYA_USER_EMAIL
)
from auth import verify_internal_secret

router = APIRouter(prefix="/internal/users", dependencies=[Depends(verify_internal_secret)])

# Request / Response Schemas
class CreateUserPayload(BaseModel):
    id: Optional[str] = None
    email: str
    password_hash: str
    full_name: str
    mobile_number: Optional[str] = None
    country: Optional[str] = "India"
    preferred_currency: Optional[str] = "INR"

class UpdateProfilePayload(BaseModel):
    full_name: Optional[str] = None
    mobile_number: Optional[str] = None
    country: Optional[str] = None
    preferred_currency: Optional[str] = None

class BankAccountPayload(BaseModel):
    bank: str
    nickname: str
    type: str = "savings"
    masked_last4: str
    opening_balance_minor: int = 0
    currency: str = "INR"
    is_primary: bool = False
    account_holder_name: Optional[str] = None
    ifsc: Optional[str] = None

class UpdateAccountPayload(BaseModel):
    bank: Optional[str] = None
    nickname: Optional[str] = None
    type: Optional[str] = None
    masked_last4: Optional[str] = None
    opening_balance_minor: Optional[int] = None
    currency: Optional[str] = None
    is_primary: Optional[bool] = None
    account_holder_name: Optional[str] = None
    ifsc: Optional[str] = None

class UpdatePasswordPayload(BaseModel):
    new_password_hash: str

class OnboardingPayload(BaseModel):
    full_name: str
    mobile_number: Optional[str] = None
    country: str = "India"
    preferred_currency: str = "INR"
    bank_accounts: List[BankAccountPayload] = []

class LockoutPayload(BaseModel):
    failed_attempts: int
    locked_until: Optional[str] = None  # ISO format string or None

def _serialize_user(user: User) -> Dict[str, Any]:
    profile_dict = None
    if user.profile:
        profile_dict = {
            "id": user.profile.id,
            "full_name": user.profile.full_name,
            "mobile_number": user.profile.mobile_number,
            "country": user.profile.country,
            "preferred_currency": user.profile.preferred_currency,
            "created_at": user.profile.created_at.isoformat() if user.profile.created_at else None,
            "updated_at": user.profile.updated_at.isoformat() if user.profile.updated_at else None
        }

    return {
        "id": user.id,
        "email": user.email,
        "password_hash": user.password_hash,
        "is_active": user.is_active,
        "is_onboarded": user.is_onboarded,
        "failed_login_attempts": user.failed_login_attempts,
        "locked_until": user.locked_until.isoformat() if user.locked_until else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "profile": profile_dict
    }

def _serialize_account(account: Account) -> Dict[str, Any]:
    # Calculate live reconciled balance: opening_balance_minor + sum(transactions)
    opening_bal = account.opening_balance_minor or 0
    txn_movements = 0
    txn_count = 0
    if hasattr(account, "transactions") and account.transactions:
        active_txns = [t for t in account.transactions if t.status == "active"]
        txn_movements = sum(t.amount_minor for t in active_txns)
        txn_count = len(active_txns)
    current_balance = opening_bal + txn_movements

    return {
        "id": account.id,
        "user_id": account.user_id,
        "nickname": account.nickname,
        "bank": account.bank,
        "type": account.type,
        "masked_last4": account.masked_last4,
        "opening_balance_minor": account.opening_balance_minor,
        "current_balance_minor": current_balance,
        "transaction_count": txn_count,
        "currency": account.currency,
        "is_primary": account.is_primary,
        "status": account.status,
        "account_holder_name": account.account_holder_name,
        "ifsc": account.ifsc,
        "created_at": account.created_at.isoformat() if account.created_at else None
    }

@router.post("/create")
def create_user(payload: CreateUserPayload, db: Session = Depends(get_db)):
    """Creates a new user and profile in the database."""
    normalized_email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email address already exists.")

    user = User(
        id=payload.id,
        email=normalized_email,
        password_hash=payload.password_hash,
        is_active=True,
        is_onboarded=False
    ) if payload.id else User(
        email=normalized_email,
        password_hash=payload.password_hash,
        is_active=True,
        is_onboarded=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = UserProfile(
        user_id=user.id,
        full_name=payload.full_name.strip(),
        mobile_number=payload.mobile_number,
        country=payload.country or "India",
        preferred_currency=payload.preferred_currency or "INR"
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    return _serialize_user(user)

@router.get("/by-email")
def get_user_by_email(email: str = Query(...), db: Session = Depends(get_db)):
    """Retrieves a user by email address."""
    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if not user and normalized_email in (DEMO_USER_EMAIL.lower(), PRIYA_USER_EMAIL.lower()):
        try:
            from seed_demo import ensure_demo_users_seeded
            ensure_demo_users_seeded(db)
            user = db.query(User).filter(User.email.ilike(normalized_email)).first()
        except Exception as e:
            print(f"[FDL] Auto-seed demo on by-email error: {e}")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _serialize_user(user)

@router.get("/{user_id}")
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    """Retrieves a user and accounts by user ID."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user and user_id in (DEMO_USER_ID, PRIYA_USER_ID):
        try:
            from seed_demo import ensure_demo_users_seeded
            ensure_demo_users_seeded(db)
            user = db.query(User).filter_by(id=user_id).first()
        except Exception as e:
            print(f"[FDL] Auto-seed demo on by-id error: {e}")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = _serialize_user(user)
    data["accounts"] = [_serialize_account(a) for a in user.accounts]
    return data

@router.post("/seed-demo")
def seed_demo_endpoint(db: Session = Depends(get_db)):
    """Explicitly triggers demo data provisioning."""
    try:
        from seed_demo import ensure_demo_users_seeded
        ensure_demo_users_seeded(db)
        return {"status": "success", "message": "Demo users ensured"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed demo users: {str(e)}")

@router.post("/{user_id}/lockout")
def update_user_lockout(user_id: str, payload: LockoutPayload, db: Session = Depends(get_db)):
    """Updates failed login attempts and temporary lockout status."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.failed_login_attempts = payload.failed_attempts
    if payload.locked_until:
        try:
            user.locked_until = datetime.fromisoformat(payload.locked_until.replace("Z", "+00:00"))
        except Exception:
            user.locked_until = None
    else:
        user.locked_until = None

    db.commit()
    db.refresh(user)
    return {"status": "success", "failed_login_attempts": user.failed_login_attempts, "locked_until": user.locked_until.isoformat() if user.locked_until else None}

@router.put("/{user_id}/profile")
def update_profile(user_id: str, payload: UpdateProfilePayload, db: Session = Depends(get_db)):
    """Updates personal profile fields for a user."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.profile:
        user.profile = UserProfile(user_id=user.id, full_name="User")
        db.add(user.profile)

    if payload.full_name is not None:
        user.profile.full_name = payload.full_name.strip()
    if payload.mobile_number is not None:
        user.profile.mobile_number = payload.mobile_number
    if payload.country is not None:
        user.profile.country = payload.country
    if payload.preferred_currency is not None:
        user.profile.preferred_currency = payload.preferred_currency

    db.commit()
    db.refresh(user)
    return _serialize_user(user)

@router.post("/{user_id}/onboarding")
def complete_onboarding(user_id: str, payload: OnboardingPayload, db: Session = Depends(get_db)):
    """Completes the onboarding workflow, updates profile, and provisions initial bank accounts."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.profile:
        user.profile = UserProfile(user_id=user.id, full_name=payload.full_name)
        db.add(user.profile)

    user.profile.full_name = payload.full_name.strip()
    user.profile.mobile_number = payload.mobile_number
    user.profile.country = payload.country
    user.profile.preferred_currency = payload.preferred_currency
    user.is_onboarded = True

    # Provision initial bank accounts
    for acct_data in payload.bank_accounts:
        acct = Account(
            user_id=user.id,
            nickname=acct_data.nickname.strip(),
            bank=acct_data.bank.strip(),
            type=acct_data.type,
            masked_last4=acct_data.masked_last4[-4:],
            opening_balance_minor=acct_data.opening_balance_minor,
            currency=acct_data.currency,
            is_primary=acct_data.is_primary,
            account_holder_name=acct_data.account_holder_name,
            ifsc=acct_data.ifsc
        )
        db.add(acct)

    db.commit()
    db.refresh(user)
    return _serialize_user(user)

@router.get("/{user_id}/accounts")
def list_user_accounts(user_id: str, db: Session = Depends(get_db)):
    """Lists bank accounts owned by the specified user."""
    accounts = db.query(Account).filter_by(user_id=user_id, status="active").all()
    return [_serialize_account(a) for a in accounts]

@router.post("/{user_id}/accounts")
def create_user_account(user_id: str, payload: BankAccountPayload, db: Session = Depends(get_db)):
    """Creates a new bank account owned by the specified user."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If this account is marked primary, unset other primary accounts for this user
    if payload.is_primary:
        db.query(Account).filter_by(user_id=user_id, is_primary=True).update({"is_primary": False})

    acct = Account(
        user_id=user_id,
        nickname=payload.nickname.strip(),
        bank=payload.bank.strip(),
        type=payload.type,
        masked_last4=payload.masked_last4[-4:],
        opening_balance_minor=payload.opening_balance_minor,
        currency=payload.currency,
        is_primary=payload.is_primary,
        account_holder_name=payload.account_holder_name,
        ifsc=payload.ifsc
    )
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return _serialize_account(acct)

@router.put("/{user_id}/password")
def update_user_password(user_id: str, payload: UpdatePasswordPayload, db: Session = Depends(get_db)):
    """Updates the password hash for a user."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = payload.new_password_hash
    db.commit()
    db.refresh(user)
    return {"status": "success", "message": "Password updated successfully."}

@router.post("/{user_id}/accounts/{account_id}/primary")
def set_primary_account(user_id: str, account_id: str, db: Session = Depends(get_db)):
    """Sets a specific account as primary and unsets all other accounts for this user."""
    target_acct = db.query(Account).filter_by(id=account_id, user_id=user_id).first()
    if not target_acct:
        raise HTTPException(status_code=404, detail="Bank account not found or access denied")

    db.query(Account).filter_by(user_id=user_id).update({"is_primary": False})
    target_acct.is_primary = True
    db.commit()
    db.refresh(target_acct)
    return _serialize_account(target_acct)

@router.put("/{user_id}/accounts/{account_id}")
def update_user_account(user_id: str, account_id: str, payload: UpdateAccountPayload, db: Session = Depends(get_db)):
    """Updates an existing bank account owned by the specified user."""
    acct = db.query(Account).filter_by(id=account_id, user_id=user_id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Bank account not found or access denied")

    if payload.is_primary is True and not acct.is_primary:
        db.query(Account).filter_by(user_id=user_id, is_primary=True).update({"is_primary": False})

    if payload.nickname is not None:
        acct.nickname = payload.nickname.strip()
    if payload.bank is not None:
        acct.bank = payload.bank.strip()
    if payload.type is not None:
        acct.type = payload.type
    if payload.masked_last4 is not None:
        acct.masked_last4 = payload.masked_last4[-4:]
    if payload.opening_balance_minor is not None:
        acct.opening_balance_minor = payload.opening_balance_minor
    if payload.currency is not None:
        acct.currency = payload.currency
    if payload.is_primary is not None:
        acct.is_primary = payload.is_primary
    if payload.account_holder_name is not None:
        acct.account_holder_name = payload.account_holder_name
    if payload.ifsc is not None:
        acct.ifsc = payload.ifsc

    db.commit()
    db.refresh(acct)
    return _serialize_account(acct)

@router.delete("/{user_id}/accounts/{account_id}")
def delete_user_account(user_id: str, account_id: str, db: Session = Depends(get_db)):
    """Deletes or archives a bank account owned by the specified user."""
    acct = db.query(Account).filter_by(id=account_id, user_id=user_id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Bank account not found or access denied")

    db.delete(acct)
    db.commit()
    return {"status": "success", "message": f"Account {account_id} deleted."}


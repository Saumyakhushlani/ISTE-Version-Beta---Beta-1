"""
Anomaly Detection & User Feedback Router
Exposes flagged spending spikes, unexpected duplicate charges, and new merchants
with mathematical explanations, query filtering, pagination, and user feedback resolution.
Enforces strict multi-user data isolation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from db.database import get_db
from db.models import Anomaly, Transaction, Account, User
from auth import get_current_user

router = APIRouter()

VALID_FEEDBACK_VALUES = {"none", "expected", "real_duplicate", "disputed", "dismissed"}

class AnomalyFeedbackRequest(BaseModel):
    feedback: str  # "expected" | "real_duplicate" | "disputed" | "dismissed" | "none"

class BatchAnomalyFeedbackRequest(BaseModel):
    anomaly_ids: Optional[List[str]] = None
    feedback: str  # "expected" | "real_duplicate" | "disputed" | "dismissed" | "none"
    severity: Optional[str] = None  # e.g. "low", "medium", "high"

@router.get("")
def list_anomalies(
    feedback_filter: Optional[str] = Query("unresolved", description="Filter by feedback: 'unresolved', 'expected', 'real_duplicate', 'disputed', 'duplicates_disputed', 'dismissed', 'all'"),
    type_filter: Optional[str] = Query(None, description="Filter by anomaly type"),
    severity_filter: Optional[str] = Query(None, description="Filter by severity ('low', 'medium', 'high')"),
    months: Optional[int] = Query(None, ge=1, le=60, description="Anomalies detected within last N months"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    account_id: Optional[str] = Query(None, description="Filter by account ID"),
    search: Optional[str] = Query(None, description="Search in anomaly reason text or merchant"),
    min_amount_paise: Optional[int] = Query(None, description="Minimum absolute anomaly amount in paise"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns paginated anomalies with filter support, status counts, and full transaction context.
    Enforces user isolation: only returns anomalies on transactions for current_user's accounts.
    """
    user_accounts = db.query(Account).filter_by(user_id=current_user.id, status="active").all()
    user_account_ids = [a.id for a in user_accounts]

    if account_id and account_id not in user_account_ids:
        return {
            "total": 0,
            "total_anomalies": 0,
            "limit": limit,
            "offset": offset,
            "counts": {
                "total": 0,
                "unresolved": 0,
                "expected": 0,
                "real_duplicate": 0,
                "disputed": 0,
                "dismissed": 0,
            },
            "anomalies": []
        }

    # Compute status counts across all user anomalies for tab badges
    all_user_anomalies = db.query(Anomaly).join(Transaction).filter(Transaction.account_id.in_(user_account_ids)).all()
    counts = {
        "total": len(all_user_anomalies),
        "unresolved": sum(1 for a in all_user_anomalies if (a.user_feedback or "none") == "none"),
        "expected": sum(1 for a in all_user_anomalies if a.user_feedback == "expected"),
        "real_duplicate": sum(1 for a in all_user_anomalies if a.user_feedback == "real_duplicate"),
        "disputed": sum(1 for a in all_user_anomalies if a.user_feedback == "disputed"),
        "dismissed": sum(1 for a in all_user_anomalies if a.user_feedback == "dismissed"),
    }

    query = db.query(Anomaly).join(Transaction).filter(Transaction.account_id.in_(user_account_ids))
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if type_filter:
        query = query.filter(Anomaly.type == type_filter)
    if severity_filter:
        query = query.filter(Anomaly.severity == severity_filter)
    if min_amount_paise is not None:
        query = query.filter((Anomaly.amount_minor >= min_amount_paise) | (Anomaly.amount_minor <= -min_amount_paise))
    if search:
        query = query.filter(Anomaly.reason_text.ilike(f"%{search}%"))

    # Apply feedback filter
    if feedback_filter == "unresolved":
        query = query.filter((Anomaly.user_feedback == "none") | (Anomaly.user_feedback == None))
    elif feedback_filter == "duplicates_disputed":
        query = query.filter(Anomaly.user_feedback.in_(["real_duplicate", "disputed"]))
    elif feedback_filter and feedback_filter != "all":
        query = query.filter(Anomaly.user_feedback == feedback_filter)

    # Relative months filter based on created_at
    if months and not start_date:
        cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)
        query = query.filter(Anomaly.created_at >= cutoff)

    anomalies = query.order_by(Anomaly.created_at.desc()).all()

    anomaly_cards = []
    for a in anomalies:
        txn = db.query(Transaction).filter_by(id=a.txn_id).first()
        acct = db.query(Account).filter_by(id=txn.account_id).first() if txn else None

        # Filter by transaction date if start_date/end_date specified
        if start_date and txn and txn.posted_date < start_date:
            continue
        if end_date and txn and txn.posted_date > end_date:
            continue

        amt = abs(a.amount_minor) if a.amount_minor else (abs(txn.amount_minor) if txn else 0)
        merchant_name = (txn.merchant_id or txn.normalized_description or txn.raw_description or "Unknown Merchant") if txn else "Unknown Merchant"

        anomaly_cards.append({
            "id": a.id,
            "txn_id": a.txn_id,
            "type": a.type,
            "rule_id": a.rule_id,
            "severity": a.severity,
            "reason_text": a.reason_text,
            "amount_paise": amt,
            "amount_minor": amt,
            "amount": amt,
            "user_feedback": a.user_feedback or "none",
            "detected_at": a.created_at.isoformat() if a.created_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "merchant": merchant_name,
            "raw_description": txn.raw_description if txn else "Unknown",
            "normalized_description": txn.normalized_description if txn else merchant_name,
            "posted_date": txn.posted_date if txn else None,
            "channel": txn.channel if txn else "OTHER",
            "bank_name": acct.bank if acct else "Unknown Bank",
            "masked_last4": acct.masked_last4 if acct else "XXXX"
        })

    total = len(anomaly_cards)
    paginated_cards = anomaly_cards[offset : offset + limit]

    return {
        "total": total,
        "total_anomalies": total,
        "limit": limit,
        "offset": offset,
        "counts": counts,
        "anomalies": paginated_cards
    }

def _apply_anomaly_feedback(anomaly_id: str, req: AnomalyFeedbackRequest, current_user: User, db: Session):
    if req.feedback not in VALID_FEEDBACK_VALUES:
        raise HTTPException(status_code=400, detail=f"Invalid feedback. Allowed values: {VALID_FEEDBACK_VALUES}")

    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    a = db.query(Anomaly).join(Transaction).filter(
        Anomaly.id == anomaly_id,
        Transaction.account_id.in_(user_account_ids)
    ).first()
    if not a:
        raise HTTPException(status_code=404, detail="Anomaly not found or access denied.")

    a.user_feedback = req.feedback
    db.commit()
    db.refresh(a)
    return {
        "status": "success",
        "success": True,
        "id": a.id,
        "feedback": a.user_feedback,
        "user_feedback": a.user_feedback
    }

@router.post("/batch-feedback")
def batch_anomaly_feedback(
    req: BatchAnomalyFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits user feedback for multiple anomalies in bulk.
    If anomaly_ids is omitted or empty, updates all unreviewed anomalies (or filtered by severity).
    """
    if req.feedback not in VALID_FEEDBACK_VALUES:
        raise HTTPException(status_code=400, detail=f"Invalid feedback. Allowed values: {VALID_FEEDBACK_VALUES}")

    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    query = db.query(Anomaly).join(Transaction).filter(Transaction.account_id.in_(user_account_ids))

    if req.anomaly_ids:
        query = query.filter(Anomaly.id.in_(req.anomaly_ids))
    else:
        query = query.filter((Anomaly.user_feedback == "none") | (Anomaly.user_feedback == None))

    if req.severity:
        query = query.filter(Anomaly.severity == req.severity)

    items = query.all()
    count = 0
    for a in items:
        a.user_feedback = req.feedback
        count += 1

    db.commit()
    return {
        "status": "success",
        "success": True,
        "count": count,
        "feedback": req.feedback
    }

@router.post("/{anomaly_id}/feedback")
def submit_anomaly_feedback_post(
    anomaly_id: str,
    req: AnomalyFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _apply_anomaly_feedback(anomaly_id, req, current_user, db)

@router.patch("/{anomaly_id}/feedback")
def submit_anomaly_feedback_patch(
    anomaly_id: str,
    req: AnomalyFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _apply_anomaly_feedback(anomaly_id, req, current_user, db)

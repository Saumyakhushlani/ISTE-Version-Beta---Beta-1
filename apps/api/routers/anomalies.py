"""
Anomaly Detection & User Feedback Router
Exposes flagged spending spikes, unexpected duplicate charges, and new merchants
with mathematical explanations, query filtering, pagination, and user feedback resolution.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from db.database import get_db
from db.models import Anomaly, Transaction, Account

router = APIRouter()

class AnomalyFeedbackRequest(BaseModel):
    feedback: str  # "expected" | "real_duplicate" | "disputed" | "none"

@router.get("")
def list_anomalies(
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
    db: Session = Depends(get_db)
):
    """
    Returns paginated anomalies with filter support and full transaction context.
    """
    query = db.query(Anomaly)
    if type_filter:
        query = query.filter(Anomaly.type == type_filter)
    if severity_filter:
        query = query.filter(Anomaly.severity == severity_filter)
    if min_amount_paise is not None:
        query = query.filter((Anomaly.amount_minor >= min_amount_paise) | (Anomaly.amount_minor <= -min_amount_paise))
    if search:
        query = query.filter(Anomaly.reason_text.ilike(f"%{search}%"))

    # Relative months filter based on created_at
    if months and not start_date:
        cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)
        query = query.filter(Anomaly.created_at >= cutoff)

    anomalies = query.order_by(Anomaly.created_at.desc()).all()

    anomaly_cards = []
    for a in anomalies:
        txn = db.query(Transaction).filter_by(id=a.txn_id).first()
        acct = db.query(Account).filter_by(id=txn.account_id).first() if txn else None

        # Filter by account_id if specified
        if account_id and txn and txn.account_id != account_id:
            continue

        # Filter by transaction date if start_date/end_date specified
        if start_date and txn and txn.posted_date < start_date:
            continue
        if end_date and txn and txn.posted_date > end_date:
            continue

        amt = abs(a.amount_minor) if a.amount_minor else (abs(txn.amount_minor) if txn else 0)

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
            "user_feedback": a.user_feedback,
            "detected_at": a.created_at.isoformat() if a.created_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "raw_description": txn.raw_description if txn else "Unknown",
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
        "anomalies": paginated_cards
    }

def _apply_anomaly_feedback(anomaly_id: str, req: AnomalyFeedbackRequest, db: Session):
    a = db.query(Anomaly).filter_by(id=anomaly_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Anomaly not found.")

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

@router.post("/{anomaly_id}/feedback")
def submit_anomaly_feedback_post(
    anomaly_id: str,
    req: AnomalyFeedbackRequest,
    db: Session = Depends(get_db)
):
    return _apply_anomaly_feedback(anomaly_id, req, db)

@router.patch("/{anomaly_id}/feedback")
def submit_anomaly_feedback_patch(
    anomaly_id: str,
    req: AnomalyFeedbackRequest,
    db: Session = Depends(get_db)
):
    return _apply_anomaly_feedback(anomaly_id, req, db)

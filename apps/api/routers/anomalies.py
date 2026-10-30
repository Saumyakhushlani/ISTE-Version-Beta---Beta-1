"""
Anomaly Detection & User Feedback Router
Exposes flagged spending spikes, unexpected duplicate charges, and new merchants
with mathematical explanations and user feedback resolution.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from db.database import get_db
from db.models import Anomaly, Transaction, Account

router = APIRouter()

class AnomalyFeedbackRequest(BaseModel):
    feedback: str  # "expected" | "real_duplicate" | "disputed" | "none"

@router.get("")
def list_anomalies(
    type_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns all flagged anomalies with mathematical explanation cards and transaction details.
    """
    query = db.query(Anomaly)
    if type_filter:
        query = query.filter(Anomaly.type == type_filter)
    if severity_filter:
        query = query.filter(Anomaly.severity == severity_filter)

    anomalies = query.order_by(Anomaly.created_at.desc()).all()

    anomaly_cards = []
    for a in anomalies:
        txn = db.query(Transaction).filter_by(id=a.txn_id).first()
        acct = db.query(Account).filter_by(id=txn.account_id).first() if txn else None

        anomaly_cards.append({
            "id": a.id,
            "txn_id": a.txn_id,
            "type": a.type,
            "rule_id": a.rule_id,
            "severity": a.severity,
            "reason_text": a.reason_text,
            "amount_paise": a.amount_minor,
            "user_feedback": a.user_feedback,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "transaction_details": {
                "posted_date": txn.posted_date if txn else None,
                "merchant": (txn.merchant_id or txn.normalized_description) if txn else "Unknown",
                "raw_description": txn.raw_description if txn else "",
                "channel": txn.channel if txn else "OTHER",
                "bank": acct.bank if acct else "Unknown Bank",
                "masked_last4": acct.masked_last4 if acct else "XXXX"
            }
        })

    return {
        "total_anomalies": len(anomaly_cards),
        "high_severity_count": sum(1 for a in anomaly_cards if a["severity"] == "high"),
        "anomalies": anomaly_cards
    }

@router.post("/{anomaly_id}/feedback")
def submit_anomaly_feedback(
    anomaly_id: str,
    payload: AnomalyFeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Records user feedback for an anomaly:
    - 'expected': User confirms this was an intentional unusual charge
    - 'real_duplicate': User confirms merchant double-charged them (or genuine duplicate)
    - 'disputed': User is disputing this charge with the bank
    """
    anomaly = db.query(Anomaly).filter_by(id=anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly flag record not found.")

    anomaly.user_feedback = payload.feedback
    db.commit()
    db.refresh(anomaly)

    return {
        "status": "success",
        "anomaly_id": anomaly.id,
        "user_feedback": anomaly.user_feedback
    }

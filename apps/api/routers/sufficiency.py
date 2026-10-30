"""
Data Sufficiency Gate Router
Evaluates data sufficiency on the live database transactions before
allowing ungrounded financial decisions.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Transaction, SourceFile
from engine.sufficiency import evaluate_data_sufficiency

router = APIRouter()

@router.get("")
def get_data_sufficiency(db: Session = Depends(get_db)):
    """
    Evaluates the 4-point data gate against all active transactions:
    - History length >= 90 days
    - No activity gaps > 7 days
    - Verified recurring income credits
    - Balance reconciliation status
    """
    txns = db.query(Transaction).filter_by(status="active").all()
    source_files = db.query(SourceFile).all()

    txn_dicts = [
        {
            "id": t.id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "is_transfer": t.is_transfer
        }
        for t in txns
    ]

    sf_dicts = [
        {
            "id": sf.id,
            "reconciliation_status": sf.reconciliation_status
        }
        for sf in source_files
    ]

    report = evaluate_data_sufficiency(txn_dicts, sf_dicts)
    return report

"""
Data Sufficiency Gate Router
Evaluates data sufficiency on the live database transactions before
allowing ungrounded financial decisions.
Enforces strict multi-user data isolation.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Transaction, SourceFile, Account, User
from auth import get_current_user
from engine.sufficiency import evaluate_data_sufficiency

router = APIRouter()

@router.get("")
def get_data_sufficiency(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates the 4-point data gate against all active transactions owned by current_user:
    - History length >= 90 days
    - No activity gaps > 7 days
    - Verified recurring income credits
    - Balance reconciliation status
    Enforces user isolation via current_user.id.
    """
    user_accounts = db.query(Account).filter_by(user_id=current_user.id, status="active").all()
    user_account_ids = [a.id for a in user_accounts]

    txns = db.query(Transaction).filter(
        Transaction.status == "active",
        Transaction.account_id.in_(user_account_ids)
    ).all()

    source_files = db.query(SourceFile).filter(
        SourceFile.account_id.in_(user_account_ids)
    ).all()

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

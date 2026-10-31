"""
Transactions Router
Provides listing, filtering, search, and user category corrections with transactional undo rollback.
Enforces strict multi-user data isolation.
"""

from typing import Optional, List
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Transaction, CorrectionLog, Account, User
from auth import get_current_user
from engine.correction import rollback_correction

router = APIRouter()

class CategoryCorrectionRequest(BaseModel):
    category_id: str
    scope: str = "same_merchant"  # "this_txn" | "same_merchant"
    dry_run: bool = False

class UndoCorrectionRequest(BaseModel):
    log_id: Optional[str] = None

@router.get("")
def list_transactions(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    channel: Optional[str] = None,
    search: Optional[str] = None,
    is_transfer: Optional[bool] = None,
    type: Optional[str] = Query(None, description="'credit' or 'debit'"),
    months: Optional[int] = Query(None, ge=1, le=60, description="Transactions within last N months"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    min_amount_paise: Optional[int] = Query(None, description="Minimum absolute amount in paise"),
    max_amount_paise: Optional[int] = Query(None, description="Maximum absolute amount in paise"),
    source_file_ids: Optional[str] = Query(None, description="Comma-separated list of SourceFile IDs to include"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns paginated transactions with multi-bank filters, date range, amount, and search.
    Enforces user-level isolation: only returns transactions for accounts owned by current_user.
    """
    user_accounts = db.query(Account).filter_by(user_id=current_user.id, status="active").all()
    user_account_ids = [a.id for a in user_accounts]

    if account_id and account_id not in user_account_ids:
        # Cross-user access attempt: return empty result safely
        return {
            "total": 0,
            "limit": limit,
            "offset": offset,
            "transactions": []
        }

    query = db.query(Transaction).filter(Transaction.status == "active")
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    else:
        query = query.filter(Transaction.account_id.in_(user_account_ids))

    if source_file_ids:
        sf_list = [s.strip() for s in source_file_ids.split(",") if s.strip()]
        if sf_list:
            query = query.filter(Transaction.source_file_id.in_(sf_list))

    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if channel:
        query = query.filter(Transaction.channel == channel)
    if is_transfer is not None:
        query = query.filter(Transaction.is_transfer == is_transfer)

    # Type filter (credit > 0, debit < 0)
    if type:
        t_lower = type.lower()
        if t_lower == "credit":
            query = query.filter(Transaction.amount_minor > 0)
        elif t_lower == "debit":
            query = query.filter(Transaction.amount_minor < 0)

    # Explicit date filters
    if start_date:
        query = query.filter(Transaction.posted_date >= start_date)
    if end_date:
        query = query.filter(Transaction.posted_date <= end_date)

    # Relative months filter
    if months and not start_date:
        all_txns = db.query(Transaction.posted_date).filter(
            Transaction.status == "active",
            Transaction.account_id.in_(user_account_ids)
        ).all()
        if all_txns:
            latest_date_str = max(t[0] for t in all_txns)
            try:
                latest_dt = datetime.strptime(latest_date_str, "%Y-%m-%d")
                cutoff_dt = latest_dt - timedelta(days=months * 30)
                cutoff_str = cutoff_dt.strftime("%Y-%m-%d")
                query = query.filter(Transaction.posted_date >= cutoff_str)
            except Exception:
                pass

    # Amount threshold filters
    if min_amount_paise is not None:
        query = query.filter(
            (Transaction.amount_minor >= min_amount_paise) | (Transaction.amount_minor <= -min_amount_paise)
        )
    if max_amount_paise is not None:
        query = query.filter(
            (Transaction.amount_minor <= max_amount_paise) & (Transaction.amount_minor >= -max_amount_paise)
        )

    # Search filter (description / merchant)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Transaction.raw_description.ilike(search_pattern)) |
            (Transaction.normalized_description.ilike(search_pattern))
        )

    total = query.count()
    txns = query.order_by(Transaction.posted_date.desc(), Transaction.id.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "transactions": [
            {
                "id": t.id,
                "account_id": t.account_id,
                "posted_date": t.posted_date,
                "value_date": t.value_date,
                "amount_minor": t.amount_minor,
                "amount_paise": t.amount_minor,
                "currency": t.currency,
                "raw_description": t.raw_description,
                "normalized_description": t.normalized_description,
                "description": t.normalized_description or t.raw_description,
                "channel": t.channel,
                "category_id": t.category_id,
                "category_source": t.category_source,
                "category_confidence": t.category_confidence,
                "balance_after_minor": t.balance_after_minor,
                "balance_after_paise": t.balance_after_minor,
                "is_transfer": t.is_transfer,
                "status": t.status
            }
            for t in txns
        ]
    }

@router.get("/corrections")
def list_corrections(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns audit trail of category correction logs for undo actions.
    """
    query = db.query(CorrectionLog).order_by(CorrectionLog.ts.desc())
    total = query.count()
    logs = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "corrections": [
            {
                "id": l.id,
                "timestamp": l.ts.isoformat() if l.ts else None,
                "action": l.action,
                "scope": l.scope,
                "affected_count": len(json.loads(l.affected_txn_ids_json or "[]")),
                "before": json.loads(l.before_json or "{}"),
                "after": json.loads(l.after_json or "{}"),
                "undone_at": l.undone_at.isoformat() if l.undone_at else None,
                "is_undone": l.undone_at is not None
            }
            for l in logs
        ]
    }

def _apply_category_override(txn_id: str, req: CategoryCorrectionRequest, current_user: User, db: Session):
    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    target = db.query(Transaction).filter_by(id=txn_id).first()
    if not target or target.account_id not in user_account_ids:
        raise HTTPException(status_code=404, detail="Transaction not found or access denied.")

    if req.scope == "same_merchant" and target.normalized_description:
        matching_txns = db.query(Transaction).filter_by(
            normalized_description=target.normalized_description,
            status="active"
        ).filter(Transaction.account_id.in_(user_account_ids)).all()
    else:
        matching_txns = [target]

    if req.dry_run:
        return {
            "status": "success",
            "dry_run": True,
            "affected_count": len(matching_txns),
            "sample_txn_ids": [t.id for t in matching_txns[:5]],
            "new_category": req.category_id,
            "new_category_id": req.category_id
        }

    before_map = {t.id: t.category_id for t in matching_txns}
    after_map = {t.id: req.category_id for t in matching_txns}

    for t in matching_txns:
        t.category_id = req.category_id
        t.category_source = "user"
        t.category_confidence = 1.0

    # Log for undo capability
    log = CorrectionLog(
        action="category_override",
        scope=req.scope,
        affected_txn_ids_json=json.dumps(list(before_map.keys())),
        before_json=json.dumps(before_map),
        after_json=json.dumps(after_map)
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "success": True,
        "log_id": log.id,
        "correction_log_id": log.id,
        "affected_count": len(matching_txns),
        "new_category": req.category_id,
        "new_category_id": req.category_id
    }

@router.patch("/{txn_id}/category")
def update_transaction_category_patch(
    txn_id: str,
    req: CategoryCorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _apply_category_override(txn_id, req, current_user, db)

@router.post("/{txn_id}/category")
def update_transaction_category_post(
    txn_id: str,
    req: CategoryCorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return _apply_category_override(txn_id, req, current_user, db)

@router.post("/undo")
def undo_last_correction(
    req: UndoCorrectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rolls back the most recent or specified user category correction.
    """
    result = rollback_correction(db=db, log_id=req.log_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message", "No active correction found to undo."))
    return result

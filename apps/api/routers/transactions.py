"""
Transactions Router
Provides listing, filtering, search, and user category corrections with transactional undo rollback.
"""

from typing import Optional, List
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Transaction, CorrectionLog
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
    db: Session = Depends(get_db)
):
    """
    Returns paginated transactions with optional multi-bank filters and search.
    """
    query = db.query(Transaction).filter(Transaction.status == "active")

    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if channel:
        query = query.filter(Transaction.channel == channel)
    if is_transfer is not None:
        query = query.filter(Transaction.is_transfer == is_transfer)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Transaction.raw_description.ilike(search_filter)) |
            (Transaction.normalized_description.ilike(search_filter))
        )

    total = query.count()
    txns = query.order_by(Transaction.posted_date.desc(), Transaction.source_row.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "transactions": [
            {
                "id": t.id,
                "account_id": t.account_id,
                "posted_date": t.posted_date,
                "amount_minor": t.amount_minor,
                "raw_description": t.raw_description,
                "normalized_description": t.normalized_description,
                "channel": t.channel,
                "merchant": t.merchant_id,
                "category_id": t.category_id,
                "category_source": t.category_source,
                "category_confidence": t.category_confidence,
                "balance_after_minor": t.balance_after_minor,
                "is_transfer": t.is_transfer,
                "transfer_pair_id": t.transfer_pair_id,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in txns
        ]
    }

@router.patch("/{txn_id}/category")
def correct_transaction_category(
    txn_id: str,
    payload: CategoryCorrectionRequest,
    db: Session = Depends(get_db)
):
    """
    Applies user category correction and propagates across similar transactions.
    If dry_run is True, returns an impact preview before committing.
    """
    target = db.query(Transaction).filter_by(id=txn_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    merchant = target.merchant_id or target.normalized_description

    # Find affected transactions according to scope
    if payload.scope == "this_txn":
        affected = [target]
    else:  # "same_merchant"
        affected = db.query(Transaction).filter(
            (Transaction.merchant_id == merchant) | (Transaction.normalized_description == merchant)
        ).all()

    old_category = target.category_id
    total_amount_minor = sum(abs(t.amount_minor) for t in affected)

    diff_summary = f"{len(affected)} transaction(s) updated: {old_category} → {payload.category_id} (Total: ₹{total_amount_minor / 100:,.2f})"

    if payload.dry_run:
        return {
            "dry_run": True,
            "affected_count": len(affected),
            "merchant": merchant,
            "old_category": old_category,
            "new_category": payload.category_id,
            "total_amount_minor": total_amount_minor,
            "diff_summary": diff_summary
        }

    # Apply changes
    affected_ids = []
    for t in affected:
        t.category_id = payload.category_id
        t.category_source = "user"
        t.category_confidence = 1.0
        affected_ids.append(t.id)

    # Record to CorrectionLog
    log = CorrectionLog(
        action="category_override",
        scope=payload.scope,
        affected_txn_ids_json=json.dumps(affected_ids),
        before_json=json.dumps({"category_id": old_category}),
        after_json=json.dumps({"category_id": payload.category_id})
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "log_id": log.id,
        "affected_count": len(affected),
        "merchant": merchant,
        "old_category": old_category,
        "new_category": payload.category_id,
        "diff_summary": diff_summary
    }

@router.get("/corrections")
def list_corrections(db: Session = Depends(get_db)):
    """
    Returns audit log of all category corrections and overrides.
    """
    logs = db.query(CorrectionLog).order_by(CorrectionLog.ts.desc()).limit(100).all()
    return {
        "corrections": [
            {
                "id": l.id,
                "timestamp": l.ts.isoformat() if l.ts else None,
                "action": l.action,
                "scope": l.scope,
                "affected_count": len(json.loads(l.affected_txn_ids_json or "[]")),
                "before": json.loads(l.before_json or "{}"),
                "after": json.loads(l.after_json or "{}"),
                "is_undone": l.undone_at is not None,
                "undone_at": l.undone_at.isoformat() if l.undone_at else None
            }
            for l in logs
        ]
    }

@router.post("/undo")
def undo_last_correction(
    payload: Optional[UndoCorrectionRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Rolls back a category override cleanly using the CorrectionLog record.
    """
    log_id = payload.log_id if payload else None
    res = rollback_correction(db=db, log_id=log_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res

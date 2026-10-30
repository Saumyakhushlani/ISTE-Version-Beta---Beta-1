"""
Transactions Router
Provides listing, filtering, search, and user category corrections.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import json

from db.database import get_db
from db.models import Transaction, CorrectionLog

router = APIRouter()

class CategoryCorrectionRequest(BaseModel):
    category_id: str
    scope: str = "same_merchant"  # "this_txn" | "same_merchant" | "similar"
    dry_run: bool = False

@router.get("")
def list_transactions(
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Returns filtered active transactions with source provenance and category status.
    """
    query = db.query(Transaction).filter_by(status="active")

    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(Transaction.raw_description.ilike(search_filter) | Transaction.normalized_description.ilike(search_filter))

    total = query.count()
    txns = query.order_by(Transaction.posted_date.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
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
        "affected_count": len(affected),
        "merchant": merchant,
        "old_category": old_category,
        "new_category": payload.category_id,
        "diff_summary": diff_summary
    }

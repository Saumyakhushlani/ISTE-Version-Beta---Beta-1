"""
Recurring Payments & Upcoming Timeline Router
Provides listing of recurring obligations, upcoming payment calendars with bank attribution,
and user confirmation/editing.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from db.database import get_db
from db.models import RecurringItem, Account, Transaction
from engine.recurring import generate_upcoming_schedule

router = APIRouter()

class EditRecurringRequest(BaseModel):
    user_status: Optional[str] = None  # "confirmed" | "rejected" | "auto"
    typical_amount_minor: Optional[int] = None
    next_expected_date: Optional[str] = None

@router.get("")
def list_recurring_items(
    type_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns all recurring obligations (Salary, Rent, EMI, Subscriptions, SIP/FD).
    """
    query = db.query(RecurringItem).filter_by(status="active")
    if type_filter:
        query = query.filter(RecurringItem.type == type_filter)
    
    items = query.all()
    return {
        "total": len(items),
        "recurring_items": [
            {
                "id": r.id,
                "merchant": r.merchant,
                "type": r.type,
                "cadence": r.cadence,
                "typical_amount_paise": r.typical_amount_minor,
                "amount_min_paise": r.amount_min_minor,
                "amount_max_paise": r.amount_max_minor,
                "last_paid_date": r.last_paid_date,
                "next_expected_date": r.next_expected_date,
                "occurrences": r.occurrences,
                "confidence": r.confidence,
                "user_status": r.user_status
            }
            for r in items
        ]
    }

@router.get("/upcoming")
def get_upcoming_schedule(
    days: int = Query(30, description="Projection horizon in days (e.g. 7, 14, 30)"),
    as_of_date: Optional[str] = Query(None, description="Anchor date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    Returns chronological timeline of upcoming deductions for the next N days:
    - Due Date and Day of Month
    - Payment purpose (e.g. Rent, Home Loan EMI, Netflix)
    - Deducting Bank Name and masked last 4 digits
    - Amount in paise
    """
    items = db.query(RecurringItem).filter_by(status="active").all()
    accounts = db.query(Account).all()
    accounts_map = {
        a.id: {"bank": a.bank, "masked_last4": a.masked_last4, "nickname": a.nickname}
        for a in accounts
    }

    # Match each recurring item to an account using latest transaction
    item_dicts = []
    for r in items:
        # Find latest transaction for this merchant to locate originating account
        txn = db.query(Transaction).filter(
            (Transaction.merchant_id == r.merchant) | (Transaction.normalized_description == r.merchant)
        ).order_by(Transaction.posted_date.desc()).first()

        acct_id = txn.account_id if txn else (accounts[0].id if accounts else None)

        item_dicts.append({
            "id": r.id,
            "merchant": r.merchant,
            "type": r.type,
            "cadence": r.cadence,
            "typical_amount_minor": r.typical_amount_minor,
            "last_paid_date": r.last_paid_date,
            "confidence": r.confidence,
            "account_id": acct_id
        })

    schedule = generate_upcoming_schedule(
        recurring_items=item_dicts,
        accounts_map=accounts_map,
        as_of_date=as_of_date,
        horizon_days=days
    )

    total_upcoming_outflows_paise = sum(s["amount_paise"] for s in schedule if not s["is_income"])
    total_upcoming_inflows_paise = sum(s["amount_paise"] for s in schedule if s["is_income"])

    return {
        "horizon_days": days,
        "total_scheduled_count": len(schedule),
        "total_upcoming_outflows_paise": total_upcoming_outflows_paise,
        "total_upcoming_inflows_paise": total_upcoming_inflows_paise,
        "schedule": schedule
    }

@router.patch("/{item_id}")
def edit_recurring_item(
    item_id: str,
    payload: EditRecurringRequest,
    db: Session = Depends(get_db)
):
    """
    Allows user to confirm, reject, or edit date/amount of an auto-detected recurring item.
    """
    item = db.query(RecurringItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found.")

    if payload.user_status:
        item.user_status = payload.user_status
        if payload.user_status == "rejected":
            item.status = "paused"
    if payload.typical_amount_minor is not None:
        item.typical_amount_minor = payload.typical_amount_minor
    if payload.next_expected_date:
        item.next_expected_date = payload.next_expected_date

    db.commit()
    db.refresh(item)

    return {"status": "success", "item_id": item.id, "user_status": item.user_status}

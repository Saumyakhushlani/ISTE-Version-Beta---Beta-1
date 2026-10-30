"""
Recurring Payments & Upcoming Timeline Router
Provides listing of recurring obligations, upcoming payment calendars with bank attribution,
query filtering, pagination, and user confirmation/editing.
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
    type_filter: Optional[str] = Query(None, description="Filter by type (salary, emi, rent, etc.)"),
    cadence: Optional[str] = Query(None, description="Filter by cadence (monthly, weekly, etc.)"),
    search: Optional[str] = Query(None, description="Search by merchant name"),
    min_amount_paise: Optional[int] = Query(None, description="Minimum typical amount in paise"),
    max_amount_paise: Optional[int] = Query(None, description="Maximum typical amount in paise"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns paginated recurring obligations with filter options.
    """
    query = db.query(RecurringItem).filter_by(status="active")
    if type_filter:
        query = query.filter(RecurringItem.type == type_filter)
    if cadence:
        query = query.filter(RecurringItem.cadence == cadence)
    if min_amount_paise is not None:
        query = query.filter(RecurringItem.typical_amount_minor >= min_amount_paise)
    if max_amount_paise is not None:
        query = query.filter(RecurringItem.typical_amount_minor <= max_amount_paise)
    if search:
        query = query.filter(RecurringItem.merchant.ilike(f"%{search}%"))

    total = query.count()
    items = query.order_by(RecurringItem.typical_amount_minor.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "recurring_items": [
            {
                "id": r.id,
                "merchant": r.merchant,
                "type": r.type,
                "cadence": r.cadence,
                "typical_amount_paise": r.typical_amount_minor,
                "typical_amount_minor": r.typical_amount_minor,
                "amount_paise": r.typical_amount_minor,
                "amount_minor": r.typical_amount_minor,
                "amount_min_paise": r.amount_min_minor,
                "amount_min_minor": r.amount_min_minor,
                "amount_max_paise": r.amount_max_minor,
                "amount_max_minor": r.amount_max_minor,
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
def get_upcoming_schedule_endpoint(
    days: int = Query(30, description="Projection horizon in days"),
    months: Optional[int] = Query(None, ge=1, le=12, description="Alternative horizon in months"),
    as_of_date: Optional[str] = Query(None, description="Anchor date YYYY-MM-DD"),
    account_id: Optional[str] = Query(None, description="Filter payments by account ID"),
    type_filter: Optional[str] = Query(None, description="Filter by payment type"),
    is_income: Optional[bool] = Query(None, description="Filter by income vs expense"),
    search: Optional[str] = Query(None, description="Search by merchant"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Returns upcoming payment schedule with bank attribution, pagination, and multi-filter support.
    """
    effective_days = (months * 30) if months else days

    accounts_db = db.query(Account).all()
    accounts_map = {
        a.id: {"bank": a.bank, "masked_last4": a.masked_last4}
        for a in accounts_db
    }

    query = db.query(RecurringItem).filter_by(status="active")
    if type_filter:
        query = query.filter(RecurringItem.type == type_filter)
    if search:
        query = query.filter(RecurringItem.merchant.ilike(f"%{search}%"))

    rec_items = query.all()
    item_dicts = []
    for r in rec_items:
        last_t = db.query(Transaction).filter(
            Transaction.raw_description.ilike(f"%{r.merchant[:10]}%"),
            Transaction.status == "active"
        ).order_by(Transaction.posted_date.desc()).first()

        item_acct = last_t.account_id if last_t else (accounts_db[0].id if accounts_db else None)

        item_dicts.append({
            "id": r.id,
            "merchant": r.merchant,
            "type": r.type,
            "cadence": r.cadence,
            "typical_amount_minor": r.typical_amount_minor,
            "last_paid_date": r.last_paid_date,
            "next_expected_date": r.next_expected_date,
            "confidence": r.confidence,
            "user_status": r.user_status,
            "account_id": item_acct
        })

    schedule = generate_upcoming_schedule(
        recurring_items=item_dicts,
        accounts_map=accounts_map,
        as_of_date=as_of_date,
        horizon_days=effective_days
    )

    if account_id:
        schedule = [s for s in schedule if s.get("account_id") == account_id]
    if is_income is not None:
        schedule = [s for s in schedule if s.get("is_income") == is_income]

    total = len(schedule)
    paginated_schedule = schedule[offset : offset + limit]

    return {
        "horizon_days": effective_days,
        "as_of_date": as_of_date,
        "total": total,
        "total_scheduled_count": total,
        "limit": limit,
        "offset": offset,
        "upcoming_payments": paginated_schedule,
        "schedule": paginated_schedule
    }

@router.patch("/{item_id}")
def update_recurring_item(
    item_id: str,
    req: EditRecurringRequest,
    db: Session = Depends(get_db)
):
    """
    Allows user to confirm, reject, or edit an auto-detected recurring obligation.
    """
    item = db.query(RecurringItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found.")

    if req.user_status:
        item.user_status = req.user_status
        if req.user_status == "rejected":
            item.status = "paused"
    if req.typical_amount_minor is not None:
        item.typical_amount_minor = req.typical_amount_minor
    if req.next_expected_date:
        item.next_expected_date = req.next_expected_date

    db.commit()
    db.refresh(item)
    return {
        "success": True,
        "item": {
            "id": item.id,
            "merchant": item.merchant,
            "user_status": item.user_status,
            "typical_amount_minor": item.typical_amount_minor,
            "typical_amount_paise": item.typical_amount_minor,
            "next_expected_date": item.next_expected_date
        }
    }

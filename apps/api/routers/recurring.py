"""
Recurring Payments & Upcoming Timeline Router
Provides listing of recurring obligations, upcoming payment calendars with bank attribution,
query filtering, pagination, user confirmation, batch confirmation, and editing.
Enforces strict multi-user data isolation.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from db.database import get_db
from db.models import RecurringItem, Account, Transaction, User
from auth import get_current_user
from engine.recurring import generate_upcoming_schedule

router = APIRouter()

class EditRecurringRequest(BaseModel):
    user_status: Optional[str] = None  # "confirmed" | "rejected" | "auto"
    typical_amount_minor: Optional[int] = None
    next_expected_date: Optional[str] = None
    merchant: Optional[str] = None
    type: Optional[str] = None
    cadence: Optional[str] = None

class BatchConfirmRequest(BaseModel):
    item_ids: Optional[List[str]] = None  # If empty or None, confirms all active auto-detected items

@router.get("")
def list_recurring_items(
    type_filter: Optional[str] = Query(None, description="Filter by type (salary, emi, rent, etc.)"),
    cadence: Optional[str] = Query(None, description="Filter by cadence (monthly, weekly, etc.)"),
    search: Optional[str] = Query(None, description="Search by merchant name"),
    min_amount_paise: Optional[int] = Query(None, description="Minimum typical amount in paise"),
    max_amount_paise: Optional[int] = Query(None, description="Maximum typical amount in paise"),
    status_filter: Optional[str] = Query("active", description="Filter by status (active, paused, all)"),
    user_status_filter: Optional[str] = Query(None, description="Filter by user_status (auto, confirmed, rejected, all)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns paginated recurring obligations with filter options and badge counts.
    Enforces user isolation via current_user.id.
    """
    # Calculate counts across user's recurring items for UI tabs and badges
    all_user_items = db.query(RecurringItem).filter_by(user_id=current_user.id).all()
    active_count = sum(1 for r in all_user_items if r.status == "active")
    needs_review_count = sum(1 for r in all_user_items if r.status == "active" and r.user_status == "auto")
    confirmed_count = sum(1 for r in all_user_items if r.status == "active" and r.user_status == "confirmed")
    dismissed_count = sum(1 for r in all_user_items if r.status == "paused" or r.user_status == "rejected")

    query = db.query(RecurringItem).filter_by(user_id=current_user.id)
    if status_filter and status_filter != "all":
        query = query.filter(RecurringItem.status == status_filter)
    if user_status_filter and user_status_filter != "all":
        query = query.filter(RecurringItem.user_status == user_status_filter)
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
        "counts": {
            "all_active": active_count,
            "needs_review": needs_review_count,
            "confirmed": confirmed_count,
            "dismissed": dismissed_count,
        },
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
                "status": r.status,
                "user_status": r.user_status,
                "is_manual": r.is_manual
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns upcoming payment schedule with bank attribution, pagination, and multi-filter support.
    Enforces user isolation via current_user.id. Only active (non-rejected) recurring items are projected.
    """
    effective_days = (months * 30) if months else days

    accounts_db = db.query(Account).filter_by(user_id=current_user.id, status="active").all()
    accounts_map = {
        a.id: {"bank": a.bank, "masked_last4": a.masked_last4}
        for a in accounts_db
    }

    query = db.query(RecurringItem).filter_by(user_id=current_user.id, status="active")
    if type_filter:
        query = query.filter(RecurringItem.type == type_filter)
    if search:
        query = query.filter(RecurringItem.merchant.ilike(f"%{search}%"))

    rec_items = query.all()
    user_account_ids = [a.id for a in accounts_db]

    item_dicts = []
    for r in rec_items:
        last_t = db.query(Transaction).filter(
            Transaction.raw_description.ilike(f"%{r.merchant[:10]}%"),
            Transaction.status == "active",
            Transaction.account_id.in_(user_account_ids)
        ).order_by(Transaction.posted_date.desc()).first()

        item_acct = r.account_id or (last_t.account_id if last_t else (accounts_db[0].id if accounts_db else None))

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

@router.post("/batch-confirm")
def batch_confirm_recurring_items(
    req: BatchConfirmRequest = BatchConfirmRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirms multiple auto-detected recurring items at once.
    If item_ids is omitted or empty, confirms all active items with user_status='auto'.
    """
    query = db.query(RecurringItem).filter_by(user_id=current_user.id, status="active")
    if req.item_ids:
        query = query.filter(RecurringItem.id.in_(req.item_ids))
    else:
        query = query.filter(RecurringItem.user_status == "auto")

    items_to_confirm = query.all()
    count = 0
    for item in items_to_confirm:
        item.user_status = "confirmed"
        count += 1

    db.commit()
    return {
        "success": True,
        "confirmed_count": count
    }

@router.patch("/{item_id}")
def update_recurring_item(
    item_id: str,
    req: EditRecurringRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows user to confirm, reject, or edit an auto-detected recurring obligation.
    Enforces user isolation via current_user.id.
    """
    item = db.query(RecurringItem).filter_by(id=item_id, user_id=current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring item not found or access denied.")

    if req.user_status:
        item.user_status = req.user_status
        if req.user_status == "rejected":
            item.status = "paused"
        elif req.user_status in ("confirmed", "auto"):
            item.status = "active"

    if req.typical_amount_minor is not None:
        if req.typical_amount_minor <= 0:
            raise HTTPException(status_code=400, detail="typical_amount_minor must be a positive integer in paise.")
        item.typical_amount_minor = req.typical_amount_minor
        item.is_manual = True

    if req.next_expected_date:
        try:
            datetime.strptime(req.next_expected_date, "%Y-%m-%d")
            item.next_expected_date = req.next_expected_date
            item.is_manual = True
        except ValueError:
            raise HTTPException(status_code=400, detail="next_expected_date must be in YYYY-MM-DD format.")

    if req.merchant:
        item.merchant = req.merchant.strip()
    if req.type:
        item.type = req.type
    if req.cadence:
        item.cadence = req.cadence

    db.commit()
    db.refresh(item)
    return {
        "success": True,
        "item": {
            "id": item.id,
            "merchant": item.merchant,
            "type": item.type,
            "cadence": item.cadence,
            "status": item.status,
            "user_status": item.user_status,
            "typical_amount_minor": item.typical_amount_minor,
            "typical_amount_paise": item.typical_amount_minor,
            "next_expected_date": item.next_expected_date,
            "occurrences": item.occurrences,
            "confidence": item.confidence,
            "is_manual": item.is_manual
        }
    }

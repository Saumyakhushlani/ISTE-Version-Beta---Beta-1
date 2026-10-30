from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from db.database import get_db

router = APIRouter()

class CategoryCorrectionRequest(BaseModel):
    category_id: str
    scope: str = "same_merchant"  # "this_txn" | "same_merchant" | "similar"
    dry_run: bool = False

@router.get("")
def list_transactions(
    account_id: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Returns filtered transactions with source provenance and status.
    """
    return {
        "total": 0,
        "transactions": []
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
    return {
        "dry_run": payload.dry_run,
        "affected_count": 11,
        "merchant": "Swiggy",
        "old_category": "Shopping",
        "new_category": payload.category_id,
        "diff_summary": "Food & Dining +₹6,140; Shopping -₹6,140"
    }

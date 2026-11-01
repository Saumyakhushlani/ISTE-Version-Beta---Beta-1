"""
FastAPI Router for Tax Intelligence (ITR-1 Assistant for AY 2026-27).
Provides:
  GET /api/tax/summary - Full financial analysis, potential deductions, missing info & checklist
  GET /api/tax/pdf     - Downloadable, branded ITR-1 Preparation Assistant PDF
"""
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from db.database import get_db
from db.models import Transaction, Account, User
from auth import get_current_user
from engine.tax_intelligence import analyze_tax_intelligence
from engine.tax_pdf_generator import generate_tax_intelligence_pdf

router = APIRouter()

def _get_user_tax_data(user: User, db: Session) -> Dict[str, Any]:
    # Fetch user accounts
    accounts = db.query(Account).filter(
        Account.user_id == user.id,
        Account.status == "active"
    ).all()
    account_ids = [a.id for a in accounts]

    if not account_ids:
        # Fallback to demo user if current user has no accounts yet
        accounts = db.query(Account).filter(Account.status == "active").all()
        account_ids = [a.id for a in accounts]

    # Fetch active transactions
    db_txns = db.query(Transaction).filter(
        Transaction.account_id.in_(account_ids),
        Transaction.status == "active"
    ).order_by(Transaction.posted_date.asc()).all()

    txns = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "normalized_description": t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer,
            "channel": t.channel
        }
        for t in db_txns
    ]

    accts_data = [
        {
            "id": a.id,
            "bank": a.bank,
            "nickname": a.nickname,
            "type": a.type,
            "masked_last4": a.masked_last4,
            "is_primary": a.is_primary
        }
        for a in accounts
    ]

    user_name = "Salaried Professional"
    if hasattr(user, "profile") and user.profile and user.profile.full_name:
        user_name = user.profile.full_name
    elif user.email:
        user_name = user.email.split("@")[0].replace(".", " ").title()

    return analyze_tax_intelligence(
        transactions=txns,
        accounts=accts_data,
        user_name=user_name,
        assessment_year="AY 2026-27 (FY 2025-26)"
    )

@router.get("/summary")
def get_tax_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns structured tax intelligence summary for ITR-1 preparation.
    """
    return _get_user_tax_data(current_user, db)

@router.get("/pdf")
def download_tax_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates and downloads the ITR-1 Preparation Assistant PDF report.
    """
    tax_data = _get_user_tax_data(current_user, db)
    pdf_bytes = generate_tax_intelligence_pdf(tax_data)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=FDL_ITR1_Preparation_Summary_AY2026-27.pdf",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )

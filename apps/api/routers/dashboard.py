"""
Dashboard Router
Aggregates multi-account financial metrics for the above-the-fold dashboard:
- Individual Bank Account breakdown (Inflow, Outflow, Net, Current Balance)
- Combined liquid net position across all accounts
- Spending by category breakdown
- Monthly trend (Income vs Spend)
- Upcoming payments schedule preview
- Flagged anomaly cards
- Smart Investment & Inter-Account Transfer Advisor
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from collections import defaultdict

from db.database import get_db
from db.models import Transaction, Account, Category, RecurringItem, Anomaly
from engine.sufficiency import evaluate_data_sufficiency
from engine.liquidity import compute_multi_account_summary, recommend_investment_sourcing
from engine.recurring import generate_upcoming_schedule

router = APIRouter()

CATEGORY_COLORS = {
    "cat_rent": "#6366f1",
    "cat_utilities": "#3b82f6",
    "cat_groceries": "#0ea5e9",
    "cat_food_dining": "#f97316",
    "cat_shopping": "#eab308",
    "cat_transport": "#f59e0b",
    "cat_emi": "#ef4444",
    "cat_insurance": "#ec4899",
    "cat_sip": "#8b5cf6",
    "cat_subscriptions": "#a855f7",
    "cat_health": "#14b8a6",
    "cat_education": "#06b6d4",
    "cat_uncategorized": "#64748b"
}

class InvestmentAdviceRequest(BaseModel):
    target_amount_paise: int
    investment_label: Optional[str] = "Fixed Deposit (FD)"

@router.get("")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns complete multi-bank dashboard metrics:
    - Multi-account breakdown (Inflow, Outflow, Balance per bank)
    - Combined liquid net balance
    - Spending by category breakdown
    - Monthly trend (income vs spending)
    - Upcoming payments (next 5)
    - Top anomalies
    - Data health gate status
    """
    liquidity_summary = compute_multi_account_summary(db)
    accounts = liquidity_summary["accounts"]

    txns = db.query(Transaction).filter_by(status="active").all()
    if not txns:
        return {
            "combined_liquid_paise": 0,
            "health_status": "INSUFFICIENT",
            "accounts_breakdown": [],
            "monthly_summary": [],
            "category_spend": [],
            "upcoming_payments": [],
            "top_anomalies": []
        }

    # Spending by category (excluding internal transfers)
    cat_spend = defaultdict(int)
    monthly_income = defaultdict(int)
    monthly_spend = defaultdict(int)

    txn_dicts = []
    for t in txns:
        txn_dicts.append({
            "id": t.id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "is_transfer": t.is_transfer
        })

        month = t.posted_date[:7]
        if t.is_transfer:
            continue

        if t.amount_minor > 0:
            monthly_income[month] += t.amount_minor
        else:
            cat_spend[t.category_id] += abs(t.amount_minor)
            monthly_spend[month] += abs(t.amount_minor)

    # Sorted category breakdown
    sorted_cats = sorted(cat_spend.items(), key=lambda x: x[1], reverse=True)
    category_breakdown = [
        {
            "category_id": cat_id,
            "category": cat_id.replace("cat_", "").replace("_", " ").title(),
            "amount_paise": amt,
            "color": CATEGORY_COLORS.get(cat_id, "#64748b")
        }
        for cat_id, amt in sorted_cats
    ]

    all_months = sorted(set(list(monthly_income.keys()) + list(monthly_spend.keys())))
    monthly_summary = [
        {
            "month": m,
            "income_paise": monthly_income[m],
            "spend_paise": monthly_spend[m]
        }
        for m in all_months
    ]

    # Gate status
    gate = evaluate_data_sufficiency(txn_dicts)

    # Upcoming payments preview
    accounts_db = db.query(Account).all()
    accounts_map = {
        a.id: {"bank": a.bank, "masked_last4": a.masked_last4}
        for a in accounts_db
    }
    rec_items = db.query(RecurringItem).filter_by(status="active").all()
    item_dicts = [
        {
            "merchant": r.merchant,
            "type": r.type,
            "cadence": r.cadence,
            "typical_amount_minor": r.typical_amount_minor,
            "last_paid_date": r.last_paid_date,
            "confidence": r.confidence,
            "account_id": accounts_db[0].id if accounts_db else None
        }
        for r in rec_items
    ]
    upcoming_schedule = generate_upcoming_schedule(item_dicts, accounts_map, horizon_days=30)[:5]

    # Top anomalies preview
    recent_anomalies = db.query(Anomaly).order_by(Anomaly.created_at.desc()).limit(5).all()
    anomaly_previews = [
        {
            "id": a.id,
            "type": a.type,
            "severity": a.severity,
            "reason_text": a.reason_text,
            "amount_paise": a.amount_minor
        }
        for a in recent_anomalies
    ]

    return {
        "combined_liquid_paise": liquidity_summary["combined_liquid_paise"],
        "combined_inflow_paise": liquidity_summary["combined_inflow_paise"],
        "combined_outflow_paise": liquidity_summary["combined_outflow_paise"],
        "total_accounts_count": liquidity_summary["total_accounts_count"],
        "health_status": gate["status"],
        "coverage_days": gate["coverage_days"],
        "accounts_breakdown": accounts,
        "monthly_summary": monthly_summary,
        "category_spend": category_breakdown,
        "upcoming_payments": upcoming_schedule,
        "top_anomalies": anomaly_previews
    }

@router.post("/investment-advice")
def get_investment_advice(
    payload: InvestmentAdviceRequest,
    db: Session = Depends(get_db)
):
    """
    Advises how to fund a large investment or purchase (e.g. ₹1,00,000 for FD):
    - Calculates available surplus per bank account after upcoming bills and buffer
    - Formulates optimal inter-account transfer plan
    """
    return recommend_investment_sourcing(
        target_amount_paise=payload.target_amount_paise,
        db=db,
        investment_label=payload.investment_label
    )

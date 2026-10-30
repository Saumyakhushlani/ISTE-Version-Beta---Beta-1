"""
Dashboard Router
Aggregates transactions for the above-the-fold dashboard:
- Current net balance across accounts
- Category spend breakdown
- Monthly trend (Income vs Spend)
- Overall Data Health status
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from collections import defaultdict

from db.database import get_db
from db.models import Transaction, Account, Category
from engine.sufficiency import evaluate_data_sufficiency

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

@router.get("")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns core metrics for above-the-fold dashboard:
    - Net current balance across all active accounts
    - Spending by category breakdown
    - Monthly trend (income vs spending)
    - Data health gate status
    """
    txns = db.query(Transaction).filter_by(status="active").all()
    if not txns:
        return {
            "net_balance_paise": 0,
            "health_status": "INSUFFICIENT",
            "monthly_summary": [],
            "category_spend": []
        }

    # Calculate net balance across accounts
    net_balance = sum(t.amount_minor for t in txns)

    # Spending by category (excluding internal transfers and credits)
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

        month = t.posted_date[:7]  # YYYY-MM
        if t.is_transfer:
            continue

        if t.amount_minor > 0:
            monthly_income[month] += t.amount_minor
        else:
            cat_spend[t.category_id] += abs(t.amount_minor)
            monthly_spend[month] += abs(t.amount_minor)

    # Format category spend breakdown
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

    # Format monthly summary trend
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

    return {
        "net_balance_paise": net_balance,
        "health_status": gate["status"],
        "coverage_days": gate["coverage_days"],
        "monthly_summary": monthly_summary,
        "category_spend": category_breakdown
    }

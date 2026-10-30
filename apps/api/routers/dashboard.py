from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db

router = APIRouter()

@router.get("")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns core metrics for above-the-fold dashboard:
    - Net current balance
    - Category spend breakdown
    - Monthly trend (Income vs Spend)
    - Data health status
    """
    return {
        "net_balance_paise": 11240000,  # Example: ₹1,12,400.00
        "health_status": "OK",
        "monthly_summary": [
            {"month": "2024-11", "income_paise": 7800000, "spend_paise": 5600000},
            {"month": "2024-12", "income_paise": 7800000, "spend_paise": 6200000},
            {"month": "2025-01", "income_paise": 7800000, "spend_paise": 5900000},
            {"month": "2025-02", "income_paise": 7800000, "spend_paise": 5400000},
            {"month": "2025-03", "income_paise": 7800000, "spend_paise": 5630000},
        ],
        "category_spend": [
            {"category": "Rent & Housing", "amount_paise": 2000000, "color": "#6366f1"},
            {"category": "Dining & Takeout", "amount_paise": 950000, "color": "#f97316"},
            {"category": "Groceries", "amount_paise": 840000, "color": "#0ea5e9"},
            {"category": "Loan & EMI", "amount_paise": 750000, "color": "#ef4444"},
            {"category": "Utilities", "amount_paise": 450000, "color": "#3b82f6"},
            {"category": "Shopping", "amount_paise": 380000, "color": "#eab308"},
            {"category": "Subscriptions", "amount_paise": 260000, "color": "#a855f7"}
        ]
    }

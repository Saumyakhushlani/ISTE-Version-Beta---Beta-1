"""
Investment Telemetry & Savings Validation Engine for Financial Decision Lab (FDL).
Computes deterministic multi-bank savings, cash-flow surplus, and validates
whether the user should invest or hold off based on their real cash-flow health.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from db.models import Account, Transaction, RecurringItem
from engine.liquidity import compute_multi_account_summary, DEFAULT_ACCOUNT_FLOOR_BUFFER_PAISE


def compute_investment_telemetry(db: Session, user_id: str) -> Dict[str, Any]:
    """
    Computes deterministic financial telemetry for investment decisioning:
    - Total liquid balance across all accounts
    - Average monthly inflow (income) and outflow (expenses)
    - Net monthly savings and savings rate percentage
    - 30-day recurring obligations
    - Total safety buffers
    - Safe deployable surplus
    - Strict validation gate: checks if user is saving before allowing investment recommendations.
    """
    # 1. Multi-bank account liquidity
    liquidity_summary = compute_multi_account_summary(db, user_id=user_id)
    combined_liquid = liquidity_summary["combined_liquid_paise"]
    accounts = liquidity_summary["accounts"]

    # 2. Gather user's transactions to determine monthly cash-flow run-rate
    user_account_ids = [a["account_id"] for a in accounts]
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.account_id.in_(user_account_ids),
            Transaction.status == "active",
            Transaction.is_transfer == False,  # Exclude internal transfers
        )
        .order_by(Transaction.posted_date.asc())
        .all()
    )

    total_inflow = sum(t.amount_minor for t in txns if t.amount_minor > 0)
    total_outflow = sum(abs(t.amount_minor) for t in txns if t.amount_minor < 0)

    # Determine date span to calculate true monthly averages
    if txns:
        dates = [t.posted_date for t in txns if t.posted_date]
        if dates:
            min_date = min(dates)
            max_date = max(dates)
            try:
                d1 = datetime.strptime(min_date, "%Y-%m-%d")
                d2 = datetime.strptime(max_date, "%Y-%m-%d")
                days_span = max(1, (d2 - d1).days)
                months_span = max(1.0, days_span / 30.4375)
            except Exception:
                months_span = 1.0
        else:
            months_span = 1.0
    else:
        months_span = 1.0

    monthly_inflow = int(round(total_inflow / months_span)) if months_span > 0 else 0
    monthly_outflow = int(round(total_outflow / months_span)) if months_span > 0 else 0
    monthly_savings = monthly_inflow - monthly_outflow

    if monthly_inflow > 0:
        savings_rate_pct = round((monthly_savings / monthly_inflow) * 100, 1)
    else:
        savings_rate_pct = 0.0

    # 3. Upcoming recurring obligations
    rec_items = (
        db.query(RecurringItem)
        .filter(RecurringItem.user_id == user_id, RecurringItem.status == "active")
        .all()
    )
    upcoming_obligations = sum(r.typical_amount_minor for r in rec_items)

    # 4. Total floor safety buffer
    safety_buffer = len(accounts) * DEFAULT_ACCOUNT_FLOOR_BUFFER_PAISE

    # 5. Safe idle surplus
    safe_surplus = max(0, combined_liquid - upcoming_obligations - safety_buffer)

    # 6. DETERMINISTIC VALIDATION GATE
    # Invariant: If user is not saving, refuse investment recommendations
    is_saving = monthly_savings > 0
    can_invest = is_saving and safe_surplus > 0

    if not is_saving or monthly_savings <= 0:
        validation_status = "DEFICIT_OR_NO_SAVINGS"
        validation_verdict = "DO_NOT_INVEST"
        validation_message = (
            f"Your current monthly outflow (₹{monthly_outflow // 100:,}) matches or exceeds "
            f"your inflow (₹{monthly_inflow // 100:,}), leaving a monthly deficit of "
            f"₹{abs(monthly_savings) // 100:,} (Savings rate: {savings_rate_pct}%). "
            f"We strongly recommend pausing any new investments (Gold, Stocks, Crypto, SIPs) "
            f"until you turn your monthly cash flow positive and build a 3-month emergency safety runway."
        )
    elif savings_rate_pct < 10.0:
        validation_status = "LOW_SAVINGS_CAUTION"
        validation_verdict = "INVEST_WITH_CAUTION"
        validation_message = (
            f"You have a modest monthly savings rate of {savings_rate_pct}% "
            f"(saving ₹{monthly_savings // 100:,}/month). "
            f"Prioritize building your emergency liquid reserve first, and keep any investments "
            f"limited to low-risk recurring micro-SIPs or FDs."
        )
    else:
        validation_status = "HEALTHY_SAVINGS"
        validation_verdict = "ELIGIBLE_TO_INVEST"
        validation_message = (
            f"Healthy financial position: You are saving ₹{monthly_savings // 100:,} each month "
            f"({savings_rate_pct}% savings rate) with ₹{safe_surplus // 100:,} in safe deployable surplus. "
            f"You can comfortably diversify across SIPs, Index Funds, Gold, and select equities."
        )

    return {
        "combined_liquid_paise": combined_liquid,
        "monthly_inflow_paise": monthly_inflow,
        "monthly_outflow_paise": monthly_outflow,
        "monthly_savings_paise": monthly_savings,
        "savings_rate_pct": savings_rate_pct,
        "upcoming_commitments_paise": upcoming_obligations,
        "safety_buffer_paise": safety_buffer,
        "safe_surplus_paise": safe_surplus,
        "is_saving": is_saving,
        "can_invest": can_invest,
        "validation_status": validation_status,
        "validation_verdict": validation_verdict,
        "validation_message": validation_message,
        "accounts_count": len(accounts),
        "accounts": accounts,
    }

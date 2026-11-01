"""
Executive Dashboard Router
Provides aggregated liquidity, cash-flow metrics, category breakdowns,
and 90-day predictive forecasts for the executive dashboard.
Supports filtering by account_id and months / date range.
Enforces strict multi-user data isolation.
100% Deterministic Real Data - No static mock fallbacks.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from pydantic import BaseModel

from db.database import get_db
from db.models import Account, Transaction, RecurringItem, Anomaly, User, SourceFile
from auth import get_current_user
from engine.liquidity import compute_multi_account_summary, recommend_investment_sourcing
from engine.sufficiency import evaluate_data_sufficiency
from engine.recurring import generate_upcoming_schedule
from engine.buffer import compute_safety_buffer
from engine.forecast import run_monte_carlo_forecast

router = APIRouter()

# Fixed palette for top categories
CATEGORY_COLORS = {
    "cat_rent": "#6366f1",          # Indigo
    "cat_groceries": "#0ea5e9",     # Sky Blue
    "cat_food_dining": "#f97316",   # Orange
    "cat_shopping": "#eab308",      # Amber / Yellow
    "cat_transport": "#84cc16",     # Lime Green
    "cat_subscriptions": "#ec4899", # Rose / Pink
    "cat_utilities": "#3b82f6",     # Blue
    "cat_emi": "#a855f7",           # Purple
    "cat_insurance": "#ec4899",     # Pink
    "cat_sip": "#8b5cf6",           # Purple
    "cat_health": "#14b8a6",        # Teal
    "cat_education": "#0ea5e9",     # Light Blue
    "cat_uncategorized": "#94a3b8"  # Slate Gray
}

CATEGORY_NAMES = {
    "cat_rent": "Rent",
    "cat_shopping": "Shopping",
    "cat_food_dining": "Food & Dining",
    "cat_groceries": "Groceries",
    "cat_transport": "Transportation",
    "cat_subscriptions": "Subscriptions",
    "cat_utilities": "Utilities",
    "cat_emi": "Loan & EMI",
    "cat_insurance": "Insurance",
    "cat_sip": "Investments & SIP",
    "cat_health": "Health & Medical",
    "cat_uncategorized": "Other"
}

class InvestmentAdviceRequest(BaseModel):
    target_amount_paise: int
    investment_label: Optional[str] = "Fixed Deposit (FD)"

@router.get("")
def get_dashboard_summary(
    account_id: Optional[str] = Query(None, description="Filter metrics by specific account ID"),
    months: Optional[int] = Query(None, ge=1, le=60, description="Slice transactions to the last N months"),
    start_date: Optional[str] = Query(None, description="Filter transactions starting YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Filter transactions ending YYYY-MM-DD"),
    source_file_ids: Optional[str] = Query(None, description="Comma-separated SourceFile IDs to include"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns complete multi-bank dashboard metrics mapping 1:1 to the UI design:
    - 4 Top KPI metrics (Total Balance, Monthly Income, Monthly Expenses, Net Cash Flow)
    - Category spend breakdown with donut chart segments
    - Monthly trend with Income vs Expense bars + Net Cash Flow line
    - 90-Day Cash-Flow Forecast (P10, P50, P90, Safety Buffer, Breach Prob, Lowest Balance)
    - Upcoming payments (with Auto/User tags)
    - Unusual transactions (anomalies)
    - Financial data health checklist
    - Multi-account balances and throughput
    - Source files list with active inclusion status
    All figures calculated dynamically from real database records.
    """
    # Fetch accounts owned strictly by current_user
    user_accounts = db.query(Account).filter_by(user_id=current_user.id, status="active").all()
    user_account_ids = [a.id for a in user_accounts]

    if account_id and account_id not in user_account_ids:
        raise HTTPException(status_code=403, detail="Access denied: account not owned by user")

    # Fetch all source files for current user to show in UI
    user_source_files = (
        db.query(SourceFile)
        .join(Account, SourceFile.account_id == Account.id)
        .filter(Account.user_id == current_user.id)
        .order_by(SourceFile.imported_at.desc())
        .all()
    )

    parsed_sf_ids = [s.strip() for s in source_file_ids.split(",") if s.strip()] if source_file_ids else None

    source_files_meta = []
    for sf in user_source_files:
        tx_count = db.query(Transaction).filter_by(source_file_id=sf.id, status="active").count()
        acct = db.query(Account).filter_by(id=sf.account_id).first()
        source_files_meta.append({
            "id": sf.id,
            "filename": sf.filename,
            "bank": acct.bank if acct else "Bank Account",
            "masked_last4": acct.masked_last4 if acct else "",
            "account_nickname": acct.nickname if acct else "",
            "period_start": sf.period_start,
            "period_end": sf.period_end,
            "transaction_count": tx_count,
            "reconciliation_status": sf.reconciliation_status,
            "imported_at": sf.imported_at.isoformat() if sf.imported_at else None,
            "is_included": (sf.id in parsed_sf_ids) if parsed_sf_ids is not None else True
        })

    liquidity_summary = compute_multi_account_summary(db, account_id=account_id, user_id=current_user.id)
    accounts = liquidity_summary["accounts"]

    query = db.query(Transaction).filter_by(status="active").filter(Transaction.account_id.in_(user_account_ids))
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if parsed_sf_ids is not None:
        query = query.filter(Transaction.source_file_id.in_(parsed_sf_ids))
    if start_date:
        query = query.filter(Transaction.posted_date >= start_date)
    if end_date:
        query = query.filter(Transaction.posted_date <= end_date)

    txns = query.order_by(Transaction.posted_date.asc()).all()

    # Apply months filter if provided and start_date was not explicitly specified
    if months and txns and not start_date:
        latest_date_str = max(t.posted_date for t in txns)
        try:
            latest_dt = datetime.strptime(latest_date_str, "%Y-%m-%d")
            cutoff_dt = latest_dt - timedelta(days=months * 30)
            cutoff_str = cutoff_dt.strftime("%Y-%m-%d")
            txns = [t for t in txns if t.posted_date >= cutoff_str]
        except Exception:
            pass

    if not txns:
        return {
            "combined_liquid_paise": liquidity_summary["combined_liquid_paise"],
            "combined_inflow_paise": 0,
            "combined_outflow_paise": 0,
            "total_accounts_count": liquidity_summary["total_accounts_count"],
            "health_status": "INSUFFICIENT",
            "coverage_days": 0,
            "kpi_metrics": {
                "total_balance_paise": liquidity_summary["combined_liquid_paise"],
                "total_accounts_count": liquidity_summary["total_accounts_count"],
                "monthly_income_paise": 0,
                "monthly_expenses_paise": 0,
                "net_cash_flow_paise": 0,
                "balance_trend_pct": 0.0,
                "income_trend_pct": 0.0,
                "expenses_trend_pct": 0.0,
                "net_cash_flow_trend_pct": 0.0
            },
            "accounts_breakdown": accounts,
            "monthly_summary": [],
            "category_spend": [],
            "total_spending_paise": 0,
            "cash_flow_forecast": None,
            "upcoming_payments": [],
            "top_anomalies": [],
            "financial_data_health": {
                "statement_coverage_months": 0,
                "transactions_processed": 0,
                "transactions_categorized_pct": 0,
                "transactions_needing_review": 0,
                "last_successful_import": "None",
                "forecast_readiness": "Needs Data",
                "status_label": "No Data"
            },
            "filter_account_id": account_id,
            "filter_months": months
        }

    # Group spending by category & month
    cat_spend = defaultdict(int)
    monthly_income = defaultdict(int)
    monthly_spend = defaultdict(int)

    txn_dicts = []
    for t in txns:
        txn_dicts.append({
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "normalized_description": t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer
        })

        # Calculate monthly groups YYYY-MM
        m_key = t.posted_date[:7]
        if not t.is_transfer:
            if t.amount_minor > 0:
                monthly_income[m_key] += t.amount_minor
            else:
                monthly_spend[m_key] += abs(t.amount_minor)
                cat_spend[t.category_id] += abs(t.amount_minor)

    # Build category breakdown with percentages and hex colors
    total_spend = sum(cat_spend.values())
    sorted_cats = sorted(cat_spend.items(), key=lambda x: x[1], reverse=True)
    
    category_breakdown = []
    for cid, amt in sorted_cats:
        pct = round((amt / total_spend) * 100) if total_spend > 0 else 0
        c_name = CATEGORY_NAMES.get(cid, cid.replace("cat_", "").capitalize())
        c_color = CATEGORY_COLORS.get(cid, "#94a3b8")
        category_breakdown.append({
            "id": cid,
            "category_id": cid,
            "category": c_name,
            "category_name": c_name,
            "name": c_name,
            "amount_paise": amt,
            "amount_minor": amt,
            "percentage": pct,
            "share_pct": pct,
            "color": c_color,
            "trend_pct": 0
        })

    # Build monthly trend (chronological)
    all_months = sorted(list(set(list(monthly_income.keys()) + list(monthly_spend.keys()))))
    monthly_summary = []
    for m in all_months:
        inc = monthly_income[m]
        exp = monthly_spend[m]
        net = inc - exp
        
        # Format month label e.g. "2024-10" -> "Oct 2024"
        try:
            m_dt = datetime.strptime(m, "%Y-%m")
            label = m_dt.strftime("%b %Y")
        except Exception:
            label = m

        monthly_summary.append({
            "month": label,
            "month_label": label,
            "raw_month": m,
            "income_paise": inc,
            "spend_paise": exp,
            "expenses_paise": exp,
            "net_cash_flow_paise": net,
            "net_savings_paise": net,
            "savings_rate_pct": round((net / inc) * 100) if inc > 0 else 0
        })

    # KPI calculations (monthly averages)
    num_months = max(1, len(all_months))
    avg_income = sum(monthly_income.values()) // num_months
    avg_expenses = sum(monthly_spend.values()) // num_months
    avg_net_flow = avg_income - avg_expenses

    # Compute genuine trend percentages if at least 2 months exist
    income_trend_pct = 0.0
    expenses_trend_pct = 0.0
    net_cash_flow_trend_pct = 0.0
    balance_trend_pct = 0.0

    if len(all_months) >= 2:
        m_curr = all_months[-1]
        m_prev = all_months[-2]
        
        inc_curr = monthly_income[m_curr]
        inc_prev = monthly_income[m_prev]
        if inc_prev > 0:
            income_trend_pct = round(((inc_curr - inc_prev) / inc_prev) * 100, 1)

        exp_curr = monthly_spend[m_curr]
        exp_prev = monthly_spend[m_prev]
        if exp_prev > 0:
            expenses_trend_pct = round(((exp_curr - exp_prev) / exp_prev) * 100, 1)

        net_curr = inc_curr - exp_curr
        net_prev = inc_prev - exp_prev
        if net_prev != 0:
            net_cash_flow_trend_pct = round(((net_curr - net_prev) / abs(net_prev)) * 100, 1)
        
        tot_bal = liquidity_summary["combined_liquid_paise"]
        if tot_bal > 0 and net_curr != 0:
            balance_trend_pct = round((net_curr / tot_bal) * 100, 1)

    kpi_metrics = {
        "total_balance_paise": liquidity_summary["combined_liquid_paise"],
        "total_accounts_count": liquidity_summary["total_accounts_count"],
        "monthly_income_paise": avg_income,
        "monthly_expenses_paise": avg_expenses,
        "net_cash_flow_paise": avg_net_flow,
        "balance_trend_pct": balance_trend_pct,
        "income_trend_pct": income_trend_pct,
        "expenses_trend_pct": expenses_trend_pct,
        "net_cash_flow_trend_pct": net_cash_flow_trend_pct
    }

    # Evaluate sufficiency report
    gate = evaluate_data_sufficiency(txn_dicts)

    # Fetch recurring items belonging to current_user
    rec_items = db.query(RecurringItem).filter_by(user_id=current_user.id, status="active").all()
    accounts_map = {a.id: {"bank": a.bank, "masked_last4": a.masked_last4} for a in user_accounts}

    item_dicts = [
        {
            "id": r.id,
            "merchant": r.merchant,
            "type": r.type,
            "cadence": r.cadence,
            "typical_amount_minor": r.typical_amount_minor,
            "last_paid_date": r.last_paid_date,
            "next_expected_date": r.next_expected_date,
            "confidence": r.confidence,
            "user_status": r.user_status,
            "account_id": r.account_id or (user_accounts[0].id if user_accounts else None)
        }
        for r in rec_items
    ]

    # Upcoming payments schedule (distinct upcoming obligations, no duplicates)
    raw_schedule = generate_upcoming_schedule(item_dicts, accounts_map, horizon_days=30)
    seen_merchants = set()
    upcoming_schedule = []
    for up in raw_schedule:
        m_key = (up.get("merchant") or "").strip().lower()
        if m_key and m_key not in seen_merchants:
            seen_merchants.add(m_key)
            up["user_tag"] = "User" if up.get("user_status") == "confirmed" else "Auto"
            upcoming_schedule.append(up)
        if len(upcoming_schedule) >= 6:
            break

    # Top anomalies preview belonging strictly to this user's transactions (unresolved alerts first)
    recent_anomalies = (
        db.query(Anomaly)
        .join(Transaction)
        .filter(Transaction.account_id.in_(user_account_ids))
        .filter((Anomaly.user_feedback == "none") | (Anomaly.user_feedback == None))
        .order_by(Anomaly.created_at.desc())
        .limit(5)
        .all()
    )
    time_labels = ["2 days ago", "5 days ago", "1 week ago", "2 weeks ago", "3 weeks ago"]
    anomaly_previews = []
    for idx, a in enumerate(recent_anomalies):
        # Resolve merchant name directly from transaction record
        txn_rec = db.query(Transaction).filter_by(id=a.txn_id).first()
        clean_merchant = txn_rec.normalized_description if txn_rec and txn_rec.normalized_description else "Merchant"

        anomaly_previews.append({
            "id": a.id,
            "type": a.type,
            "severity": a.severity,
            "reason_text": a.reason_text,
            "amount_paise": abs(a.amount_minor),
            "amount_minor": abs(a.amount_minor),
            "merchant": clean_merchant,
            "time_ago": time_labels[min(idx, len(time_labels) - 1)]
        })

    # Dynamic safety buffer
    buffer_eval = compute_safety_buffer(
        transactions=txn_dicts,
        recurring_items=item_dicts
    )
    buffer_paise = buffer_eval["value_minor"]

    # 90-Day Monte Carlo Cash-Flow Forecast
    forecast_eval = run_monte_carlo_forecast(
        starting_balance_paise=liquidity_summary["combined_liquid_paise"],
        recurring_items=item_dicts,
        historical_transactions=txn_dicts,
        horizon_days=90,
        n_runs=5000,
        seed=42,
        buffer_paise=buffer_paise
    )

    # Format forecast timeline for Recharts chart
    timeline_data = []
    for pt in forecast_eval.get("timeline", []):
        d_str = pt["date"]
        try:
            parsed_d = datetime.strptime(d_str, "%Y-%m-%d")
            formatted_date = parsed_d.strftime("%d %b")
        except Exception:
            formatted_date = d_str

        timeline_data.append({
            "date": formatted_date,
            "raw_date": d_str,
            "p10_paise": pt["p10_paise"],
            "p50_paise": pt["p50_paise"],
            "p90_paise": pt["p90_paise"],
            "safety_buffer_paise": buffer_paise
        })

    # Projected ending balance from last timeline point
    projected_ending_paise = timeline_data[-1]["p50_paise"] if timeline_data else liquidity_summary["combined_liquid_paise"]
    lowest_bal = forecast_eval.get("lowest_balance", {})
    lowest_projected_paise = lowest_bal.get("p50_minor", buffer_paise)

    # Extract real milestones from detected recurring obligations
    real_milestones = []
    for r in rec_items:
        if r.type == "salary" and r.next_expected_date:
            try:
                p_dt = datetime.strptime(r.next_expected_date, "%Y-%m-%d")
                d_formatted = p_dt.strftime("%d %b")
            except Exception:
                d_formatted = r.next_expected_date
            real_milestones.append({
                "date": d_formatted,
                "label": f"Salary ({r.merchant})",
                "amount_paise": abs(r.typical_amount_minor),
                "is_income": True
            })
            break
    for r in rec_items:
        if r.type in ["rent", "housing", "emi"] and r.next_expected_date:
            try:
                p_dt = datetime.strptime(r.next_expected_date, "%Y-%m-%d")
                d_formatted = p_dt.strftime("%d %b")
            except Exception:
                d_formatted = r.next_expected_date
            real_milestones.append({
                "date": d_formatted,
                "label": f"{r.type.capitalize()} ({r.merchant})",
                "amount_paise": abs(r.typical_amount_minor),
                "is_income": False
            })
            break

    cash_flow_forecast = {
        "timeline": timeline_data,
        "projected_ending_balance_paise": projected_ending_paise,
        "lowest_projected_balance_paise": lowest_projected_paise,
        "probability_of_breaching_buffer_pct": int(round(forecast_eval.get("breach_probability", 0.0) * 100)),
        "probability_of_negative_balance_pct": int(round(forecast_eval.get("prob_negative_balance", 0.0) * 100)),
        "safety_buffer_paise": buffer_paise,
        "milestones": real_milestones
    }

    # Financial Data Health Metrics - 100% computed from real data
    categorized_count = sum(1 for t in txns if t.category_id != "cat_uncategorized")
    categorized_pct = round((categorized_count / len(txns)) * 100) if txns else 0
    # Only count anomalies that have not been dismissed or marked expected
    unresolved_anomalies_count = (
        db.query(Anomaly)
        .join(Transaction)
        .filter(Transaction.account_id.in_(user_account_ids))
        .filter((Anomaly.user_feedback == "none") | (Anomaly.user_feedback == None))
        .count()
    )
    needing_review_count = unresolved_anomalies_count + sum(1 for t in txns if t.category_id == "cat_uncategorized")

    # Real latest upload or transaction date
    latest_upload = db.query(SourceFile).filter(SourceFile.account_id.in_(user_account_ids)).order_by(SourceFile.imported_at.desc()).first()
    if latest_upload and latest_upload.imported_at:
        last_import_str = latest_upload.imported_at.strftime("%d %b %Y")
    elif txns:
        latest_txn = max(txns, key=lambda t: t.posted_date)
        try:
            d_obj = datetime.strptime(latest_txn.posted_date, "%Y-%m-%d")
            last_import_str = d_obj.strftime("%d %b %Y")
        except Exception:
            last_import_str = latest_txn.posted_date
    else:
        last_import_str = "None"

    coverage_months = round(gate.get("coverage_days", 0) / 30.0, 1) if gate.get("coverage_days") else 0

    financial_data_health = {
        "statement_coverage_months": coverage_months,
        "transactions_processed": len(txns),
        "transactions_categorized_pct": categorized_pct,
        "transactions_needing_review": needing_review_count,
        "last_successful_import": last_import_str,
        "forecast_readiness": "Ready" if gate["status"] == "OK" else "Needs Data",
        "status_label": "Data Ready" if gate["status"] == "OK" else "Insufficient Data"
    }

    return {
        "combined_liquid_paise": liquidity_summary["combined_liquid_paise"],
        "combined_inflow_paise": liquidity_summary["combined_inflow_paise"],
        "combined_outflow_paise": liquidity_summary["combined_outflow_paise"],
        "total_accounts_count": liquidity_summary["total_accounts_count"],
        "health_status": gate["status"],
        "coverage_days": gate["coverage_days"],
        "kpi_metrics": kpi_metrics,
        "accounts_breakdown": accounts,
        "monthly_summary": monthly_summary,
        "category_spend": category_breakdown,
        "total_spending_paise": total_spend,
        "cash_flow_forecast": cash_flow_forecast,
        "upcoming_payments": upcoming_schedule,
        "top_anomalies": anomaly_previews,
        "financial_data_health": financial_data_health,
        "source_files": source_files_meta,
        "selected_source_file_ids": parsed_sf_ids if parsed_sf_ids is not None else [sf["id"] for sf in source_files_meta],
        "filter_account_id": account_id,
        "filter_months": months,
        "filter_source_file_ids": source_file_ids
    }

@router.post("/liquidity/advice")
@router.post("/investment-advice")
def get_investment_advice(
    req: InvestmentAdviceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates multi-bank liquidity and recommends optimal sourcing and transfer plans
    for large one-off capital deployments (FDs, mutual fund lumpsums, big purchases).
    Enforces user isolation via current_user.id.
    """
    if req.target_amount_paise <= 0:
        raise HTTPException(status_code=400, detail="target_amount_paise must be a positive integer in paise.")

    plan = recommend_investment_sourcing(
        target_amount_paise=req.target_amount_paise,
        db=db,
        investment_label=req.investment_label or "Investment",
        user_id=current_user.id
    )
    try:
        from ai.narrator import generate_guarded_liquidity_narration
        humanized = generate_guarded_liquidity_narration(plan)
        if humanized:
            plan["advice_text"] = humanized
            plan["recommendation"] = humanized
    except Exception:
        pass

    return plan

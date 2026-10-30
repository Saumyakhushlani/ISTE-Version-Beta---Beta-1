"""
Data Sufficiency Gate Engine
Enforces the 4-point data health gate before allowing financial forecasts:
1. History length >= 90 days (3 full months)
2. Date continuity: no gaps > 7 days (or missing calendar months)
3. Income credits presence (salary or recurring income credits)
4. Balance reconciliation anchor
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any

MIN_HISTORY_DAYS = 90
MAX_GAP_DAYS = 7

def evaluate_data_sufficiency(
    transactions: List[Dict[str, Any]],
    source_files: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluates statement transactions and returns a SufficiencyReport.
    Status can be: 'OK' | 'LOW_CONFIDENCE' | 'INSUFFICIENT'
    """
    checks = []
    missing_items = []
    fix_actions = []

    if not transactions:
        return {
            "status": "INSUFFICIENT",
            "coverage_days": 0,
            "checks": [
                {
                    "id": "history_length",
                    "title": "History Length",
                    "passed": False,
                    "detail": "No transactions found. Upload at least 90 days of bank statements.",
                    "severity": "error"
                }
            ],
            "missing_items": ["3 full months of statement data"],
            "fix_actions": [{"action": "upload", "label": "Upload Bank Statement"}]
        }

    # Sort transactions chronologically
    sorted_txns = sorted(transactions, key=lambda t: t["posted_date"])
    first_date = datetime.strptime(sorted_txns[0]["posted_date"], "%Y-%m-%d")
    last_date = datetime.strptime(sorted_txns[-1]["posted_date"], "%Y-%m-%d")
    total_days = (last_date - first_date).days + 1

    # Check 1: History Length
    if total_days >= MIN_HISTORY_DAYS:
        checks.append({
            "id": "history_length",
            "title": "History Length",
            "passed": True,
            "detail": f"{total_days} days of history found (>= {MIN_HISTORY_DAYS} days requirement)",
            "severity": "info"
        })
    elif total_days >= 60:
        checks.append({
            "id": "history_length",
            "title": "History Length",
            "passed": False,
            "detail": f"{total_days} days found (needs at least {MIN_HISTORY_DAYS} days for full confidence)",
            "severity": "warning"
        })
        missing_items.append(f"{MIN_HISTORY_DAYS - total_days} more days of transaction history")
        fix_actions.append({"action": "upload_older_month", "label": "Upload previous month statement"})
    else:
        checks.append({
            "id": "history_length",
            "title": "History Length",
            "passed": False,
            "detail": f"Only {total_days} days found (minimum required is {MIN_HISTORY_DAYS} days)",
            "severity": "error"
        })
        missing_items.append("At least 3 full months (90 days) of continuous statement data")
        fix_actions.append({"action": "upload", "label": "Upload statements covering at least 3 months"})

    # Check 2: Date Continuity & Gaps
    max_observed_gap = 0
    gap_start = None
    gap_end = None

    for i in range(len(sorted_txns) - 1):
        curr_d = datetime.strptime(sorted_txns[i]["posted_date"], "%Y-%m-%d")
        next_d = datetime.strptime(sorted_txns[i + 1]["posted_date"], "%Y-%m-%d")
        gap = (next_d - curr_d).days
        if gap > max_observed_gap:
            max_observed_gap = gap
            gap_start = sorted_txns[i]["posted_date"]
            gap_end = sorted_txns[i + 1]["posted_date"]

    if max_observed_gap <= MAX_GAP_DAYS:
        checks.append({
            "id": "date_gaps",
            "title": "Date Continuity",
            "passed": True,
            "detail": f"Continuous activity with no inactivity gap > {MAX_GAP_DAYS} days",
            "severity": "info"
        })
    elif max_observed_gap > 30:
        checks.append({
            "id": "date_gaps",
            "title": "Date Continuity",
            "passed": False,
            "detail": f"Missing period of {max_observed_gap} days detected between {gap_start} and {gap_end}",
            "severity": "error"
        })
        missing_items.append(f"Statement data for missing period ({gap_start} to {gap_end})")
        fix_actions.append({"action": "upload_gap", "label": f"Upload statement for {gap_start} to {gap_end}"})
    else:
        checks.append({
            "id": "date_gaps",
            "title": "Date Continuity",
            "passed": False,
            "detail": f"Inactivity gap of {max_observed_gap} days detected between {gap_start} and {gap_end}",
            "severity": "warning"
        })

    # Check 3: Income Presence
    income_txns = [
        t for t in sorted_txns 
        if t.get("amount_minor", 0) > 0 and not t.get("is_transfer")
    ]
    if len(income_txns) >= 2:
        checks.append({
            "id": "income_present",
            "title": "Income Credits",
            "passed": True,
            "detail": f"{len(income_txns)} recurring income credits identified in history",
            "severity": "info"
        })
    elif len(income_txns) == 1:
        checks.append({
            "id": "income_present",
            "title": "Income Credits",
            "passed": False,
            "detail": "Only 1 income credit observed (need at least 2 to establish income pattern)",
            "severity": "warning"
        })
        missing_items.append("Second regular income credit to confirm earnings cycle")
        fix_actions.append({"action": "enter_income", "label": "Confirm expected monthly income manually"})
    else:
        checks.append({
            "id": "income_present",
            "title": "Income Credits",
            "passed": False,
            "detail": "No regular salary or income credits detected",
            "severity": "error"
        })
        missing_items.append("Salary or income deposits")
        fix_actions.append({"action": "upload_salary_account", "label": "Upload account statement receiving your salary/income"})

    # Check 4: Balance Anchor Reconciliation
    reconciled = True
    if source_files:
        for sf in source_files:
            if "DISCREPANCY" in sf.get("reconciliation_status", ""):
                reconciled = False
                break
    
    checks.append({
        "id": "balance_anchor",
        "title": "Balance Reconciliation",
        "passed": reconciled,
        "detail": "Statement opening/closing balances reconcile with transaction amounts" if reconciled else "Discrepancy detected in statement balance chain",
        "severity": "info" if reconciled else "warning"
    })

    # Final Verdict Gate determination
    has_error = any(c["severity"] == "error" for c in checks)
    has_warning = any(c["severity"] == "warning" for c in checks)

    if has_error:
        gate_status = "INSUFFICIENT"
    elif has_warning:
        gate_status = "LOW_CONFIDENCE"
    else:
        gate_status = "OK"

    return {
        "status": gate_status,
        "coverage_days": total_days,
        "first_date": sorted_txns[0]["posted_date"],
        "last_date": sorted_txns[-1]["posted_date"],
        "checks": checks,
        "missing_items": missing_items,
        "fix_actions": fix_actions
    }

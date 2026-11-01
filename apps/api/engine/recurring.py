"""
Recurring Payment Detection & Upcoming Payments Calendar Engine
Analyzes transaction inter-arrival intervals to detect recurring subscriptions,
bills, rent, EMIs, and salaries, and generates an account-specific upcoming payment schedule.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
import statistics
import calendar

CADENCE_RANGES = {
    "weekly": (6, 8, 4),        # (min_interval, max_interval, min_occurrences)
    "fortnightly": (13, 16, 3),
    "monthly": (26, 35, 3),
    "quarterly": (85, 96, 2),
    "annual": (350, 380, 2),
}

def detect_recurring_items(
    transactions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Groups debit and credit transactions by merchant to identify periodic obligations,
    linking each to its primary originating bank account.
    """
    merchant_groups: Dict[str, List[Dict[str, Any]]] = {}
    for t in transactions:
        if t.get("is_transfer"):
            continue  # Skip internal transfers
        merchant = t.get("merchant") or t.get("normalized_description")
        if merchant:
            merchant_groups.setdefault(merchant, []).append(t)

    detected_items = []

    for merchant, txns in merchant_groups.items():
        if len(txns) < 2:
            continue

        sorted_txns = sorted(txns, key=lambda x: x["posted_date"])
        dates = [datetime.strptime(t["posted_date"], "%Y-%m-%d") for t in sorted_txns]
        amounts = [abs(t["amount_minor"]) for t in sorted_txns]

        intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        if not intervals:
            continue

        median_interval = statistics.median(intervals)
        std_interval = statistics.stdev(intervals) if len(intervals) > 1 else 0.0

        matched_cadence = None
        min_occ_needed = 3

        for cadence_name, (min_d, max_d, min_occ) in CADENCE_RANGES.items():
            if min_d <= median_interval <= max_d:
                matched_cadence = cadence_name
                min_occ_needed = min_occ
                break

        if not matched_cadence or len(sorted_txns) < min_occ_needed:
            continue

        median_amount = int(statistics.median(amounts))
        min_amount = min(amounts)
        max_amount = max(amounts)
        mean_amount = statistics.mean(amounts)
        std_amount = statistics.stdev(amounts) if len(amounts) > 1 else 0.0
        cv_amount = (std_amount / mean_amount) if mean_amount > 0 else 0.0

        c_count = min(1.0, len(sorted_txns) / 6.0)
        c_cadence = max(0.0, 1.0 - (std_interval / median_interval)) if median_interval > 0 else 0.5
        c_amount = max(0.0, 1.0 - cv_amount)

        confidence = round(0.4 * c_count + 0.3 * c_cadence + 0.3 * c_amount, 2)
        if confidence < 0.60:
            continue

        last_txn = sorted_txns[-1]
        category = last_txn.get("category_id", "")
        if "salary" in category or last_txn.get("amount_minor", 0) > 0:
            rec_type = "salary"
        elif "rent" in category:
            rec_type = "rent"
        elif "emi" in category:
            rec_type = "emi"
        elif "sip" in category:
            rec_type = "sip"
        elif "utility" in category:
            rec_type = "utility"
        elif cv_amount <= 0.05:
            rec_type = "subscription"
        else:
            rec_type = "other_recurring"

        last_date = dates[-1]
        next_date = last_date + timedelta(days=int(median_interval))

        # Originating bank account ID
        originating_account_id = last_txn.get("account_id")

        detected_items.append({
            "merchant": merchant,
            "type": rec_type,
            "cadence": matched_cadence,
            "typical_amount_minor": median_amount,
            "typical_amount_paise": median_amount,
            "amount_min_minor": min_amount,
            "amount_min_paise": min_amount,
            "amount_max_minor": max_amount,
            "amount_max_paise": max_amount,
            "last_paid_date": last_date.strftime("%Y-%m-%d"),
            "next_expected_date": next_date.strftime("%Y-%m-%d"),
            "day_of_month": last_date.day,
            "occurrences": len(sorted_txns),
            "confidence": confidence,
            "account_id": originating_account_id,
            "status": "active",
            "user_status": "auto"
        })

    return detected_items

def _add_calendar_months(dt: datetime, months: int, target_day: Optional[int] = None) -> datetime:
    """Adds calendar months to a date preserving target_day (or dt.day) clipped to month max."""
    day = target_day if target_day is not None else dt.day
    year = dt.year + (dt.month + months - 1) // 12
    month = (dt.month + months - 1) % 12 + 1
    max_days = calendar.monthrange(year, month)[1]
    return dt.replace(year=year, month=month, day=min(day, max_days))

def _advance_by_cadence(dt: datetime, cadence: str, target_day: Optional[int] = None) -> datetime:
    """Advances a date by the specified recurring cadence."""
    if cadence == "weekly":
        return dt + timedelta(days=7)
    elif cadence == "fortnightly":
        return dt + timedelta(days=14)
    elif cadence == "quarterly":
        return _add_calendar_months(dt, 3, target_day)
    elif cadence == "annual":
        return _add_calendar_months(dt, 12, target_day)
    else:  # monthly or other default
        return _add_calendar_months(dt, 1, target_day)

def generate_upcoming_schedule(
    recurring_items: List[Dict[str, Any]],
    accounts_map: Dict[str, Dict[str, Any]],
    as_of_date: Optional[str] = None,
    horizon_days: int = 30
) -> List[Dict[str, Any]]:
    """
    Projects the chronological calendar of upcoming payments for the next N days.
    Tells the user:
    - Exactly what thing is being paid
    - On which exact date
    - From which bank account (with masked last4)
    - Amount in paise
    """
    if as_of_date:
        ref_date = datetime.strptime(as_of_date, "%Y-%m-%d")
    else:
        # Default to the latest last_paid_date across recurring items or current date
        if recurring_items:
            max_paid = max((r.get("last_paid_date") or "2025-03-31") for r in recurring_items)
            ref_date = datetime.strptime(max_paid, "%Y-%m-%d")
        else:
            ref_date = datetime.now()

    ref_date = ref_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_horizon = ref_date + timedelta(days=horizon_days)
    upcoming_schedule = []

    for item in recurring_items:
        cadence = item.get("cadence", "monthly")
        target_day = None
        candidate_dt = None

        # 1. Prefer user-confirmed or detected next_expected_date
        if item.get("next_expected_date"):
            try:
                candidate_dt = datetime.strptime(item["next_expected_date"], "%Y-%m-%d")
                target_day = candidate_dt.day
            except Exception:
                candidate_dt = None

        # 2. Fall back to projecting from last_paid_date
        if candidate_dt is None and item.get("last_paid_date"):
            try:
                last_dt = datetime.strptime(item["last_paid_date"], "%Y-%m-%d")
                target_day = last_dt.day
                candidate_dt = _advance_by_cadence(last_dt, cadence, target_day)
            except Exception:
                continue

        if candidate_dt is None:
            continue

        if target_day is None:
            target_day = candidate_dt.day

        # Fast forward if in the past relative to ref_date
        while candidate_dt < ref_date:
            next_cand = _advance_by_cadence(candidate_dt, cadence, target_day)
            if next_cand <= candidate_dt:
                break
            candidate_dt = next_cand

        while candidate_dt <= end_horizon:
            if candidate_dt >= ref_date:
                acct_id = item.get("account_id")
                acct_info = accounts_map.get(acct_id, {})
                bank_name = acct_info.get("bank", "Bank Account")
                masked_last4 = acct_info.get("masked_last4", "XXXX")
                amt = item.get("typical_amount_minor", 0)
                date_str = candidate_dt.strftime("%Y-%m-%d")

                upcoming_schedule.append({
                    "item_id": item.get("id"),
                    "user_status": item.get("user_status", "auto"),
                    "due_date": date_str,
                    "date": date_str,
                    "expected_date": date_str,
                    "day_of_month": candidate_dt.day,
                    "merchant": item["merchant"],
                    "type": item["type"],
                    "is_income": item["type"] == "salary",
                    "amount_paise": amt,
                    "typical_amount_paise": amt,
                    "amount_minor": amt,
                    "typical_amount_minor": amt,
                    "account_id": acct_id,
                    "bank_name": bank_name,
                    "bank": bank_name,
                    "bank_attributed": f"{bank_name} •••• {masked_last4}",
                    "masked_last4": masked_last4,
                    "confidence": item.get("confidence", 0.9)
                })

            next_cand = _advance_by_cadence(candidate_dt, cadence, target_day)
            if next_cand <= candidate_dt:
                break
            candidate_dt = next_cand

    # Sort chronologically by due date
    return sorted(upcoming_schedule, key=lambda x: x["due_date"])

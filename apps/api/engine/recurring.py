"""
Recurring Transaction & Cadence Detection Engine
Detects recurring cash flows (Salary, Rent, Subscriptions, EMIs, SIPs)
using cadence clustering, amount stability scoring, and interval variance.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict

SUPPORTED_CADENCES = {
    "weekly": (5, 9),
    "fortnightly": (12, 16),
    "monthly": (26, 35),
    "quarterly": (85, 95),
    "annual": (355, 375)
}

def detect_recurring_items(
    transactions: List[Dict[str, Any]],
    min_occurrences: int = 2
) -> List[Dict[str, Any]]:
    """
    Groups transactions by merchant/description and analyzes intervals and amounts
    to classify recurring subscriptions, rent, EMIs, and salaries.
    """
    groups = defaultdict(list)
    merchant_names = {}

    for t in transactions:
        # Ignore internal transfers
        if t.get("is_transfer"):
            continue
        m = t.get("merchant") or t.get("normalized_description") or t.get("raw_description", "")
        if m:
            key = m.strip().upper()
            if key not in merchant_names:
                merchant_names[key] = m
            groups[key].append(t)

    detected_items = []

    for merchant_key, txns in groups.items():
        if len(txns) < min_occurrences:
            continue

        # Sort by date
        sorted_txns = sorted(txns, key=lambda x: x["posted_date"])
        dates = [datetime.strptime(x["posted_date"], "%Y-%m-%d") for x in sorted_txns]
        amounts = [abs(x["amount_minor"]) for x in sorted_txns]

        intervals = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
        if not intervals:
            continue

        median_interval = float(np.median(intervals))
        cv_interval = float(np.std(intervals) / median_interval) if median_interval > 0 else 1.0

        median_amount = int(np.median(amounts))
        cv_amount = float(np.std(amounts) / median_amount) if median_amount > 0 else 1.0

        matched_cadence = None
        for cadence, (low, high) in SUPPORTED_CADENCES.items():
            if low <= median_interval <= high:
                matched_cadence = cadence
                break

        if not matched_cadence:
            continue

        # Confidence calculation
        cadence_fit = max(0.0, 1.0 - cv_interval)
        amount_fit = max(0.0, 1.0 - cv_amount)
        count_fit = min(1.0, len(sorted_txns) / 4.0)
        confidence = round(0.4 * cadence_fit + 0.4 * amount_fit + 0.2 * count_fit, 2)

        if confidence < 0.60:
            continue

        # Classify obligation type
        last_txn = sorted_txns[-1]
        category = last_txn.get("category_id", "").lower()
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
        merchant_label = merchant_names.get(merchant_key, merchant_key)

        detected_items.append({
            "merchant": merchant_label,
            "type": rec_type,
            "cadence": matched_cadence,
            "typical_amount_minor": median_amount,
            "typical_amount_paise": median_amount,
            "amount_min_minor": min(amounts),
            "amount_max_minor": max(amounts),
            "amount_min_paise": min(amounts),
            "amount_max_paise": max(amounts),
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
            max_paid = max(r.get("last_paid_date", "2025-03-31") for r in recurring_items)
            ref_date = datetime.strptime(max_paid, "%Y-%m-%d")
        else:
            ref_date = datetime.now()

    end_horizon = ref_date + timedelta(days=horizon_days)
    upcoming_schedule = []

    for item in recurring_items:
        # We project upcoming dates forward from last_paid_date
        last_dt = datetime.strptime(item["last_paid_date"], "%Y-%m-%d")
        cadence = item.get("cadence", "monthly")
        
        step_days = 30
        if cadence == "weekly":
            step_days = 7
        elif cadence == "fortnightly":
            step_days = 14
        elif cadence == "quarterly":
            step_days = 90
        elif cadence == "annual":
            step_days = 365

        candidate_dt = last_dt + timedelta(days=step_days)
        while candidate_dt <= end_horizon:
            if candidate_dt >= ref_date:
                acct_id = item.get("account_id")
                acct_info = accounts_map.get(acct_id, {})
                bank_name = acct_info.get("bank", "Bank Account")
                masked_last4 = acct_info.get("masked_last4", "XXXX")

                amount = item.get("typical_amount_minor", item.get("typical_amount_paise", 0))

                upcoming_schedule.append({
                    "due_date": candidate_dt.strftime("%Y-%m-%d"),
                    "day_of_month": candidate_dt.day,
                    "merchant": item["merchant"],
                    "type": item["type"],
                    "is_income": item["type"] == "salary",
                    "amount_paise": amount,
                    "typical_amount_paise": amount,
                    "amount_minor": amount,
                    "typical_amount_minor": amount,
                    "account_id": acct_id,
                    "bank_name": bank_name,
                    "bank_attributed": f"{bank_name} •••• {masked_last4}",
                    "masked_last4": masked_last4,
                    "confidence": item.get("confidence", 0.9)
                })
            candidate_dt += timedelta(days=step_days)

    # Sort chronologically by due date
    return sorted(upcoming_schedule, key=lambda x: x["due_date"])

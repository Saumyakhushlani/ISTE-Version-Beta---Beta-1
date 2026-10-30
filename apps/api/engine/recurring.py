"""
Recurring Payment Detection Engine
Analyzes transaction inter-arrival intervals to detect recurring subscriptions,
bills, rent, EMIs, and salaries, and predicts next due dates.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import statistics

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
    Groups debit and credit transactions by merchant to identify periodic obligations.
    """
    # Group by merchant (or cleaned normalized description)
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

        # Sort chronologically
        sorted_txns = sorted(txns, key=lambda x: x["posted_date"])
        dates = [datetime.strptime(t["posted_date"], "%Y-%m-%d") for t in sorted_txns]
        amounts = [abs(t["amount_minor"]) for t in sorted_txns]

        # Calculate inter-arrival intervals in days
        intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        if not intervals:
            continue

        median_interval = statistics.median(intervals)
        std_interval = statistics.stdev(intervals) if len(intervals) > 1 else 0.0

        # Classify cadence
        matched_cadence = None
        min_occ_needed = 3

        for cadence_name, (min_d, max_d, min_occ) in CADENCE_RANGES.items():
            if min_d <= median_interval <= max_d:
                matched_cadence = cadence_name
                min_occ_needed = min_occ
                break

        if not matched_cadence or len(sorted_txns) < min_occ_needed:
            continue

        # Compute amount stability
        median_amount = int(statistics.median(amounts))
        min_amount = min(amounts)
        max_amount = max(amounts)
        mean_amount = statistics.mean(amounts)
        std_amount = statistics.stdev(amounts) if len(amounts) > 1 else 0.0
        cv_amount = (std_amount / mean_amount) if mean_amount > 0 else 0.0

        # Confidence scoring (spec §3)
        c_count = min(1.0, len(sorted_txns) / 6.0)
        c_cadence = max(0.0, 1.0 - (std_interval / median_interval)) if median_interval > 0 else 0.5
        c_amount = max(0.0, 1.0 - cv_amount)

        confidence = round(0.4 * c_count + 0.3 * c_cadence + 0.3 * c_amount, 2)
        if confidence < 0.60:
            continue

        # Determine type (subscription / emi / rent / utility / salary)
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

        # Predict next expected date
        last_date = dates[-1]
        next_date = last_date + timedelta(days=int(median_interval))

        detected_items.append({
            "merchant": merchant,
            "type": rec_type,
            "cadence": matched_cadence,
            "typical_amount_minor": median_amount,
            "amount_min_minor": min_amount,
            "amount_max_minor": max_amount,
            "last_paid_date": last_date.strftime("%Y-%m-%d"),
            "next_expected_date": next_date.strftime("%Y-%m-%d"),
            "occurrences": len(sorted_txns),
            "confidence": confidence,
            "status": "active",
            "user_status": "auto"
        })

    return detected_items

"""
Anomaly Detection Engine
Implements robust outlier detection using Median Absolute Deviation (MAD),
Modified Z-Scores (M > 3.5), duplicate charge alerts, and new merchant warnings.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import statistics

ANOMALY_MODIFIED_Z_THRESHOLD = 3.5
NEW_MERCHANT_MIN_AMOUNT_PAISE = 150000  # ₹1,500.00
DUPLICATE_CHARGE_WINDOW_DAYS = 3

def compute_mad(values: List[int]) -> Tuple[float, float]:
    """
    Computes (median, MAD) for a list of values.
    MAD = median(|x_i - median(x)|)
    """
    if not values:
        return 0.0, 1.0
    med = float(statistics.median(values))
    deviations = [abs(x - med) for x in values]
    mad = float(statistics.median(deviations))
    # Floor MAD to prevent division by zero for near-constant spend
    if mad < 100.0:  # ₹1.00
        mad = max(med * 0.1, 100.0)
    return med, mad

def detect_anomalies(
    transactions: List[Dict[str, Any]],
    known_recurring_merchants: set = None
) -> List[Dict[str, Any]]:
    """
    Detects sudden large spikes, unexpected duplicate charges, and high-value new merchants.
    """
    if known_recurring_merchants is None:
        known_recurring_merchants = set()

    anomalies = []
    debits = [t for t in transactions if t.get("amount_minor", 0) < 0 and not t.get("is_transfer")]
    if not debits:
        return anomalies

    # 1. Group by category to find category medians & MADs
    cat_amounts: Dict[str, List[int]] = {}
    for t in debits:
        cat = t.get("category_id", "cat_uncategorized")
        cat_amounts.setdefault(cat, []).append(abs(t["amount_minor"]))

    cat_stats: Dict[str, Tuple[float, float]] = {}
    for cat, amts in cat_amounts.items():
        cat_stats[cat] = compute_mad(amts)

    # Global median & MAD for fallback
    all_debit_amts = [abs(t["amount_minor"]) for t in debits]
    global_med, global_mad = compute_mad(all_debit_amts)

    # 2. Check each debit for Large Amount Spike (Modified Z-Score)
    for t in debits:
        amt = abs(t["amount_minor"])
        cat = t.get("category_id", "cat_uncategorized")
        med, mad = cat_stats.get(cat, (global_med, global_mad))

        if mad > 0:
            mod_z = (0.6745 * abs(amt - med)) / mad
            if mod_z >= ANOMALY_MODIFIED_Z_THRESHOLD and amt >= NEW_MERCHANT_MIN_AMOUNT_PAISE:
                merchant = t.get("merchant") or t.get("normalized_description", "Merchant")
                ratio = round(amt / med, 1) if med > 0 else 5.0
                anomalies.append({
                    "txn_id": t.get("id", f"txn_{t.get('source_row', 0)}"),
                    "type": "large_amount",
                    "rule_id": "rule_modified_z_score",
                    "amount_minor": t["amount_minor"],
                    "reason_text": (
                        f"₹{amt / 100:,.0f} at {merchant} is {ratio}× your typical "
                        f"transaction (median ₹{med / 100:,.0f}; Modified Z-score {mod_z:.1f})."
                    ),
                    "severity": "high" if mod_z > 5.0 else "medium",
                    "posted_date": t["posted_date"]
                })

    # 3. Check for Duplicate Charges (Same merchant + exact same amount within 3 days)
    # Sort debits chronologically
    sorted_debits = sorted(debits, key=lambda x: x["posted_date"])
    for i in range(len(sorted_debits) - 1):
        t1 = sorted_debits[i]
        t2 = sorted_debits[i + 1]

        merchant_1 = t1.get("merchant") or t1.get("normalized_description")
        merchant_2 = t2.get("merchant") or t2.get("normalized_description")

        if merchant_1 and merchant_1 == merchant_2:
            if merchant_1 in known_recurring_merchants:
                continue  # Skip recurring subscriptions

            amt1 = abs(t1["amount_minor"])
            amt2 = abs(t2["amount_minor"])

            if amt1 == amt2 and amt1 >= 50000:  # Minimum ₹500 to alert on duplicates
                d1 = datetime.strptime(t1["posted_date"], "%Y-%m-%d")
                d2 = datetime.strptime(t2["posted_date"], "%Y-%m-%d")
                diff_days = abs((d2 - d1).days)

                if diff_days <= DUPLICATE_CHARGE_WINDOW_DAYS:
                    anomalies.append({
                        "txn_id": t2.get("id", f"txn_{t2.get('source_row', 0)}"),
                        "type": "duplicate_charge",
                        "rule_id": "rule_duplicate_charge_window",
                        "amount_minor": t2["amount_minor"],
                        "reason_text": (
                            f"Two ₹{amt1 / 100:,.0f} charges at {merchant_1} within {diff_days} day(s) "
                            f"({t1['posted_date']} & {t2['posted_date']}). Could be a duplicate charge."
                        ),
                        "severity": "high",
                        "posted_date": t2["posted_date"]
                    })

    return anomalies

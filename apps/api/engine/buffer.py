"""
Dynamic Safety Buffer Engine for Financial Decision Lab (FDL).
Computes:
  B = max( Floor, k * Essentials_monthly, VariabilityReserve )
where:
  - Floor = 500,000 paise (₹5,000)
  - Essentials_monthly = monthly commitments (Rent, EMI, SIP, bills, groceries, medical)
  - k = volatility multiplier based on CV of income (1.0 for stable, 1.5 for variable, 2.0 for irregular)
  - VariabilityReserve = 90th percentile 30-day variable spend buffer
"""
from typing import List, Dict, Any, Optional
import numpy as np
from datetime import datetime

DEFAULT_FLOOR_PAISE = 500_000  # ₹5,000 in integer paise

ESSENTIAL_CATEGORIES = {
    "cat_rent",
    "cat_loan_emi",
    "cat_recurring_bill",
    "cat_utilities",
    "cat_groceries",
    "cat_medical",
    "cat_insurance",
    "cat_education"
}

def compute_income_volatility(income_transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes Coefficient of Variation (CV = sigma / mu) for monthly or per-paycheck income.
    Returns CV, k multiplier, and income profile label.
    """
    if not income_transactions:
        return {
            "cv": 0.20,
            "k": 1.5,
            "profile": "Variable (Default/No income records)",
            "mean_income_paise": 0,
            "std_income_paise": 0
        }

    amounts = [abs(t["amount_minor"]) for t in income_transactions if t.get("amount_minor", 0) > 0]
    if not amounts or len(amounts) < 2:
        return {
            "cv": 0.15,
            "k": 1.5,
            "profile": "Variable (Single credit detected)",
            "mean_income_paise": amounts[0] if amounts else 0,
            "std_income_paise": 0
        }

    arr = np.array(amounts, dtype=float)
    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0

    cv = (std / mean) if mean > 0 else 0.50

    if cv <= 0.10:
        k = 1.0
        profile = "Stable Salary (CV <= 0.10)"
    elif cv <= 0.30:
        k = 1.5
        profile = "Variable Income (0.10 < CV <= 0.30)"
    else:
        k = 2.0
        profile = "Irregular/Volatile Income (CV > 0.30)"

    return {
        "cv": round(cv, 3),
        "k": k,
        "profile": profile,
        "mean_income_paise": int(round(mean)),
        "std_income_paise": int(round(std))
    }

def calculate_monthly_essentials(
    transactions: List[Dict[str, Any]],
    recurring_items: Optional[List[Dict[str, Any]]] = None
) -> int:
    """
    Calculates representative monthly essential spending in paise.
    Prioritizes active recurring obligations + monthly essential categories.
    """
    committed_monthly = 0
    if recurring_items:
        for item in recurring_items:
            typ = item.get("type", "")
            if typ != "salary":  # expenses only
                cadence = item.get("cadence", "monthly")
                amt = abs(item.get("typical_amount_minor", 0))
                if cadence == "monthly":
                    committed_monthly += amt
                elif cadence == "weekly":
                    committed_monthly += amt * 4
                elif cadence == "fortnightly":
                    committed_monthly += amt * 2
                elif cadence == "quarterly":
                    committed_monthly += amt // 3
                elif cadence == "annual":
                    committed_monthly += amt // 12

    # Group essential transactions by month (excluding paired transfers)
    months_spend: Dict[str, int] = {}
    for txn in transactions:
        if txn.get("is_transfer", False) or txn.get("amount_minor", 0) >= 0:
            continue
        cat = txn.get("category_id", "")
        if cat in ESSENTIAL_CATEGORIES:
            posted = str(txn.get("posted_date", ""))
            month_key = posted[:7] if len(posted) >= 7 else "all"
            months_spend[month_key] = months_spend.get(month_key, 0) + abs(txn["amount_minor"])

    if months_spend:
        # Use median monthly essential spend
        med_essential = int(np.median(list(months_spend.values())))
        # Take the maximum between detected recurring and historical monthly category spend
        return max(committed_monthly, med_essential)
    
    return committed_monthly if committed_monthly > 0 else 2_500_000  # Default ₹25,000 if no data

def calculate_variability_reserve(transactions: List[Dict[str, Any]]) -> int:
    """
    Computes a reserve based on the 90th percentile of variable (non-essential) spend spikes.
    """
    variable_spends = []
    for txn in transactions:
        if txn.get("is_transfer", False) or txn.get("amount_minor", 0) >= 0:
            continue
        cat = txn.get("category_id", "")
        if cat not in ESSENTIAL_CATEGORIES:
            variable_spends.append(abs(txn["amount_minor"]))

    if not variable_spends:
        return 500_000  # ₹5,000

    arr = np.array(variable_spends, dtype=float)
    # Estimate a monthly discretionary spike: 1.5 * IQR or 90th percentile of 30-day cluster
    p90_single = float(np.percentile(arr, 90))
    # A reserve equivalent to 3 typical p90 discretionary spikes
    reserve = int(round(p90_single * 3))
    return max(500_000, reserve)

def compute_safety_buffer(
    transactions: List[Dict[str, Any]],
    recurring_items: Optional[List[Dict[str, Any]]] = None,
    floor_paise: int = DEFAULT_FLOOR_PAISE,
    k_override: Optional[float] = None
) -> Dict[str, Any]:
    """
    Evaluates dynamic safety buffer B = max(Floor, k * Essentials, VariabilityReserve).
    Returns integer paise and breakdown metadata.
    """
    # 1. Income volatility & multiplier k
    income_txns = [
        t for t in transactions 
        if not t.get("is_transfer", False) and t.get("amount_minor", 0) > 0 and 
        t.get("category_id", "") in ("cat_income_salary", "cat_income_freelance", "cat_income_other")
    ]
    vol = compute_income_volatility(income_txns)
    k = k_override if k_override is not None else vol["k"]

    # 2. Monthly essentials
    essentials_monthly = calculate_monthly_essentials(transactions, recurring_items)
    k_essentials = int(round(k * essentials_monthly))

    # 3. Variability reserve
    variability_reserve = calculate_variability_reserve(transactions)

    # 4. Final buffer
    buffer_paise = max(floor_paise, k_essentials, variability_reserve)

    if buffer_paise == k_essentials:
        binding_term = "k_x_essentials"
        reason = f"{k:.1f} × monthly essentials (₹{essentials_monthly // 100:,}) based on income volatility ({vol['profile']})"
    elif buffer_paise == variability_reserve:
        binding_term = "variability_reserve"
        reason = f"Variability reserve (₹{variability_reserve // 100:,}) covers high historical discretionary spend spikes"
    else:
        binding_term = "floor"
        reason = f"Absolute safety floor of ₹{floor_paise // 100:,}"

    return {
        "value_minor": buffer_paise,
        "binding_term": binding_term,
        "k": k,
        "essentials_monthly_minor": essentials_monthly,
        "variability_reserve_minor": variability_reserve,
        "floor_minor": floor_paise,
        "reason": reason,
        "income_volatility": vol
    }

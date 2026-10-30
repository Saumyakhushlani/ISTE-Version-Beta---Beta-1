"""
Cash-Flow Forecast & Monte Carlo Sampler Engine for Financial Decision Lab (FDL).
Simulates daily cash-balance evolution:
  Balance(t) = Balance(t-1) + I(t) - C(t) - V(t)
over horizon H (default 30 or 90 days) using N=5,000 deterministic Monte Carlo runs (seed=42).
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np

def extract_recurring_calendar(
    recurring_items: List[Dict[str, Any]],
    start_date: datetime,
    days: int = 60
) -> Tuple[Dict[str, int], Dict[str, int]]:
    """
    Projects daily inflows I(t) and scheduled recurring outflows C(t) for each date YYYY-MM-DD.
    Returns: (daily_inflows, daily_outflows) in paise.
    """
    daily_inflows: Dict[str, int] = {}
    daily_outflows: Dict[str, int] = {}

    for i in range(days + 1):
        dt = start_date + timedelta(days=i)
        iso = dt.strftime("%Y-%m-%d")
        daily_inflows[iso] = 0
        daily_outflows[iso] = 0

    for item in recurring_items:
        typ = item.get("type", "")
        amt = abs(item.get("typical_amount_minor", 0))
        next_date_str = item.get("next_expected_date", "")
        cadence = item.get("cadence", "monthly")
        day_of_month = 1

        try:
            if next_date_str:
                parsed_next = datetime.strptime(next_date_str, "%Y-%m-%d")
                day_of_month = parsed_next.day
            else:
                day_of_month = 1
        except Exception:
            day_of_month = 1

        # Project occurrences across the horizon
        for i in range(days + 1):
            dt = start_date + timedelta(days=i)
            iso = dt.strftime("%Y-%m-%d")
            matches_schedule = False

            if cadence == "monthly":
                # Matches if same day of month (or end of month)
                if dt.day == min(day_of_month, 28 if dt.month == 2 else 30):
                    matches_schedule = True
            elif cadence == "weekly":
                if i % 7 == 0:
                    matches_schedule = True
            elif cadence == "fortnightly":
                if i % 14 == 0:
                    matches_schedule = True
            elif cadence == "quarterly":
                if dt.day == day_of_month and i % 90 == 0:
                    matches_schedule = True

            if matches_schedule:
                if typ == "salary" or item.get("amount_minor", 0) > 0:
                    daily_inflows[iso] = daily_inflows.get(iso, 0) + amt
                else:
                    daily_outflows[iso] = daily_outflows.get(iso, 0) + amt

    return daily_inflows, daily_outflows

def extract_historical_daily_variable_spend(
    transactions: List[Dict[str, Any]],
    committed_categories: Optional[set] = None
) -> np.ndarray:
    """
    Extracts daily non-committed variable spending array to construct empirical distribution.
    """
    if committed_categories is None:
        committed_categories = {
            "cat_rent", "cat_loan_emi", "cat_recurring_bill", "cat_insurance", "cat_investments"
        }

    daily_spend: Dict[str, int] = {}
    for txn in transactions:
        if txn.get("is_transfer", False) or txn.get("amount_minor", 0) >= 0:
            continue
        cat = txn.get("category_id", "")
        if cat in committed_categories:
            continue
        posted = str(txn.get("posted_date", ""))
        daily_spend[posted] = daily_spend.get(posted, 0) + abs(txn["amount_minor"])

    if not daily_spend:
        # Default daily spend ~ ₹750/day (75,000 paise)
        return np.array([75_000] * 30, dtype=float)

    values = list(daily_spend.values())
    # Add zero-spend days if span is larger than count
    return np.array(values, dtype=float)

def run_monte_carlo_forecast(
    starting_balance_paise: int,
    recurring_items: List[Dict[str, Any]],
    historical_transactions: List[Dict[str, Any]],
    horizon_days: int = 45,
    n_runs: int = 5000,
    seed: int = 42,
    buffer_paise: int = 500_000,
    proposed_purchase_paise: int = 0,
    purchase_day_offset: int = 15
) -> Dict[str, Any]:
    """
    Executes N deterministic Monte Carlo simulations of the daily balance trajectory.
    Returns:
      - Percentile paths: P10, P50, P90
      - Lowest balance amounts and dates (P10, P50, P90)
      - Breach probability (Balance < Buffer)
      - Negative balance probability (Balance < 0)
    """
    rng = np.random.default_rng(seed)
    start_date = datetime.now()
    daily_inflows, daily_outflows = extract_recurring_calendar(recurring_items, start_date, horizon_days)
    var_spend_pool = extract_historical_daily_variable_spend(historical_transactions)

    # Date sequence
    date_keys = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(horizon_days)]

    # Draw variable spend for all runs at once: shape (n_runs, horizon_days)
    # Using bootstrap resample from empirical variable spend distribution
    sampled_var_spend = rng.choice(var_spend_pool, size=(n_runs, horizon_days), replace=True)

    # Pre-build daily deterministic cash flows (Inflow - Committed Outflow - Proposed Purchase)
    det_flows = np.zeros(horizon_days, dtype=float)
    for t_idx, d_str in enumerate(date_keys):
        inflow = daily_inflows.get(d_str, 0)
        outflow = daily_outflows.get(d_str, 0)
        purchase = proposed_purchase_paise if t_idx == purchase_day_offset else 0
        det_flows[t_idx] = inflow - outflow - purchase

    # Daily net flows: det_flows - sampled_var_spend
    # Shape: (n_runs, horizon_days)
    daily_net = det_flows - sampled_var_spend

    # Cumulative trajectory starting from starting_balance_paise
    # Shape: (n_runs, horizon_days)
    trajectories = starting_balance_paise + np.cumsum(daily_net, axis=1)

    # Daily percentiles across runs
    p10_daily = np.percentile(trajectories, 10, axis=0)
    p50_daily = np.percentile(trajectories, 50, axis=0)
    p90_daily = np.percentile(trajectories, 90, axis=0)

    # Minimum balance per run
    min_balances_per_run = np.min(trajectories, axis=1)

    # Lowest balance percentiles
    lowest_p10 = int(round(np.percentile(min_balances_per_run, 10)))
    lowest_p50 = int(round(np.percentile(min_balances_per_run, 50)))
    lowest_p90 = int(round(np.percentile(min_balances_per_run, 90)))

    # Find the day when P50 lowest balance occurs
    p50_min_idx = int(np.argmin(p50_daily))
    lowest_balance_date = date_keys[p50_min_idx]

    # Probabilities
    breach_prob = float(np.mean(min_balances_per_run < buffer_paise))
    neg_balance_prob = float(np.mean(min_balances_per_run < 0))

    # Format daily trajectory points for UI chart (sample 15 key points or every 2-3 days)
    timeline_points = []
    step_size = max(1, horizon_days // 20)
    for idx in range(0, horizon_days, step_size):
        timeline_points.append({
            "date": date_keys[idx],
            "p10_paise": int(round(p10_daily[idx])),
            "p50_paise": int(round(p50_daily[idx])),
            "p90_paise": int(round(p90_daily[idx]))
        })

    return {
        "n_runs": n_runs,
        "seed": seed,
        "horizon_days": horizon_days,
        "starting_balance_paise": starting_balance_paise,
        "lowest_balance": {
            "date": lowest_balance_date,
            "day_index": p50_min_idx,
            "p10_minor": lowest_p10,
            "p50_minor": lowest_p50,
            "p90_minor": lowest_p90
        },
        "breach_probability": round(breach_prob, 3),
        "prob_negative_balance": round(neg_balance_prob, 3),
        "timeline": timeline_points
    }

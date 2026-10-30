"""
Core Affordability Decision Engine for Financial Decision Lab (FDL).
Integrates:
  1. Data Sufficiency Gate
  2. Dynamic Safety Buffer (Floor vs Essentials vs Reserve)
  3. Monte Carlo Cash-Flow Forecast (5,000 runs, seed 42)
  4. Headroom Evaluation (P10 / P50 / P90)
  5. Deterministic Verdict Classification
  6. Reasoning Ledger Chain
"""
from typing import List, Dict, Any, Optional
import numpy as np
from datetime import datetime

from engine.sufficiency import evaluate_data_sufficiency
from engine.buffer import compute_safety_buffer
from engine.forecast import run_monte_carlo_forecast
from engine.ledger import build_reasoning_ledger

def calculate_emi_paise(principal_paise: int, tenure_months: int, annual_interest_pct: float = 0.0) -> int:
    """
    Computes monthly EMI in integer paise.
    If interest == 0.0, EMI = round(principal / tenure).
    Otherwise: EMI = round(P * i * (1+i)^n / ((1+i)^n - 1)) where i = r / (12 * 100).
    """
    if tenure_months <= 0:
        return principal_paise

    if annual_interest_pct <= 0.0:
        return int(round(principal_paise / tenure_months))

    i = annual_interest_pct / (12.0 * 100.0)
    factor = (1.0 + i) ** tenure_months
    emi = principal_paise * (i * factor) / (factor - 1.0)
    return int(round(emi))

def evaluate_affordability_decision(
    transactions: List[Dict[str, Any]],
    recurring_items: List[Dict[str, Any]],
    current_balances: Dict[str, int],  # per-account or {"combined": total_paise}
    purchase_amount_paise: int,
    label: str = "Purchase",
    timing: str = "next_month",
    payment_type: str = "cash",
    emi_months: Optional[int] = None,
    emi_interest_rate_pct: Optional[float] = None,
    buffer_multiplier_override: Optional[float] = None,
    source_files: Optional[List[Dict[str, Any]]] = None,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Master Affordability Evaluator:
    Produces deterministic verdict, P10/P50/P90 headroom, safety buffer, and Reasoning Ledger.
    """
    # Total starting liquid balance
    total_starting_balance = sum(current_balances.values()) if current_balances else 0

    # 1. Gate: Sufficiency check
    gate_report = evaluate_data_sufficiency(transactions, source_files=source_files)
    if gate_report["status"] == "INSUFFICIENT":
        return {
            "verdict": {
                "code": "INSUFFICIENT_DATA",
                "headline": "Insufficient statement history to safely evaluate affordability.",
                "breach_probability": 1.0,
                "prob_negative_balance": 1.0,
                "confidence": {
                    "score": 20,
                    "label": "Low",
                    "factors": ["Fewer than 60 days of continuous transaction history"]
                }
            },
            "gate": gate_report,
            "headroom": {"p10_minor": 0, "p50_minor": 0, "p90_minor": 0},
            "buffer": {"value_minor": 0, "reason": "Data insufficient to calculate buffer"},
            "lowest_balance": {"date": "N/A", "p50_minor": 0, "p10_minor": 0},
            "ledger": []
        }

    # 2. Dynamic Safety Buffer
    buffer_eval = compute_safety_buffer(
        transactions=transactions,
        recurring_items=recurring_items,
        k_override=buffer_multiplier_override
    )
    buffer_paise = buffer_eval["value_minor"]

    # 3. Handle Cash vs EMI
    actual_outflow_paise = purchase_amount_paise
    emi_details = None
    if payment_type == "emi" and emi_months and emi_months > 1:
        rate = emi_interest_rate_pct or 0.0
        monthly_emi_paise = calculate_emi_paise(purchase_amount_paise, emi_months, rate)
        actual_outflow_paise = monthly_emi_paise  # monthly impact in next month forecast
        emi_details = {
            "tenure_months": emi_months,
            "annual_interest_pct": rate,
            "monthly_emi_paise": monthly_emi_paise,
            "total_payable_paise": monthly_emi_paise * emi_months,
            "interest_cost_paise": (monthly_emi_paise * emi_months) - purchase_amount_paise
        }

    # 4. Monte Carlo Forecast (5,000 runs, seed 42)
    # purchase placed at day 15 (middle of next month)
    forecast = run_monte_carlo_forecast(
        starting_balance_paise=total_starting_balance,
        recurring_items=recurring_items,
        historical_transactions=transactions,
        horizon_days=45,
        n_runs=5000,
        seed=seed,
        buffer_paise=buffer_paise,
        proposed_purchase_paise=actual_outflow_paise,
        purchase_day_offset=15
    )

    lowest_bal = forecast["lowest_balance"]
    # Headroom = Projected Lowest Balance - Buffer
    headroom_p10 = lowest_bal["p10_minor"] - buffer_paise
    headroom_p50 = lowest_bal["p50_minor"] - buffer_paise
    headroom_p90 = lowest_bal["p90_minor"] - buffer_paise

    # 5. Verdict Classification
    if headroom_p10 >= 0:
        verdict_code = "AFFORDABLE"
        headline = f"Safe to buy. Leaves ₹{headroom_p10 // 100:,} cushion above your safety buffer even in conservative conditions."
    elif headroom_p50 >= 0:
        verdict_code = "TIGHT"
        headline = f"Likely affordable (₹{headroom_p50 // 100:,} median headroom), but exposed if unexpected expenses occur."
    elif lowest_bal["p50_minor"] >= 0:
        verdict_code = "NOT_ADVISABLE"
        deficit = abs(headroom_p50) // 100
        headline = f"Not advisable now. Breaches your ₹{buffer_paise // 100:,} emergency buffer by ₹{deficit:,}."
    else:
        verdict_code = "NOT_AFFORDABLE"
        headline = "Not affordable. High risk of account balance dropping below ₹0 (negative balance)."

    # Confidence calculation
    conf_factors = []
    days_span = gate_report.get("coverage_days", 90)
    conf_score = min(95, 60 + (days_span // 3))
    conf_factors.append(f"{days_span} days of statement history verified")
    if buffer_eval["income_volatility"]["cv"] <= 0.15:
        conf_factors.append("Low income volatility detected")
    else:
        conf_factors.append("Income variance accounted for in buffer multiplier")

    conf_label = "High" if conf_score >= 80 else ("Medium" if conf_score >= 60 else "Low")

    # 6. Expected next month income & commitments for Ledger
    salary_items = [item for item in recurring_items if item.get("type") == "salary" or item.get("amount_minor", 0) > 0]
    expected_income = sum(item.get("typical_amount_minor", 0) for item in salary_items)
    if expected_income == 0:
        # Fallback to mean income from volatility module
        expected_income = buffer_eval["income_volatility"].get("mean_income_paise", 0)

    committed_outflows = sum(
        item.get("typical_amount_minor", 0) for item in recurring_items 
        if item.get("type") != "salary" and item.get("amount_minor", 0) < 0
    )

    # Account breakdown description
    acct_strs = [f"{b}: ₹{amt // 100:,}" for b, amt in current_balances.items()]
    acct_desc = " + ".join(acct_strs) if acct_strs else f"₹{total_starting_balance // 100:,}"

    # 7. Build Reasoning Ledger
    ledger = build_reasoning_ledger(
        starting_balance_paise=total_starting_balance,
        expected_income_paise=expected_income,
        income_method_desc=f"Projected from regular credit pattern (₹{expected_income // 100:,})",
        committed_outflows_paise=committed_outflows,
        recurring_items_count=len([i for i in recurring_items if i.get("type") != "salary"]),
        variable_spend_estimate_paise=buffer_eval["variability_reserve_minor"],
        buffer_paise=buffer_paise,
        buffer_formula_desc=buffer_eval["reason"],
        purchase_amount_paise=actual_outflow_paise,
        lowest_balance_date=lowest_bal["date"],
        lowest_balance_p50_paise=lowest_bal["p50_minor"],
        headroom_p50_paise=headroom_p50,
        verdict_code=verdict_code,
        account_breakdown_desc=acct_desc
    )

    return {
        "verdict": {
            "code": verdict_code,
            "headline": headline,
            "breach_probability": forecast["breach_probability"],
            "prob_negative_balance": forecast["prob_negative_balance"],
            "confidence": {
                "score": conf_score,
                "label": conf_label,
                "factors": conf_factors
            }
        },
        "gate": gate_report,
        "headroom": {
            "p10_minor": headroom_p10,
            "p50_minor": headroom_p50,
            "p90_minor": headroom_p90
        },
        "buffer": buffer_eval,
        "lowest_balance": lowest_bal,
        "emi_details": emi_details,
        "timeline": forecast["timeline"],
        "ledger": ledger
    }

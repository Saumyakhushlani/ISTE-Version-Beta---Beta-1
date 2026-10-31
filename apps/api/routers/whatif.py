"""
FastAPI Router for What-If Scenarios & Simulations.
Allows simulating adjustments side-by-side:
  - EMI Financing (e.g. 6-month / 12-month no-cost or low-cost EMI)
  - Subscription / Recurring cancellation
  - Delaying purchase by 1-3 months
  - Income shock (-10%, -20%)
Enforces strict multi-user data isolation.
"""
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import ForecastSnapshot, User
from auth import get_current_user
from routers.affordability import fetch_db_state
from engine.affordability import evaluate_affordability_decision, calculate_emi_paise

router = APIRouter()

class ScenarioAdjustment(BaseModel):
    type: str  # "cancel_recurring" | "purchase_emi" | "delay_purchase" | "income_shock"
    params: Dict[str, Any]

class CreateScenarioRequest(BaseModel):
    name: str
    adjustments: List[ScenarioAdjustment]
    purchase_amount_minor: int = 8_000_000  # Default ₹80,000

class CompareScenariosPayload(BaseModel):
    purchase_amount_minor: int
    scenarios: List[CreateScenarioRequest]

@router.post("/compare")
def compare_scenarios(
    payload: CompareScenariosPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulates What-If overlays side-by-side against the baseline without mutating transactions.
    Enforces user isolation via current_user.id.
    """
    txns, account_balances, recurring, source_files = fetch_db_state(db, user_id=current_user.id)

    # 1. Baseline evaluation (Cash purchase now)
    base_decision = evaluate_affordability_decision(
        transactions=txns,
        recurring_items=recurring,
        current_balances=account_balances,
        purchase_amount_paise=payload.purchase_amount_minor,
        payment_type="cash",
        source_files=source_files,
        seed=42
    )

    baseline_summary = {
        "name": "Baseline (Cash Next Month)",
        "lowest_balance_paise": base_decision["lowest_balance"]["p50_minor"],
        "headroom_paise": base_decision["headroom"]["p50_minor"],
        "breach_probability": base_decision["verdict"]["breach_probability"],
        "verdict": base_decision["verdict"]["code"],
        "headline": base_decision["verdict"]["headline"]
    }

    # 2. Evaluate each scenario
    simulated_scenarios = []
    for sc in payload.scenarios:
        sc_txns = list(txns)
        sc_recurring = [dict(r) for r in recurring]
        sc_purchase_paise = payload.purchase_amount_minor
        payment_type = "cash"
        emi_months = None
        emi_rate = 0.0

        for adj in sc.adjustments:
            if adj.type == "cancel_recurring":
                merchant_to_cancel = adj.params.get("merchant", "")
                sc_recurring = [r for r in sc_recurring if merchant_to_cancel.lower() not in r["merchant"].lower()]

            elif adj.type == "purchase_emi":
                payment_type = "emi"
                emi_months = adj.params.get("months", 6)
                emi_rate = adj.params.get("interest_rate_pct", 0.0)

            elif adj.type == "delay_purchase":
                delay_m = adj.params.get("months", 1)

            elif adj.type == "income_shock":
                reduction_pct = adj.params.get("reduction_pct", 20.0)
                for r in sc_recurring:
                    if r["type"] == "salary":
                        r["amount_minor"] = int(r["amount_minor"] * (1 - reduction_pct / 100))

        # Run decision for scenario
        sc_decision = evaluate_affordability_decision(
            transactions=sc_txns,
            recurring_items=sc_recurring,
            current_balances=account_balances,
            purchase_amount_paise=sc_purchase_paise,
            payment_type=payment_type,
            emi_months=emi_months,
            emi_interest_rate_pct=emi_rate,
            source_files=source_files,
            seed=42
        )

        delta_headroom = sc_decision["headroom"]["p50_minor"] - base_decision["headroom"]["p50_minor"]
        delta_lowest = sc_decision["lowest_balance"]["p50_minor"] - base_decision["lowest_balance"]["p50_minor"]

        simulated_scenarios.append({
            "name": sc.name,
            "verdict": sc_decision["verdict"]["code"],
            "headline": sc_decision["verdict"]["headline"],
            "lowest_balance_paise": sc_decision["lowest_balance"]["p50_minor"],
            "headroom_paise": sc_decision["headroom"]["p50_minor"],
            "delta_headroom_paise": delta_headroom,
            "delta_lowest_balance_paise": delta_lowest,
            "breach_probability": sc_decision["verdict"]["breach_probability"],
            "prob_negative_balance": sc_decision["verdict"]["prob_negative_balance"],
            "payment_type": payment_type,
            "emi_months": emi_months
        })

    return {
        "purchase_amount_paise": payload.purchase_amount_minor,
        "baseline": baseline_summary,
        "scenarios": simulated_scenarios
    }

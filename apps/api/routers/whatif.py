"""
FastAPI Router for What-If Scenarios & Simulations.
Allows simulating adjustments side-by-side:
  - EMI Financing (e.g. 6-month / 12-month no-cost or low-cost EMI)
  - Subscription / Recurring cancellation
  - Delaying purchase by 1-3 months
  - Income shock (-10%, -20%)
"""
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import ForecastSnapshot
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
def compare_scenarios(payload: CompareScenariosPayload, db: Session = Depends(get_db)):
    """
    Simulates What-If overlays side-by-side against the baseline without mutating transactions.
    """
    txns, account_balances, recurring, source_files = fetch_db_state(db)

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
            atype = adj.type
            aparams = adj.params

            if atype == "purchase_emi":
                payment_type = "emi"
                emi_months = aparams.get("months", 6)
                emi_rate = float(aparams.get("interest_pct", 0.0))

            elif atype == "cancel_recurring":
                # Filter out specified recurring items or categories
                target_merchants = [m.lower() for m in aparams.get("merchants", [])]
                target_categories = aparams.get("categories", [])
                sc_recurring = [
                    r for r in sc_recurring
                    if r.get("merchant", "").lower() not in target_merchants and
                       r.get("category_id") not in target_categories
                ]

            elif atype == "delay_purchase":
                # E.g. delay by months frees next month entirely
                months_delayed = aparams.get("months", 1)
                if months_delayed >= 1:
                    sc_purchase_paise = 0  # No purchase next month!

            elif atype == "income_shock":
                # Reduce recurring salary
                shock_pct = float(aparams.get("reduction_pct", 15.0))
                for r in sc_recurring:
                    if r.get("type") == "salary" or r.get("amount_minor", 0) > 0:
                        r["typical_amount_minor"] = int(round(r["typical_amount_minor"] * (1.0 - shock_pct / 100.0)))

        # Run scenario decision
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

        simulated_scenarios.append({
            "name": sc.name,
            "lowest_balance_paise": sc_decision["lowest_balance"]["p50_minor"],
            "headroom_paise": sc_decision["headroom"]["p50_minor"],
            "breach_probability": sc_decision["verdict"]["breach_probability"],
            "verdict": sc_decision["verdict"]["code"],
            "headline": sc_decision["verdict"]["headline"],
            "delta_headroom_paise": sc_decision["headroom"]["p50_minor"] - base_decision["headroom"]["p50_minor"]
        })

    return {
        "baseline": baseline_summary,
        "scenarios": simulated_scenarios
    }

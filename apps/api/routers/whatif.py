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
    type: str  # "cancel_recurring" | "purchase_emi" | "delay_purchase" | "income_shock" | "expense_shock" | "add_recurring"
    params: Dict[str, Any]

class CreateScenarioRequest(BaseModel):
    name: str
    adjustments: List[ScenarioAdjustment]
    purchase_amount_minor: int = 8_000_000  # Default ₹80,000

class CompareScenariosPayload(BaseModel):
    purchase_amount_minor: int
    scenarios: List[CreateScenarioRequest]
    source_file_ids: Optional[List[str]] = None

@router.get("/recurring-options")
def get_recurring_options_for_scenarios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns active subscriptions and recurring obligations for the current user
    to populate cancellation dropdowns in What-If scenario modeling.
    """
    txns, account_balances, recurring, source_files = fetch_db_state(db, user_id=current_user.id)
    obligations = [
        {
            "id": r.get("id"),
            "merchant": r.get("merchant"),
            "cadence": r.get("cadence"),
            "typical_amount_minor": r.get("typical_amount_minor"),
            "type": r.get("type")
        }
        for r in recurring
        if r.get("type") != "salary" and (r.get("amount_minor", 0) < 0 or r.get("typical_amount_minor", 0) > 0)
    ]
    return obligations

def simulate_scenarios_core(
    txns: List[Dict[str, Any]],
    account_balances: Dict[str, int],
    recurring: List[Dict[str, Any]],
    source_files: Optional[List[Dict[str, Any]]],
    purchase_amount_minor: int,
    scenarios: List[Any]
) -> Dict[str, Any]:
    # 1. Baseline evaluation (Cash purchase now)
    base_decision = evaluate_affordability_decision(
        transactions=txns,
        recurring_items=recurring,
        current_balances=account_balances,
        purchase_amount_paise=purchase_amount_minor,
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
    for sc in scenarios:
        sc_name = sc.name if hasattr(sc, "name") else (sc.get("name") if isinstance(sc, dict) else "Scenario")
        adjustments = sc.adjustments if hasattr(sc, "adjustments") else (sc.get("adjustments", []) if isinstance(sc, dict) else [])

        sc_txns = list(txns)
        sc_recurring = [dict(r) for r in recurring]
        sc_purchase_paise = purchase_amount_minor
        payment_type = "cash"
        emi_months = None
        emi_rate = 0.0

        for adj in adjustments:
            adj_type = adj.type if hasattr(adj, "type") else (adj.get("type", "") if isinstance(adj, dict) else "")
            adj_params = adj.params if hasattr(adj, "params") else (adj.get("params", {}) if isinstance(adj, dict) else {})

            if adj_type == "cancel_recurring":
                merchant_to_cancel = adj_params.get("merchant", "")
                item_id = adj_params.get("id", "")
                sc_recurring = [
                    r for r in sc_recurring
                    if (not item_id or r.get("id") != item_id) and
                       (not merchant_to_cancel or merchant_to_cancel.lower() not in r.get("merchant", "").lower())
                ]

            elif adj_type == "add_recurring":
                add_merchant = adj_params.get("merchant", "New Commitment")
                add_amount = adj_params.get("typical_amount_minor", 100000)
                sc_recurring.append({
                    "id": f"sc_rec_{len(sc_recurring)}",
                    "merchant": add_merchant,
                    "type": "subscription",
                    "cadence": "monthly",
                    "typical_amount_minor": add_amount,
                    "amount_minor": -abs(add_amount),
                    "confidence": 1.0
                })

            elif adj_type == "purchase_emi":
                payment_type = "emi"
                emi_months = adj_params.get("months", 6)
                emi_rate = adj_params.get("interest_rate_pct", 0.0)

            elif adj_type == "delay_purchase":
                delay_m = adj_params.get("months", 2)
                if delay_m >= 2:
                    sc_purchase_paise = 0
                else:
                    sc_purchase_paise = int(sc_purchase_paise * 0.5)

            elif adj_type == "income_shock":
                pct = adj_params.get("reduction_pct")
                if pct is not None:
                    multiplier = 1.0 - (float(pct) / 100.0)
                else:
                    delta_pct = adj_params.get("delta_pct", 0.0)
                    multiplier = 1.0 + (float(delta_pct) / 100.0)

                for r in sc_recurring:
                    if r.get("type") == "salary":
                        r["typical_amount_minor"] = int(r["typical_amount_minor"] * multiplier)
                        r["amount_minor"] = int(r["amount_minor"] * multiplier)

            elif adj_type == "expense_shock":
                cut_pct = adj_params.get("cut_pct", 20.0)
                sc_txns = [
                    dict(t, amount_minor=int(t["amount_minor"] * (1 - cut_pct / 100.0)))
                    if t["amount_minor"] < 0 and not t.get("is_transfer", False)
                    else t
                    for t in sc_txns
                ]

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
            "name": sc_name,
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
        "purchase_amount_paise": purchase_amount_minor,
        "baseline": baseline_summary,
        "scenarios": simulated_scenarios
    }

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
    txns, account_balances, recurring, source_files = fetch_db_state(db, user_id=current_user.id, source_file_ids=payload.source_file_ids)
    return simulate_scenarios_core(
        txns=txns,
        account_balances=account_balances,
        recurring=recurring,
        source_files=source_files,
        purchase_amount_minor=payload.purchase_amount_minor,
        scenarios=payload.scenarios
    )

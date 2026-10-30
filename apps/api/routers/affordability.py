from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from db.database import get_db

router = APIRouter()

class AffordabilityQuery(BaseModel):
    purchase_amount_minor: int  # e.g. 8000000 for ₹80,000
    label: str = "Purchase"
    timing: str = "next_month"  # "next_month" | "this_month" | specific date
    payment_type: str = "cash"  # "cash" | "emi"
    emi_months: Optional[int] = None
    emi_interest_rate_pct: Optional[float] = None
    buffer_multiplier_override: Optional[float] = None

class NaturalLanguageAsk(BaseModel):
    question: str

@router.post("")
def evaluate_affordability(query: AffordabilityQuery, db: Session = Depends(get_db)):
    """
    Core Affordability Decision Endpoint:
    Returns the verdict, percentile ranges, buffer rationale, and Reasoning Ledger.
    """
    return {
        "snapshot_id": "fs_demo_001",
        "verdict": {
            "code": "TIGHT",
            "headline": "Likely affordable but exposed if income or spending comes in worse than usual.",
            "breach_probability": 0.24,
            "prob_negative_balance": 0.02,
            "confidence": {
                "score": 74,
                "label": "Medium",
                "factors": ["Stable salary detected (6 months)", "Low uncategorized spend (8%)"]
            }
        },
        "headroom": {
            "p10_minor": -500000,
            "p50_minor": 330000,
            "p90_minor": 1100000
        },
        "buffer": {
            "value_minor": 5800000,
            "binding_term": "k_x_essentials",
            "k": 1.5,
            "essentials_monthly_minor": 3870000,
            "reason": "1.5 × monthly essentials because income is variable (CV 0.21)"
        },
        "lowest_balance": {
            "date": "2025-04-27",
            "p50_minor": 6130000,
            "p10_minor": 5300000
        },
        "ledger": [
            {"step_no": 1, "label": "Current balance (all accounts)", "value_minor": 11240000, "formula_text": "HDFC (₹74,000) + SBI (₹38,400)", "status": "ok"},
            {"step_no": 2, "label": "Expected next month income", "value_minor": 7800000, "formula_text": "Median of last 6 salary credits", "status": "ok"},
            {"step_no": 3, "label": "Committed payments (Rent, EMI, SIP, Subs)", "value_minor": -3180000, "formula_text": "Sum of 9 active recurring obligations", "status": "ok"},
            {"step_no": 4, "label": "Variable spending estimate", "value_minor": -2450000, "formula_text": "Median Food + Utilities + Discretionary", "status": "ok"},
            {"step_no": 5, "label": "Safety buffer", "value_minor": 5800000, "formula_text": "1.5 × monthly essentials (₹38,700)", "status": "ok"},
            {"step_no": 6, "label": "Purchase cost", "value_minor": -query.purchase_amount_minor, "formula_text": "One-off cash outflow", "status": "ok"},
            {"step_no": 7, "label": "Projected lowest balance date", "value_minor": 6130000, "formula_text": "Dips to ₹61,300 on 27th before next salary", "status": "ok"},
            {"step_no": 8, "label": "Headroom vs buffer", "value_minor": 330000, "formula_text": "Lowest balance ₹61,300 − Buffer ₹58,000", "status": "ok"}
        ]
    }

@router.post("/ask")
def natural_language_ask(payload: NaturalLanguageAsk, db: Session = Depends(get_db)):
    """
    Parses natural language question, confirms parsed intent,
    and returns affordability evaluation with Number-Guarded narration.
    """
    # Demo stub for natural language parsing
    return evaluate_affordability(
        AffordabilityQuery(purchase_amount_minor=8000000, label="Phone", timing="next_month"),
        db=db
    )

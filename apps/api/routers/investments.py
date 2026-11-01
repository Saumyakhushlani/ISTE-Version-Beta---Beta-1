"""
FastAPI Router for Investments & Liquidity Sourcing.
Provides:
  - GET  /api/investments/summary  - Real-time savings health and investment eligibility
  - POST /api/investments/chat     - Conversational Groq NLP investment advisor with strict zero-savings validation
  - POST /api/investments/sourcing - Multi-bank inter-account fund allocation and transfer recommendations
Enforces strict multi-user data isolation.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User
from auth import get_current_user
from engine.investments import compute_investment_telemetry
from engine.liquidity import recommend_investment_sourcing
from ai.investment_chat import generate_investment_advice

router = APIRouter()


class InvestmentChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


class InvestmentSourcingRequest(BaseModel):
    target_amount_paise: int
    investment_label: Optional[str] = "Investment"


@router.get("/summary")
def get_investment_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns user's multi-bank liquid balances, monthly run-rate (inflow, outflow, savings),
    savings rate %, and deterministic investment eligibility validation.
    """
    telemetry = compute_investment_telemetry(db, user_id=current_user.id)
    return {
        "status": "success",
        "telemetry": telemetry,
    }


@router.post("/chat")
def chat_investment_advisor(
    req: InvestmentChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluates conversational investment inquiries through Groq NLP (or fallback),
    injecting real multi-bank financial telemetry and investment options.
    Enforces deterministic validation: if user is not saving, firmly refuses new investments.
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    telemetry = compute_investment_telemetry(db, user_id=current_user.id)
    result = generate_investment_advice(
        message=req.message.strip(),
        telemetry=telemetry,
        history=req.history,
    )
    return result


@router.post("/sourcing")
def get_sourcing_plan(
    req: InvestmentSourcingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Calculates multi-bank inter-account fund sourcing and transfer instructions.
    """
    if req.target_amount_paise <= 0:
        raise HTTPException(status_code=400, detail="target_amount_paise must be positive integer paise.")

    plan = recommend_investment_sourcing(
        target_amount_paise=req.target_amount_paise,
        db=db,
        investment_label=req.investment_label or "Investment",
        user_id=current_user.id,
    )
    return plan

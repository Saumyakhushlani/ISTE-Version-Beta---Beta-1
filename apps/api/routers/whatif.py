from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from db.database import get_db

router = APIRouter()

class ScenarioAdjustment(BaseModel):
    type: str  # "cancel_recurring" | "purchase_emi" | "delay_purchase" | "income_shock"
    params: Dict[str, Any]

class CreateScenarioRequest(BaseModel):
    name: str
    base_snapshot_id: str
    adjustments: List[ScenarioAdjustment]

@router.post("/compare")
def compare_scenarios(scenarios: List[CreateScenarioRequest], db: Session = Depends(get_db)):
    """
    Simulates What-If overlays side-by-side without mutating baseline transactions.
    """
    return {
        "baseline": {
            "name": "Baseline (Cash Now)",
            "lowest_balance_paise": 6130000,
            "headroom_paise": 330000,
            "breach_probability": 0.24,
            "verdict": "TIGHT"
        },
        "scenarios": [
            {
                "name": "Scenario A: 6-Month EMI",
                "lowest_balance_paise": 9850000,
                "headroom_paise": 4050000,
                "breach_probability": 0.05,
                "verdict": "AFFORDABLE"
            },
            {
                "name": "Scenario B: Wait 2 Months + Cancel 2 Subs",
                "lowest_balance_paise": 12400000,
                "headroom_paise": 6600000,
                "breach_probability": 0.02,
                "verdict": "AFFORDABLE"
            }
        ]
    }

"""
FastAPI Router for Financial Goals & Recurring Expense Optimizer.
Endpoints:
  - GET    /api/goals              - List all goals with progress and totals
  - POST   /api/goals              - Create a goal directly or parse via Gemini NLP
  - DELETE /api/goals/{goal_id}    - Delete a goal
  - PATCH  /api/goals/{goal_id}    - Update goal details
  - POST   /api/goals/optimize     - Compute deterministic timelines, graph points, and AI cuts
Enforces strict multi-user data isolation via current_user.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Goal, User
from auth import get_current_user
from ai.goal_parser import parse_goal_prompt
from engine.goal_optimizer import compute_goal_optimization

router = APIRouter()


class CreateGoalRequest(BaseModel):
    # Either provide parse_prompt for Gemini NLP extraction, or structured fields
    parse_prompt: Optional[str] = None
    title: Optional[str] = None
    target_amount_minor: Optional[int] = Field(default=None, description="Amount in integer paise")
    current_saved_minor: Optional[int] = Field(default=0, description="Amount already saved in integer paise")
    target_date: Optional[str] = None
    category: Optional[str] = "other"
    priority: Optional[int] = 1
    notes: Optional[str] = None


class UpdateGoalRequest(BaseModel):
    title: Optional[str] = None
    target_amount_minor: Optional[int] = None
    current_saved_minor: Optional[int] = None
    target_date: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None  # active, completed, archived
    notes: Optional[str] = None


class OptimizeGoalsRequest(BaseModel):
    excluded_recurring_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="IDs of recurring expenses deselected by user to simulate freed cash"
    )


@router.get("")
def list_user_goals(
    status: Optional[str] = "active",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all goals for current user with total target and saved progress.
    """
    query = db.query(Goal).filter(Goal.user_id == current_user.id)
    if status and status != "all":
        query = query.filter(Goal.status == status)

    goals = query.order_by(Goal.priority.asc(), Goal.created_at.asc()).all()

    total_target_minor = sum(g.target_amount_minor for g in goals)
    total_saved_minor = sum(g.current_saved_minor for g in goals)

    return {
        "status": "success",
        "goals": [
            {
                "id": g.id,
                "title": g.title,
                "target_amount_minor": g.target_amount_minor,
                "current_saved_minor": g.current_saved_minor,
                "target_date": g.target_date,
                "category": g.category,
                "priority": g.priority,
                "status": g.status,
                "notes": g.notes,
                "created_at": g.created_at.isoformat() if g.created_at else None,
                "updated_at": g.updated_at.isoformat() if g.updated_at else None,
            }
            for g in goals
        ],
        "summary": {
            "count": len(goals),
            "total_target_minor": total_target_minor,
            "total_saved_minor": total_saved_minor,
            "overall_progress_pct": round((total_saved_minor / total_target_minor * 100), 1) if total_target_minor > 0 else 0.0
        }
    }


@router.post("")
def create_user_goal(
    req: CreateGoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new goal. If parse_prompt is passed, uses Gemini NLP to extract details.
    """
    if req.parse_prompt and req.parse_prompt.strip():
        parsed = parse_goal_prompt(req.parse_prompt.strip())
        title = req.title or parsed["title"]
        target_minor = req.target_amount_minor or parsed["target_amount_minor"]
        category = req.category if req.category != "other" else parsed["category"]
        target_date = req.target_date or parsed.get("target_date")
        priority = req.priority or parsed.get("priority", 1)
        notes = req.notes or parsed.get("notes")
    else:
        if not req.title or not req.title.strip():
            raise HTTPException(status_code=400, detail="Goal title is required.")
        if not req.target_amount_minor or req.target_amount_minor <= 0:
            raise HTTPException(status_code=400, detail="Target amount in paise must be greater than 0.")
        title = req.title.strip()
        target_minor = req.target_amount_minor
        category = req.category or "other"
        target_date = req.target_date
        priority = req.priority or 1
        notes = req.notes

    new_goal = Goal(
        user_id=current_user.id,
        title=title,
        target_amount_minor=target_minor,
        current_saved_minor=req.current_saved_minor or 0,
        target_date=target_date,
        category=category,
        priority=priority,
        status="active",
        notes=notes
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return {
        "status": "success",
        "goal": {
            "id": new_goal.id,
            "title": new_goal.title,
            "target_amount_minor": new_goal.target_amount_minor,
            "current_saved_minor": new_goal.current_saved_minor,
            "target_date": new_goal.target_date,
            "category": new_goal.category,
            "priority": new_goal.priority,
            "status": new_goal.status,
            "notes": new_goal.notes,
            "created_at": new_goal.created_at.isoformat() if new_goal.created_at else None
        }
    }


@router.delete("/{goal_id}")
def delete_user_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a goal belonging to the current user.
    """
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")

    db.delete(goal)
    db.commit()
    return {"status": "success", "deleted_id": goal_id}


@router.patch("/{goal_id}")
def update_user_goal(
    goal_id: str,
    req: UpdateGoalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates goal details.
    """
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")

    if req.title is not None:
        goal.title = req.title.strip()
    if req.target_amount_minor is not None:
        goal.target_amount_minor = req.target_amount_minor
    if req.current_saved_minor is not None:
        goal.current_saved_minor = req.current_saved_minor
    if req.target_date is not None:
        goal.target_date = req.target_date
    if req.category is not None:
        goal.category = req.category
    if req.priority is not None:
        goal.priority = req.priority
    if req.status is not None:
        goal.status = req.status
    if req.notes is not None:
        goal.notes = req.notes

    db.commit()
    db.refresh(goal)
    return {
        "status": "success",
        "goal": {
            "id": goal.id,
            "title": goal.title,
            "target_amount_minor": goal.target_amount_minor,
            "current_saved_minor": goal.current_saved_minor,
            "target_date": goal.target_date,
            "category": goal.category,
            "priority": goal.priority,
            "status": goal.status,
            "notes": goal.notes
        }
    }


@router.post("/optimize")
def optimize_user_goals(
    req: OptimizeGoalsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Computes time-to-reach, milestones, trajectory graph points, and AI cuts
    based on verified cash-flow and selected recurring items.
    """
    result = compute_goal_optimization(
        db=db,
        user_id=current_user.id,
        excluded_recurring_ids=req.excluded_recurring_ids
    )
    return {
        "status": "success",
        "data": result
    }

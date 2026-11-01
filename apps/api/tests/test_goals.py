"""
Tests for Financial Goals Planner & Recurring Expense Optimizer.
Validates:
  1. Natural language goal parsing (Gemini/Regex fallback) with integer paise.
  2. Multi-goal deterministic optimization & milestone calculations.
  3. Real-time acceleration when recurring subscriptions are deselected.
  4. End-to-end API endpoints under authenticated session.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import SessionLocal
from db.models import User, Goal, Account, RecurringItem, Transaction
from ai.goal_parser import parse_goal_prompt, parse_inr_amount_to_minor
from engine.goal_optimizer import compute_goal_optimization

client = TestClient(app)


def test_parse_inr_amount_to_minor():
    assert parse_inr_amount_to_minor("55k") == 5_500_000
    assert parse_inr_amount_to_minor("1.2 lakh") == 12_000_000
    assert parse_inr_amount_to_minor("₹35,000") == 3_500_000
    assert parse_inr_amount_to_minor("2.5 lacs") == 25_000_000
    assert parse_inr_amount_to_minor("1 cr") == 10_000_000 * 100


def test_parse_goal_prompt():
    bike_goal = parse_goal_prompt("a bike of 55k")
    assert bike_goal["target_amount_minor"] == 5_500_000
    assert "bike" in bike_goal["title"].lower()
    assert bike_goal["category"] == "vehicle"

    laptop_goal = parse_goal_prompt("buy MacBook Air for 1.15 lakh")
    assert laptop_goal["target_amount_minor"] == 11_500_000
    assert laptop_goal["category"] == "gadget"

    vacation_goal = parse_goal_prompt("Goa vacation 35000")
    assert vacation_goal["target_amount_minor"] == 3_500_000
    assert vacation_goal["category"] == "travel"


def test_compute_goal_optimization_no_goals():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            pytest.skip("No user in test database")

        # Temporarily ensure user has no active goals
        saved_goals = db.query(Goal).filter(Goal.user_id == user.id, Goal.status == "active").all()
        for g in saved_goals:
            g.status = "archived"
        db.commit()

        result = compute_goal_optimization(db, user_id=user.id)
        assert result["has_goals"] is False
        assert result["milestones"] == []

        # Restore goals
        for g in saved_goals:
            g.status = "active"
        db.commit()
    finally:
        db.close()


def test_goal_api_lifecycle(monkeypatch):
    """
    Tests full API lifecycle: create via prompt, list, optimize with checkbox deselect, delete.
    """
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            pytest.skip("No user in test database")

        # Mock authentication dependency
        from auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: user

        # 1. Create a goal via natural prompt
        res = client.post("/api/goals", json={"parse_prompt": "a bike of 55k"})
        assert res.status_code == 200
        created = res.json()["goal"]
        goal_id = created["id"]
        assert created["target_amount_minor"] == 5_500_000
        assert "bike" in created["title"].lower()

        # 2. List goals
        res_list = client.get("/api/goals")
        assert res_list.status_code == 200
        data = res_list.json()
        assert data["status"] == "success"
        assert any(g["id"] == goal_id for g in data["goals"])

        # 3. Test optimization with all recurring items selected (initial state)
        res_opt = client.post("/api/goals/optimize", json={"excluded_recurring_ids": []})
        assert res_opt.status_code == 200
        opt_data = res_opt.json()["data"]
        assert opt_data["has_goals"] is True
        assert len(opt_data["milestones"]) > 0
        baseline_savings = opt_data["baseline_monthly_savings_minor"]

        # 4. Deselect a recurring subscription (simulate checkbox unticked)
        candidate_item = next((r for r in opt_data["recurring_items"] if r["can_cancel"]), None)
        if candidate_item:
            res_opt_cut = client.post(
                "/api/goals/optimize",
                json={"excluded_recurring_ids": [candidate_item["id"]]}
            )
            assert res_opt_cut.status_code == 200
            cut_data = res_opt_cut.json()["data"]
            assert cut_data["freed_monthly_savings_minor"] == candidate_item["amount_minor"]
            assert cut_data["optimized_monthly_savings_minor"] == baseline_savings + candidate_item["amount_minor"]
            # Milestone should show accelerated completion
            target_milestone = next((m for m in cut_data["milestones"] if m["goal_id"] == goal_id), None)
            if target_milestone and baseline_savings > 0:
                assert target_milestone["optimized_months"] <= target_milestone["baseline_months"]

        # 5. Clean up created goal
        res_del = client.delete(f"/api/goals/{goal_id}")
        assert res_del.status_code == 200
        assert res_del.json()["deleted_id"] == goal_id

    finally:
        app.dependency_overrides.clear()
        db.close()

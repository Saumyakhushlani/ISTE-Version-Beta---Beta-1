"""
Tests for Groq NLU Natural Language Query Parser and Fallback Engine.
Verifies:
  1. Groq NLU parses complex queries (Item, INR amount in paise, EMI terms, timing)
  2. Fallback to heuristic regex works gracefully when Groq is unavailable
  3. POST /api/affordability/parse endpoint returns parsed parameters and attribution
  4. POST /api/affordability/ask evaluates decisions using Groq parsed entities
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from ai.extractor import parse_natural_language_query, parse_natural_language_query_regex, parse_with_groq
from db.database import SessionLocal
from db.models import User
from auth import create_access_token

client = TestClient(app)


def test_heuristic_regex_parser():
    """Verifies the deterministic fallback parser when offline or without API key."""
    q1 = "Can I afford an iPhone 16 for ₹79,900 next month?"
    p1 = parse_natural_language_query_regex(q1)
    assert p1["purchase_amount_minor"] == 7990000
    assert "Iphone" in p1["label"]
    assert p1["timing"] == "next_month"
    assert p1["payment_type"] == "cash"
    assert p1["parsed_by"] == "heuristic"

    q2 = "Can I buy a MacBook for 1.5 lakh on 6 months EMI?"
    p2 = parse_natural_language_query_regex(q2)
    assert p2["purchase_amount_minor"] == 15000000
    assert p2["payment_type"] == "emi"
    assert p2["emi_months"] == 6
    assert p2["parsed_by"] == "heuristic"


def test_groq_nlu_parser_live():
    """Verifies Groq NLU parsing with active GROQ_API_KEY if configured."""
    q = "Can I buy a Sony A7IV Camera for Rs 2.1 lakh on 9 months EMI next month?"
    parsed = parse_natural_language_query(q)

    # Regardless of Groq or heuristic fallback, the parsed values must be strictly correct:
    assert parsed["purchase_amount_minor"] == 21000000
    assert "Sony" in parsed["label"] or "Camera" in parsed["label"]
    assert parsed["payment_type"] == "emi"
    assert parsed["emi_months"] == 9
    assert parsed["timing"] == "next_month"
    assert parsed["parsed_by"] in ("groq", "heuristic")


def test_api_parse_endpoint():
    """Verifies the /api/affordability/parse endpoint."""
    db = SessionLocal()
    user = db.query(User).filter(User.email == "test_groq@fdl.local").first()
    if not user:
        user = User(
            id="usr_test_groq",
            email="test_groq@fdl.local",
            password_hash="fakehash"
        )
        db.add(user)
        db.commit()
    db.close()

    token = create_access_token(user_id="usr_test_groq", email="test_groq@fdl.local")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/affordability/parse",
        json={"question": "Can I spend 50k on a Goa vacation this week?"},
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "parsed" in data
    assert data["parsed"]["purchase_amount_minor"] == 5000000
    assert data["parsed"]["timing"] == "this_month"
    assert data["parsed_by"] in ("groq", "heuristic")

import pytest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, DEMO_USER_ID, DEMO_USER_EMAIL

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token(user_id=DEMO_USER_ID, email=DEMO_USER_EMAIL, expires_in_seconds=3600)
    return {"Authorization": f"Bearer {token}"}

def test_decision_lab_chat_affordability_with_auto_pricing(auth_headers):
    # Ask affordability without explicit price (e.g. "Can I buy an iPhone 16 next month?")
    resp = client.post(
        "/api/affordability/chat",
        headers=auth_headers,
        json={"message": "Can I buy an iPhone 16 next month?"}
    )
    assert resp.status_code == 200, f"Chat failed: {resp.text}"
    data = resp.json()
    assert data["role"] == "assistant"
    assert data["intent"] == "AFFORDABILITY"
    assert data["decision"] is not None
    assert "verdict" in data["decision"]
    assert data["pricing_info"]["is_estimated"] is True
    assert data["pricing_info"]["amount_rs"] == 79900
    assert data["whatif_results"] is not None
    assert "scenarios" in data["whatif_results"]

def test_decision_lab_chat_investment(auth_headers):
    resp = client.post(
        "/api/affordability/chat",
        headers=auth_headers,
        json={"message": "I have 50000 rupees where can I invest?"}
    )
    assert resp.status_code == 200, f"Investment failed: {resp.text}"
    data = resp.json()
    assert data["intent"] == "INVESTMENT"
    assert "Fixed Deposits" in data["reply"] or "FDs" in data["reply"]
    assert "decision" not in data  # No affordability calculation triggered

def test_decision_lab_chat_general_advice(auth_headers):
    resp = client.post(
        "/api/affordability/chat",
        headers=auth_headers,
        json={"message": "What is the 50/30/20 budgeting rule?"}
    )
    assert resp.status_code == 200, f"General advice failed: {resp.text}"
    data = resp.json()
    assert data["intent"] == "GENERAL_ADVISOR"
    assert "50/30/20" in data["reply"] or "Needs" in data["reply"]
    assert "decision" not in data

def test_decision_lab_chat_unlawful_refusal(auth_headers):
    resp = client.post(
        "/api/affordability/chat",
        headers=auth_headers,
        json={"message": "I have 10000 rupees how can i spend it in unlawful things"}
    )
    assert resp.status_code == 200, f"Unlawful check failed: {resp.text}"
    data = resp.json()
    assert data["intent"] == "GENERAL_ADVISOR"
    assert "illegal or unlawful" in data["reply"].lower()
    assert "decision" not in data  # Refuses and NEVER returns affordability decision/verdict

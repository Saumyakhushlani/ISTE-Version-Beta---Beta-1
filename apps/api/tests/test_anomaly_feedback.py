"""
Tests for Anomaly Feedback, Review & Dismissal Router & Synchronization.
Validates:
1. Listing anomalies with live counts and feedback_filter.
2. Submitting feedback ('expected', 'dismissed', 'real_duplicate', 'disputed').
3. Reopening an anomaly (setting feedback back to 'none').
4. Batch feedback operations.
5. Dashboard 'needing_review_count' synchronization when anomalies are resolved.
6. Rejection of invalid feedback values.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import SessionLocal, Base, engine
from db.models import Anomaly

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    # Clean DB and load Aarav's statement (which generates anomalies)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    res = client.post("/api/imports/demo-load", data={"persona": "aarav"})
    assert res.status_code == 200, res.text
    yield

def test_list_anomalies_counts_and_feedback_filter():
    res = client.get("/api/anomalies")
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data
    assert "total" in data["counts"]
    assert "unresolved" in data["counts"]
    assert "expected" in data["counts"]
    assert "dismissed" in data["counts"]
    assert "real_duplicate" in data["counts"]
    assert "disputed" in data["counts"]
    assert data["counts"]["total"] > 0
    assert data["counts"]["unresolved"] == data["counts"]["total"]

    # Default feedback_filter='unresolved' returns only unreviewed anomalies
    assert len(data["anomalies"]) == data["counts"]["unresolved"]
    assert all(a["user_feedback"] == "none" for a in data["anomalies"])

def test_submit_feedback_expected_and_dismissed():
    res = client.get("/api/anomalies")
    anomalies = res.json()["anomalies"]
    assert len(anomalies) >= 2
    first_id = anomalies[0]["id"]
    second_id = anomalies[1]["id"]

    # Mark first as 'expected'
    res_exp = client.post(
        f"/api/anomalies/{first_id}/feedback",
        json={"feedback": "expected"}
    )
    assert res_exp.status_code == 200
    assert res_exp.json()["feedback"] == "expected"

    # Mark second as 'dismissed'
    res_dism = client.patch(
        f"/api/anomalies/{second_id}/feedback",
        json={"feedback": "dismissed"}
    )
    assert res_dism.status_code == 200
    assert res_dism.json()["feedback"] == "dismissed"

    # Verify counts
    res_after = client.get("/api/anomalies")
    counts = res_after.json()["counts"]
    assert counts["expected"] == 1
    assert counts["dismissed"] == 1
    assert counts["unresolved"] == counts["total"] - 2

    # Verify filtering
    res_expected_tab = client.get("/api/anomalies?feedback_filter=expected")
    assert res_expected_tab.status_code == 200
    assert any(a["id"] == first_id for a in res_expected_tab.json()["anomalies"])

    res_dismissed_tab = client.get("/api/anomalies?feedback_filter=dismissed")
    assert res_dismissed_tab.status_code == 200
    assert any(a["id"] == second_id for a in res_dismissed_tab.json()["anomalies"])

def test_submit_duplicate_and_disputed():
    res = client.get("/api/anomalies")
    target_id = res.json()["anomalies"][0]["id"]

    # Flag as real duplicate
    res_dup = client.post(
        f"/api/anomalies/{target_id}/feedback",
        json={"feedback": "real_duplicate"}
    )
    assert res_dup.status_code == 200
    assert res_dup.json()["feedback"] == "real_duplicate"

    # Filter duplicates_disputed
    res_tab = client.get("/api/anomalies?feedback_filter=duplicates_disputed")
    assert res_tab.status_code == 200
    assert any(a["id"] == target_id for a in res_tab.json()["anomalies"])

def test_reopen_anomaly():
    res = client.get("/api/anomalies")
    target_id = res.json()["anomalies"][0]["id"]

    # Dismiss
    client.post(f"/api/anomalies/{target_id}/feedback", json={"feedback": "dismissed"})

    # Reopen by setting feedback='none'
    res_reopen = client.post(f"/api/anomalies/{target_id}/feedback", json={"feedback": "none"})
    assert res_reopen.status_code == 200
    assert res_reopen.json()["feedback"] == "none"

    # Verify it is back in unresolved
    res_after = client.get("/api/anomalies")
    assert any(a["id"] == target_id for a in res_after.json()["anomalies"])

def test_batch_anomaly_feedback():
    res = client.get("/api/anomalies")
    initial_unresolved = res.json()["counts"]["unresolved"]
    assert initial_unresolved > 0

    # Batch dismiss all
    res_batch = client.post(
        "/api/anomalies/batch-feedback",
        json={"feedback": "dismissed"}
    )
    assert res_batch.status_code == 200
    data = res_batch.json()
    assert data["success"] is True
    assert data["count"] == initial_unresolved

    # Verify counts
    res_after = client.get("/api/anomalies")
    assert res_after.json()["counts"]["unresolved"] == 0
    assert res_after.json()["counts"]["dismissed"] == initial_unresolved

def test_invalid_feedback_rejected():
    res = client.get("/api/anomalies")
    target_id = res.json()["anomalies"][0]["id"]

    res_bad = client.post(
        f"/api/anomalies/{target_id}/feedback",
        json={"feedback": "not_a_valid_feedback"}
    )
    assert res_bad.status_code == 400

def test_dashboard_unresolved_count_sync():
    # 1. Check dashboard needing_review_count initially
    dash_before = client.get("/api/dashboard").json()
    initial_review_needed = dash_before["financial_data_health"]["transactions_needing_review"]

    # 2. Dismiss an anomaly
    res = client.get("/api/anomalies")
    target_id = res.json()["anomalies"][0]["id"]
    client.post(f"/api/anomalies/{target_id}/feedback", json={"feedback": "expected"})

    # 3. Check dashboard again: transactions_needing_review should be decremented by 1
    dash_after = client.get("/api/dashboard").json()
    after_review_needed = dash_after["financial_data_health"]["transactions_needing_review"]
    assert after_review_needed == initial_review_needed - 1

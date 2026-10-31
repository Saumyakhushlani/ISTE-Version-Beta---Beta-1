"""
Tests for Recurring Commitment Confirmation & Management.
Validates:
1. Listing recurring obligations with counts, status_filter, and user_status_filter.
2. Confirming an auto-detected commitment.
3. Dismissing a false positive commitment (sets status='paused' and user_status='rejected').
4. Restoring a dismissed commitment.
5. Editing amount and next expected date with validation.
6. Batch confirmation of auto-detected commitments.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import SessionLocal, Base, engine
from db.models import RecurringItem

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    # Clean DB and load Aarav's statement
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    res = client.post("/api/imports/demo-load", data={"persona": "aarav"})
    assert res.status_code == 200, res.text
    yield

def test_list_recurring_items_counts_and_filters():
    res = client.get("/api/recurring")
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data
    assert "all_active" in data["counts"]
    assert "needs_review" in data["counts"]
    assert "confirmed" in data["counts"]
    assert "dismissed" in data["counts"]
    assert data["counts"]["all_active"] > 0
    assert len(data["recurring_items"]) == data["counts"]["all_active"]

    # Filter by user_status=auto
    res_auto = client.get("/api/recurring?user_status_filter=auto")
    assert res_auto.status_code == 200
    assert all(r["user_status"] == "auto" for r in res_auto.json()["recurring_items"])

def test_confirm_recurring_item():
    res = client.get("/api/recurring")
    items = res.json()["recurring_items"]
    assert len(items) > 0
    target_item = items[0]

    # Confirm item
    patch_res = client.patch(
        f"/api/recurring/{target_item['id']}",
        json={"user_status": "confirmed"}
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()["item"]
    assert updated["user_status"] == "confirmed"
    assert updated["status"] == "active"

    # Verify counts reflect 1 confirmed item
    res_after = client.get("/api/recurring")
    assert res_after.json()["counts"]["confirmed"] >= 1

def test_dismiss_and_restore_recurring_item():
    res = client.get("/api/recurring")
    items = res.json()["recurring_items"]
    assert len(items) > 0
    target_item = items[0]
    original_active_count = res.json()["counts"]["all_active"]

    # Dismiss item
    dismiss_res = client.patch(
        f"/api/recurring/{target_item['id']}",
        json={"user_status": "rejected"}
    )
    assert dismiss_res.status_code == 200
    dismissed = dismiss_res.json()["item"]
    assert dismissed["user_status"] == "rejected"
    assert dismissed["status"] == "paused"

    # Verify it is excluded from active list by default
    res_active = client.get("/api/recurring")
    assert res_active.json()["counts"]["all_active"] == original_active_count - 1
    assert res_active.json()["counts"]["dismissed"] >= 1
    assert all(r["id"] != target_item["id"] for r in res_active.json()["recurring_items"])

    # Verify it appears under status_filter=paused
    res_paused = client.get("/api/recurring?status_filter=paused")
    assert res_paused.status_code == 200
    assert any(r["id"] == target_item["id"] for r in res_paused.json()["recurring_items"])

    # Restore the item
    restore_res = client.patch(
        f"/api/recurring/{target_item['id']}",
        json={"user_status": "confirmed"}
    )
    assert restore_res.status_code == 200
    restored = restore_res.json()["item"]
    assert restored["user_status"] == "confirmed"
    assert restored["status"] == "active"

    # Verify it's back in active list
    res_restored = client.get("/api/recurring")
    assert any(r["id"] == target_item["id"] for r in res_restored.json()["recurring_items"])

def test_edit_recurring_amount_and_date():
    res = client.get("/api/recurring")
    target_item = res.json()["recurring_items"][0]

    # Valid edit
    new_amount = 3500000  # ₹35,000 in paise
    new_date = "2026-11-20"
    edit_res = client.patch(
        f"/api/recurring/{target_item['id']}",
        json={
            "typical_amount_minor": new_amount,
            "next_expected_date": new_date,
            "cadence": "monthly"
        }
    )
    assert edit_res.status_code == 200
    item = edit_res.json()["item"]
    assert item["typical_amount_minor"] == new_amount
    assert item["next_expected_date"] == new_date
    assert item["is_manual"] is True

    # Invalid amount <= 0
    bad_amt_res = client.patch(
        f"/api/recurring/{target_item['id']}",
        json={"typical_amount_minor": 0}
    )
    assert bad_amt_res.status_code == 400

    # Invalid date format
    bad_date_res = client.patch(
        f"/api/recurring/{target_item['id']}",
        json={"next_expected_date": "not-a-date"}
    )
    assert bad_date_res.status_code == 400

def test_batch_confirm():
    res = client.get("/api/recurring")
    needs_review = res.json()["counts"]["needs_review"]
    assert needs_review > 0

    batch_res = client.post("/api/recurring/batch-confirm", json={})
    assert batch_res.status_code == 200
    data = batch_res.json()
    assert data["success"] is True
    assert data["confirmed_count"] == needs_review

    # Verify counts: needs_review should now be 0
    res_after = client.get("/api/recurring")
    assert res_after.json()["counts"]["needs_review"] == 0
    assert res_after.json()["counts"]["confirmed"] == data["confirmed_count"]

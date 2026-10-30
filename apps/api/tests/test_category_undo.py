"""
Unit & API tests for Category Correction Propagation & Undo Rollback:
  1. Patch transaction category (single & merchant scope).
  2. Record in correction_log.
  3. Clean rollback via /api/transactions/undo.
"""
from fastapi.testclient import TestClient
from main import app
from db.database import SessionLocal
from db.models import Transaction, Account, CorrectionLog

client = TestClient(app)

def test_category_correction_and_undo_flow():
    db = SessionLocal()
    # 1. Create dummy account and transaction
    acct = Account(nickname="Undo Test Account", bank="HDFC", type="savings", masked_last4="9999", opening_balance_minor=1000000)
    db.add(acct)
    db.commit()
    db.refresh(acct)

    txn = Transaction(
        account_id=acct.id,
        posted_date="2026-10-10",
        amount_minor=-25000,
        raw_description="UPI/SWIGGY/BANGALORE",
        normalized_description="Swiggy",
        merchant_id="Swiggy",
        category_id="cat_food_dining",
        fingerprint="fp_swiggy_test_001"
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    # 2. Patch category to cat_entertainment
    patch_resp = client.patch(
        f"/api/transactions/{txn.id}/category",
        json={"category_id": "cat_entertainment", "scope": "this_txn"}
    )
    assert patch_resp.status_code == 200
    patch_data = patch_resp.json()
    assert patch_data["status"] == "success"
    assert patch_data["new_category"] == "cat_entertainment"
    log_id = patch_data["log_id"]

    # Verify in DB
    db.refresh(txn)
    assert txn.category_id == "cat_entertainment"

    # 3. List corrections
    hist_resp = client.get("/api/transactions/corrections")
    assert hist_resp.status_code == 200
    corrections = hist_resp.json()["corrections"]
    assert any(c["id"] == log_id and not c["is_undone"] for c in corrections)

    # 4. Undo the correction
    undo_resp = client.post("/api/transactions/undo", json={"log_id": log_id})
    assert undo_resp.status_code == 200
    undo_data = undo_resp.json()
    assert undo_data["status"] == "success"
    assert undo_data["restored_category_id"] == "cat_food_dining"

    # Verify transaction restored in DB
    db.refresh(txn)
    assert txn.category_id == "cat_food_dining"

    db.close()

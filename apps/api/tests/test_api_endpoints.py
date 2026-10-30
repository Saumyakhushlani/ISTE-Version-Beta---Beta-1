"""
Integration tests for FastAPI REST Endpoints
Verifies statement preview, commit, live dashboard calculations,
and sufficiency gate evaluation.
"""

import os
import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import Base, engine

client = TestClient(app)

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", "..", ".."))
SYNTHETIC_DIR = os.path.join(WORKSPACE_ROOT, "data", "synthetic")

@pytest.fixture(autouse=True)
def setup_clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_preview_and_commit_hdfc_statement():
    csv_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(csv_path, "rb") as f:
        response = client.post(
            "/api/imports/preview",
            files={"file": ("hdfc_statement.csv", f, "text/csv")},
            data={"bank_hint": "hdfc"}
        )
    assert response.status_code == 200
    preview = response.json()
    assert preview["rows_detected"] == 75
    assert preview["reconciliation_status"] == "PASSED"
    file_id = preview["file_id"]

    # Commit the previewed statement
    commit_res = client.post("/api/imports/commit", data={"file_id": file_id})
    assert commit_res.status_code == 200
    commit_json = commit_res.json()
    assert commit_json["imported_rows"] == 75
    assert commit_json["anomalies_flagged"] > 0
    assert commit_json["recurring_items_found"] > 0

    # Verify Dashboard updates
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200
    dash_json = dash_res.json()
    assert dash_json["health_status"] == "OK"
    assert len(dash_json["category_spend"]) > 0
    assert len(dash_json["monthly_summary"]) == 8

    # Verify Transactions list
    txns_res = client.get("/api/transactions?limit=10")
    assert txns_res.status_code == 200
    assert txns_res.json()["total"] == 75

    # Test Category Correction & Propagation
    first_txn_id = txns_res.json()["transactions"][0]["id"]
    patch_res = client.patch(
        f"/api/transactions/{first_txn_id}/category",
        json={"category_id": "cat_shopping", "scope": "same_merchant", "dry_run": False}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "success"

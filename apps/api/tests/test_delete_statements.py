import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import SessionLocal
from db.models import SourceFile, Transaction, RecurringItem, Account

client = TestClient(app)

def test_delete_single_statement_cascade():
    """
    Verifies that deleting an uploaded statement cascades:
    1. Removes all its transactions.
    2. Recalculates recurring items.
    3. Deletes the SourceFile.
    """
    # 1. Load demo statement
    res = client.post("/api/imports/demo-load", data={"persona": "aarav"})
    assert res.status_code == 200, res.text
    load_data = res.json()
    source_file_id = load_data["source_file_id"]
    assert source_file_id is not None

    # 2. Confirm it appears in /api/imports/files
    files_res = client.get("/api/imports/files")
    assert files_res.status_code == 200
    file_ids = [f["id"] for f in files_res.json()]
    assert source_file_id in file_ids

    # 3. Call DELETE /api/imports/files/{file_id}
    del_res = client.delete(f"/api/imports/files/{source_file_id}")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["status"] == "success"
    assert del_data["file_id"] == source_file_id
    assert "deleted_transactions" in del_data
    assert "unpaired_transfers" in del_data
    assert "recalculated_recurring" in del_data

    # 4. Verify file is no longer listed in /api/imports/files
    files_res2 = client.get("/api/imports/files")
    assert files_res2.status_code == 200
    file_ids2 = [f["id"] for f in files_res2.json()]
    assert source_file_id not in file_ids2

    # 5. Calling delete on same ID returns 404
    del_res_again = client.delete(f"/api/imports/files/{source_file_id}")
    assert del_res_again.status_code == 404

def test_delete_all_statements():
    """
    Verifies that DELETE /api/imports/files clears all statements and transactions.
    """
    # Load demo statement
    client.post("/api/imports/demo-load", data={"persona": "priya"})
    
    # Call clear all
    del_all_res = client.delete("/api/imports/files")
    assert del_all_res.status_code == 200
    data = del_all_res.json()
    assert data["status"] == "success"
    assert "deleted_files_count" in data
    assert "deleted_transactions_count" in data

    # Verify no files remain
    files_res = client.get("/api/imports/files")
    assert files_res.status_code == 200
    assert len(files_res.json()) == 0

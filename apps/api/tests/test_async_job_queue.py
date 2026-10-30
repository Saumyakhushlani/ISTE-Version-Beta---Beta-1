"""
Unit & Integration tests for Async Statement Ingestion Queue:
  1. Submit statement for async preview.
  2. Poll job status until COMPLETED (100% progress).
  3. Verify extracted preview result and file_id.
"""
import time
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_async_statement_preview_queue():
    csv_content = (
        "Date,Description,Debit,Credit,Balance\n"
        "2026-10-01,SALARY CREDIT,,80000.00,80000.00\n"
        "2026-10-05,RENT DEBIT,25000.00,,55000.00\n"
    ).encode("utf-8")

    # 1. Submit async preview
    resp = client.post(
        "/api/imports/preview/async",
        files={"file": ("hdfc_async_test.csv", csv_content, "text/csv")},
        data={"bank_hint": "HDFC"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "job_id" in data
    job_id = data["job_id"]

    # 2. Poll job status
    completed = False
    for _ in range(20):
        time.sleep(0.1)
        poll_resp = client.get(f"/api/imports/jobs/{job_id}")
        assert poll_resp.status_code == 200
        job_data = poll_resp.json()
        if job_data["status"] == "COMPLETED":
            completed = True
            assert job_data["progress_pct"] == 100
            assert "result" in job_data
            result = job_data["result"]
            assert result["rows_detected"] == 2
            assert result["file_id"].startswith("stg_")
            break
        elif job_data["status"] == "FAILED":
            pytest.fail(f"Async job failed: {job_data.get('error')}")

    assert completed is True

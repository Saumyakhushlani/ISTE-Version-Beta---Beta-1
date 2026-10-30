"""
Unit & API tests for Egress Log Tracking & Privacy Inspector:
  1. Record local audit events in egress_log.
  2. Block and log external internet destinations in local mode.
  3. API endpoints /api/privacy/status and /api/privacy/egress-log.
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from db.database import SessionLocal
from db.models import EgressLog
from middleware.egress import record_egress

client = TestClient(app)

def test_egress_logging_and_air_gap_enforcement():
    db = SessionLocal()

    # 1. Local event should be logged cleanly
    local_log = record_egress(
        purpose="local_statement_parse",
        destination="localhost",
        payload={"filename": "statement.csv", "password": "mypassword123"},
        mode="local",
        db=db
    )
    assert local_log.id is not None
    # Verify password was redacted
    assert "[REDACTED]" in local_log.payload_json

    # 2. External destination in local mode should be blocked and logged as blocked_local
    with pytest.raises(PermissionError) as excinfo:
        record_egress(
            purpose="external_cloud_sync",
            destination="api.somethirdparty.com",
            payload={"account_number": "123456789"},
            mode="local",
            db=db
        )
    assert "PRIVACY_VIOLATION" in str(excinfo.value)

    # Verify blocked log entry exists in database
    blocked = db.query(EgressLog).filter_by(destination="api.somethirdparty.com").first()
    assert blocked is not None
    assert blocked.mode == "blocked_local"

    # 3. Test Privacy API Endpoints
    status_resp = client.get("/api/privacy/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["is_local_first"] is True
    assert status_data["air_gap_status"] == "ENFORCED"

    log_resp = client.get("/api/privacy/egress-log")
    assert log_resp.status_code == 200
    logs = log_resp.json()["logs"]
    assert len(logs) >= 2

    db.close()

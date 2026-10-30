"""
Egress Log Tracking & Air-Gap Privacy Enforcement for Financial Decision Lab (FDL).
Logs all outbound calls and enforces local-first mode (zero external financial data leakage).
"""

import os
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import EgressLog

# Privacy Mode: "local" (default air-gapped) or "cloud"
PRIVACY_MODE = os.getenv("PRIVACY_MODE", "local").lower()

def record_egress(
    purpose: str,
    destination: str,
    payload: Dict[str, Any],
    mode: str = PRIVACY_MODE,
    db: Optional[Session] = None
) -> EgressLog:
    """
    Records an outbound network event to the persistent egress_log table.
    If mode == "local" and destination is an external remote internet host,
    blocks the request and raises a privacy violation exception.
    """
    # Scrub potential PII in payload
    safe_payload = dict(payload)
    for sensitive_key in ("account_number", "raw_statement", "password", "pan"):
        if sensitive_key in safe_payload:
            safe_payload[sensitive_key] = "[REDACTED]"

    # Check for unauthorized external internet egress in local mode
    is_external = destination not in ("none", "localhost", "127.0.0.1", "local_file")
    if mode == "local" and is_external:
        # Enforce air-gap
        should_block = True
    else:
        should_block = False

    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        log_entry = EgressLog(
            purpose=purpose,
            destination=destination,
            payload_json=json.dumps(safe_payload),
            mode="blocked_local" if should_block else mode
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
    finally:
        if close_db:
            db.close()

    if should_block:
        raise PermissionError(
            f"PRIVACY_VIOLATION: Outbound internet egress to '{destination}' blocked by PRIVACY_MODE=local. "
            f"Financial data is strictly local-first."
        )

    return log_entry

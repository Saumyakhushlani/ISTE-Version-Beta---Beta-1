"""
Privacy & Egress Log Inspection Router.
Provides endpoints to audit system local-first status and egress logs.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import EgressLog
from middleware.egress import PRIVACY_MODE

router = APIRouter()

@router.get("/status")
def get_privacy_status(db: Session = Depends(get_db)):
    """
    Returns air-gapped security status, database file location, and privacy mode.
    """
    total_logs = db.query(EgressLog).count()
    blocked_logs = db.query(EgressLog).filter(EgressLog.mode == "blocked_local").count()

    return {
        "privacy_mode": PRIVACY_MODE,
        "is_local_first": PRIVACY_MODE == "local",
        "storage": "Local SQLite (fdl.db)",
        "air_gap_status": "ENFORCED" if PRIVACY_MODE == "local" else "PERMISSIVE",
        "total_egress_events": total_logs,
        "blocked_external_attempts": blocked_logs,
        "message": "Financial data and statement text never leave your machine."
    }

@router.get("/egress-log")
def list_egress_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Returns the immutable audit log of all outbound calls.
    """
    logs = db.query(EgressLog).order_by(EgressLog.ts.desc()).limit(limit).all()
    return {
        "count": len(logs),
        "logs": [
            {
                "id": l.id,
                "timestamp": l.ts.isoformat() if l.ts else None,
                "purpose": l.purpose,
                "destination": l.destination,
                "mode": l.mode,
                "payload": json.loads(l.payload_json or "{}")
            }
            for l in logs
        ]
    }

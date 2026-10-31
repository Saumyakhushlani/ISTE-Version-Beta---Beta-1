"""
Privacy & Egress Log Inspection Router.
Provides endpoints to audit system local-first status and egress logs with filtering and pagination.
Enforces strict multi-user data isolation.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import EgressLog, User
from auth import get_current_user
from middleware.egress import PRIVACY_MODE

router = APIRouter()

@router.get("/status")
def get_privacy_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns air-gapped security status, database file location, and privacy mode.
    """
    total_logs = db.query(EgressLog).filter(
        (EgressLog.user_id == current_user.id) | (EgressLog.user_id.is_(None))
    ).count()
    blocked_logs = db.query(EgressLog).filter(
        (EgressLog.user_id == current_user.id) | (EgressLog.user_id.is_(None)),
        EgressLog.mode == "blocked_local"
    ).count()

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
    mode_filter: Optional[str] = Query(None, description="Filter by egress mode (local, hybrid, off, blocked_local)"),
    destination: Optional[str] = Query(None, description="Filter by destination host"),
    search: Optional[str] = Query(None, description="Search by purpose or destination"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the immutable audit log of outbound calls with pagination and filtering.
    Enforces user isolation: only shows system logs or logs belonging to current_user.
    """
    query = db.query(EgressLog).filter(
        (EgressLog.user_id == current_user.id) | (EgressLog.user_id.is_(None))
    )
    if mode_filter:
        query = query.filter(EgressLog.mode == mode_filter)
    if destination:
        query = query.filter(EgressLog.destination.ilike(f"%{destination}%"))
    if search:
        query = query.filter(
            (EgressLog.purpose.ilike(f"%{search}%")) |
            (EgressLog.destination.ilike(f"%{search}%"))
        )

    total = query.count()
    logs = query.order_by(EgressLog.ts.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "count": len(logs),
        "limit": limit,
        "offset": offset,
        "logs": [
            {
                "id": l.id,
                "timestamp": l.ts.isoformat() if l.ts else None,
                "purpose": l.purpose,
                "mode": l.mode,
                "destination": l.destination,
                "payload_preview": l.payload_json[:100] if l.payload_json else "{}",
                "payload": json.loads(l.payload_json or "{}")
            }
            for l in logs
        ]
    }

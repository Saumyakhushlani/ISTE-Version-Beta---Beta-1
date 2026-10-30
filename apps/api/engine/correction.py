"""
Correction and Undo Rollback Engine for Financial Decision Lab (FDL).
Enables safe, transactional undo of category overrides across transactions.
"""

import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from db.models import Transaction, CorrectionLog

def rollback_correction(db: Session, log_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Reverts a category override:
    - If log_id is provided, reverts that specific log.
    - If log_id is None, reverts the most recent active (non-undone) correction log.
    - Restores each affected transaction to before_json["category_id"].
    - Sets undone_at = now().
    """
    query = db.query(CorrectionLog).filter(CorrectionLog.undone_at.is_(None))
    if log_id:
        log_entry = query.filter(CorrectionLog.id == log_id).first()
    else:
        log_entry = query.order_by(CorrectionLog.ts.desc()).first()

    if not log_entry:
        return {
            "status": "error",
            "message": "No active correction found to undo."
        }

    try:
        affected_ids = json.loads(log_entry.affected_txn_ids_json)
        before_state = json.loads(log_entry.before_json)
        if isinstance(before_state, dict):
            target_category = before_state.get("category_id") or (list(before_state.values())[0] if before_state else "cat_uncategorized")
        else:
            target_category = "cat_uncategorized"
    except Exception as e:
        return {
            "status": "error",
            "message": f"Corrupted correction log data: {str(e)}"
        }

    # Revert all affected transactions
    reverted_count = 0
    for txn_id in affected_ids:
        txn = db.query(Transaction).filter_by(id=txn_id).first()
        if txn:
            cat_to_restore = before_state.get(txn_id) if isinstance(before_state, dict) and txn_id in before_state else target_category
            txn.category_id = cat_to_restore
            txn.category_source = "rule"
            txn.category_confidence = 0.85
            reverted_count += 1

    log_entry.undone_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "status": "success",
        "log_id": log_entry.id,
        "action_undone": log_entry.action,
        "reverted_transactions_count": reverted_count,
        "restored_category_id": target_category,
        "success": True,
        "undone_log_id": log_entry.id
    }

"""
FastAPI Router for Affordability Decision Engine.
Provides:
  POST /api/affordability — Full evaluation with Monte Carlo, Buffer, Headroom & Reasoning Ledger
  POST /api/affordability/ask — Natural language query parsing + Guarded narration
Enforces strict multi-user data isolation.
"""
import json
import hashlib
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from db.database import get_db
from db.models import Transaction, Account, RecurringItem, SourceFile, ForecastSnapshot, User
from auth import get_current_user
from engine.affordability import evaluate_affordability_decision
from engine.recurring import detect_recurring_items
from ai.extractor import parse_natural_language_query
from ai.narrator import generate_guarded_narration

router = APIRouter()

class AffordabilityQuery(BaseModel):
    purchase_amount_minor: int  # e.g. 8000000 for ₹80,000
    label: str = "Purchase"
    timing: str = "next_month"  # "next_month" | "this_month" | specific date
    payment_type: str = "cash"  # "cash" | "emi"
    emi_months: Optional[int] = None
    emi_interest_rate_pct: Optional[float] = None
    buffer_multiplier_override: Optional[float] = None
    source_file_ids: Optional[List[str]] = None

class NaturalLanguageAsk(BaseModel):
    question: str
    source_file_ids: Optional[List[str]] = None

def fetch_db_state(db: Session, user_id: Optional[str] = None, source_file_ids: Optional[List[str]] = None):
    """
    Retrieves active transactions, current account balances, recurring items, and source files
    strictly filtered by user_id and optional source_file_ids for multi-user isolation.
    """
    # 0. User Accounts
    acct_query = db.query(Account).filter_by(status="active")
    if user_id:
        acct_query = acct_query.filter(Account.user_id == user_id)
    accounts = acct_query.all()
    user_account_ids = [a.id for a in accounts]

    # 1. Transactions
    txn_q = db.query(Transaction).filter(
        Transaction.status == "active",
        Transaction.account_id.in_(user_account_ids)
    )
    if source_file_ids:
        txn_q = txn_q.filter(Transaction.source_file_id.in_(source_file_ids))
    db_txns = txn_q.order_by(Transaction.posted_date.asc()).all()

    txns = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "normalized_description": t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer,
            "channel": t.channel,
            "balance_after_minor": t.balance_after_minor
        }
        for t in db_txns
    ]

    # 2. Account balances
    account_balances = {}
    for acct in accounts:
        latest_txn = db.query(Transaction).filter(
            Transaction.account_id == acct.id,
            Transaction.status == "active"
        ).order_by(Transaction.posted_date.desc(), Transaction.source_row.desc()).first()

        if latest_txn and latest_txn.balance_after_minor is not None:
            account_balances[acct.bank] = latest_txn.balance_after_minor
        else:
            net_delta = sum(t["amount_minor"] for t in txns if t["account_id"] == acct.id)
            account_balances[acct.bank] = (acct.opening_balance_minor or 0) + net_delta

    # 3. Recurring items
    rec_query = db.query(RecurringItem).filter(RecurringItem.status == "active")
    if user_id:
        rec_query = rec_query.filter(RecurringItem.user_id == user_id)
    db_recurring = rec_query.all()

    if db_recurring:
        recurring = [
            {
                "id": r.id,
                "merchant": r.merchant,
                "type": r.type,
                "cadence": r.cadence,
                "typical_amount_minor": r.typical_amount_minor,
                "amount_minor": r.typical_amount_minor if r.type == "salary" else -abs(r.typical_amount_minor),
                "next_expected_date": r.next_expected_date,
                "confidence": r.confidence
            }
            for r in db_recurring
        ]
    else:
        # Auto-detect from user's transactions
        detected = detect_recurring_items(txns)
        recurring = [
            {
                "id": d["id"],
                "merchant": d["merchant"],
                "type": d["type"],
                "cadence": d["cadence"],
                "typical_amount_minor": d["typical_amount_minor"],
                "amount_minor": d["typical_amount_minor"] if d["type"] == "salary" else -abs(d["typical_amount_minor"]),
                "next_expected_date": d["next_expected_date"],
                "confidence": d["confidence"]
            }
            for d in detected
        ]

    # 4. Source files
    sf_query = db.query(SourceFile).filter(SourceFile.account_id.in_(user_account_ids))
    if source_file_ids:
        sf_query = sf_query.filter(SourceFile.id.in_(source_file_ids))
    db_files = sf_query.all()
    source_files = [
        {
            "id": f.id,
            "filename": f.filename,
            "reconciliation_status": f.reconciliation_status,
            "period_start": f.period_start,
            "period_end": f.period_end
        }
        for f in db_files
    ]

    return txns, account_balances, recurring, source_files

@router.post("")
def evaluate_affordability(
    query: AffordabilityQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Core Affordability Decision Endpoint:
    Computes deterministic financial math:
      - Dynamic Safety Buffer
      - 5,000 Monte Carlo simulations
      - Reasoning Ledger (8 steps)
      - Number-verified narration
    Enforces strict user isolation.
    """
    txns, account_balances, recurring, source_files = fetch_db_state(db, user_id=current_user.id, source_file_ids=query.source_file_ids)

    # Evaluate decision
    decision = evaluate_affordability_decision(
        transactions=txns,
        recurring_items=recurring,
        current_balances=account_balances,
        purchase_amount_paise=query.purchase_amount_minor,
        label=query.label,
        timing=query.timing,
        payment_type=query.payment_type,
        emi_months=query.emi_months,
        emi_interest_rate_pct=query.emi_interest_rate_pct,
        buffer_multiplier_override=query.buffer_multiplier_override,
        source_files=source_files,
        seed=42
    )

    # Generate guarded narration
    narration = generate_guarded_narration(decision)
    decision["narration"] = narration

    # Record snapshot in database
    try:
        input_hash = hashlib.sha256(
            f"{query.purchase_amount_minor}_{query.payment_type}_{len(txns)}_{current_user.id}".encode()
        ).hexdigest()

        snapshot = ForecastSnapshot(
            user_id=current_user.id,
            asof_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            engine_version="1.0.0",
            seed=42,
            params_json=json.dumps(query.model_dump()),
            input_hash=input_hash,
            outputs_json=json.dumps({
                "verdict": decision["verdict"],
                "headroom": decision["headroom"],
                "lowest_balance": decision["lowest_balance"]
            }),
            ledger_json=json.dumps(decision["ledger"]),
            confidence_json=json.dumps(decision["verdict"].get("confidence", {})),
            gate_status=decision["gate"].get("status", "OK")
        )
        db.add(snapshot)
        db.commit()
        decision["snapshot_id"] = snapshot.id
    except Exception:
        db.rollback()
        decision["snapshot_id"] = "fs_local_run"

    return decision

@router.post("/parse")
def parse_natural_language_affordability_query(
    payload: NaturalLanguageAsk,
    current_user: User = Depends(get_current_user),
):
    """
    Parses a natural language question via Groq NLU (or heuristic fallback)
    and returns the extracted structured parameters and entity chips.
    """
    parsed_params = parse_natural_language_query(payload.question)
    return {
        "query": payload.question,
        "parsed": parsed_params,
        "parsed_by": parsed_params.get("parsed_by", "groq"),
        "model_used": parsed_params.get("model_used")
    }

@router.post("/ask")
def natural_language_ask(
    payload: NaturalLanguageAsk,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parses a natural language question (e.g. "Can I buy an iPhone for 80,000 next month?"),
    evaluates affordability, and returns guarded narration + reasoning ledger.
    Enforces user isolation.
    """
    parsed_params = parse_natural_language_query(payload.question)

    query = AffordabilityQuery(
        purchase_amount_minor=parsed_params["purchase_amount_minor"],
        label=parsed_params["label"],
        timing=parsed_params["timing"],
        payment_type=parsed_params["payment_type"],
        emi_months=parsed_params["emi_months"],
        emi_interest_rate_pct=parsed_params["emi_interest_rate_pct"]
    )

    decision = evaluate_affordability(query, current_user=current_user, db=db)
    decision["parsed_query"] = parsed_params
    return decision

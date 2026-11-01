"""
FastAPI Router for Affordability Decision Engine & Conversational Decision Lab.
Provides:
  POST /api/affordability — Full evaluation with Monte Carlo, Buffer, Headroom & Reasoning Ledger
  POST /api/affordability/ask — Natural language query parsing + Guarded narration
  POST /api/affordability/parse — Groq NLU entity extractor
  POST /api/affordability/chat — Interactive Chatbot Assistant for Affordability, Investments & Financial Advisory
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
from engine.buffer import compute_safety_buffer
from engine.liquidity import recommend_investment_sourcing
from ai.extractor import parse_natural_language_query, _extract_amount_regex
from ai.narrator import generate_guarded_narration
from ai.advisor import (
    classify_intent,
    check_unlawful_or_harmful,
    resolve_purchase_pricing,
    generate_investment_guidance,
    generate_general_financial_advice
)

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

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class AffordabilityChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
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
    amount_minor, label, is_estimated, source_note = resolve_purchase_pricing(
        payload.question,
        parsed_params.get("purchase_amount_minor", 0),
        parsed_params.get("label", "Purchase")
    )

    query = AffordabilityQuery(
        purchase_amount_minor=amount_minor,
        label=label,
        timing=parsed_params.get("timing", "next_month"),
        payment_type=parsed_params.get("payment_type", "cash"),
        emi_months=parsed_params.get("emi_months"),
        emi_interest_rate_pct=parsed_params.get("emi_interest_rate_pct")
    )

    decision = evaluate_affordability(query, current_user=current_user, db=db)
    decision["parsed_query"] = {
        **parsed_params,
        "purchase_amount_minor": amount_minor,
        "label": label,
        "is_estimated": is_estimated,
        "pricing_source": source_note
    }
    return decision

@router.post("/chat")
def decision_lab_chat(
    payload: AffordabilityChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified Conversational Assistant for Decision Lab:
    Routes queries seamlessly based on intent:
      1. AFFORDABILITY:
         - Predicts / looks up market price if not specified by user
         - Runs 5,000 Monte Carlo runs, dynamic buffer & 8-step reasoning ledger
         - Pre-computes What-If simulation matrix
      2. INVESTMENT:
         - Prudent Indian investment advisory (Buffer preservation, Bank FDs, PPF, Index funds)
         - Multi-account liquidity surplus check
         - Directs user to the Investments Tab
      3. GENERAL_ADVISOR:
         - Practical personal finance advice (50/30/20 rule, credit cards, emergency fund, taxes)
    """
    from routers.whatif import simulate_scenarios_core

    msg = payload.message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    intent = classify_intent(msg)
    txns, account_balances, recurring, source_files = fetch_db_state(db, user_id=current_user.id, source_file_ids=payload.source_file_ids)

    # 0. UNLAWFUL / HARMFUL REFUSAL
    if intent == "UNLAWFUL_REFUSAL":
        refusal_text = check_unlawful_or_harmful(msg) or (
            "I cannot assist, advise, or provide recommendations for illegal or unlawful activities.\n\n"
            "If you have surplus money, I can help you evaluate safe and legal personal finance options — "
            "such as building an emergency buffer, setting up a high-interest Bank FD (7.1%–7.5%), "
            "investing in index funds, or budgeting for personal goals."
        )
        return {
            "role": "assistant",
            "intent": "GENERAL_ADVISOR",
            "reply": refusal_text
        }

    # 1. INVESTMENT INTENT
    if intent == "INVESTMENT":
        amount_minor = _extract_amount_regex(msg)
        target_rs = (amount_minor // 100) if amount_minor > 0 else None

        buffer_eval = compute_safety_buffer(transactions=txns, recurring_items=recurring)
        guidance = generate_investment_guidance(
            query_text=msg,
            target_amount_rs=target_rs,
            current_balances=account_balances,
            buffer_paise=buffer_eval["value_minor"]
        )

        # Multi-account liquidity recommendation if amount is known
        sourcing_plan = None
        if amount_minor > 0 and account_balances:
            try:
                sourcing_plan = recommend_investment_sourcing(
                    target_amount_paise=amount_minor,
                    investment_label="Fixed Deposit / Safe Investment",
                    current_balances=account_balances,
                    recurring_items=recurring
                )
            except Exception:
                pass

        return {
            "role": "assistant",
            "intent": "INVESTMENT",
            "reply": guidance["reply"],
            "target_amount_rs": target_rs,
            "investment_data": guidance,
            "sourcing_plan": sourcing_plan
        }

    # 2. GENERAL FINANCIAL ADVISOR INTENT
    if intent == "GENERAL_ADVISOR":
        advice_reply = generate_general_financial_advice(msg)
        return {
            "role": "assistant",
            "intent": "GENERAL_ADVISOR",
            "reply": advice_reply
        }

    # 3. AFFORDABILITY INTENT (Default / Primary)
    parsed_params = parse_natural_language_query(msg)
    raw_amount = parsed_params.get("purchase_amount_minor", 0)
    raw_label = parsed_params.get("label", "Purchase")

    # Resolve price (auto-estimate if user did not mention amount)
    amount_minor, resolved_label, is_estimated, source_note = resolve_purchase_pricing(
        msg,
        raw_amount,
        raw_label
    )

    timing = parsed_params.get("timing", "next_month")
    payment_type = parsed_params.get("payment_type", "cash")
    emi_months = parsed_params.get("emi_months")
    emi_rate = parsed_params.get("emi_interest_rate_pct")

    # Evaluate Affordability Decision
    decision = evaluate_affordability_decision(
        transactions=txns,
        recurring_items=recurring,
        current_balances=account_balances,
        purchase_amount_paise=amount_minor,
        label=resolved_label,
        timing=timing,
        payment_type=payment_type,
        emi_months=emi_months,
        emi_interest_rate_pct=emi_rate,
        source_files=source_files,
        seed=42
    )

    # Guarded narration
    narration = generate_guarded_narration(decision)
    decision["narration"] = narration

    # Pre-compute What-If Simulation Matrix (placed above Cash Flow in UI)
    default_scenarios = [
        {
            "name": "6-Month No-Cost EMI",
            "adjustments": [{"type": "purchase_emi", "params": {"months": 6, "interest_rate_pct": 0.0}}]
        },
        {
            "name": "12-Month EMI (12% p.a.)",
            "adjustments": [{"type": "purchase_emi", "params": {"months": 12, "interest_rate_pct": 12.0}}]
        },
        {
            "name": "Delay Purchase by 2 Months",
            "adjustments": [{"type": "delay_purchase", "params": {"months": 2}}]
        }
    ]

    whatif_results = None
    try:
        whatif_results = simulate_scenarios_core(
            txns=txns,
            account_balances=account_balances,
            recurring=recurring,
            source_files=source_files,
            purchase_amount_minor=amount_minor,
            scenarios=default_scenarios
        )
    except Exception as e:
        logger.warning(f"Failed to pre-compute what-if scenarios: {e}")

    # Build assistant response text
    estimate_banner = ""
    if is_estimated:
        estimate_banner = (
            f"💡 Estimated Indian market budget for {resolved_label}: ₹{amount_minor // 100:,} "
            f"({source_note}).\n\n"
        )

    assistant_reply = f"{estimate_banner}{narration}"

    # Record snapshot in database
    try:
        input_hash = hashlib.sha256(
            f"{amount_minor}_{payment_type}_{len(txns)}_{current_user.id}".encode()
        ).hexdigest()

        snapshot = ForecastSnapshot(
            user_id=current_user.id,
            asof_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            engine_version="1.0.0",
            seed=42,
            params_json=json.dumps({
                "message": msg,
                "amount_minor": amount_minor,
                "label": resolved_label,
                "is_estimated": is_estimated,
                "payment_type": payment_type
            }),
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
        decision["snapshot_id"] = "fs_chat_run"

    return {
        "role": "assistant",
        "intent": "AFFORDABILITY",
        "reply": assistant_reply,
        "pricing_info": {
            "is_estimated": is_estimated,
            "amount_rs": amount_minor // 100,
            "amount_minor": amount_minor,
            "label": resolved_label,
            "source_note": source_note
        },
        "decision": decision,
        "whatif_results": whatif_results,
        "parsed_query": {
            "purchase_amount_minor": amount_minor,
            "label": resolved_label,
            "timing": timing,
            "payment_type": payment_type,
            "emi_months": emi_months,
            "is_estimated": is_estimated
        }
    }

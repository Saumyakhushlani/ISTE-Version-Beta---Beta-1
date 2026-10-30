"""
Statement Ingestion Router
Handles uploading bank statement files (CSV & PDF), generating live extraction previews,
and committing transactions with deduplication, transfer detection, categorization,
and anomaly flagging across cumulative historical uploads.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from db.database import get_db
from db.models import Account, SourceFile, Transaction, RecurringItem, Anomaly
from parsers.csv_parser import parse_csv_statement
from parsers.pdf_parser import parse_pdf_statement
from parsers.bank_detector import detect_bank_and_account
from engine.dedupe import deduplicate_transactions, detect_internal_transfers
from ml.categorizer import categorize_transaction
from engine.recurring import detect_recurring_items
from engine.anomaly import detect_anomalies

router = APIRouter()

# In-memory staging store for previewed files: {file_id: parsed_result_dict}
_STAGING_FILES = {}

@router.post("/preview")
async def preview_statement(
    file: UploadFile = File(...),
    bank_hint: Optional[str] = Form("auto"),
    db: Session = Depends(get_db)
):
    """
    Parses CSV or PDF statement and provides an extraction preview without committing:
    - Detected bank and masked account number (via hint or auto-detection backup)
    - Total rows read
    - Sample rows with parsed amounts and dates
    - Balance reconciliation status
    """
    contents = await file.read()
    filename = file.filename or "statement.csv"
    sha256_hash = hashlib.sha256(contents).hexdigest()

    try:
        if filename.lower().endswith(".pdf"):
            parsed = parse_pdf_statement(contents)
            raw_sample_text = str(contents[:4000])
        else:
            text_content = contents.decode("utf-8", errors="replace")
            parsed = parse_csv_statement(text_content)
            raw_sample_text = text_content[:4000]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse statement: {str(e)}")

    # Auto-detect bank and account number
    bank_detected, masked_last4 = detect_bank_and_account(
        raw_text=raw_sample_text,
        filename=filename,
        user_bank_hint=bank_hint
    )

    file_id = f"stg_{uuid.uuid4().hex[:12]}"
    _STAGING_FILES[file_id] = {
        "filename": filename,
        "kind": "pdf" if filename.lower().endswith(".pdf") else "csv",
        "sha256": sha256_hash,
        "bank_detected": bank_detected,
        "masked_last4": masked_last4,
        "parsed": parsed
    }

    sample_txns = parsed["transactions"][:5]

    return {
        "file_id": file_id,
        "filename": filename,
        "content_type": file.content_type,
        "bank_detected": bank_detected,
        "masked_last4": masked_last4,
        "rows_detected": parsed["rows_detected"],
        "date_range": {
            "start": parsed["period_start"],
            "end": parsed["period_end"]
        },
        "opening_balance_minor": parsed["opening_balance_minor"],
        "closing_balance_minor": parsed["closing_balance_minor"],
        "reconciliation_status": parsed["reconciliation_status"],
        "sample_rows": sample_txns,
        "warnings": parsed["warnings"]
    }

@router.post("/commit")
async def commit_statement(
    file_id: str = Form(...),
    account_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Commits staged parsed statement to database:
    - Finds or creates matching Account record by bank and masked last4
    - Runs deduplication (merges overlapping imports seamlessly)
    - Detects internal transfers across user's accounts
    - Assigns categories & updates recurring items and anomalies across cumulative history
    """
    staged = _STAGING_FILES.get(file_id)
    if not staged:
        raise HTTPException(status_code=404, detail="Staged file preview expired or not found. Please re-upload.")

    parsed = staged["parsed"]
    filename = staged["filename"]
    bank_detected = staged["bank_detected"]
    masked_last4 = staged["masked_last4"]

    # Check if a matching Account already exists (e.g. earlier 6-month upload for this bank)
    if not account_id:
        target_account = db.query(Account).filter_by(
            bank=bank_detected,
            masked_last4=masked_last4
        ).first()

        if not target_account:
            # Create new account for this bank
            target_account = Account(
                nickname=f"{bank_detected} - {masked_last4}",
                bank=bank_detected,
                type="savings",
                masked_last4=masked_last4,
                opening_balance_minor=parsed["opening_balance_minor"] or 0
            )
            db.add(target_account)
            db.commit()
            db.refresh(target_account)
        account_id = target_account.id

    # Create SourceFile record
    sf = SourceFile(
        account_id=account_id,
        filename=filename,
        kind=staged["kind"],
        sha256=staged["sha256"],
        period_start=parsed["period_start"],
        period_end=parsed["period_end"],
        opening_balance_minor=parsed["opening_balance_minor"],
        closing_balance_minor=parsed["closing_balance_minor"],
        reconciliation_status=parsed["reconciliation_status"]
    )
    db.add(sf)
    db.commit()
    db.refresh(sf)

    # 1. Deduplication against all existing DB transactions for this account
    existing_db_txns = db.query(Transaction).filter_by(account_id=account_id).all()
    existing_dicts = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "normalized_description": t.normalized_description,
            "status": t.status
        }
        for t in existing_db_txns
    ]

    to_insert, duplicates_merged_count = deduplicate_transactions(
        incoming_txns=parsed["transactions"],
        existing_txns=existing_dicts,
        account_id=account_id
    )

    # 2. Categorization
    for t in to_insert:
        cat_id, source, conf = categorize_transaction(
            raw_desc=t["raw_description"],
            normalized_desc=t["normalized_description"],
            merchant=t["merchant"],
            amount_minor=t["amount_minor"]
        )
        t["category_id"] = cat_id
        t["category_source"] = source
        t["category_confidence"] = conf

    # Persist active transactions to SQLite
    for t in to_insert:
        txn_record = Transaction(
            account_id=account_id,
            source_file_id=sf.id,
            source_row=t.get("source_row", 0),
            posted_date=t["posted_date"],
            amount_minor=t["amount_minor"],
            raw_description=t["raw_description"],
            normalized_description=t["normalized_description"],
            channel=t.get("channel", "OTHER"),
            merchant_id=t.get("merchant"),
            category_id=t["category_id"],
            category_source=t["category_source"],
            category_confidence=t["category_confidence"],
            balance_after_minor=t.get("balance_after_minor"),
            fingerprint=t["fingerprint"],
            occurrence_index=t.get("occurrence_index", 1),
            status="active"
        )
        db.add(txn_record)

    db.commit()

    # 3. Detect Internal Transfers across all active accounts in cumulative history
    all_active_txns = db.query(Transaction).filter_by(status="active").all()
    all_dict_txns = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "is_transfer": t.is_transfer
        }
        for t in all_active_txns
    ]
    _, transfers_detected = detect_internal_transfers(all_dict_txns)

    # 4. Detect Recurring Commitments across cumulative history (including earlier months)
    raw_dicts = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "amount_minor": t.amount_minor,
            "posted_date": t.posted_date,
            "merchant": t.merchant_id or t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer
        }
        for t in all_active_txns
    ]

    recurring_found = detect_recurring_items(raw_dicts)
    for r in recurring_found:
        existing_r = db.query(RecurringItem).filter_by(merchant=r["merchant"]).first()
        if existing_r:
            # Update next expected date & typical amount using the extended cumulative history
            existing_r.typical_amount_minor = r["typical_amount_minor"]
            existing_r.next_expected_date = r["next_expected_date"]
            existing_r.last_paid_date = r["last_paid_date"]
            existing_r.occurrences = r["occurrences"]
            existing_r.confidence = r["confidence"]
        else:
            new_r = RecurringItem(
                merchant=r["merchant"],
                type=r["type"],
                cadence=r["cadence"],
                typical_amount_minor=r["typical_amount_minor"],
                amount_min_minor=r["amount_min_minor"],
                amount_max_minor=r["amount_max_minor"],
                last_paid_date=r["last_paid_date"],
                next_expected_date=r["next_expected_date"],
                occurrences=r["occurrences"],
                confidence=r["confidence"],
                status="active"
            )
            db.add(new_r)

    # 5. Detect Anomalies across cumulative history
    anomalies_found = detect_anomalies(raw_dicts)
    for a in anomalies_found:
        existing_a = db.query(Anomaly).filter_by(txn_id=a["txn_id"]).first()
        if not existing_a:
            new_a = Anomaly(
                txn_id=a["txn_id"],
                type=a["type"],
                rule_id=a["rule_id"],
                amount_minor=a["amount_minor"],
                reason_text=a["reason_text"],
                severity=a["severity"]
            )
            db.add(new_a)

    db.commit()

    # Clean up staging file
    del _STAGING_FILES[file_id]

    return {
        "status": "success",
        "account_id": account_id,
        "bank_detected": bank_detected,
        "masked_last4": masked_last4,
        "source_file_id": sf.id,
        "imported_rows": len(to_insert),
        "duplicates_merged": duplicates_merged_count,
        "transfers_detected": transfers_detected,
        "cumulative_transactions": len(all_active_txns),
        "anomalies_flagged": len(anomalies_found),
        "recurring_items_found": len(recurring_found)
    }

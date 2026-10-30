"""
Statement Ingestion Router
Handles uploading bank statement files (CSV & PDF), generating live extraction previews,
and committing transactions with deduplication, transfer detection, categorization,
and anomaly flagging across cumulative historical uploads.
Includes password decryption and async ingestion queue support.
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
    password: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Parses CSV or PDF statement and provides an extraction preview without committing:
    - Supports password-protected PDF statements
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
            parsed = parse_pdf_statement(contents, password=password)
            raw_sample_text = str(contents[:4000])
        else:
            text_content = contents.decode("utf-8", errors="replace")
            parsed = parse_csv_statement(text_content)
            raw_sample_text = text_content[:4000]
    except Exception as e:
        err_msg = str(e)
        if "PASSWORD_REQUIRED" in err_msg:
            raise HTTPException(status_code=400, detail={"error": "PASSWORD_REQUIRED", "message": "This statement is password-protected. Please enter your PDF password."})
        elif "PASSWORD_INCORRECT" in err_msg:
            raise HTTPException(status_code=400, detail={"error": "PASSWORD_INCORRECT", "message": "Incorrect PDF password. Please verify and try again."})
        raise HTTPException(status_code=400, detail=f"Failed to parse statement: {err_msg}")

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

@router.post("/preview/async")
async def preview_statement_async(
    file: UploadFile = File(...),
    bank_hint: Optional[str] = Form("auto"),
    password: Optional[str] = Form(None)
):
    """
    Non-blocking async statement preview for large/multi-page files:
    Submits extraction to background job queue and immediately returns a job_id.
    """
    contents = await file.read()
    filename = file.filename or "statement.csv"

    from engine.job_queue import submit_async_parse_job
    job_id = submit_async_parse_job(
        contents=contents,
        filename=filename,
        bank_hint=bank_hint,
        password=password
    )

    return {
        "job_id": job_id,
        "status": "QUEUED",
        "filename": filename,
        "message": "Statement submitted for background parsing."
    }

@router.get("/jobs/{job_id}")
def get_parsing_job_status(job_id: str):
    """
    Polling endpoint returning the background statement parsing progress and result.
    """
    from engine.job_queue import get_job_status
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or expired.")
    return job

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
        reconciliation_status=parsed["reconciliation_status"],
        parse_report_json=json.dumps({"warnings": parsed["warnings"]})
    )
    db.add(sf)
    db.commit()
    db.refresh(sf)

    # 1. Fetch existing transactions for this account for deduplication
    existing_txns = db.query(Transaction).filter_by(account_id=account_id).all()
    existing_dicts = [
        {
            "id": t.id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "occurrence_index": t.occurrence_index,
            "fingerprint": t.fingerprint,
            "normalized_description": t.normalized_description,
            "account_id": t.account_id,
            "status": t.status
        }
        for t in existing_txns
    ]

    # 2. Run Deduplication
    fresh_txns = parsed["transactions"]
    to_insert, duplicates_count = deduplicate_transactions(fresh_txns, existing_dicts, account_id)

    # 3. Insert non-duplicate transactions
    inserted_records = []
    for raw_t in to_insert:
        # ML / Rule Categorization
        cat_id, cat_source, cat_conf = categorize_transaction(
            raw_desc=raw_t.get("raw_description", ""),
            normalized_desc=raw_t.get("normalized_description", ""),
            merchant=raw_t.get("merchant", ""),
            amount_minor=raw_t["amount_minor"]
        )

        txn = Transaction(
            account_id=account_id,
            source_file_id=sf.id,
            source_row=raw_t.get("source_row", 0),
            posted_date=raw_t["posted_date"],
            amount_minor=raw_t["amount_minor"],
            raw_description=raw_t["raw_description"],
            normalized_description=raw_t["normalized_description"],
            channel=raw_t.get("channel", "OTHER"),
            merchant_id=raw_t.get("merchant"),
            category_id=cat_id,
            category_source=cat_source,
            category_confidence=cat_conf,
            balance_after_minor=raw_t.get("balance_after_minor"),
            fingerprint=raw_t["fingerprint"],
            occurrence_index=raw_t["occurrence_index"]
        )
        db.add(txn)
        inserted_records.append(txn)

    db.commit()

    # 4. Check Internal Transfers across all user accounts
    all_db_txns = db.query(Transaction).filter_by(status="active").all()
    all_dicts = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "is_transfer": t.is_transfer,
            "transfer_pair_id": t.transfer_pair_id
        }
        for t in all_db_txns
    ]

    all_updated, paired_count = detect_internal_transfers(all_dicts)
    for t_dict in all_updated:
        if t_dict.get("is_transfer") and t_dict.get("transfer_pair_id"):
            db_t = db.query(Transaction).filter_by(id=t_dict["id"]).first()
            if db_t and not db_t.is_transfer:
                db_t.is_transfer = True
                db_t.transfer_pair_id = t_dict["transfer_pair_id"]
                db_t.category_id = "cat_transfer"

    db.commit()

    # 5. Refresh Recurring Items
    active_txns = [
        {
            "id": t.id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "normalized_description": t.normalized_description,
            "merchant": t.merchant_id,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer
        }
        for t in all_db_txns
    ]
    detected_recurring = detect_recurring_items(active_txns)
    for r in detected_recurring:
        existing_rec = db.query(RecurringItem).filter_by(merchant=r["merchant"], cadence=r["cadence"]).first()
        if existing_rec:
            existing_rec.typical_amount_minor = r["typical_amount_minor"]
            existing_rec.last_paid_date = r["last_paid_date"]
            existing_rec.next_expected_date = r["next_expected_date"]
            existing_rec.occurrences = r["occurrences"]
            existing_rec.confidence = r["confidence"]
        else:
            new_rec = RecurringItem(
                merchant=r["merchant"],
                type=r["type"],
                cadence=r["cadence"],
                typical_amount_minor=r["typical_amount_minor"],
                amount_min_minor=r["amount_min_minor"],
                amount_max_minor=r["amount_max_minor"],
                last_paid_date=r["last_paid_date"],
                next_expected_date=r["next_expected_date"],
                occurrences=r["occurrences"],
                confidence=r["confidence"]
            )
            db.add(new_rec)

    # 6. Flag Anomalies across transactions
    anomalies = detect_anomalies(active_txns)
    for a in anomalies:
        existing_anom = db.query(Anomaly).filter_by(txn_id=a["txn_id"], rule_id=a["rule_id"]).first()
        if not existing_anom:
            db_anom = Anomaly(
                txn_id=a["txn_id"],
                type=a["type"],
                rule_id=a["rule_id"],
                amount_minor=a["amount_minor"],
                reason_text=a["reason_text"],
                severity=a["severity"]
            )
            db.add(db_anom)

    db.commit()

    # Clean up staged cache
    _STAGING_FILES.pop(file_id, None)

    return {
        "status": "success",
        "account_id": account_id,
        "source_file_id": sf.id,
        "bank": bank_detected,
        "masked_last4": masked_last4,
        "total_rows": len(fresh_txns),
        "inserted": len(inserted_records),
        "imported_rows": len(inserted_records),
        "duplicates_skipped": duplicates_count,
        "duplicates_merged": duplicates_count,
        "internal_transfers_detected": paired_count,
        "anomalies_detected": len(anomalies),
        "anomalies_flagged": len(anomalies),
        "recurring_items_updated": len(detected_recurring),
        "recurring_items_found": len(detected_recurring)
    }

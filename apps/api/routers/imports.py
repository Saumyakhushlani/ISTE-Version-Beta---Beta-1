"""
Statement Ingestion Router
Handles uploading bank statement files (CSV & PDF), generating live extraction previews,
and committing transactions with deduplication, transfer detection, categorization,
and anomaly flagging across cumulative historical uploads.
Includes password decryption, dynamic CSV sniffing, column mapping, demo statement loading,
and async ingestion queue support.
Enforces strict multi-user data isolation.
100% Deterministic Real Data - No static mock fallbacks.
"""

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from db.database import get_db
from db.models import Account, SourceFile, Transaction, RecurringItem, Anomaly, User
from auth import get_current_user
from parsers.csv_parser import parse_csv_statement
from parsers.pdf_parser import parse_pdf_statement
from parsers.bank_detector import detect_bank_and_account
from engine.dedupe import deduplicate_transactions, detect_internal_transfers
from ml.categorizer import categorize_transaction
from engine.recurring import detect_recurring_items
from engine.anomaly import detect_anomalies

router = APIRouter()

# In-memory staging store for previewed files: {file_id: staged_file_dict}
_STAGING_FILES = {}

@router.post("/preview")
async def preview_statement(
    file: UploadFile = File(...),
    bank_hint: Optional[str] = Form("auto"),
    password: Optional[str] = Form(None),
    column_mapping: Optional[str] = Form(None),
    delimiter: Optional[str] = Form(None),
    encoding: Optional[str] = Form(None),
    has_header: Optional[bool] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Parses CSV or PDF statement and provides an extraction preview without committing:
    - Supports password-protected PDF statements
    - Supports dynamic CSV with encoding, delimiter, header, and column mapping auto-detection
    - Detected bank and masked account number (via hint or auto-detection backup)
    - Total rows read, date range, opening/closing balance, running balance check
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
            col_map_dict = None
            if column_mapping:
                try:
                    col_map_dict = json.loads(column_mapping) if isinstance(column_mapping, str) else column_mapping
                except Exception:
                    pass
            parsed = parse_csv_statement(
                csv_content=contents,
                column_mapping=col_map_dict,
                delimiter=delimiter,
                encoding=encoding,
                has_header=has_header
            )
            raw_sample_text = contents[:4000].decode("utf-8", errors="replace")
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
        "contents": contents,
        "kind": "pdf" if filename.lower().endswith(".pdf") else "csv",
        "sha256": sha256_hash,
        "bank_detected": bank_detected,
        "masked_last4": masked_last4,
        "parsed": parsed
    }

    sample_txns = parsed["transactions"][:10]
    total_txns = parsed["transactions"]
    credits_count = sum(1 for t in total_txns if t["amount_minor"] > 0)
    debits_count = sum(1 for t in total_txns if t["amount_minor"] < 0)

    return {
        "file_id": file_id,
        "filename": filename,
        "content_type": file.content_type,
        "bank_detected": bank_detected,
        "bank": bank_detected,
        "masked_last4": masked_last4,
        "rows_detected": parsed["rows_detected"],
        "transactions_count": len(total_txns),
        "total_credits_count": credits_count,
        "total_debits_count": debits_count,
        "period_start": parsed["period_start"],
        "period_end": parsed["period_end"],
        "date_range": {
            "start": parsed["period_start"],
            "end": parsed["period_end"]
        },
        "opening_balance_minor": parsed["opening_balance_minor"],
        "closing_balance_minor": parsed["closing_balance_minor"],
        "net_cash_flow_minor": parsed.get("net_cash_flow_minor", 0),
        "reconciliation_status": parsed["reconciliation_status"],
        "reconciliation_delta_minor": parsed.get("reconciliation_delta_minor", 0),
        "running_balance_status": parsed.get("running_balance_status", "NOT_AVAILABLE"),
        "running_balance_breaks": parsed.get("running_balance_breaks", []),
        "detected_delimiter": parsed.get("detected_delimiter", ","),
        "detected_encoding": parsed.get("detected_encoding", "utf-8"),
        "has_header": parsed.get("has_header", True),
        "headers": parsed.get("headers", []),
        "column_mapping": parsed.get("column_mapping", {}),
        "mapping_confidence": parsed.get("mapping_confidence", 1.0),
        "is_ambiguous": parsed.get("is_ambiguous", False),
        "ambiguity_reasons": parsed.get("ambiguity_reasons", []),
        "sample_rows": sample_txns,
        "warnings": parsed["warnings"],
        "errors": parsed.get("errors", [])
    }

@router.post("/preview/async")
async def preview_statement_async(
    file: UploadFile = File(...),
    bank_hint: Optional[str] = Form("auto"),
    password: Optional[str] = Form(None),
    column_mapping: Optional[str] = Form(None),
    delimiter: Optional[str] = Form(None),
    encoding: Optional[str] = Form(None),
    has_header: Optional[bool] = Form(None)
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
        password=password,
        column_mapping=column_mapping,
        delimiter=delimiter,
        encoding=encoding,
        has_header=has_header
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
    column_mapping_override: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Commits staged parsed statement to database:
    - Supports optional column_mapping_override to re-parse with user-confirmed mapping
    - Finds or creates matching Account record by bank and masked last4 owned by current_user
    - Runs deduplication (merges overlapping imports seamlessly)
    - Detects internal transfers across user's accounts
    - Assigns categories & updates recurring items and anomalies across cumulative history
    Enforces strict user isolation.
    """
    staged = _STAGING_FILES.get(file_id)
    if not staged:
        raise HTTPException(status_code=404, detail="Staged file preview expired or not found. Please re-upload.")

    # Re-parse if column_mapping_override is provided and file is CSV
    if column_mapping_override and staged.get("kind") == "csv" and staged.get("contents"):
        try:
            col_map_dict = json.loads(column_mapping_override) if isinstance(column_mapping_override, str) else column_mapping_override
            re_parsed = parse_csv_statement(
                csv_content=staged["contents"],
                column_mapping=col_map_dict
            )
            staged["parsed"] = re_parsed
        except Exception:
            pass

    parsed = staged["parsed"]
    filename = staged["filename"]
    bank_detected = staged["bank_detected"]
    masked_last4 = staged["masked_last4"]

    # Check if a matching Account already exists for current_user
    if account_id:
        target_account = db.query(Account).filter_by(
            id=account_id,
            user_id=current_user.id
        ).first()
        if not target_account:
            raise HTTPException(status_code=404, detail="Target account not found or access denied.")
    else:
        target_account = db.query(Account).filter_by(
            user_id=current_user.id,
            bank=bank_detected,
            masked_last4=masked_last4
        ).first()

        if not target_account:
            # Create new account for this bank for current_user
            target_account = Account(
                user_id=current_user.id,
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
        parse_report_json=json.dumps({"warnings": parsed["warnings"], "errors": parsed.get("errors", [])})
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
            "normalized_description": t.normalized_description,
            "fingerprint": t.fingerprint,
            "occurrence_index": t.occurrence_index
        }
        for t in existing_txns
    ]

    # 2. Run deduplication engine
    fresh_txns, duplicates_count = deduplicate_transactions(
        incoming_txns=parsed["transactions"],
        existing_txns=existing_dicts,
        account_id=account_id
    )

    # 3. Categorize and insert new transactions
    inserted_records = []
    for raw_t in fresh_txns:
        norm_desc = raw_t.get("normalized_description") or raw_t["raw_description"]
        raw_merchant = raw_t.get("merchant") or raw_t.get("merchant_id") or ""
        cat_id, cat_source, cat_conf = categorize_transaction(
            raw_t["raw_description"],
            norm_desc,
            raw_merchant,
            raw_t["amount_minor"]
        )

        txn = Transaction(
            account_id=account_id,
            source_file_id=sf.id,
            source_row=raw_t.get("source_row", 0),
            posted_date=raw_t["posted_date"],
            value_date=raw_t.get("value_date"),
            amount_minor=raw_t["amount_minor"],
            raw_description=raw_t["raw_description"],
            normalized_description=norm_desc,
            channel=raw_t.get("channel", "OTHER"),
            merchant_id=raw_merchant if raw_merchant else None,
            category_id=cat_id,
            category_source=cat_source,
            category_confidence=cat_conf,
            balance_after_minor=raw_t.get("balance_after_minor"),
            fingerprint=raw_t["fingerprint"],
            occurrence_index=raw_t["occurrence_index"],
            status="active"
        )
        db.add(txn)
        inserted_records.append(txn)

    db.commit()

    # 4. Detect Internal Transfers across all accounts belonging to current_user
    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    all_db_txns = db.query(Transaction).filter(
        Transaction.status == "active",
        Transaction.account_id.in_(user_account_ids)
    ).all()

    all_dicts = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "normalized_description": t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer
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

    # 5. Refresh Recurring Items for current_user
    active_txns = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "normalized_description": t.normalized_description,
            "merchant": t.merchant_id or t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer
        }
        for t in all_db_txns
    ]
    detected_recurring = detect_recurring_items(active_txns)
    for r in detected_recurring:
        existing_rec = db.query(RecurringItem).filter_by(
            user_id=current_user.id,
            merchant=r["merchant"],
            cadence=r["cadence"]
        ).first()
        if existing_rec:
            existing_rec.typical_amount_minor = r["typical_amount_minor"]
            existing_rec.last_paid_date = r["last_paid_date"]
            existing_rec.next_expected_date = r["next_expected_date"]
            existing_rec.occurrences = r["occurrences"]
            existing_rec.confidence = r["confidence"]
        else:
            new_rec = RecurringItem(
                user_id=current_user.id,
                account_id=r.get("account_id") or account_id,
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
        "imported_rows": len(inserted_records),
        "inserted": len(inserted_records),
        "duplicates_skipped": duplicates_count,
        "duplicates_merged": duplicates_count,
        "internal_transfers_detected": paired_count,
        "transfers_detected": paired_count,
        "anomalies_flagged": len(anomalies),
        "recurring_items_found": len(detected_recurring),
        "recurring_items_updated": len(detected_recurring)
    }

@router.post("/demo-load")
def load_demo_statement(
    persona: str = Form("aarav"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Directly ingests a real synthetic bank statement file for testing/demo purposes:
    - 'aarav': data/synthetic/aarav/hdfc_statement.csv (Salaried Engineer)
    - 'priya': data/synthetic/priya/icici_freelance.csv (Freelancer)
    Runs the exact same parsing, deduplication, categorization, and anomaly pipeline.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if persona == "priya":
        rel_path = os.path.join("data", "synthetic", "priya", "icici_freelance.csv")
        bank_hint = "ICICI"
        filename = "PRIYA_ICICI_FREELANCE.CSV"
    else:
        rel_path = os.path.join("data", "synthetic", "aarav", "hdfc_statement.csv")
        bank_hint = "HDFC"
        filename = "AARAV_HDFC_SALARY.CSV"

    full_path = os.path.join(base_dir, rel_path)
    if not os.path.exists(full_path):
        full_path = os.path.abspath(rel_path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail=f"Synthetic demo file not found: {rel_path}")

    with open(full_path, "rb") as f:
        contents = f.read()

    sha256_hash = hashlib.sha256(contents).hexdigest()
    parsed = parse_csv_statement(csv_content=contents)
    raw_sample_text = contents[:4000].decode("utf-8", errors="replace")

    bank_detected, masked_last4 = detect_bank_and_account(
        raw_text=raw_sample_text,
        filename=filename,
        user_bank_hint=bank_hint
    )

    # Find or create account for current_user
    target_account = db.query(Account).filter_by(
        user_id=current_user.id,
        bank=bank_detected,
        masked_last4=masked_last4
    ).first()

    if not target_account:
        target_account = Account(
            user_id=current_user.id,
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

    # Create SourceFile
    sf = SourceFile(
        account_id=account_id,
        filename=filename,
        kind="csv",
        sha256=sha256_hash,
        period_start=parsed["period_start"],
        period_end=parsed["period_end"],
        opening_balance_minor=parsed["opening_balance_minor"],
        closing_balance_minor=parsed["closing_balance_minor"],
        reconciliation_status=parsed["reconciliation_status"],
        parse_report_json=json.dumps({"warnings": parsed["warnings"], "errors": parsed.get("errors", [])})
    )
    db.add(sf)
    db.commit()
    db.refresh(sf)

    # Deduplicate
    existing_txns = db.query(Transaction).filter_by(account_id=account_id).all()
    existing_dicts = [
        {
            "id": t.id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "normalized_description": t.normalized_description,
            "fingerprint": t.fingerprint,
            "occurrence_index": t.occurrence_index
        }
        for t in existing_txns
    ]
    fresh_txns, duplicates_count = deduplicate_transactions(
        incoming_txns=parsed["transactions"],
        existing_txns=existing_dicts,
        account_id=account_id
    )

    inserted_records = []
    for raw_t in fresh_txns:
        norm_desc = raw_t.get("normalized_description") or raw_t["raw_description"]
        raw_merchant = raw_t.get("merchant") or raw_t.get("merchant_id") or ""
        cat_id, cat_source, cat_conf = categorize_transaction(
            raw_t["raw_description"],
            norm_desc,
            raw_merchant,
            raw_t["amount_minor"]
        )
        txn = Transaction(
            account_id=account_id,
            source_file_id=sf.id,
            source_row=raw_t.get("source_row", 0),
            posted_date=raw_t["posted_date"],
            value_date=raw_t.get("value_date"),
            amount_minor=raw_t["amount_minor"],
            raw_description=raw_t["raw_description"],
            normalized_description=norm_desc,
            channel=raw_t.get("channel", "OTHER"),
            merchant_id=raw_merchant if raw_merchant else None,
            category_id=cat_id,
            category_source=cat_source,
            category_confidence=cat_conf,
            balance_after_minor=raw_t.get("balance_after_minor"),
            fingerprint=raw_t["fingerprint"],
            occurrence_index=raw_t["occurrence_index"],
            status="active"
        )
        db.add(txn)
        inserted_records.append(txn)

    db.commit()

    # Transfers
    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    all_db_txns = db.query(Transaction).filter(
        Transaction.status == "active",
        Transaction.account_id.in_(user_account_ids)
    ).all()
    all_dicts = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "normalized_description": t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer
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

    # Recurring
    active_txns = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "normalized_description": t.normalized_description,
            "merchant": t.merchant_id or t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": t.is_transfer
        }
        for t in all_db_txns
    ]
    detected_recurring = detect_recurring_items(active_txns)
    for r in detected_recurring:
        existing_rec = db.query(RecurringItem).filter_by(
            user_id=current_user.id,
            merchant=r["merchant"],
            cadence=r["cadence"]
        ).first()
        if existing_rec:
            existing_rec.typical_amount_minor = r["typical_amount_minor"]
            existing_rec.last_paid_date = r["last_paid_date"]
            existing_rec.next_expected_date = r["next_expected_date"]
            existing_rec.occurrences = r["occurrences"]
            existing_rec.confidence = r["confidence"]
        else:
            new_rec = RecurringItem(
                user_id=current_user.id,
                account_id=r.get("account_id") or account_id,
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

    # Anomalies
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

    credits_count = sum(1 for t in parsed["transactions"] if t["amount_minor"] > 0)
    debits_count = sum(1 for t in parsed["transactions"] if t["amount_minor"] < 0)

    return {
        "status": "success",
        "account_id": account_id,
        "source_file_id": sf.id,
        "bank_detected": bank_detected,
        "bank": bank_detected,
        "masked_last4": masked_last4,
        "rows_detected": parsed["rows_detected"],
        "transactions_count": len(parsed["transactions"]),
        "total_credits_count": credits_count,
        "total_debits_count": debits_count,
        "period_start": parsed["period_start"],
        "period_end": parsed["period_end"],
        "date_range": {
            "start": parsed["period_start"],
            "end": parsed["period_end"]
        },
        "reconciliation_status": parsed["reconciliation_status"],
        "total_rows": len(fresh_txns),
        "imported_rows": len(inserted_records),
        "inserted": len(inserted_records),
        "duplicates_skipped": duplicates_count,
        "transfers_detected": paired_count,
        "anomalies_flagged": len(anomalies),
        "recurring_items_found": len(detected_recurring)
    }

@router.get("/files")
def list_uploaded_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns list of all statement source files uploaded by current_user with reconciliation status
    and active transaction counts.
    """
    files = (
        db.query(SourceFile)
        .join(Account, SourceFile.account_id == Account.id)
        .filter(Account.user_id == current_user.id)
        .order_by(SourceFile.imported_at.desc())
        .all()
    )
    result = []
    for sf in files:
        acct = db.query(Account).filter_by(id=sf.account_id).first()
        tx_count = db.query(Transaction).filter_by(source_file_id=sf.id, status="active").count()
        result.append({
            "id": sf.id,
            "filename": sf.filename,
            "bank": acct.bank if acct else "Bank Account",
            "masked_last4": acct.masked_last4 if acct else "",
            "account_nickname": acct.nickname if acct else "",
            "period_start": sf.period_start,
            "period_end": sf.period_end,
            "transaction_count": tx_count,
            "reconciliation_status": sf.reconciliation_status,
            "imported_at": sf.imported_at.isoformat() if sf.imported_at else None
        })
    return result

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
from typing import Optional, Dict, Any, List

from db.database import get_db
from db.models import Account, SourceFile, Transaction, RecurringItem, Anomaly, User, ForecastSnapshot
from auth import get_current_user
from parsers.csv_parser import parse_csv_statement
from parsers.pdf_parser import parse_pdf_statement
from parsers.excel_parser import parse_excel_statement
from parsers.bank_detector import detect_bank_and_account
from engine.dedupe import deduplicate_transactions, detect_internal_transfers
from ml.categorizer import categorize_transaction
from engine.recurring import detect_recurring_items
from engine.anomaly import detect_anomalies

router = APIRouter()

# Staging directory for persistent staged files across Uvicorn worker restarts
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGING_DIR = os.path.join(BASE_DIR, ".staging")
os.makedirs(STAGING_DIR, exist_ok=True)

# In-memory staging store: {file_id: staged_file_dict}
_STAGING_FILES: Dict[str, Dict[str, Any]] = {}

def get_repo_root() -> str:
    """Climbs directory tree to find root repository containing data/synthetic or package.json."""
    curr = os.path.dirname(os.path.abspath(__file__))
    while curr:
        if os.path.exists(os.path.join(curr, "data", "synthetic")) or os.path.exists(os.path.join(curr, "package.json")):
            return curr
        parent = os.path.dirname(curr)
        if parent == curr:
            break
        curr = parent
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def save_staged_file(file_id: str, staged_dict: Dict[str, Any]):
    """Stores in-memory and writes metadata & binary contents to disk cache for restart resilience."""
    _STAGING_FILES[file_id] = staged_dict
    try:
        disk_meta = os.path.join(STAGING_DIR, f"{file_id}.json")
        save_copy = {k: v for k, v in staged_dict.items() if k != "contents"}
        with open(disk_meta, "w", encoding="utf-8") as f:
            json.dump(save_copy, f)
        if "contents" in staged_dict and isinstance(staged_dict["contents"], (bytes, bytearray)):
            with open(os.path.join(STAGING_DIR, f"{file_id}.bin"), "wb") as bf:
                bf.write(staged_dict["contents"])
    except Exception:
        pass

def get_staged_file(file_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves staged statement from in-memory dictionary or disk cache."""
    if file_id in _STAGING_FILES:
        return _STAGING_FILES[file_id]
    disk_meta = os.path.join(STAGING_DIR, f"{file_id}.json")
    if os.path.exists(disk_meta):
        try:
            with open(disk_meta, "r", encoding="utf-8") as f:
                staged = json.load(f)
            bin_path = os.path.join(STAGING_DIR, f"{file_id}.bin")
            if os.path.exists(bin_path):
                with open(bin_path, "rb") as bf:
                    staged["contents"] = bf.read()
            _STAGING_FILES[file_id] = staged
            return staged
        except Exception:
            return None
    return None

def _run_post_import_pipeline(
    db: Session,
    current_user: User,
    account_id: str,
    source_file: SourceFile,
    parsed: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Executes the deterministic post-import pipeline:
    1. Deduplication (occurrence-ordinal algorithm)
    2. Category classification
    3. Internal transfer pairing (cross-account transfers)
    4. Recurring cadence detection & clustering
    5. Anomaly detection (spikes & duplicate charges)
    Optimized with in-memory hash lookups to eliminate quadratic query overhead.
    """
    # 1. Fetch existing transactions for deduplication
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

    # 2. Categorize and insert fresh transactions
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
            source_file_id=source_file.id,
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

    # 3. Detect Internal Transfers across all accounts of current_user
    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    all_db_txns = db.query(Transaction).filter(
        Transaction.status == "active",
        Transaction.account_id.in_(user_account_ids)
    ).all()
    txns_by_id = {t.id: t for t in all_db_txns}

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
            db_t = txns_by_id.get(t_dict["id"])
            if db_t and not db_t.is_transfer:
                db_t.is_transfer = True
                db_t.transfer_pair_id = t_dict["transfer_pair_id"]
                db_t.category_id = "cat_transfer"

    db.commit()

    # 4. Refresh Recurring Items for current_user
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
    existing_recs = db.query(RecurringItem).filter_by(user_id=current_user.id).all()
    rec_lookup = {(r.merchant, r.cadence): r for r in existing_recs}

    for r in detected_recurring:
        key = (r["merchant"], r["cadence"])
        existing_rec = rec_lookup.get(key)
        if existing_rec:
            # If user rejected this item, do not reactivate or unpause it
            if existing_rec.user_status != "rejected":
                # Only update typical amount if user has not manually customized it
                if not getattr(existing_rec, "is_manual", False):
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
            rec_lookup[key] = new_rec

    # 5. Flag Anomalies across transactions
    anomalies = detect_anomalies(active_txns)
    existing_anoms = db.query(Anomaly).all()
    anom_lookup = {(a.txn_id, a.rule_id): a for a in existing_anoms}

    for a in anomalies:
        key = (a["txn_id"], a["rule_id"])
        if key not in anom_lookup:
            db_anom = Anomaly(
                txn_id=a["txn_id"],
                type=a["type"],
                rule_id=a["rule_id"],
                amount_minor=a["amount_minor"],
                reason_text=a["reason_text"],
                severity=a["severity"]
            )
            db.add(db_anom)
            anom_lookup[key] = db_anom

    db.commit()

    return {
        "inserted": len(inserted_records),
        "duplicates_skipped": duplicates_count,
        "transfers_detected": paired_count,
        "recurring_items_updated": len(detected_recurring),
        "anomalies_flagged": len(anomalies)
    }

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
    - Detected bank and masked account number
    - Total rows read, date range, opening/closing balance, running balance check
    - Sample rows with parsed amounts and dates
    - Balance reconciliation status
    """
    contents = await file.read()
    filename = file.filename or "statement.csv"
    sha256_hash = hashlib.sha256(contents).hexdigest()

    lower_fn = filename.lower()
    file_type_label = "PDF" if lower_fn.endswith(".pdf") else ("Excel" if lower_fn.endswith((".xlsx", ".xls")) else ("Zip Archive" if lower_fn.endswith(".zip") else "CSV"))

    try:
        if lower_fn.endswith(".pdf"):
            parsed = parse_pdf_statement(contents, password=password)
            raw_sample_text = str(contents[:4000])
        elif lower_fn.endswith((".xlsx", ".xls")):
            col_map_dict = None
            if column_mapping:
                try:
                    col_map_dict = json.loads(column_mapping) if isinstance(column_mapping, str) else column_mapping
                except Exception:
                    pass
            parsed = parse_excel_statement(
                excel_bytes=contents,
                password=password,
                column_mapping=col_map_dict
            )
            raw_sample_text = "\n".join(["\t".join(str(cell) for cell in r) for r in parsed.get("headers", []) + [r.get("raw_description", "") for r in parsed.get("sample_rows", [])]])
        elif lower_fn.endswith(".zip"):
            import zipfile
            with zipfile.ZipFile(io.BytesIO(contents)) as zf:
                names = zf.namelist()
                target_m = next((m for m in names if m.lower().endswith((".csv", ".xlsx", ".xls", ".txt"))), None) or (names[0] if names else None)
                if not target_m:
                    raise ValueError("ZIP archive contains no statement files.")
                
                info = zf.getinfo(target_m)
                if (info.flag_bits & 0x1) != 0:
                    if not password or not password.strip():
                        raise ValueError("PASSWORD_REQUIRED: This compressed statement is password-protected. Please enter your password.")
                    try:
                        inner_data = zf.read(target_m, pwd=password.strip().encode("utf-8"))
                    except Exception:
                        raise ValueError("PASSWORD_INCORRECT: Incorrect password for this compressed statement.")
                else:
                    inner_data = zf.read(target_m)

                if target_m.lower().endswith((".xlsx", ".xls")):
                    parsed = parse_excel_statement(inner_data, password=password)
                    raw_sample_text = "\n".join(["\t".join(str(cell) for cell in r) for r in parsed.get("headers", []) + [r.get("raw_description", "") for r in parsed.get("sample_rows", [])]])
                else:
                    parsed = parse_csv_statement(inner_data)
                    raw_sample_text = inner_data[:4000].decode("utf-8", errors="replace")
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
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "PASSWORD_REQUIRED",
                    "file_name": filename,
                    "file_type": file_type_label,
                    "message": f"This {file_type_label} statement is password-protected. Please enter the password to unlock it."
                }
            )
        elif "PASSWORD_INCORRECT" in err_msg:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "PASSWORD_INCORRECT",
                    "file_name": filename,
                    "file_type": file_type_label,
                    "message": f"Incorrect password for this {file_type_label} statement. Please verify and try again."
                }
            )
        raise HTTPException(status_code=400, detail=f"Failed to parse statement: {err_msg}")

    # Auto-detect bank and account number
    bank_detected, masked_last4 = detect_bank_and_account(
        raw_text=raw_sample_text,
        filename=filename,
        user_bank_hint=bank_hint
    )

    file_id = f"stg_{uuid.uuid4().hex[:12]}"
    staged_data = {
        "filename": filename,
        "contents": contents,
        "kind": "pdf" if filename.lower().endswith(".pdf") else "csv",
        "sha256": sha256_hash,
        "bank_detected": bank_detected,
        "masked_last4": masked_last4,
        "parsed": parsed
    }
    save_staged_file(file_id, staged_data)

    sample_txns = parsed["transactions"][:10]
    total_txns = parsed["transactions"]
    credits_count = sum(1 for t in total_txns if t["amount_minor"] > 0)
    debits_count = sum(1 for t in total_txns if t["amount_minor"] < 0)

    return {
        "file_id": file_id,
        "staging_id": file_id,
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
    staged = get_staged_file(file_id)
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

    # Run post-import pipeline
    pipeline_res = _run_post_import_pipeline(
        db=db,
        current_user=current_user,
        account_id=account_id,
        source_file=sf,
        parsed=parsed
    )

    # Clean up staged cache
    _STAGING_FILES.pop(file_id, None)
    try:
        disk_meta = os.path.join(STAGING_DIR, f"{file_id}.json")
        if os.path.exists(disk_meta):
            os.remove(disk_meta)
        bin_path = os.path.join(STAGING_DIR, f"{file_id}.bin")
        if os.path.exists(bin_path):
            os.remove(bin_path)
    except Exception:
        pass

    return {
        "status": "success",
        "account_id": account_id,
        "source_file_id": sf.id,
        "bank": bank_detected,
        "masked_last4": masked_last4,
        "total_rows": len(parsed["transactions"]),
        "imported_rows": pipeline_res["inserted"],
        "inserted": pipeline_res["inserted"],
        "duplicates_skipped": pipeline_res["duplicates_skipped"],
        "duplicates_merged": pipeline_res["duplicates_skipped"],
        "internal_transfers_detected": pipeline_res["transfers_detected"],
        "transfers_detected": pipeline_res["transfers_detected"],
        "anomalies_flagged": pipeline_res["anomalies_flagged"],
        "recurring_items_found": pipeline_res["recurring_items_updated"],
        "recurring_items_updated": pipeline_res["recurring_items_updated"]
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
    repo_root = get_repo_root()
    if persona == "priya":
        rel_path = os.path.join("data", "synthetic", "priya", "icici_freelance.csv")
        bank_hint = "ICICI"
        filename = "PRIYA_ICICI_FREELANCE.CSV"
    else:
        rel_path = os.path.join("data", "synthetic", "aarav", "hdfc_statement.csv")
        bank_hint = "HDFC"
        filename = "AARAV_HDFC_SALARY.CSV"

    full_path = os.path.join(repo_root, rel_path)
    if not os.path.exists(full_path):
        full_path = os.path.abspath(rel_path)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail=f"Synthetic demo file not found at {full_path}")

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

    pipeline_res = _run_post_import_pipeline(
        db=db,
        current_user=current_user,
        account_id=account_id,
        source_file=sf,
        parsed=parsed
    )

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
        "total_rows": len(parsed["transactions"]),
        "imported_rows": pipeline_res["inserted"],
        "inserted": pipeline_res["inserted"],
        "duplicates_skipped": pipeline_res["duplicates_skipped"],
        "transfers_detected": pipeline_res["transfers_detected"],
        "anomalies_flagged": pipeline_res["anomalies_flagged"],
        "recurring_items_found": pipeline_res["recurring_items_updated"]
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

@router.delete("/files/{file_id}")
def delete_uploaded_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently deletes a single uploaded statement file and executes cascade cleanup:
    1. Unpairs linked cross-statement transfers on partner accounts and restores their category.
    2. Deletes anomalies associated with deleted transactions.
    3. Deletes transactions originating from this source file.
    4. Deletes the SourceFile record.
    5. Cleans up orphaned empty account if 0 files/txns remain and account is not primary.
    6. Recalculates auto-detected recurring items on the remaining active transactions.
    7. Invalidates cached forecast snapshots.
    """
    sf = (
        db.query(SourceFile)
        .join(Account, SourceFile.account_id == Account.id)
        .filter(SourceFile.id == file_id, Account.user_id == current_user.id)
        .first()
    )
    if not sf:
        raise HTTPException(status_code=404, detail="Statement file not found or access denied.")

    account_id = sf.account_id
    filename = sf.filename

    # 1. Find all transactions belonging to this file
    file_txns = db.query(Transaction).filter_by(source_file_id=sf.id).all()
    file_txn_ids = [t.id for t in file_txns]

    # 2. Unpair linked internal transfers on partner transactions in other statements
    transfer_pair_ids = [t.transfer_pair_id for t in file_txns if t.is_transfer and t.transfer_pair_id]
    unpaired_count = 0
    if transfer_pair_ids:
        user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
        partner_txns = db.query(Transaction).filter(
            Transaction.transfer_pair_id.in_(transfer_pair_ids),
            Transaction.account_id.in_(user_account_ids),
            ~Transaction.id.in_(file_txn_ids)
        ).all()
        for pt in partner_txns:
            pt.is_transfer = False
            pt.transfer_pair_id = None
            cat_id, cat_source, cat_conf = categorize_transaction(
                pt.raw_description,
                pt.normalized_description,
                pt.merchant_id or "",
                pt.amount_minor
            )
            pt.category_id = cat_id
            pt.category_source = cat_source
            pt.category_confidence = cat_conf
            unpaired_count += 1

    # 3. Delete anomalies linked to these transactions
    if file_txn_ids:
        db.query(Anomaly).filter(Anomaly.txn_id.in_(file_txn_ids)).delete(synchronize_session=False)

    # 4. Delete transactions
    if file_txn_ids:
        db.query(Transaction).filter(Transaction.source_file_id == sf.id).delete(synchronize_session=False)

    # 5. Delete SourceFile
    db.delete(sf)
    db.commit()

    # 6. Check if Account is now orphaned
    remaining_files_count = db.query(SourceFile).filter_by(account_id=account_id).count()
    remaining_txns_count = db.query(Transaction).filter_by(account_id=account_id).count()
    account_deleted = False
    if remaining_files_count == 0 and remaining_txns_count == 0:
        acct = db.query(Account).filter_by(id=account_id, user_id=current_user.id).first()
        if acct and not acct.is_primary:
            db.delete(acct)
            db.commit()
            account_deleted = True

    # 7. Recalculate auto recurring items on remaining active transactions
    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    remaining_db_txns = db.query(Transaction).filter(
        Transaction.status == "active",
        Transaction.account_id.in_(user_account_ids)
    ).all()
    remaining_dicts = [
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
        for t in remaining_db_txns
    ]

    new_recurring = detect_recurring_items(remaining_dicts)
    db.query(RecurringItem).filter_by(user_id=current_user.id, is_manual=False).delete()
    for r in new_recurring:
        new_rec = RecurringItem(
            user_id=current_user.id,
            account_id=r.get("account_id") or (user_account_ids[0] if user_account_ids else None),
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
            is_manual=False
        )
        db.add(new_rec)

    # 8. Invalidate cached forecast snapshots
    db.query(ForecastSnapshot).filter_by(user_id=current_user.id).delete()
    db.commit()

    return {
        "status": "success",
        "file_id": file_id,
        "filename": filename,
        "deleted_transactions": len(file_txn_ids),
        "unpaired_transfers": unpaired_count,
        "recalculated_recurring": len(new_recurring),
        "account_removed": account_deleted
    }


@router.delete("/files")
def delete_all_uploaded_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Purges all uploaded statement files, transactions, anomalies, auto-detected recurring items,
    and forecast snapshots for current_user.
    """
    user_account_ids = [a.id for a in db.query(Account).filter_by(user_id=current_user.id).all()]
    all_files = (
        db.query(SourceFile)
        .filter(SourceFile.account_id.in_(user_account_ids))
        .all()
    )
    total_files_count = len(all_files)
    file_ids = [sf.id for sf in all_files]

    # Find transactions
    txns = db.query(Transaction).filter(Transaction.account_id.in_(user_account_ids)).all()
    txn_ids = [t.id for t in txns]

    # Delete anomalies
    if txn_ids:
        db.query(Anomaly).filter(Anomaly.txn_id.in_(txn_ids)).delete(synchronize_session=False)

    # Delete transactions
    if txn_ids:
        db.query(Transaction).filter(Transaction.account_id.in_(user_account_ids)).delete(synchronize_session=False)

    # Delete source files
    if file_ids:
        db.query(SourceFile).filter(SourceFile.id.in_(file_ids)).delete(synchronize_session=False)

    # Delete auto recurring items
    db.query(RecurringItem).filter_by(user_id=current_user.id, is_manual=False).delete()

    # Invalidate forecast snapshots
    db.query(ForecastSnapshot).filter_by(user_id=current_user.id).delete()

    # Delete non-primary empty accounts
    accounts_deleted_count = 0
    accounts = db.query(Account).filter_by(user_id=current_user.id).all()
    for acct in accounts:
        if not acct.is_primary:
            db.delete(acct)
            accounts_deleted_count += 1
        else:
            acct.opening_balance_minor = 0

    db.commit()

    return {
        "status": "success",
        "deleted_files_count": total_files_count,
        "deleted_transactions_count": len(txn_ids),
        "deleted_accounts_count": accounts_deleted_count
    }


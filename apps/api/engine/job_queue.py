"""
Async Statement Ingestion Job Queue for Financial Decision Lab (FDL).
Enables non-blocking background parsing of large, multi-page statements.
"""

import uuid
import time
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

from parsers.csv_parser import parse_csv_statement
from parsers.pdf_parser import parse_pdf_statement
from parsers.bank_detector import detect_bank_and_account

_EXECUTOR = ThreadPoolExecutor(max_workers=2)
_JOBS: Dict[str, Dict[str, Any]] = {}

def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    return _JOBS.get(job_id)

def _process_parse_job(
    job_id: str,
    contents: bytes,
    filename: str,
    bank_hint: Optional[str] = "auto",
    password: Optional[str] = None
):
    job = _JOBS.get(job_id)
    if not job:
        return

    job["status"] = "PROCESSING"
    job["progress_pct"] = 15

    try:
        sha256_hash = hashlib.sha256(contents).hexdigest()

        if filename.lower().endswith(".pdf"):
            job["progress_pct"] = 35
            parsed = parse_pdf_statement(contents, password=password)
            raw_sample_text = str(contents[:4000])
        else:
            job["progress_pct"] = 35
            text_content = contents.decode("utf-8", errors="replace")
            parsed = parse_csv_statement(text_content)
            raw_sample_text = text_content[:4000]

        job["progress_pct"] = 75

        # Detect bank & last 4 digits
        bank_detected, masked_last4 = detect_bank_and_account(
            raw_text=raw_sample_text,
            filename=filename,
            user_bank_hint=bank_hint
        )

        job["progress_pct"] = 90

        # Save to staging store
        file_id = f"stg_{uuid.uuid4().hex[:12]}"
        from routers.imports import _STAGING_FILES
        _STAGING_FILES[file_id] = {
            "filename": filename,
            "kind": "pdf" if filename.lower().endswith(".pdf") else "csv",
            "sha256": sha256_hash,
            "bank_detected": bank_detected,
            "masked_last4": masked_last4,
            "parsed": parsed
        }

        job["status"] = "COMPLETED"
        job["progress_pct"] = 100
        job["completed_at"] = datetime.now(timezone.utc).isoformat()
        job["result"] = {
            "file_id": file_id,
            "filename": filename,
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
            "sample_rows": parsed["transactions"][:5],
            "warnings": parsed["warnings"]
        }

    except Exception as e:
        job["status"] = "FAILED"
        job["progress_pct"] = 100
        job["completed_at"] = datetime.now(timezone.utc).isoformat()
        job["error"] = str(e)

def submit_async_parse_job(
    contents: bytes,
    filename: str,
    bank_hint: Optional[str] = "auto",
    password: Optional[str] = None
) -> str:
    """
    Submits a statement parsing job to the background thread pool.
    Returns unique job_id.
    """
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    _JOBS[job_id] = {
        "job_id": job_id,
        "filename": filename,
        "status": "QUEUED",
        "progress_pct": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "result": None,
        "error": None
    }

    _EXECUTOR.submit(
        _process_parse_job,
        job_id,
        contents,
        filename,
        bank_hint,
        password
    )

    return job_id

"""
Async Statement Ingestion Job Queue for Financial Decision Lab (FDL).
Enables non-blocking background parsing of large, multi-page statements.
"""

import uuid
import time
import hashlib
import json
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

from parsers.csv_parser import parse_csv_statement
from parsers.pdf_parser import parse_pdf_statement
from parsers.excel_parser import parse_excel_statement
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
    password: Optional[str] = None,
    column_mapping: Optional[str] = None,
    delimiter: Optional[str] = None,
    encoding: Optional[str] = None,
    has_header: Optional[bool] = None
):
    job = _JOBS.get(job_id)
    if not job:
        return

    job["status"] = "PROCESSING"
    job["progress_pct"] = 15

    try:
        sha256_hash = hashlib.sha256(contents).hexdigest()

        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            job["progress_pct"] = 35
            parsed = parse_pdf_statement(contents, password=password)
            raw_sample_text = str(contents[:4000])
        elif lower_name.endswith((".xlsx", ".xls")):
            job["progress_pct"] = 35
            col_map_dict = None
            if column_mapping:
                try:
                    col_map_dict = json.loads(column_mapping) if isinstance(column_mapping, str) else column_mapping
                except Exception:
                    pass
            parsed = parse_excel_statement(contents, password=password, column_mapping=col_map_dict)
            raw_sample_text = "\n".join(["\t".join(str(c) for c in r) for r in parsed.get("headers", [])])
        else:
            job["progress_pct"] = 35
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
            "contents": contents,
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
            "sample_rows": parsed["transactions"][:10],
            "warnings": parsed["warnings"],
            "errors": parsed.get("errors", [])
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
    password: Optional[str] = None,
    column_mapping: Optional[str] = None,
    delimiter: Optional[str] = None,
    encoding: Optional[str] = None,
    has_header: Optional[bool] = None
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
        password,
        column_mapping,
        delimiter,
        encoding,
        has_header
    )

    return job_id

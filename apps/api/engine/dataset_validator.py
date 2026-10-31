"""
Repeatable Financial Statement Dataset Validator for Financial Decision Lab (FDL).
Audits and validates any bank statement CSV against FDL's 7 Golden Rules and Financial Data Quality criteria:
- Encoding, delimiter, and column mapping verification.
- Integer paise precision and sign conventions (credits > 0, debits < 0).
- Opening/closing balance reconciliation (O + sum(T) == C).
- Running balance consistency (B_t == B_{t-1} + delta_t).
- Date continuity, chronological ordering, and gap analysis.
- Sufficiency gate evaluation.
"""

import os
from datetime import datetime
from typing import Dict, Any, List, Optional

from parsers.csv_parser import parse_csv_statement
from engine.sufficiency import evaluate_data_sufficiency


def validate_statement_dataset(filepath: str) -> Dict[str, Any]:
    """
    Performs comprehensive financial and technical validation on a statement file.
    Returns a structured validation report.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Statement file not found: {filepath}")

    file_size_bytes = os.path.getsize(filepath)
    with open(filepath, "rb") as f:
        raw_bytes = f.read()

    # 1. Parse statement with dynamic CSV parser
    parsed = parse_csv_statement(raw_bytes)
    txns = parsed["transactions"]

    # 2. Financial Invariants Checks
    debit_count = 0
    credit_count = 0
    sign_convention_passed = True
    zero_amount_count = 0

    for t in txns:
        amt = t["amount_minor"]
        if amt < 0:
            debit_count += 1
        elif amt > 0:
            credit_count += 1
        else:
            zero_amount_count += 1
            sign_convention_passed = False

    # 3. Chronological Ordering Check
    is_chronological = True
    if len(txns) >= 2:
        dates = [t["posted_date"] for t in txns]
        is_ascending = all(dates[i] <= dates[i + 1] for i in range(len(dates) - 1))
        is_descending = all(dates[i] >= dates[i + 1] for i in range(len(dates) - 1))
        is_chronological = is_ascending or is_descending

    # 4. In-Statement Duplicate Check
    seen_fingerprints = set()
    internal_duplicates = 0
    for t in txns:
        fp = f"{t['posted_date']}|{t['amount_minor']}|{t['raw_description']}"
        if fp in seen_fingerprints:
            internal_duplicates += 1
        seen_fingerprints.add(fp)

    # 5. Data Sufficiency Evaluation
    sufficiency_report = evaluate_data_sufficiency(txns)

    # 6. Overall Quality Grading
    issues = []
    if not sign_convention_passed:
        issues.append("Contains zero or unsigned transactions.")
    if parsed["reconciliation_status"].startswith("DISCREPANCY"):
        issues.append(f"Reconciliation discrepancy: {parsed['reconciliation_status']}")
    if parsed["running_balance_status"] == "DISCREPANCY":
        issues.append(f"Running balance broke on {len(parsed['running_balance_breaks'])} rows.")
    if len(parsed["errors"]) > 0:
        issues.append(f"Contains {len(parsed['errors'])} row-level parsing errors.")

    if not issues:
        quality_grade = "EXCELLENT" if sufficiency_report["status"] == "OK" else "ACCEPTABLE"
    elif len(issues) <= 2 and not parsed["reconciliation_status"].startswith("DISCREPANCY"):
        quality_grade = "WARNING"
    else:
        quality_grade = "DEFECTIVE"

    return {
        "file_path": filepath,
        "filename": os.path.basename(filepath),
        "file_size_bytes": file_size_bytes,
        "quality_grade": quality_grade,
        "technical_metadata": {
            "detected_delimiter": parsed["detected_delimiter"],
            "detected_encoding": parsed["detected_encoding"],
            "has_header": parsed["has_header"],
            "mapping_confidence": parsed["mapping_confidence"],
            "is_ambiguous": parsed["is_ambiguous"],
            "ambiguity_reasons": parsed["ambiguity_reasons"],
            "column_mapping": parsed["column_mapping"],
            "headers": parsed["headers"],
        },
        "financial_summary": {
            "total_transactions": len(txns),
            "debit_transactions": debit_count,
            "credit_transactions": credit_count,
            "period_start": parsed["period_start"],
            "period_end": parsed["period_end"],
            "opening_balance_minor": parsed["opening_balance_minor"],
            "closing_balance_minor": parsed["closing_balance_minor"],
            "net_cash_flow_minor": parsed["net_cash_flow_minor"],
            "reconciliation_status": parsed["reconciliation_status"],
            "reconciliation_delta_minor": parsed["reconciliation_delta_minor"],
            "running_balance_status": parsed["running_balance_status"],
            "running_balance_breaks_count": len(parsed["running_balance_breaks"]),
        },
        "validation_checks": {
            "sign_convention_valid": sign_convention_passed,
            "chronological_ordering_valid": is_chronological,
            "internal_duplicates_count": internal_duplicates,
            "date_gaps_count": len(parsed.get("date_gaps", [])),
            "row_level_errors_count": len(parsed["errors"]),
            "row_level_warnings_count": len(parsed["warnings"]),
            "sufficiency_status": sufficiency_report["status"],
        },
        "issues": issues,
        "remediation_actions": sufficiency_report["fix_actions"],
    }


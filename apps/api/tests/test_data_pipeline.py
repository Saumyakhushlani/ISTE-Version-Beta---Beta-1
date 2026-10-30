"""
Automated Pytest Suite for the Financial Data Pipeline
Tests Ingestion (CSV & PDF), Deduplication, Internal Transfers,
Categorization, Sufficiency Gate, Recurring Detection, and Anomalies.
"""

import os
import pytest
from parsers.csv_parser import parse_csv_statement, parse_indian_amount_to_paise
from engine.dedupe import deduplicate_transactions, detect_internal_transfers
from ml.categorizer import categorize_transaction
from engine.sufficiency import evaluate_data_sufficiency
from engine.recurring import detect_recurring_items
from engine.anomaly import detect_anomalies

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", "..", ".."))
SYNTHETIC_DIR = os.path.join(WORKSPACE_ROOT, "data", "synthetic")
ORIGINAL_DIR = os.path.join(WORKSPACE_ROOT, "data", "original")

def test_indian_amount_parsing_to_paise():
    """Verify that rupees and paise are converted to exact integer paise without float drift."""
    assert parse_indian_amount_to_paise("1,23,456.78") == 12345678
    assert parse_indian_amount_to_paise("₹80,000.00") == 8000000
    assert parse_indian_amount_to_paise("5000") == 500000
    assert parse_indian_amount_to_paise("(150.50)") == -15050
    assert parse_indian_amount_to_paise("2000.00 DR") == -200000
    assert parse_indian_amount_to_paise("2000.00 CR") == 200000

def test_aarav_hdfc_reconciliation():
    """Verify that Aarav HDFC CSV parses all rows and passes balance reconciliation."""
    csv_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(csv_path, encoding="utf-8") as f:
        res = parse_csv_statement(f.read())

    assert res["rows_detected"] == 75
    assert res["reconciliation_status"] == "PASSED"
    assert res["opening_balance_minor"] == 4500000
    assert res["closing_balance_minor"] > 0

def test_deduplication_idempotence():
    """Assert that uploading overlapping/identical statements merges duplicates."""
    csv_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(csv_path, encoding="utf-8") as f:
        res = parse_csv_statement(f.read())
    
    txns = res["transactions"]
    to_insert, merged_count = deduplicate_transactions(txns, txns, "acct_hdfc")
    assert to_insert == []
    assert merged_count == len(txns)

def test_internal_transfer_pairing():
    """Assert that offsetting transactions between HDFC and SBI are paired and netted."""
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    sbi_path = os.path.join(SYNTHETIC_DIR, "aarav", "sbi_statement.csv")
    
    with open(hdfc_path, encoding="utf-8") as f1, open(sbi_path, encoding="utf-8") as f2:
        hdfc_txns = parse_csv_statement(f1.read())["transactions"]
        sbi_txns = parse_csv_statement(f2.read())["transactions"]

    for t in hdfc_txns:
        t["account_id"] = "hdfc_acct"
    for t in sbi_txns:
        t["account_id"] = "sbi_acct"

    all_txns = hdfc_txns + sbi_txns
    _, paired_count = detect_internal_transfers(all_txns)
    assert paired_count == 8  # Exactly 8 monthly transfers of ₹15,000

def test_categorization_rules():
    """Verify merchant dictionary and keyword categorization."""
    cat_id, source, conf = categorize_transaction("Paid to Swiggy", "SWIGGY", "Swiggy", -45000)
    assert cat_id == "cat_food_dining"
    assert conf >= 0.90

    cat_id, source, conf = categorize_transaction("ACH/SALARY/ACME", "SALARY", "ACME", 7800000)
    assert cat_id == "cat_income_salary"
    assert conf >= 0.85

def test_sufficiency_gate_refusal_on_short_data():
    """Verify that a 60-day statement halts the gate with INSUFFICIENT status."""
    short_path = os.path.join(SYNTHETIC_DIR, "short", "short_statement.csv")
    with open(short_path, encoding="utf-8") as f:
        txns = parse_csv_statement(f.read())["transactions"]

    gate_report = evaluate_data_sufficiency(txns)
    assert gate_report["status"] == "INSUFFICIENT"
    assert len(gate_report["missing_items"]) > 0

def test_recurring_cadence_detection():
    """Verify that monthly rent, salary, and Netflix subscriptions are detected."""
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(hdfc_path, encoding="utf-8") as f:
        txns = parse_csv_statement(f.read())["transactions"]

    recurring = detect_recurring_items(txns)
    merchants = {r["merchant"]: r for r in recurring}

    assert "Netflix" in merchants
    assert merchants["Netflix"]["cadence"] == "monthly"
    assert merchants["Netflix"]["typical_amount_minor"] == 64900
    assert merchants["Netflix"]["confidence"] >= 0.90

def test_anomaly_detection():
    """Verify that seeded large outlier and duplicate charges are flagged."""
    hdfc_path = os.path.join(SYNTHETIC_DIR, "aarav", "hdfc_statement.csv")
    with open(hdfc_path, encoding="utf-8") as f:
        txns = parse_csv_statement(f.read())["transactions"]

    anomalies = detect_anomalies(txns)
    types = [a["type"] for a in anomalies]

    assert "large_amount" in types
    assert "duplicate_charge" in types

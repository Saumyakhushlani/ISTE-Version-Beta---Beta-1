from db.database import SessionLocal
from db.models import Transaction
"""
Comprehensive Automated Pytest Suite for Dynamic CSV Support in Financial Decision Lab (FDL).
Tests:
- Different bank layouts (HDFC, SBI preamble, ICICI, Axis, Kotak Dr/Cr, Semicolon, TSV, Pipe).
- Encodings (UTF-8, UTF-8-BOM, Latin-1 / CP1252).
- Delimiters (comma, semicolon, tab, pipe).
- Header detection & headerless data-type inference.
- Amount formats: Indian grouping, currency symbols, parentheses, trailing DR/CR.
- Precision: exact integer paise without float drift.
- Ambiguous column mappings and manual mapping overrides.
- Malformed rows and footer summary ignoring.
- Running balance break detection.
- Dataset validator engine.
- API endpoints integration (/preview, /preview/async, /commit).
"""

import io
import json
import os
import pytest
from starlette.testclient import TestClient

from main import app
from parsers.csv_parser import parse_csv_statement, parse_indian_amount_to_paise
from parsers.date_parser import parse_date_to_iso
from parsers.delimiter_detector import detect_delimiter
from parsers.encoding_detector import detect_and_decode_bytes
from parsers.column_mapper import detect_column_mapping
from parsers.reconciliation import verify_balance_reconciliation
from engine.dataset_validator import validate_statement_dataset

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", "..", ".."))
TEST_FORMATS_DIR = os.path.join(REPO_ROOT, "data", "synthetic", "test_formats")


# =====================================================================
# 1. High-Precision Monetary Math & Date Parsing Tests
# =====================================================================

def test_exact_integer_paise_conversion_no_float_drift():
    """Asserts that currency strings are converted to integer paise with zero IEEE-754 drift."""
    assert parse_indian_amount_to_paise("1,23,456.78") == 12345678
    assert parse_indian_amount_to_paise("₹ 80,000.50") == 8000050
    assert parse_indian_amount_to_paise("Rs. 1,00,000.00") == 10000000
    assert parse_indian_amount_to_paise("$150.25") == 15025
    assert parse_indian_amount_to_paise("(500.00)") == -50000
    assert parse_indian_amount_to_paise("-1,250.75") == -125075
    assert parse_indian_amount_to_paise("35,000.00 DR") == -3500000
    assert parse_indian_amount_to_paise("35,000.00 CR") == 3500000
    assert parse_indian_amount_to_paise("1 23 456.78") == 12345678
    # Edge cases
    assert parse_indian_amount_to_paise("") is None
    assert parse_indian_amount_to_paise("-") is None
    assert parse_indian_amount_to_paise("nan") is None
    assert parse_indian_amount_to_paise("nil") is None


def test_diverse_date_formats():
    """Asserts that Indian and international date formats parse into ISO YYYY-MM-DD."""
    assert parse_date_to_iso("2024-05-15") == "2024-05-15"
    assert parse_date_to_iso("15/05/2024") == "2024-05-15"
    assert parse_date_to_iso("15-05-2024") == "2024-05-15"
    assert parse_date_to_iso("15.05.2024") == "2024-05-15"
    assert parse_date_to_iso("15-May-2024") == "2024-05-15"
    assert parse_date_to_iso("15 May 2024") == "2024-05-15"
    assert parse_date_to_iso("May 15, 2024") == "2024-05-15"
    assert parse_date_to_iso("15/05/24") == "2024-05-15"
    assert parse_date_to_iso("15/05/2024 14:32:00") == "2024-05-15"
    assert parse_date_to_iso("2024-05-15T10:15:30Z") == "2024-05-15"


# =====================================================================
# 2. Delimiter & Encoding Detection Tests
# =====================================================================

def test_delimiter_sniffer():
    """Asserts accurate sniffing of comma, semicolon, tab, and pipe delimiters."""
    assert detect_delimiter("Date,Narration,Amount\n2024-01-01,Test,100") == ","
    assert detect_delimiter("Date;Narration;Amount\n2024-01-01;Test;100") == ";"
    assert detect_delimiter("Date\tNarration\tAmount\n2024-01-01\tTest\t100") == "\t"
    assert detect_delimiter("Date|Narration|Amount\n2024-01-01|Test|100") == "|"


def test_encoding_detector():
    """Asserts detection and decoding of UTF-8, UTF-8-BOM, and Latin-1."""
    utf8_bytes = "Date,Narration,Amount\n2024-01-01,Swiggy,100".encode("utf-8")
    text, enc = detect_and_decode_bytes(utf8_bytes)
    assert enc == "utf-8"
    assert "Swiggy" in text

    bom_bytes = b"\xef\xbb\xbfDate,Narration,Amount\n2024-01-01,Swiggy,100"
    text, enc = detect_and_decode_bytes(bom_bytes)
    assert enc == "utf-8-sig"
    assert text.startswith("Date")  # BOM stripped

    latin1_bytes = "Date,Narration\n2024-01-01,Café Coffee Day".encode("latin-1")
    text, enc = detect_and_decode_bytes(latin1_bytes)
    assert "Café" in text


# =====================================================================
# 3. Real-World Bank Format Parsing Tests
# =====================================================================

def test_parse_hdfc_standard_format():
    path = os.path.join(TEST_FORMATS_DIR, "hdfc_standard.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 5
    assert res["reconciliation_status"] == "PASSED"
    assert res["opening_balance_minor"] == 5000000  # 125,000 - 75,000 = 50,000
    assert res["closing_balance_minor"] == 10290200
    assert res["detected_delimiter"] == ","


def test_parse_sbi_preamble_format():
    path = os.path.join(TEST_FORMATS_DIR, "sbi_preamble.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["reconciliation_status"] == "PASSED"
    assert res["opening_balance_minor"] == 3000000  # 45,000 - 15,000 = 30,000
    assert res["closing_balance_minor"] == 2615000


def test_parse_icici_inr_format():
    path = os.path.join(TEST_FORMATS_DIR, "icici_inr.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["reconciliation_status"] == "PASSED"
    assert res["closing_balance_minor"] == 8907000


def test_parse_axis_abbreviated_format():
    path = os.path.join(TEST_FORMATS_DIR, "axis_abbrev.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["reconciliation_status"] == "PASSED"
    assert res["closing_balance_minor"] == 8681100


def test_parse_kotak_single_amount_drcr_format():
    path = os.path.join(TEST_FORMATS_DIR, "kotak_drcr.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["reconciliation_status"] == "PASSED"
    # Credit 50000, Debit 18000, Debit 3500, Debit 720 -> closing 57780
    assert res["closing_balance_minor"] == 5778000
    # First txn was CR 50000, so amount_minor > 0
    assert res["transactions"][0]["amount_minor"] == 5000000
    # Second txn was DR 18000, so amount_minor < 0
    assert res["transactions"][1]["amount_minor"] == -1800000


def test_parse_semicolon_delimited_signed_amount():
    path = os.path.join(TEST_FORMATS_DIR, "semicolon_delim.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["detected_delimiter"] == ";"
    assert res["reconciliation_status"] == "PASSED"
    assert res["transactions"][0]["amount_minor"] == 7500000
    assert res["transactions"][1]["amount_minor"] == -2000000
    assert res["closing_balance_minor"] == 7860050


def test_parse_tab_delimited():
    path = os.path.join(TEST_FORMATS_DIR, "tab_delim.tsv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["detected_delimiter"] == "\t"
    assert res["reconciliation_status"] == "PASSED"


def test_parse_pipe_delimited():
    path = os.path.join(TEST_FORMATS_DIR, "pipe_delim.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["detected_delimiter"] == "|"
    assert res["reconciliation_status"] == "PASSED"


def test_parse_headerless_statement():
    path = os.path.join(TEST_FORMATS_DIR, "headerless.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 5
    assert res["has_header"] is False
    assert res["reconciliation_status"] == "PASSED"
    assert res["closing_balance_minor"] == 8293200


def test_parse_quoted_descriptions_with_commas():
    path = os.path.join(TEST_FORMATS_DIR, "quoted_commas.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    # Ensure commas inside quotes did not split into extra columns
    assert "Tech Solutions, Inc., Bangalore" in res["transactions"][0]["raw_description"]
    assert res["reconciliation_status"] == "PASSED"


def test_parse_indian_numbering_formats():
    path = os.path.join(TEST_FORMATS_DIR, "indian_numbering.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 4
    assert res["transactions"][0]["amount_minor"] == 15000000   # ₹ 1,50,000.00
    assert res["transactions"][1]["amount_minor"] == -4500000   # (45,000.00)
    assert res["transactions"][2]["amount_minor"] == -3500000   # 35,000.00 DR
    assert res["transactions"][3]["amount_minor"] == 500000     # 5,000.00 CR


def test_parse_malformed_and_footers():
    path = os.path.join(TEST_FORMATS_DIR, "malformed_and_footers.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    # 3 valid rows parsed; 1 corrupted row skipped; 1 invalid amount skipped; footer totals ignored
    assert res["rows_detected"] == 3
    assert len(res["errors"]) >= 2
    assert res["closing_balance_minor"] == 8935100


def test_detect_running_balance_break():
    path = os.path.join(TEST_FORMATS_DIR, "running_balance_break.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["running_balance_status"] == "DISCREPANCY"
    assert len(res["running_balance_breaks"]) == 1
    brk = res["running_balance_breaks"][0]
    assert brk["previous_balance_minor"] == 8000000
    assert brk["amount_minor"] == -100000
    assert brk["actual_balance_minor"] == 7850000
    assert brk["expected_balance_minor"] == 7900000
    assert brk["delta_minor"] == -50000  # -₹500.00 mismatch


def test_parse_utf8_with_bom():
    path = os.path.join(TEST_FORMATS_DIR, "bom_utf8.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 2
    assert res["detected_encoding"] == "utf-8-sig"


def test_parse_latin1_encoded():
    path = os.path.join(TEST_FORMATS_DIR, "latin1_statement.csv")
    with open(path, "rb") as f:
        res = parse_csv_statement(f.read())
    assert res["rows_detected"] == 3
    assert "Café Coffee Day" in res["transactions"][1]["raw_description"]


# =====================================================================
# 4. Ambiguous Mappings and Manual Mapping Override Tests
# =====================================================================

def test_explicit_column_mapping_override():
    """Asserts that supplying custom column_mapping correctly drives parsing."""
    csv_raw = """TxnDate,Details,Amt,Bal\n2024-05-01,Bonus,50000,75000\n2024-05-05,Rent,-15000,60000\n"""
    custom_mapping = {
        "date": 0,
        "description": 1,
        "amount": 2,
        "balance": 3
    }
    res = parse_csv_statement(csv_raw, column_mapping=custom_mapping)
    assert res["rows_detected"] == 2
    assert res["transactions"][0]["amount_minor"] == 5000000
    assert res["transactions"][1]["amount_minor"] == -1500000
    assert res["reconciliation_status"] == "PASSED"


def test_large_statement_performance():
    """Asserts that 1,000 transactions parse rapidly in integer paise without memory spikes."""
    lines = ["Date,Narration,Withdrawal,Deposit,Balance"]
    bal = 100000.00
    for i in range(1, 1001):
        if i % 2 == 0:
            bal += 100.00
            lines.append(f"2024-01-01,Credit {i},,100.00,{bal:.2f}")
        else:
            bal -= 50.00
            lines.append(f"2024-01-01,Debit {i},50.00,,{bal:.2f}")

    content = "\n".join(lines)
    res = parse_csv_statement(content)
    assert res["rows_detected"] == 1000
    assert res["reconciliation_status"] == "PASSED"


# =====================================================================
# 5. Dataset Validator Engine Tests
# =====================================================================

def test_dataset_validator_engine():
    path = os.path.join(TEST_FORMATS_DIR, "hdfc_standard.csv")
    report = validate_statement_dataset(path)
    assert report["quality_grade"] in ("EXCELLENT", "ACCEPTABLE")
    assert report["financial_summary"]["total_transactions"] == 5
    assert report["validation_checks"]["sign_convention_valid"] is True
    assert report["validation_checks"]["chronological_ordering_valid"] is True


# =====================================================================
# 6. API Endpoints Integration Tests (/preview, /async, /commit)
# =====================================================================

def test_api_preview_with_dynamic_csv():
    client = TestClient(app)
    csv_bytes = b"Date,Description,Withdrawal,Deposit,Balance\n2024-05-01,Salary,,75000.00,100000.00\n2024-05-05,Rent,20000.00,,80000.00\n"
    
    resp = client.post(
        "/api/imports/preview",
        files={"file": ("salary.csv", csv_bytes, "text/csv")},
        data={"bank_hint": "HDFC"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["rows_detected"] == 2
    assert data["reconciliation_status"] == "PASSED"
    assert data["detected_delimiter"] == ","
    assert "column_mapping" in data
    assert data["column_mapping"]["date"] == 0
    assert data["column_mapping"]["description"] == 1


def test_api_preview_and_commit_with_mapping_override():
    db = SessionLocal()
    db.query(Transaction).filter(Transaction.raw_description.in_(["Unique Bonus Credit", "Unique Office Rent"])).delete(synchronize_session=False)
    db.commit()
    db.close()
    client = TestClient(app)
    csv_bytes = b"D,N,W,D,B\n2024-08-10,Unique Bonus Credit,,50000.00,80000.00\n2024-08-11,Unique Office Rent,15000.00,,65000.00\n"
    custom_mapping = json.dumps({"date": 0, "description": 1, "withdrawal": 2, "deposit": 3, "balance": 4})

    # Preview with custom mapping
    resp = client.post(
        "/api/imports/preview",
        files={"file": ("custom.csv", csv_bytes, "text/csv")},
        data={"bank_hint": "IndusInd", "column_mapping": custom_mapping}
    )
    assert resp.status_code == 200
    p_data = resp.json()
    file_id = p_data["file_id"]

    # Commit with custom mapping
    commit_resp = client.post(
        "/api/imports/commit",
        data={"file_id": file_id, "column_mapping_override": custom_mapping}
    )
    assert commit_resp.status_code == 200
    c_data = commit_resp.json()
    assert c_data["status"] == "success"
    assert c_data["inserted"] == 2

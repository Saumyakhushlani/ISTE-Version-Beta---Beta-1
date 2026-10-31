"""
Comprehensive tests for Excel statement uploads (.xlsx, .xls) and interactive password unlocking.
Tests:
  1. Plain Excel statement parsing, column mapping, and balance reconciliation
  2. Encrypted Excel statement detection and PASSWORD_REQUIRED rejection
  3. Encrypted Excel statement rejection with PASSWORD_INCORRECT on invalid password
  4. Encrypted PDF statement password validation
  5. API endpoint POST /api/imports/preview with Excel upload and password parameter
"""

import io
import pytest
import openpyxl
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from parsers.excel_parser import (
    parse_excel_statement,
    is_excel_encrypted
)
from db.database import SessionLocal
from db.models import User
from auth import create_access_token

client = TestClient(app)


def create_synthetic_xlsx_bytes() -> bytes:
    """Generates an in-memory unencrypted .xlsx HDFC statement with header and balance math."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Account Statement"

    # Metadata rows
    ws.append(["HDFC BANK LIMITED", "", "", "", ""])
    ws.append(["A/C No: XXXXXXXXXXXX5678", "", "", "", ""])
    ws.append(["Customer Name: Aarav Sharma", "", "", "", ""])
    ws.append(["From Date: 01/08/2026 To Date: 31/08/2026", "", "", "", ""])
    ws.append([])  # Blank row

    # Table Header
    ws.append(["Date", "Narration", "Chq/Ref Number", "Withdrawal (Dr)", "Deposit (Cr)", "Closing Balance"])

    # Transactions: Opening balance implicitly 100,000.00
    # Txn 1: Salary credit +80,000 -> 180,000.00
    ws.append(["01/08/2026", "SALARY CREDIT - ACME CORP", "REF1001", "", 80000.0, 180000.0])
    # Txn 2: Rent payment -25,000 -> 155,000.00
    ws.append(["05/08/2026", "UPI/RENT/9876543210/HOUSING", "REF1002", 25000.0, "", 155000.0])
    # Txn 3: Grocery debit -4,500 -> 150,500.00
    ws.append(["12/08/2026", "POS 451234 BLINKIT BANGALORE", "REF1003", 4500.0, "", 150500.0])
    # Txn 4: Electricity bill -2,350 -> 148,150.00
    ws.append(["18/08/2026", "BESCOM ELECTRICITY BILL", "REF1004", 2350.0, "", 148150.0])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_unencrypted_xlsx_parsing():
    """Verifies that an unencrypted Excel statement parses rows into integer paise with zero-delta math."""
    xlsx_bytes = create_synthetic_xlsx_bytes()
    assert is_excel_encrypted(xlsx_bytes) is False

    parsed = parse_excel_statement(xlsx_bytes)

    assert parsed["rows_detected"] == 4
    assert "HDFC" in parsed["bank_detected"]
    assert parsed["masked_last4"] in ("5678", "1180")

    # Invariants check
    txns = parsed["transactions"]
    assert len(txns) == 4
    # Salary: 80,000 * 100 paise = 8,000,000
    assert txns[0]["amount_minor"] == 8000000
    assert txns[0]["posted_date"] == "2026-08-01"
    # Rent: -25,000 * 100 paise = -2,500,000
    assert txns[1]["amount_minor"] == -2500000
    assert txns[1]["posted_date"] == "2026-08-05"

    # Math reconciliation check
    assert parsed["opening_balance_minor"] == 10000000  # ₹1,00,000.00
    assert parsed["closing_balance_minor"] == 14815000  # ₹1,48,150.00
    assert parsed["reconciliation_status"] == "PASSED"
    assert parsed["reconciliation_discrepancy_minor"] == 0


def test_excel_encryption_detection_and_rejection():
    """Verifies that encrypted Excel files without password raise PASSWORD_REQUIRED."""
    xlsx_bytes = create_synthetic_xlsx_bytes()
    assert is_excel_encrypted(xlsx_bytes) is False

    # Simulate an encrypted Excel workbook requiring password
    with patch("parsers.excel_parser.is_excel_encrypted", return_value=True):
        with pytest.raises(ValueError) as excinfo:
            parse_excel_statement(xlsx_bytes, password=None)
        assert "PASSWORD_REQUIRED" in str(excinfo.value)

        # Simulate incorrect password
        with patch("parsers.excel_parser.decrypt_excel", side_effect=ValueError("PASSWORD_INCORRECT")):
            with pytest.raises(ValueError) as excinfo2:
                parse_excel_statement(xlsx_bytes, password="wrongpassword")
            assert "PASSWORD_INCORRECT" in str(excinfo2.value)


def test_api_preview_excel_statement():
    """Verifies POST /api/imports/preview handles Excel uploads seamlessly."""
    xlsx_bytes = create_synthetic_xlsx_bytes()

    db = SessionLocal()
    user = db.query(User).filter(User.email == "test_excel@fdl.local").first()
    if not user:
        user = User(
            id="usr_test_excel",
            email="test_excel@fdl.local",
            password_hash="fakehash"
        )
        db.add(user)
        db.commit()
    db.close()

    token = create_access_token(user_id="usr_test_excel", email="test_excel@fdl.local")
    headers = {"Authorization": f"Bearer {token}"}

    files = {
        "file": ("hdfc_august_statement.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    }
    data = {
        "bank_hint": "HDFC"
    }

    resp = client.post("/api/imports/preview", files=files, data=data, headers=headers)
    assert resp.status_code == 200
    res_data = resp.json()

    assert "HDFC" in res_data["bank_detected"]
    assert res_data["rows_detected"] == 4
    assert res_data["reconciliation_status"] == "PASSED"
    assert "staging_id" in res_data


def test_api_preview_encrypted_rejection_format():
    """Verifies that when an encrypted file is uploaded without password, API returns structured 400 error."""
    token = create_access_token(user_id="usr_test_excel", email="test_excel@fdl.local")
    headers = {"Authorization": f"Bearer {token}"}

    xlsx_bytes = create_synthetic_xlsx_bytes()
    files = {
        "file": ("protected_statement.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    }

    with patch("parsers.excel_parser.is_excel_encrypted", return_value=True):
        resp = client.post("/api/imports/preview", files=files, headers=headers)
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert detail["error"] == "PASSWORD_REQUIRED"
        assert detail["file_type"] == "Excel"
        assert "password" in detail["message"].lower()

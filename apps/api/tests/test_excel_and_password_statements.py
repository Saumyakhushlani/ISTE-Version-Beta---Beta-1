"""
Comprehensive tests for Excel statement uploads (.xlsx, .xls) and interactive password unlocking.
Tests:
  1. Plain Excel statement parsing, column mapping, and balance reconciliation
  2. Encrypted Excel statement detection and PASSWORD_REQUIRED rejection
  3. Real msoffcrypto encrypted Excel statement rejection with PASSWORD_INCORRECT on invalid password
  4. Real msoffcrypto encrypted Excel statement decryption with correct password
  5. API endpoint POST /api/imports/preview with real encrypted Excel upload (without pass, wrong pass, correct pass)
  6. API endpoint POST /api/imports/commit for decrypted Excel statement
"""

import io
import pytest
import openpyxl
import msoffcrypto
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from parsers.excel_parser import (
    parse_excel_statement,
    is_excel_encrypted,
    decrypt_excel
)
from db.database import SessionLocal
from db.models import User, Account, Transaction
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


def create_encrypted_xlsx_bytes(password: str = "Hdfc@2026") -> bytes:
    """Generates a genuinely password-encrypted .xlsx workbook using msoffcrypto."""
    plain_bytes = create_synthetic_xlsx_bytes()
    enc_stream = io.BytesIO()
    office_file = msoffcrypto.OfficeFile(io.BytesIO(plain_bytes))
    office_file.encrypt(password, enc_stream)
    return enc_stream.getvalue()


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


def test_real_encrypted_xlsx_detection_and_rejection():
    """Verifies that a real encrypted Excel file triggers PASSWORD_REQUIRED and PASSWORD_INCORRECT accurately."""
    enc_bytes = create_encrypted_xlsx_bytes("Hdfc@2026")
    assert is_excel_encrypted(enc_bytes) is True

    # 1. Parse without password -> PASSWORD_REQUIRED
    with pytest.raises(ValueError) as excinfo:
        parse_excel_statement(enc_bytes, password=None)
    assert "PASSWORD_REQUIRED" in str(excinfo.value)

    # 2. Parse with wrong password -> PASSWORD_INCORRECT
    with pytest.raises(ValueError) as excinfo2:
        parse_excel_statement(enc_bytes, password="WrongPassword999")
    assert "PASSWORD_INCORRECT" in str(excinfo2.value)

    # 3. Parse with correct password -> Success
    parsed = parse_excel_statement(enc_bytes, password="Hdfc@2026")
    assert parsed["rows_detected"] == 4
    assert "HDFC" in parsed["bank_detected"]
    assert parsed["reconciliation_status"] == "PASSED"


def test_api_preview_real_encrypted_excel_workflow():
    """Verifies end-to-end API preview workflow for password protected Excel."""
    enc_bytes = create_encrypted_xlsx_bytes("Hdfc@2026")

    db = SessionLocal()
    user = db.query(User).filter(User.email == "test_excel_enc@fdl.local").first()
    if not user:
        user = User(
            id="usr_test_excel_enc",
            email="test_excel_enc@fdl.local",
            password_hash="fakehash"
        )
        db.add(user)
        db.commit()

    # Clean up prior test accounts/transactions for clean run
    acct_ids = [a.id for a in db.query(Account).filter_by(user_id=user.id).all()]
    if acct_ids:
        db.query(Transaction).filter(Transaction.account_id.in_(acct_ids)).delete(synchronize_session=False)
        db.query(Account).filter(Account.user_id == user.id).delete(synchronize_session=False)
        db.commit()
    db.close()

    token = create_access_token(user_id="usr_test_excel_enc", email="test_excel_enc@fdl.local")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload without password -> 400 PASSWORD_REQUIRED
    resp1 = client.post(
        "/api/imports/preview",
        files={"file": ("hdfc_secure.xlsx", enc_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=headers
    )
    assert resp1.status_code == 400
    detail1 = resp1.json()["detail"]
    assert detail1["error"] == "PASSWORD_REQUIRED"
    assert detail1["file_type"] == "Excel"
    assert "password" in detail1["message"].lower()

    # 2. Upload with incorrect password -> 400 PASSWORD_INCORRECT
    resp2 = client.post(
        "/api/imports/preview",
        files={"file": ("hdfc_secure.xlsx", enc_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"password": "WrongPassword999"},
        headers=headers
    )
    assert resp2.status_code == 400
    detail2 = resp2.json()["detail"]
    assert detail2["error"] == "PASSWORD_INCORRECT"
    assert detail2["file_type"] == "Excel"

    # 3. Upload with correct password -> 200 OK
    resp3 = client.post(
        "/api/imports/preview",
        files={"file": ("hdfc_secure.xlsx", enc_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data={"password": "Hdfc@2026"},
        headers=headers
    )
    assert resp3.status_code == 200
    res3 = resp3.json()
    assert res3["rows_detected"] == 4
    assert "HDFC" in res3["bank_detected"]
    assert res3["reconciliation_status"] == "PASSED"
    staging_id = res3["staging_id"]

    # 4. Commit decrypted statement into database
    resp4 = client.post(
        "/api/imports/commit",
        data={"file_id": staging_id},
        headers=headers
    )
    assert resp4.status_code == 200
    commit_res = resp4.json()
    assert commit_res["inserted"] == 4
    assert "account_id" in commit_res

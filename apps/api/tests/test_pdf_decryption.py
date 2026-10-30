"""
Unit tests for password-protected PDF bank statement decryption:
  1. Detects encrypted PDF when password is missing (PASSWORD_REQUIRED).
  2. Detects invalid password (PASSWORD_INCORRECT).
  3. Successfully decrypts and parses when correct password is provided.
"""
import io
import pytest
from pypdf import PdfWriter
from parsers.pdf_parser import parse_pdf_statement

def create_encrypted_sample_pdf(password: str) -> bytes:
    """Helper to create a password-encrypted PDF in memory."""
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    writer.encrypt(user_password=password, owner_password="owner_secret_123")
    stream = io.BytesIO()
    writer.write(stream)
    return stream.getvalue()

def test_encrypted_pdf_requires_password():
    pdf_bytes = create_encrypted_sample_pdf(password="secret123")

    with pytest.raises(ValueError) as excinfo:
        parse_pdf_statement(pdf_bytes, password=None)
    assert "PASSWORD_REQUIRED" in str(excinfo.value)

def test_encrypted_pdf_rejects_wrong_password():
    pdf_bytes = create_encrypted_sample_pdf(password="secret123")

    with pytest.raises(ValueError) as excinfo:
        parse_pdf_statement(pdf_bytes, password="wrong_password")
    assert "PASSWORD_INCORRECT" in str(excinfo.value)

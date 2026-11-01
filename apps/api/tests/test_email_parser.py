"""
Unit tests for Email Alert Parser.
Verifies parsing of the user's exact HDFC UPI transaction alert email,
as well as edge cases, credit alerts, and rejection of non-financial emails.
"""

import pytest
from datetime import datetime
from parsers.email_alert_parser import EmailAlertParser, parse_currency_to_paise, normalize_date_string

def test_currency_and_date_helpers():
    assert parse_currency_to_paise("340.00") == 34000
    assert parse_currency_to_paise("Rs. 1,250.75") == 125075
    assert parse_currency_to_paise("500") == 50000

    assert normalize_date_string("30-10-26") == "2026-10-30"
    assert normalize_date_string("30-10-2026") == "2026-10-30"
    assert normalize_date_string("30/10/2026") == "2026-10-30"
    assert normalize_date_string("30-Oct-2026") == "2026-10-30"

def test_user_hdfc_upi_email_parsing():
    """Tests the exact HDFC UPI alert shown in the user's screenshot."""
    subject = "❗ You have done a UPI txn. Check details!"
    sender = "HDFC Bank InstaAlerts <alerts@hdfcbank.bank.in>"
    body = """Dear Customer,

Greetings from HDFC Bank!

Rs.340.00 is debited from your account ending 2650 towards VPA ******3524@okbizaxis (Mr Deepesh Lodhi) on 30-10-26.

UPI transaction reference no.: 074486320407.

If you did not authorize this transaction, please report it immediately at:
a. When in India (Toll free): 1800 258 6161
b. When abroad: 9122 61606160
c. Or SMS 'BLOCK UPI' to 7308080808.

We're here to support you in every step of the way.

Warm regards,
HDFC Bank
"""
    result = EmailAlertParser.parse_alert(subject, sender, body)
    assert result is not None

    # Invariants verification
    # Golden Rule #1: Integer paise
    # Golden Rule #2: Signed amount (Debit < 0)
    assert result["amount_minor"] == -34000
    assert result["bank"] == "HDFC Bank"
    assert result["account_last4"] == "2650"
    assert result["posted_date"] == "2026-10-30"
    assert result["merchant"] == "Mr Deepesh Lodhi"
    assert result["channel"] == "UPI"
    assert result["reference_number"] == "074486320407"
    assert len(result["fingerprint"]) == 64

def test_rejection_of_non_financial_emails():
    """OTP requests, newsletters, and promotional emails must be rejected."""
    # OTP email
    otp_subject = "Your OTP for NetBanking Login is 123456"
    otp_sender = "HDFC Bank <alerts@hdfcbank.net>"
    otp_body = "123456 is your OTP for login. Do not share with anyone."
    assert EmailAlertParser.parse_alert(otp_subject, otp_sender, otp_body) is None

    # Newsletter / Promo
    promo_subject = "Special festive offer on personal loans"
    promo_sender = "Offers <offers@sbi.co.in>"
    promo_body = "Apply now and get exciting benefits and zero processing fees."
    assert EmailAlertParser.parse_alert(promo_subject, promo_sender, promo_body) is None

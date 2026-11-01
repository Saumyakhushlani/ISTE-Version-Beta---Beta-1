"""
Seed script and auto-provisioning utility for Financial Decision Lab (FDL).
Provides reproducible demo user data (Aarav Kumar & Priya Sharma).
Can be executed as a CLI script or called at startup / on-demand by internal auth.
"""
import os
import sys
from typing import Optional

# Ensure apps/api directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from sqlalchemy.orm import Session
from db.database import init_db, SessionLocal, engine
from db.models import (
    Base, User, UserProfile, Account, SourceFile, Transaction, RecurringItem, Anomaly,
    DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_PASSWORD_HASH,
    PRIYA_USER_ID, PRIYA_USER_EMAIL, PRIYA_USER_PASSWORD_HASH
)
from parsers.csv_parser import parse_csv_statement
from engine.dedupe import detect_internal_transfers
from ml.categorizer import categorize_transaction
from engine.recurring import detect_recurring_items
from engine.anomaly import detect_anomalies

# Embedded statement fallbacks (ensures 100% reliability in serverless / read-only Vercel bundles)
FALLBACK_HDFC_CSV = """Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
2024-08-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100001,2024-08-01,,78000.00,123000.00
2024-08-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100002,2024-08-03,15000.00,,108000.00
2024-08-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100003,2024-08-05,20000.00,,88000.00
2024-08-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100004,2024-08-08,1420.00,,86580.00
2024-08-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100005,2024-08-12,680.00,,85900.00
2024-08-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100006,2024-08-15,649.00,,85251.00
2024-08-18,ACH D-BHARTI AIRTEL LIMITED,ACH100007,2024-08-18,799.00,,84452.00
2024-08-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100008,2024-08-22,520.00,,83932.00
2024-08-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100009,2024-08-25,1850.00,,82082.00
2024-09-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100010,2024-09-01,,78000.00,160082.00
2024-09-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100011,2024-09-03,15000.00,,145082.00
2024-09-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100012,2024-09-05,20000.00,,125082.00
2024-09-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100013,2024-09-08,1420.00,,123662.00
2024-09-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100014,2024-09-12,680.00,,122982.00
2024-09-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100015,2024-09-15,649.00,,122333.00
2024-09-18,ACH D-BHARTI AIRTEL LIMITED,ACH100016,2024-09-18,799.00,,121534.00
2024-09-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100017,2024-09-22,520.00,,121014.00
2024-09-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100018,2024-09-25,1850.00,,119164.00
2024-10-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100019,2024-10-01,,78000.00,197164.00
2024-10-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100020,2024-10-03,15000.00,,182164.00
2024-10-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100021,2024-10-05,20000.00,,162164.00
2024-10-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100022,2024-10-08,1420.00,,160744.00
2024-10-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100023,2024-10-12,680.00,,160064.00
2024-10-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100024,2024-10-15,649.00,,159415.00
2024-10-18,ACH D-BHARTI AIRTEL LIMITED,ACH100025,2024-10-18,799.00,,158616.00
2024-10-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100026,2024-10-22,520.00,,158096.00
2024-10-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100027,2024-10-25,1850.00,,156246.00
2024-11-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100028,2024-11-01,,78000.00,234246.00
2024-11-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100029,2024-11-03,15000.00,,219246.00
2024-11-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100030,2024-11-05,20000.00,,199246.00
2024-11-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100031,2024-11-08,1420.00,,197826.00
2024-11-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100032,2024-11-12,680.00,,197146.00
2024-11-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100033,2024-11-15,649.00,,196497.00
2024-11-18,ACH D-BHARTI AIRTEL LIMITED,ACH100034,2024-11-18,799.00,,195698.00
2024-11-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100035,2024-11-22,520.00,,195178.00
2024-11-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100036,2024-11-25,1850.00,,193328.00
2024-12-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100037,2024-12-01,,78000.00,271328.00
2024-12-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100038,2024-12-03,15000.00,,256328.00
2024-12-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100039,2024-12-05,20000.00,,236328.00
2024-12-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100040,2024-12-08,1420.00,,234908.00
2024-12-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100041,2024-12-12,680.00,,234228.00
2024-12-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100042,2024-12-15,649.00,,233579.00
2024-12-18,ACH D-BHARTI AIRTEL LIMITED,ACH100043,2024-12-18,799.00,,232780.00
2024-12-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100044,2024-12-22,520.00,,232260.00
2024-12-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100045,2024-12-25,1850.00,,230410.00
2025-01-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100046,2025-01-01,,78000.00,308410.00
2025-01-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100047,2025-01-03,15000.00,,293410.00
2025-01-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100048,2025-01-05,20000.00,,273410.00
2025-01-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100049,2025-01-08,1420.00,,271990.00
2025-01-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100050,2025-01-12,680.00,,271310.00
2025-01-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100051,2025-01-15,649.00,,270661.00
2025-01-18,ACH D-BHARTI AIRTEL LIMITED,ACH100052,2025-01-18,799.00,,269862.00
2025-01-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100053,2025-01-22,520.00,,269342.00
2025-01-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100054,2025-01-25,1850.00,,267492.00
2025-02-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100055,2025-02-01,,78000.00,345492.00
2025-02-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100056,2025-02-03,15000.00,,330492.00
2025-02-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100057,2025-02-05,20000.00,,310492.00
2025-02-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100058,2025-02-08,1420.00,,309072.00
2025-02-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100059,2025-02-12,680.00,,308392.00
2025-02-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100060,2025-02-15,649.00,,307743.00
2025-02-18,ACH D-BHARTI AIRTEL LIMITED,ACH100061,2025-02-18,799.00,,306944.00
2025-02-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100062,2025-02-22,520.00,,306424.00
2025-02-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100063,2025-02-25,1850.00,,304574.00
2025-02-14,POS 981249 RELIANCE DIGITAL BANGALORE,POS100064,2025-02-14,18400.00,,286174.00
2025-03-01,ACH/SALARY/TECH SOLUTIONS PVT LTD,ACH100065,2025-03-01,,78000.00,364174.00
2025-03-03,NEFT-OWN A/C FUND TRF TO SBI 4421,NEFT100066,2025-03-03,15000.00,,349174.00
2025-03-05,UPI-RENT PAYMENT-MR SHARMA-sharma@icici,UPI100067,2025-03-05,20000.00,,329174.00
2025-03-08,UPI-BLINKIT-blinkit@icici-ORDER1928,UPI100068,2025-03-08,1420.00,,327754.00
2025-03-12,UPI-SWIGGY-swiggy@hdfcbank-FOOD482,UPI100069,2025-03-12,680.00,,327074.00
2025-03-15,POS 412938 NETFLIX ENTERTAINMENT MUMBAI,POS100070,2025-03-15,649.00,,326425.00
2025-03-18,ACH D-BHARTI AIRTEL LIMITED,ACH100071,2025-03-18,799.00,,325626.00
2025-03-22,UPI-ZOMATO-zomato@hdfcbank-MEAL910,UPI100072,2025-03-22,520.00,,325106.00
2025-03-25,UPI-ZEPTO-zepto@axisbank-GROC391,UPI100073,2025-03-25,1850.00,,323256.00
2025-03-12,POS 882103 GADGET ACCESSORIES BANGALORE,POS100074,2025-03-12,2499.00,,320757.00
2025-03-12,POS 882103 GADGET ACCESSORIES BANGALORE,POS100075,2025-03-12,2499.00,,318258.00"""

FALLBACK_SBI_CSV = """Txn Date,Description,Ref No,Debit,Credit,Balance
2024-08-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500001,,15000.00,35000.00
2024-08-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500002,7500.00,,27500.00
2024-08-12,NACH-ZERODHA BROKING LTD SIP,NACH500003,5000.00,,22500.00
2024-09-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500004,,15000.00,37500.00
2024-09-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500005,7500.00,,30000.00
2024-09-12,NACH-ZERODHA BROKING LTD SIP,NACH500006,5000.00,,25000.00
2024-10-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500007,,15000.00,40000.00
2024-10-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500008,7500.00,,32500.00
2024-10-12,NACH-ZERODHA BROKING LTD SIP,NACH500009,5000.00,,27500.00
2024-11-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500010,,15000.00,42500.00
2024-11-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500011,7500.00,,35000.00
2024-11-12,NACH-ZERODHA BROKING LTD SIP,NACH500012,5000.00,,30000.00
2024-12-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500013,,15000.00,45000.00
2024-12-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500014,7500.00,,37500.00
2024-12-12,NACH-ZERODHA BROKING LTD SIP,NACH500015,5000.00,,32500.00
2025-01-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500016,,15000.00,47500.00
2025-01-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500017,7500.00,,40000.00
2025-01-12,NACH-ZERODHA BROKING LTD SIP,NACH500018,5000.00,,35000.00
2025-02-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500019,,15000.00,50000.00
2025-02-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500020,7500.00,,42500.00
2025-02-12,NACH-ZERODHA BROKING LTD SIP,NACH500021,5000.00,,37500.00
2025-03-03,NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C,SBIN500022,,15000.00,52500.00
2025-03-10,ACH D-HDFC BANK LTD HOME LOAN EMI,ACH500023,7500.00,,45000.00
2025-03-12,NACH-ZERODHA BROKING LTD SIP,NACH500024,5000.00,,40000.00"""

FALLBACK_ICICI_CSV = """Date,Narration,Reference No,Withdrawal,Deposit,Balance
2024-04-10,NEFT-CLIENT RETENTION BONUS-GLOBAL DESIGNS,REF4001,,120000.00,150000.00
2024-04-15,UPI-RENT PAYMENT-LANDLORD,REF4002,25000.00,,125000.00
2024-10-07,IMPS-INVOICE PAYMENT-STUDIO-2024-10,IMPS202410,,45000.00,170000.00
2024-10-10,UPI-RENT-LANDLORD,UPI2024101,25000.00,,145000.00
2024-10-15,POS ADOBE SYSTEMS INDIA SUBSCRIPTION,POS2024102,4230.00,,140770.00
2024-10-20,UPI-SWIGGY-BLINKIT-LIVING EXPENSES,UPI2024103,12000.00,,128770.00
2024-11-07,IMPS-INVOICE PAYMENT-STUDIO-2024-11,IMPS202411,,110000.00,238770.00
2024-11-10,UPI-RENT-LANDLORD,UPI2024111,25000.00,,213770.00
2024-11-15,POS ADOBE SYSTEMS INDIA SUBSCRIPTION,POS2024112,4230.00,,209540.00
2024-11-20,UPI-SWIGGY-BLINKIT-LIVING EXPENSES,UPI2024113,12000.00,,197540.00
2024-12-07,IMPS-INVOICE PAYMENT-STUDIO-2024-12,IMPS202412,,35000.00,232540.00
2024-12-10,UPI-RENT-LANDLORD,UPI2024121,25000.00,,207540.00
2024-12-15,POS ADOBE SYSTEMS INDIA SUBSCRIPTION,POS2024122,4230.00,,203310.00
2024-12-20,UPI-SWIGGY-BLINKIT-LIVING EXPENSES,UPI2024123,12000.00,,191310.00
2025-01-07,IMPS-INVOICE PAYMENT-STUDIO-2025-01,IMPS202501,,90000.00,281310.00
2025-01-10,UPI-RENT-LANDLORD,UPI2025011,25000.00,,256310.00
2025-01-15,POS ADOBE SYSTEMS INDIA SUBSCRIPTION,POS2025012,4230.00,,252080.00
2025-01-20,UPI-SWIGGY-BLINKIT-LIVING EXPENSES,UPI2025013,12000.00,,240080.00
2025-02-07,IMPS-INVOICE PAYMENT-STUDIO-2025-02,IMPS202502,,40000.00,280080.00
2025-02-10,UPI-RENT-LANDLORD,UPI2025021,25000.00,,255080.00
2025-02-15,POS ADOBE SYSTEMS INDIA SUBSCRIPTION,POS2025022,4230.00,,250850.00
2025-02-20,UPI-SWIGGY-BLINKIT-LIVING EXPENSES,UPI2025023,12000.00,,238850.00
2025-03-07,IMPS-INVOICE PAYMENT-STUDIO-2025-03,IMPS202503,,125000.00,363850.00
2025-03-10,UPI-RENT-LANDLORD,UPI2025031,25000.00,,338850.00
2025-03-15,POS ADOBE SYSTEMS INDIA SUBSCRIPTION,POS2025032,4230.00,,334620.00
2025-03-20,UPI-SWIGGY-BLINKIT-LIVING EXPENSES,UPI2025033,12000.00,,322620.00"""


def _load_csv_content(subpath: str, fallback: str) -> str:
    """Safely loads CSV content from local filesystem with multi-path resolution or falls back to embedded string."""
    candidate_paths = [
        os.path.abspath(os.path.join(current_dir, "data", "synthetic", subpath)),
        os.path.abspath(os.path.join(current_dir, "..", "..", "data", "synthetic", subpath)),
        os.path.abspath(os.path.join(os.getcwd(), "data", "synthetic", subpath)),
        os.path.abspath(os.path.join(os.getcwd(), "apps", "api", "data", "synthetic", subpath)),
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass
    return fallback


def seed_aarav(db: Session) -> User:
    """Seeds Aarav Kumar (Salaried persona) with HDFC and SBI statements."""
    existing_user = db.query(User).filter(
        (User.id == DEMO_USER_ID) | (User.email.ilike(DEMO_USER_EMAIL))
    ).first()

    if existing_user:
        return existing_user

    aarav_user = User(
        id=DEMO_USER_ID,
        email=DEMO_USER_EMAIL,
        password_hash=DEMO_USER_PASSWORD_HASH,
        is_active=True,
        is_onboarded=True
    )
    db.add(aarav_user)
    db.flush()

    aarav_profile = UserProfile(
        user_id=DEMO_USER_ID,
        full_name="Aarav Kumar",
        mobile_number="+91 98765 43210",
        country="India",
        preferred_currency="INR"
    )
    db.add(aarav_profile)
    db.flush()

    # 1. HDFC Account & Statement
    hdfc_content = _load_csv_content(os.path.join("aarav", "hdfc_statement.csv"), FALLBACK_HDFC_CSV)
    hdfc_parsed = parse_csv_statement(hdfc_content)

    hdfc_acct = Account(
        user_id=DEMO_USER_ID,
        nickname="Aarav HDFC Salary Account",
        bank="HDFC Bank",
        type="savings",
        masked_last4="4821",
        opening_balance_minor=hdfc_parsed["opening_balance_minor"] or 4500000,
        currency="INR",
        is_primary=True
    )
    db.add(hdfc_acct)
    db.flush()

    hdfc_source = SourceFile(
        account_id=hdfc_acct.id,
        filename="hdfc_statement.csv",
        kind="csv",
        sha256="seed_hdfc_hash",
        period_start=hdfc_parsed["period_start"],
        period_end=hdfc_parsed["period_end"],
        opening_balance_minor=hdfc_parsed["opening_balance_minor"],
        closing_balance_minor=hdfc_parsed["closing_balance_minor"],
        reconciliation_status=hdfc_parsed["reconciliation_status"]
    )
    db.add(hdfc_source)
    db.flush()

    for t in hdfc_parsed["transactions"]:
        norm_desc = t.get("normalized_description") or t["raw_description"]
        cat_id, source, conf = categorize_transaction(t["raw_description"], norm_desc, t.get("merchant_id", ""), t["amount_minor"])
        db_txn = Transaction(
            account_id=hdfc_acct.id,
            source_file_id=hdfc_source.id,
            source_row=t.get("source_row", 0),
            posted_date=t["posted_date"],
            value_date=t.get("value_date"),
            amount_minor=t["amount_minor"],
            raw_description=t["raw_description"],
            normalized_description=norm_desc,
            channel=t.get("channel", "OTHER"),
            category_id=cat_id,
            category_source=source,
            category_confidence=conf,
            balance_after_minor=t.get("balance_after_minor"),
            fingerprint=f"hdfc_{t['posted_date']}_{t['amount_minor']}_{t.get('source_row', 0)}",
            status="active"
        )
        db.add(db_txn)
    db.flush()

    # 2. SBI Account & Statement
    sbi_content = _load_csv_content(os.path.join("aarav", "sbi_statement.csv"), FALLBACK_SBI_CSV)
    sbi_parsed = parse_csv_statement(sbi_content)

    sbi_acct = Account(
        user_id=DEMO_USER_ID,
        nickname="Aarav SBI Savings & EMI Account",
        bank="State Bank of India",
        type="savings",
        masked_last4="4421",
        opening_balance_minor=sbi_parsed["opening_balance_minor"] or 2000000,
        currency="INR",
        is_primary=False
    )
    db.add(sbi_acct)
    db.flush()

    sbi_source = SourceFile(
        account_id=sbi_acct.id,
        filename="sbi_statement.csv",
        kind="csv",
        sha256="seed_sbi_hash",
        period_start=sbi_parsed["period_start"],
        period_end=sbi_parsed["period_end"],
        opening_balance_minor=sbi_parsed["opening_balance_minor"],
        closing_balance_minor=sbi_parsed["closing_balance_minor"],
        reconciliation_status=sbi_parsed["reconciliation_status"]
    )
    db.add(sbi_source)
    db.flush()

    for t in sbi_parsed["transactions"]:
        norm_desc = t.get("normalized_description") or t["raw_description"]
        cat_id, source, conf = categorize_transaction(t["raw_description"], norm_desc, t.get("merchant_id", ""), t["amount_minor"])
        db_txn = Transaction(
            account_id=sbi_acct.id,
            source_file_id=sbi_source.id,
            source_row=t.get("source_row", 0),
            posted_date=t["posted_date"],
            value_date=t.get("value_date"),
            amount_minor=t["amount_minor"],
            raw_description=t["raw_description"],
            normalized_description=norm_desc,
            channel=t.get("channel", "OTHER"),
            category_id=cat_id,
            category_source=source,
            category_confidence=conf,
            balance_after_minor=t.get("balance_after_minor"),
            fingerprint=f"sbi_{t['posted_date']}_{t['amount_minor']}_{t.get('source_row', 0)}",
            status="active"
        )
        db.add(db_txn)
    db.flush()

    # 3. Detect and link internal transfers
    aarav_txns = db.query(Transaction).filter(
        Transaction.account_id.in_([hdfc_acct.id, sbi_acct.id])
    ).all()
    txn_dicts = [
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
        for t in aarav_txns
    ]
    _, paired_count = detect_internal_transfers(txn_dicts)
    for td in txn_dicts:
        if td.get("is_transfer"):
            t_obj = db.query(Transaction).filter_by(id=td["id"]).first()
            if t_obj:
                t_obj.is_transfer = True
                t_obj.category_id = "cat_transfer"
                t_obj.transfer_pair_id = td.get("transfer_pair_id")
    db.flush()

    # 4. Recurring detection
    rec_items = detect_recurring_items(txn_dicts)
    for r in rec_items:
        r_obj = RecurringItem(
            user_id=DEMO_USER_ID,
            merchant=r["merchant"],
            type=r["type"],
            cadence=r["cadence"],
            typical_amount_minor=r["typical_amount_minor"],
            amount_min_minor=r.get("amount_min_minor", r["typical_amount_minor"]),
            amount_max_minor=r.get("amount_max_minor", r["typical_amount_minor"]),
            last_paid_date=r["last_paid_date"],
            next_expected_date=r["next_expected_date"],
            occurrences=r["occurrences"],
            confidence=r["confidence"],
            status="active",
            user_status="auto"
        )
        db.add(r_obj)
    db.flush()

    # 5. Anomalies detection
    anomalies = detect_anomalies(txn_dicts, rec_items)
    for a in anomalies:
        a_obj = Anomaly(
            txn_id=a["txn_id"],
            type=a["type"],
            rule_id=a["rule_id"],
            amount_minor=a["amount_minor"],
            reason_text=a["reason_text"],
            severity=a["severity"]
        )
        db.add(a_obj)
    db.commit()
    print("Seeded demo user Aarav Kumar successfully.")
    return aarav_user


def seed_priya(db: Session) -> User:
    """Seeds Priya Sharma (Freelancer persona) with ICICI freelance statement."""
    existing_user = db.query(User).filter(
        (User.id == PRIYA_USER_ID) | (User.email.ilike(PRIYA_USER_EMAIL))
    ).first()

    if existing_user:
        return existing_user

    priya_user = User(
        id=PRIYA_USER_ID,
        email=PRIYA_USER_EMAIL,
        password_hash=PRIYA_USER_PASSWORD_HASH,
        is_active=True,
        is_onboarded=True
    )
    db.add(priya_user)
    db.flush()

    priya_profile = UserProfile(
        user_id=PRIYA_USER_ID,
        full_name="Priya Sharma",
        mobile_number="+91 98123 45678",
        country="India",
        preferred_currency="INR"
    )
    db.add(priya_profile)
    db.flush()

    # Ingest ICICI statement
    icici_content = _load_csv_content(os.path.join("priya", "icici_freelance.csv"), FALLBACK_ICICI_CSV)
    icici_parsed = parse_csv_statement(icici_content)

    icici_acct = Account(
        user_id=PRIYA_USER_ID,
        nickname="Priya ICICI Current Account",
        bank="ICICI Bank",
        type="current",
        masked_last4="9012",
        opening_balance_minor=icici_parsed["opening_balance_minor"] or 15000000,
        currency="INR",
        is_primary=True
    )
    db.add(icici_acct)
    db.flush()

    icici_source = SourceFile(
        account_id=icici_acct.id,
        filename="icici_freelance.csv",
        kind="csv",
        sha256="seed_icici_hash",
        period_start=icici_parsed["period_start"],
        period_end=icici_parsed["period_end"],
        opening_balance_minor=icici_parsed["opening_balance_minor"],
        closing_balance_minor=icici_parsed["closing_balance_minor"],
        reconciliation_status=icici_parsed["reconciliation_status"]
    )
    db.add(icici_source)
    db.flush()

    for t in icici_parsed["transactions"]:
        norm_desc = t.get("normalized_description") or t["raw_description"]
        cat_id, source, conf = categorize_transaction(t["raw_description"], norm_desc, t.get("merchant_id", ""), t["amount_minor"])
        db_txn = Transaction(
            account_id=icici_acct.id,
            source_file_id=icici_source.id,
            source_row=t.get("source_row", 0),
            posted_date=t["posted_date"],
            value_date=t.get("value_date"),
            amount_minor=t["amount_minor"],
            raw_description=t["raw_description"],
            normalized_description=norm_desc,
            channel=t.get("channel", "OTHER"),
            category_id=cat_id,
            category_source=source,
            category_confidence=conf,
            balance_after_minor=t.get("balance_after_minor"),
            fingerprint=f"icici_{t['posted_date']}_{t['amount_minor']}_{t.get('source_row', 0)}",
            status="active"
        )
        db.add(db_txn)
    db.flush()

    # Recurring items & anomalies for Priya
    priya_txns = db.query(Transaction).filter_by(account_id=icici_acct.id).all()
    txn_dicts = [
        {
            "id": t.id,
            "account_id": t.account_id,
            "posted_date": t.posted_date,
            "amount_minor": t.amount_minor,
            "raw_description": t.raw_description,
            "normalized_description": t.normalized_description,
            "category_id": t.category_id,
            "is_transfer": False
        }
        for t in priya_txns
    ]

    rec_items = detect_recurring_items(txn_dicts)
    for r in rec_items:
        r_obj = RecurringItem(
            user_id=PRIYA_USER_ID,
            merchant=r["merchant"],
            type=r["type"],
            cadence=r["cadence"],
            typical_amount_minor=r["typical_amount_minor"],
            amount_min_minor=r.get("amount_min_minor", r["typical_amount_minor"]),
            amount_max_minor=r.get("amount_max_minor", r["typical_amount_minor"]),
            last_paid_date=r["last_paid_date"],
            next_expected_date=r["next_expected_date"],
            occurrences=r["occurrences"],
            confidence=r["confidence"],
            status="active",
            user_status="auto"
        )
        db.add(r_obj)
    db.flush()

    anomalies = detect_anomalies(txn_dicts, rec_items)
    for a in anomalies:
        a_obj = Anomaly(
            txn_id=a["txn_id"],
            type=a["type"],
            rule_id=a["rule_id"],
            amount_minor=a["amount_minor"],
            reason_text=a["reason_text"],
            severity=a["severity"]
        )
        db.add(a_obj)
    db.commit()
    print("Seeded demo user Priya Sharma successfully.")
    return priya_user


def ensure_demo_users_seeded(db: Session):
    """Guarantees both demo users (Aarav and Priya) exist in the database with their accounts and transactions."""
    aarav_exists = db.query(User).filter(
        (User.id == DEMO_USER_ID) | (User.email.ilike(DEMO_USER_EMAIL))
    ).first()
    if not aarav_exists:
        try:
            seed_aarav(db)
        except Exception as e:
            print(f"[FDL] Error seeding Aarav: {e}")
            db.rollback()

    priya_exists = db.query(User).filter(
        (User.id == PRIYA_USER_ID) | (User.email.ilike(PRIYA_USER_EMAIL))
    ).first()
    if not priya_exists:
        try:
            seed_priya(db)
        except Exception as e:
            print(f"[FDL] Error seeding Priya: {e}")
            db.rollback()


def seed():
    """Manual full reset and seed for CLI invocation."""
    print("Re-creating database schema with multi-user support...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_demo_users_seeded(db)
        print("Seed complete! Database ready at apps/api/fdl.db")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

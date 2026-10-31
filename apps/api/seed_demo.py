"""
Seed script to ingest Aarav's synthetic bank statements (HDFC CSV + SBI CSV)
into the database for realistic, deterministic dashboard visualization.
Sets up default demo user Aarav Kumar.
"""
import os
import sys

# Ensure apps/api directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from db.database import init_db, SessionLocal, engine
from db.models import (
    Base, User, UserProfile, Account, SourceFile, Transaction, RecurringItem, Anomaly,
    DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_PASSWORD_HASH
)
from parsers.csv_parser import parse_csv_statement
from parsers.bank_detector import detect_bank_and_account
from engine.dedupe import deduplicate_transactions, detect_internal_transfers
from ml.categorizer import categorize_transaction
from engine.recurring import detect_recurring_items
from engine.anomaly import detect_anomalies

def seed():
    print("Re-creating database schema with multi-user support...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    data_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "data", "synthetic", "aarav"))
    hdfc_path = os.path.join(data_dir, "hdfc_statement.csv")
    sbi_path = os.path.join(data_dir, "sbi_statement.csv")

    if not os.path.exists(hdfc_path):
        print(f"Error: {hdfc_path} not found")
        return

    # 0. Create Demo User & Profile (Aarav Kumar)
    aarav_user = User(
        id=DEMO_USER_ID,
        email=DEMO_USER_EMAIL,
        password_hash=DEMO_USER_PASSWORD_HASH,
        is_active=True,
        is_onboarded=True
    )
    db.add(aarav_user)
    db.commit()

    aarav_profile = UserProfile(
        user_id=DEMO_USER_ID,
        full_name="Aarav Kumar",
        mobile_number="+91 98765 43210",
        country="India",
        preferred_currency="INR"
    )
    db.add(aarav_profile)
    db.commit()
    print("Created demo user: Aarav Kumar (aarav.kumar@example.com)")

    # 1. Ingest HDFC statement
    with open(hdfc_path, "r", encoding="utf-8") as f:
        hdfc_content = f.read()

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
    db.commit()
    db.refresh(hdfc_acct)

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
    db.commit()
    db.refresh(hdfc_source)

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
            normalized_description=t.get("normalized_description") or t["raw_description"],
            channel=t.get("channel", "OTHER"),
            category_id=cat_id,
            category_source=source,
            category_confidence=conf,
            balance_after_minor=t.get("balance_after_minor"),
            fingerprint=f"hdfc_{t['posted_date']}_{t['amount_minor']}_{t.get('source_row', 0)}",
            status="active"
        )
        db.add(db_txn)
    db.commit()
    print(f"Ingested {len(hdfc_parsed['transactions'])} HDFC transactions.")

    # 2. Ingest SBI statement
    if os.path.exists(sbi_path):
        with open(sbi_path, "r", encoding="utf-8") as f:
            sbi_content = f.read()

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
        db.commit()
        db.refresh(sbi_acct)

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
        db.commit()
        db.refresh(sbi_source)

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
                normalized_description=t.get("normalized_description") or t["raw_description"],
                channel=t.get("channel", "OTHER"),
                category_id=cat_id,
                category_source=source,
                category_confidence=conf,
                balance_after_minor=t.get("balance_after_minor"),
                fingerprint=f"sbi_{t['posted_date']}_{t['amount_minor']}_{t.get('source_row', 0)}",
                status="active"
            )
            db.add(db_txn)
        db.commit()
        print(f"Ingested {len(sbi_parsed['transactions'])} SBI transactions.")

    # 3. Detect and link internal transfers
    all_db_txns = db.query(Transaction).all()
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
        for t in all_db_txns
    ]
    _, paired_count = detect_internal_transfers(txn_dicts)
    for td in txn_dicts:
        if td.get("is_transfer"):
            t_obj = db.query(Transaction).filter_by(id=td["id"]).first()
            if t_obj:
                t_obj.is_transfer = True
                t_obj.category_id = "cat_transfer"
                t_obj.transfer_pair_id = td.get("transfer_pair_id")
    db.commit()
    print(f"Internal transfers paired: {paired_count}")

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
    db.commit()
    print(f"Recurring items identified: {len(rec_items)}")

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
    print(f"Anomalies flagged: {len(anomalies)}")

    print("Seed complete! Database ready at apps/api/fdl.db")
    db.close()

if __name__ == "__main__":
    seed()

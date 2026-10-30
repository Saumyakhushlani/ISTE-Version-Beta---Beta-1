import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    nickname = Column(String, nullable=False)
    bank = Column(String, nullable=False)
    type = Column(String, nullable=False)  # savings, current, credit_card, etc.
    masked_last4 = Column(String(4), nullable=False)
    opening_balance_minor = Column(BigInteger, default=0)
    currency = Column(String, default="INR")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")

class SourceFile(Base):
    __tablename__ = "source_files"

    id = Column(String, primary_key=True, default=generate_uuid)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    filename = Column(String, nullable=False)
    kind = Column(String, nullable=False)  # csv | pdf
    sha256 = Column(String, nullable=False)
    period_start = Column(String, nullable=True)
    period_end = Column(String, nullable=True)
    opening_balance_minor = Column(BigInteger, nullable=True)
    closing_balance_minor = Column(BigInteger, nullable=True)
    reconciliation_status = Column(String, default="unverified")
    parse_report_json = Column(Text, nullable=True)
    imported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    source_file_id = Column(String, ForeignKey("source_files.id"), nullable=True)
    source_row = Column(Integer, default=0)
    posted_date = Column(String, nullable=False)  # YYYY-MM-DD
    value_date = Column(String, nullable=True)
    amount_minor = Column(BigInteger, nullable=False)  # signed: debit < 0, credit > 0
    currency = Column(String, default="INR")
    raw_description = Column(Text, nullable=False)
    normalized_description = Column(String, nullable=False)
    channel = Column(String, default="OTHER")
    merchant_id = Column(String, nullable=True)
    category_id = Column(String, nullable=False, default="cat_uncategorized")
    category_source = Column(String, default="rule")
    category_confidence = Column(Float, default=1.0)
    balance_after_minor = Column(BigInteger, nullable=True)
    fingerprint = Column(String, nullable=False)
    occurrence_index = Column(Integer, default=1)
    is_transfer = Column(Boolean, default=False)
    transfer_pair_id = Column(String, nullable=True)
    dup_group_id = Column(String, nullable=True)
    merged_from_json = Column(Text, nullable=True)
    status = Column(String, default="active")  # active | merged | excluded
    user_override_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    account = relationship("Account", back_populates="transactions")

    __table_args__ = (
        Index("idx_txns_account_date", "account_id", "posted_date"),
        Index("idx_txns_fingerprint", "fingerprint"),
        Index("idx_txns_merchant", "merchant_id"),
    )

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    parent_id = Column(String, nullable=True)
    kind = Column(String, nullable=False)  # income | essential | committed | discretionary | system
    color = Column(String, default="#64748b")

class RecurringItem(Base):
    __tablename__ = "recurring_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    merchant = Column(String, nullable=False)
    type = Column(String, nullable=False)  # subscription | emi | rent | utility | insurance | sip | salary
    cadence = Column(String, nullable=False)  # monthly | weekly | etc.
    typical_amount_minor = Column(BigInteger, nullable=False)
    amount_min_minor = Column(BigInteger, nullable=False)
    amount_max_minor = Column(BigInteger, nullable=False)
    last_paid_date = Column(String, nullable=False)
    next_expected_date = Column(String, nullable=False)
    occurrences = Column(Integer, default=1)
    confidence = Column(Float, default=0.8)
    status = Column(String, default="active")
    user_status = Column(String, default="auto")  # auto | confirmed | rejected
    is_manual = Column(Boolean, default=False)

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, default=generate_uuid)
    txn_id = Column(String, ForeignKey("transactions.id"), nullable=False)
    type = Column(String, nullable=False)
    rule_id = Column(String, nullable=False)
    amount_minor = Column(BigInteger, nullable=False)
    reason_text = Column(Text, nullable=False)
    severity = Column(String, default="medium")  # low | medium | high
    user_feedback = Column(String, default="none")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class CorrectionLog(Base):
    __tablename__ = "correction_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    ts = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    action = Column(String, nullable=False)
    scope = Column(String, nullable=False)
    affected_txn_ids_json = Column(Text, nullable=False)
    before_json = Column(Text, nullable=False)
    after_json = Column(Text, nullable=False)
    undone_at = Column(DateTime, nullable=True)

class ForecastSnapshot(Base):
    __tablename__ = "forecast_snapshots"

    id = Column(String, primary_key=True, default=generate_uuid)
    ts = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    asof_date = Column(String, nullable=False)
    engine_version = Column(String, default="1.0.0")
    seed = Column(Integer, nullable=False)
    params_json = Column(Text, nullable=False)
    input_hash = Column(String, nullable=False)
    outputs_json = Column(Text, nullable=False)
    ledger_json = Column(Text, nullable=False)
    confidence_json = Column(Text, nullable=False)
    gate_status = Column(String, default="OK")

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    base_snapshot_id = Column(String, ForeignKey("forecast_snapshots.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    active = Column(Boolean, default=True)

class ScenarioAdjustment(Base):
    __tablename__ = "scenario_adjustments"

    id = Column(String, primary_key=True, default=generate_uuid)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    seq = Column(Integer, default=0)
    type = Column(String, nullable=False)  # cancel_recurring, emi, delay_purchase, income_shock, etc.
    params_json = Column(Text, nullable=False)

class EgressLog(Base):
    __tablename__ = "egress_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    ts = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    purpose = Column(String, nullable=False)
    payload_json = Column(Text, nullable=False)
    mode = Column(String, default="local")
    destination = Column(String, default="none")

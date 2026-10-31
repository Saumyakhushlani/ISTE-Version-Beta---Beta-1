# Database Architecture & Schema Audit — Financial Decision Lab (FDL)

**Audit Date**: October 2026  
**Auditor**: Senior Database Architect & Backend Engineer  
**Database Engine**: SQLite 3  
**ORM Layer**: SQLAlchemy 2.1.6  
**Default Database File**: `apps/api/fdl.db` (configurable via `DATABASE_URL`)  

---

## 1. Schema Specifications & Field Dictionary

The database schema is defined in `apps/api/db/models.py` and comprises **10 relational tables**:

### 1.1 Table Dictionary

| Table Name | Primary Key | Foreign Keys | Key Indexes | Description |
|---|---|---|---|---|
| `accounts` | `id` (`String` UUID) | None | PK | User bank accounts, credit cards, or wallets. |
| `source_files` | `id` (`String` UUID) | `account_id` $\rightarrow$ `accounts.id` | PK | Audit log of imported CSV/PDF files with SHA-256 idempotency hash. |
| `transactions` | `id` (`String` UUID) | `account_id` $\rightarrow$ `accounts.id`, `source_file_id` $\rightarrow$ `source_files.id` | `idx_txns_account_date`, `idx_txns_fingerprint`, `idx_txns_merchant` | Core normalized financial ledger. |
| `categories` | `id` (`String` slug) | `parent_id` (self) | PK | System and user spending/income categories. |
| `recurring_items` | `id` (`String` UUID) | None | PK | Detected commitments (Rent, EMIs, SIPs, utilities, subscriptions). |
| `anomalies` | `id` (`String` UUID) | `txn_id` $\rightarrow$ `transactions.id` | PK | Spending spikes, duplicate charges, and new merchant alerts. |
| `correction_log` | `id` (`String` UUID) | None | PK | Audit ledger of user category overrides enabling transactional rollback. |
| `forecast_snapshots` | `id` (`String` UUID) | None | PK | Immutable snapshots of cash-flow simulations for reproducibility. |
| `scenarios` | `id` (`String` UUID) | `base_snapshot_id` $\rightarrow$ `forecast_snapshots.id` | PK | What-If sandbox adjustments overlaid on baseline snapshots. |
| `scenario_adjustments` | `id` (`String` UUID) | `scenario_id` $\rightarrow$ `scenarios.id` | PK | Ordered adjustments for a scenario (e.g. EMI, cancel recurring). |
| `egress_log` | `id` (`String` UUID) | None | PK | Cryptographic privacy log of all outbound network requests. |

---

## 2. Invariant Adherence Audit

| Invariant Rule | Implementation Target | Codebase Verification | Status |
|---|---|---|---|
| **1. Integer Paise Only** | All monetary columns must use `BigInteger` (`int64`) in minor paise ($1.00 = 100$). | All monetary columns (`amount_minor`, `balance_after_minor`, `typical_amount_minor`, etc.) are declared as `BigInteger`. No float currency columns exist in `models.py`. | **VERIFIED PASS** |
| **2. Signed Amounts** | Credits positive ($> 0$), Debits negative ($< 0$). | Ingestion parsers (`csv_parser.py`, `pdf_parser.py`) explicitly negate debits and preserve positive credits. | **VERIFIED PASS** |
| **3. Date Format** | ISO 8601 `YYYY-MM-DD`. Timestamps in UTC ISO format. | Dates stored as ISO string `YYYY-MM-DD`. Timestamps use `datetime.now(timezone.utc)`. | **VERIFIED PASS** |
| **4. Idempotent Ingestion** | Prevent duplicate statement uploads and duplicate rows. | `source_files.sha256` prevents file re-upload; `fingerprint = SHA256(...)` deduplicates identical rows. | **VERIFIED PASS** |

---

## 3. Database Integrity & Configuration Findings

### Finding DB-01: SQLite Foreign Key Constraints Disabled by Default (HIGH RISK)
- **File**: `apps/api/db/database.py` line 10-13
- **Detail**: In SQLite, foreign key enforcement is **disabled by default** unless explicitly enabled per connection via `PRAGMA foreign_keys = ON;`.
- **Impact**: While foreign keys are declared in SQLAlchemy models (`ForeignKey("accounts.id")`), SQLite does not prevent orphaned rows if an account is deleted or an invalid `account_id` is inserted unless the PRAGMA event listener is registered:
  ```python
  from sqlalchemy import event
  from sqlalchemy.engine import Engine

  @event.listens_for(Engine, "connect")
  def set_sqlite_pragma(dbapi_connection, connection_record):
      cursor = dbapi_connection.cursor()
      cursor.execute("PRAGMA foreign_keys=ON")
      cursor.close()
  ```

### Finding DB-02: Missing Database Migrations Framework (MEDIUM RISK)
- **Detail**: There is no Alembic or database migration setup in `apps/api`. Database creation relies strictly on `Base.metadata.create_all(bind=engine)`.
- **Impact**: Any future schema modification (adding columns, changing constraints) requires either manual SQLite `ALTER TABLE` scripts or dropping and recreating the database.

### Finding DB-03: Order-Dependent Test Schema Initialization (CONFIRMED DEFECT)
- **Detail**: In `apps/api/tests/test_api_endpoints.py`, `@pytest.fixture(autouse=True) def setup_clean_db()` was defined inside `test_api_endpoints.py` rather than in a root `conftest.py`.
- **Impact**: When `pytest` runs `test_affordability_engine.py` prior to `test_api_endpoints.py` on a fresh database, tests fail with `sqlite3.OperationalError: no such table: accounts`. Moving this fixture to a shared `conftest.py` solves the test order dependency.

### Finding DB-04: SQLite Concurrency Under High Load (INFORMATIONAL)
- **File**: `apps/api/db/database.py` line 12
- **Detail**: `connect_args={"check_same_thread": False}` allows multiple threads to access SQLite. However, default SQLite journal mode (`DELETE`) can lock the database during concurrent write transactions.
- **Recommendation**: Enable WAL (Write-Ahead Logging) mode via `PRAGMA journal_mode=WAL;` to allow concurrent readers while a write transaction is active.


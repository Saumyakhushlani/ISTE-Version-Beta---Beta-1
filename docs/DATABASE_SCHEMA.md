# Database Schema Dictionary — Financial Decision Lab (FDL)

This document provides a detailed reference for all database tables defined in `apps/api/db/models.py`. The database uses **SQLite** managed via **SQLAlchemy 2.0 ORM**.

---

## 1. Overview & Data Types

- **Monetary Storage**: Stored as `BigInteger` (`int64`) in integer paise (1 INR = 100 paise). Column names conventionally end with `_minor` or `_paise`.
- **Date Storage**: Stored as `String` in ISO 8601 `YYYY-MM-DD` format.
- **Timestamp Storage**: Stored as `DateTime` with UTC timezone (`timezone.utc`).
- **IDs**: UUID v4 strings (`generate_uuid()`).

---

## 2. Table Specifications

### 2.1 `accounts`
Represents user bank accounts, credit cards, or digital wallets.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique account identifier |
| `nickname` | `String` | No | — | Display label (e.g. "Primary Salary Account") |
| `bank` | `String` | No | — | Bank name ("HDFC Bank", "State Bank of India") |
| `type` | `String` | No | — | Account type (`savings`, `current`, `credit_card`) |
| `masked_last4`| `String(4)` | No | — | Last 4 digits of account number (e.g. "9823") |
| `opening_balance_minor` | `BigInteger` | No | `0` | Starting balance in paise |
| `currency` | `String` | No | `"INR"` | Currency ISO code |
| `created_at` | `DateTime` | No | `utcnow` | Creation timestamp |

---

### 2.2 `source_files`
Tracks uploaded bank statement files for auditability, reconciliation, and idempotence.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique source file record ID |
| `account_id` | `String` (FK) | No | — | Target account (`accounts.id`) |
| `filename` | `String` | No | — | Uploaded filename |
| `kind` | `String` | No | — | File format (`csv` or `pdf`) |
| `sha256` | `String` | No | — | Content hash to prevent re-uploading duplicate files |
| `period_start` | `String` | Yes | `None` | Earliest transaction date `YYYY-MM-DD` |
| `period_end` | `String` | Yes | `None` | Latest transaction date `YYYY-MM-DD` |
| `opening_balance_minor` | `BigInteger` | Yes | `None` | Balance at period start in paise |
| `closing_balance_minor` | `BigInteger` | Yes | `None` | Balance at period end in paise |
| `reconciliation_status` | `String` | No | `"unverified"` | `unverified` \| `passed` \| `discrepancy` |
| `parse_report_json` | `Text` | Yes | `None` | Serialized extraction report & warnings |
| `imported_at` | `DateTime` | No | `utcnow` | Ingestion timestamp |

---

### 2.3 `transactions`
The core ledger containing every normalized bank transaction.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique transaction ID |
| `account_id` | `String` (FK) | No | — | Parent account (`accounts.id`) |
| `source_file_id`| `String` (FK) | Yes | `None` | Originating file (`source_files.id`) |
| `source_row` | `Integer` | No | `0` | Original line index in file |
| `posted_date` | `String` | No | — | Date settled `YYYY-MM-DD` |
| `value_date` | `String` | Yes | `None` | Date effective `YYYY-MM-DD` |
| `amount_minor` | `BigInteger` | No | — | Signed paise: credit > 0, debit < 0 |
| `currency` | `String` | No | `"INR"` | ISO currency code |
| `raw_description` | `Text` | No | — | Raw unmodified narration from statement |
| `normalized_description`| `String` | No | — | Cleaned merchant / counterparty name |
| `channel` | `String` | No | `"OTHER"` | Channel: `UPI`, `NEFT`, `IMPS`, `ATM`, `POS`, `NACH` |
| `merchant_id` | `String` | Yes | `None` | Canonical merchant ID |
| `category_id` | `String` | No | `"cat_uncategorized"` | Assigned category ID |
| `category_source` | `String` | No | `"rule"` | Assignment source: `rule`, `ml`, `user` |
| `category_confidence` | `Float` | No | `1.0` | Classification confidence (0.0 to 1.0) |
| `balance_after_minor` | `BigInteger` | Yes | `None` | Running balance in paise if available |
| `fingerprint` | `String` | No | — | Deterministic deduplication hash |
| `occurrence_index` | `Integer` | No | `1` | Disambiguation index for identical transactions on same day |
| `is_transfer` | `Boolean` | No | `False` | True if identified as internal transfer between user accounts |
| `transfer_pair_id` | `String` | Yes | `None` | ID of the offset leg transaction |
| `dup_group_id` | `String` | Yes | `None` | Identifier linking merged duplicate records |
| `merged_from_json` | `Text` | Yes | `None` | JSON array of merged source file row references |
| `status` | `String` | No | `"active"` | Record status: `active`, `merged`, `excluded` |
| `user_override_json` | `Text` | Yes | `None` | Recorded user category/channel modifications |
| `created_at` | `DateTime` | No | `utcnow` | Record insertion timestamp |

#### Indexes
- `idx_txns_account_date`: `("account_id", "posted_date")`
- `idx_txns_fingerprint`: `("fingerprint")`
- `idx_txns_merchant`: `("merchant_id")`

---

### 2.4 `categories`
Hierarchical spending and income categories.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | — | Unique category string (`cat_rent`, `cat_groceries`) |
| `name` | `String` | No | — | Display label ("Rent & Housing") |
| `parent_id` | `String` | Yes | `None` | Parent category ID for nesting |
| `kind` | `String` | No | — | Classification: `income`, `essential`, `committed`, `discretionary`, `system` |
| `color` | `String` | No | `"#64748b"` | Hex color string for charts |

---

### 2.5 `recurring_items`
Committed obligations and predictable income streams identified by the cadence detector.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique recurring obligation record ID |
| `merchant` | `String` | No | — | Counterparty name ("Netflix", "HDFC Housing Loan") |
| `type` | `String` | No | — | Obligation kind: `subscription`, `emi`, `rent`, `utility`, `insurance`, `sip`, `salary` |
| `cadence` | `String` | No | — | Cadence: `weekly`, `fortnightly`, `monthly`, `quarterly`, `annual` |
| `typical_amount_minor`| `BigInteger`| No | — | Median amount in paise |
| `amount_min_minor` | `BigInteger`| No | — | Observed minimum amount in paise |
| `amount_max_minor` | `BigInteger`| No | — | Observed maximum amount in paise |
| `last_paid_date` | `String` | No | — | Date of most recent charge `YYYY-MM-DD` |
| `next_expected_date` | `String` | No | — | Projected next due date `YYYY-MM-DD` |
| `occurrences` | `Integer` | No | `1` | Count of observed instances in history |
| `confidence` | `Float` | No | `0.8` | Cadence confidence score (0.0 to 1.0) |
| `status` | `String` | No | `"active"` | Status: `active`, `possibly_ended`, `paused` |
| `user_status` | `String` | No | `"auto"` | User verification: `auto`, `confirmed`, `rejected` |
| `is_manual` | `Boolean` | No | `False` | True if manually added by user |

---

### 2.6 `anomalies`
Transactions flagged as outliers or unexpected pattern changes.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique anomaly record ID |
| `txn_id` | `String` (FK) | No | — | Associated transaction (`transactions.id`) |
| `type` | `String` | No | — | `large_amount`, `duplicate_charge`, `new_merchant`, `recurring_change` |
| `rule_id` | `String` | No | — | Identifier of triggered rule |
| `amount_minor` | `BigInteger` | No | — | Transaction amount in paise |
| `reason_text` | `Text` | No | — | Explainable description for user alert |
| `severity` | `String` | No | `"medium"` | Alert severity: `low`, `medium`, `high` |
| `user_feedback` | `String` | No | `"none"` | Feedback: `expected`, `real_duplicate`, `disputed`, `none` |
| `created_at` | `DateTime` | No | `utcnow` | Creation timestamp |

---

### 2.7 `correction_log`
Audit ledger of user category and rule overrides. Enables rollback and feedback loop.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique correction log ID |
| `ts` | `DateTime` | No | `utcnow` | Timestamp of correction |
| `action` | `String` | No | — | Action type (`reclassify`, `split`, `merge`) |
| `scope` | `String` | No | — | Scope: `this_txn`, `same_merchant`, `similar` |
| `affected_txn_ids_json`| `Text` | No | — | JSON array of affected transaction UUIDs |
| `before_json` | `Text` | No | — | State prior to correction |
| `after_json` | `Text` | No | — | State after correction |
| `undone_at` | `DateTime` | Yes | `None` | Timestamp if user reverted the correction |

---

### 2.8 `forecast_snapshots`
Immutable snapshots of cash flow projections for reproducibility and backtesting.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique snapshot identifier |
| `ts` | `DateTime` | No | `utcnow` | Simulation timestamp |
| `asof_date` | `String` | No | — | Reference date `YYYY-MM-DD` |
| `engine_version` | `String` | No | `"1.0.0"` | Version of calculation engine |
| `seed` | `Integer` | No | — | Explicit Monte Carlo random seed |
| `params_json` | `Text` | No | — | Input parameters used |
| `input_hash` | `String` | No | — | SHA-256 hash of transactions used |
| `outputs_json` | `Text` | No | — | Serialized percentile paths (P10, P50, P90) |
| `ledger_json` | `Text` | No | — | Serialized `Reasoning Ledger` steps |
| `confidence_json`| `Text` | No | — | Score and contributing factors |
| `gate_status` | `String` | No | `"OK"` | Gate evaluation result |

---

### 2.9 `scenarios` & `scenario_adjustments`
Stores What-If sandbox adjustments overlaid on top of a baseline forecast snapshot.

#### `scenarios`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique scenario ID |
| `name` | `String` | No | — | Scenario name (e.g. "Scenario A: 6-Month EMI") |
| `base_snapshot_id` | `String` (FK)| No | — | Baseline snapshot (`forecast_snapshots.id`) |
| `created_at` | `DateTime` | No | `utcnow` | Creation timestamp |
| `active` | `Boolean` | No | `True` | Whether scenario is active in comparison view |

#### `scenario_adjustments`
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique adjustment ID |
| `scenario_id` | `String` (FK)| No | — | Parent scenario (`scenarios.id`) |
| `seq` | `Integer` | No | `0` | Order of application |
| `type` | `String` | No | — | Adjustment kind: `purchase_emi`, `delay_purchase`, `cancel_recurring`, `income_shock` |
| `params_json` | `Text` | No | — | Serialized parameters (e.g. months, rate, recurring IDs) |

---

### 2.10 `egress_log`
Cryptographic privacy log recording any external API calls.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `String` (PK) | No | `uuid4` | Unique log entry ID |
| `ts` | `DateTime` | No | `utcnow` | Dispatch timestamp |
| `purpose` | `String` | No | — | Purpose (`natural_language_summary`, `categorization_assist`) |
| `payload_json` | `Text` | No | — | Sanitized payload sent (PII scrubbed) |
| `mode` | `String` | No | `"local"` | Privacy mode: `local`, `hybrid` |
| `destination` | `String` | No | `"none"` | Remote endpoint or model name |

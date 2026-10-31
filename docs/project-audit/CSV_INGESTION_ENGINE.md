# Dynamic CSV Ingestion Engine — Technical Architecture & Validation Report

**Financial Decision Lab (FDL)**  
**Author**: Senior Data Engineer, Financial Data Architect, Python Backend Engineer & QA Engineer  
**Date**: October 2026  
**Status**: Production Ready & Fully Verified (58 of 58 automated tests passing)  

---

## 1. Executive Summary & Problem Context

Financial statement CSV files issued by banks and fintech providers exhibit significant structural and formatting heterogeneity:
- **Encoding variations**: UTF-8, UTF-8 with Byte Order Mark (`\xef\xbb\xbf`), Windows-1252 (CP1252), ISO-8859-1 (Latin-1).
- **Delimiters**: Commas (`,`), semicolons (`;`), tabs (`\t`), pipes (`|`).
- **Preamble and header structures**: 5–20 lines of account metadata before transaction headers, summary footers, or completely headerless files.
- **Date formats**: `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`, `DD-Mon-YYYY`, `YYYY-MM-DD`, `Month DD, YYYY`, `DD/MM/YY`, and timestamps.
- **Amount & convention differences**: Split Debit/Credit columns, single signed amount columns, single amount with `Dr / Cr` indicator columns, parentheses negative `(500.00)`, and trailing `DR/CR` flags.
- **Indian numbering systems**: Lakhs/crores comma grouping (`1,23,456.78`), currency symbols (`₹`, `Rs.`), and embedded spaces.
- **Formatting quirks**: Descriptions with commas enclosed in double quotes (`"Swiggy, Bangalore South"`), empty rows, and malformed records.

The **Dynamic CSV Ingestion Engine** replaces static CSV parsing with an extensible, self-healing pipeline that automatically detects layouts, normalizes records into FDL's canonical financial model in **exact integer paise**, verifies mathematical balance reconciliation, supports interactive user column mapping, and surfaces row-level errors.

---

## 2. Architecture & Pipeline Design

```mermaid
flowchart TD
    A["Raw Bank Statement (CSV Bytes)"] --> B["Encoding Sniffer\n(UTF-8, UTF-8-BOM, CP1252, Latin-1, UTF-16)"]
    B --> C["Delimiter Sniffer\n(csv.Sniffer + Frequency Heuristics: , ; \\t |)"]
    C --> D["Header & Preamble Detector\n(Scoring lines against canonical synonyms)"]
    D -->|Header Found| E["Column Mapping Engine\n(Synonym Matching + Ambiguity Detection)"]
    D -->|No Header (Headerless)| F["Type-Inference Sniffer\n(Date / Amount / Narration profiling)"]
    E --> G["Normalized Data Extraction"]
    F --> G
    G --> H["High-Precision Monetary Parser\n(Decimal -> Integer Paise: MinorAmount)"]
    G --> I["Locale-Aware Date Parser\n(DMY vs MDY Disambiguation -> ISO YYYY-MM-DD)"]
    G --> J["Merchant Normalizer & Channel Classifier\n(UPI, NEFT, IMPS, POS, ACH, etc.)"]
    H & I & J --> K["Financial Data Validation & Balance Reconciliation"]
    K --> L["Reconciliation Proof:\nOpening + sum(T) == Closing\nRunning Balance: B_t == B_{t-1} + delta_t"]
    L --> M["Canonical FDL Transaction Stream + Preview API"]
```

### Module Responsibilities

| Module | Location | Purpose |
|---|---|---|
| `encoding_detector.py` | `apps/api/parsers/encoding_detector.py` | Detects BOM markers and byte encodings (`utf-8-sig`, `utf-8`, `cp1252`, `iso-8859-1`, `utf-16`), decoding text safely. |
| `delimiter_detector.py` | `apps/api/parsers/delimiter_detector.py` | Sniffs delimiter (`,`, `;`, `\t`, `|`) using `csv.Sniffer` and quote-aware frequency variance analysis. |
| `amount_parser.py` | `apps/api/parsers/amount_parser.py` | Parses currency strings into exact integer paise (`MinorAmount`) using Python `Decimal` (`ROUND_HALF_UP`) with zero floating-point drift. |
| `date_parser.py` | `apps/api/parsers/date_parser.py` | Parses 19 distinct date formats, strips timestamps, and disambiguates `DMY` vs `MDY` by scanning column values $> 12$. |
| `column_mapper.py` | `apps/api/parsers/column_mapper.py` | Scores header rows against comprehensive canonical synonyms, detects ambiguities, infers column types for headerless files, and handles explicit user overrides. |
| `reconciliation.py` | `apps/api/parsers/reconciliation.py` | Computes $O + \sum T = C$, verifies row-by-row running balance consistency ($B_t = B_{t-1} + \Delta_t$), and detects chronological direction and date gaps $> 7$ days. |
| `csv_parser.py` | `apps/api/parsers/csv_parser.py` | Master orchestrator providing `parse_csv_statement` (backward compatible) and `parse_csv_statement_advanced`. |
| `dataset_validator.py` | `apps/api/engine/dataset_validator.py` | Repeatable financial dataset validation tool grading files (`EXCELLENT`, `ACCEPTABLE`, `WARNING`, `DEFECTIVE`). |

---

## 3. Supported Real-World Bank Formats & Test Matrix

The engine has been tested and verified across 15 real-world banking statement layouts:

| Format / Bank | Delimiter | Header Structure | Amount Convention | Date Format | Test File |
|---|---|---|---|---|---|
| **HDFC Bank** | `,` (Comma) | Row 1 headers (`Withdrawal Amt`, `Deposit Amt`, `Closing Balance`) | Separate Debit / Credit columns | `YYYY-MM-DD` / `DD/MM/YYYY` | `hdfc_standard.csv` |
| **State Bank of India (SBI)** | `,` (Comma) | 7 lines of account preamble metadata before header table | Separate Debit / Credit columns | `DD-MM-YYYY` | `sbi_preamble.csv` |
| **ICICI Bank** | `,` (Comma) | Currency suffix in headers: `Withdrawal Amount (INR )`, `Deposit Amount (INR )` | Separate Debit / Credit columns | `DD/MM/YYYY` | `icici_inr.csv` |
| **Axis Bank** | `,` (Comma) | Abbreviated headers: `Tran Date`, `PARTICULARS`, `DR`, `CR`, `BAL`, `SOL` | Separate Debit / Credit columns | `DD-MM-YYYY` | `axis_abbrev.csv` |
| **Kotak Mahindra Bank** | `,` (Comma) | Single `Amount` column with separate `Dr / Cr` indicator column | Single Amount with `DR` / `CR` | `DD/MM/YYYY` | `kotak_drcr.csv` |
| **Enterprise / European** | `;` (Semicolon) | Single signed `Amount` column (outflows negative, inflows positive) | Signed Amount (`-20000.00`, `75000.00`) | `YYYY-MM-DD` | `semicolon_delim.csv` |
| **Tab-Separated (TSV)** | `\t` (Tab) | `Date\tDescription\tReference\tDebit\tCredit\tBalance` | Separate Debit / Credit columns | `YYYY-MM-DD` | `tab_delim.tsv` |
| **Pipe-Separated** | `\|` (Pipe) | `Date\|Narration\|Chq_Ref\|Withdrawal\|Deposit\|Balance` | Separate Debit / Credit columns | `YYYY-MM-DD` | `pipe_delim.csv` |
| **Headerless CSV** | `,` (Comma) | No header row (data starts on row 1; inferred via cell data typing) | Separate Debit / Credit columns | `YYYY-MM-DD` | `headerless.csv` |
| **Quoted Descriptions** | `,` (Comma) | Descriptions with commas inside quotes (`"Tech Solutions, Inc., Bangalore"`) | RFC 4180 quote preservation | `YYYY-MM-DD` | `quoted_commas.csv` |
| **Indian Numbering** | `,` (Comma) | Grouping commas (`₹ 1,50,000.00`), `(45,000.00)`, `35,000.00 DR`, `5,000.00 CR` | Mixed symbols, signs, and DR/CR | `YYYY-MM-DD` | `indian_numbering.csv` |
| **Malformed & Footers** | `,` (Comma) | Empty lines, invalid date row, invalid amount, footer totals (`Total Debits:...`) | Gracefully skips malformed rows; drops footers | `YYYY-MM-DD` | `malformed_and_footers.csv` |
| **Balance Break Detection** | `,` (Comma) | Row 3 balance has deliberate ₹500 mismatch to verify row break detection | Standard Debit / Credit | `YYYY-MM-DD` | `running_balance_break.csv` |
| **UTF-8 with BOM** | `,` (Comma) | `\xef\xbb\xbfDate,Description,...` | Standard Debit / Credit | `YYYY-MM-DD` | `bom_utf8.csv` |
| **Latin-1 / CP1252** | `,` (Comma) | Non-ASCII accents: `Café Coffee Day`, `Le Méridien` | Standard Debit / Credit | `YYYY-MM-DD` | `latin1_statement.csv` |

---

## 4. Financial Normalization & Invariants

Every ingested row is strictly converted into the FDL canonical transaction contract:

```typescript
export interface Transaction {
  id: string;
  account_id: string;
  source_file_id: string;
  source_row: number;
  posted_date: string;          // ISO 8601: YYYY-MM-DD
  amount_minor: MinorAmount;     // Signed integer paise: credit > 0, debit < 0
  currency: string;             // "INR"
  raw_description: string;       // Original unmodified narration
  normalized_description: string;// Cleaned counterparty
  channel: Channel;             // UPI, NEFT, IMPS, POS, ACH, ATM, etc.
  merchant_id?: string;
  category_id: string;
  category_source: CategorySource;
  category_confidence: number;
  balance_after_minor?: MinorAmount;
  fingerprint: string;          // SHA256 deduplication hash
  occurrence_index: number;     // 1..k disambiguation
  is_transfer: boolean;
  status: 'active' | 'merged' | 'excluded';
}
```

### Invariant Rules Enforced
1. **Integer Paise Only**: 1 INR = 100 paise. Floating-point conversions are prohibited. Python `decimal.Decimal` with `ROUND_HALF_UP` is used exclusively.
2. **Strict Sign Convention**: Inflows / Credits are **positive** ($> 0$); Outflows / Debits are **negative** ($< 0$).
3. **Zero Data Loss**: Raw narration is preserved verbatim in `raw_description`. Cleaned counterparty names reside in `normalized_description`.
4. **Row-Level Error Accountability**: Corrupted or unparseable rows are recorded in `errors` with exact row numbers and original string representations; valid rows continue to be processed.

---

## 5. Extensible Column Mapping Layer

The mapping engine identifies the following canonical semantic targets:

| Target Field | Typical Synonyms Scored | Required? |
|---|---|---|
| `date` | `Date`, `Txn Date`, `Transaction Date`, `Tran Date`, `Post Date`, `Booking Date`, `Value Date` | **Yes** |
| `description` | `Narration`, `Description`, `Particulars`, `Remarks`, `Transaction Details`, `Memo`, `Partner Name` | **Yes** |
| `withdrawal` | `Withdrawal Amt`, `Withdrawal Amount`, `Withdrawal`, `Debit Amount`, `Debit Amt`, `Debit`, `Dr Amount`, `Paid Out` | Optional |
| `deposit` | `Deposit Amt`, `Deposit Amount`, `Deposit`, `Credit Amount`, `Credit Amt`, `Credit`, `Cr Amount`, `Paid In` | Optional |
| `amount` | `Amount`, `Txn Amount`, `Transaction Amount`, `Net Amount`, `Total` | Optional |
| `txn_type` | `Transaction Type`, `Type`, `Dr/Cr`, `Cr/Dr`, `Indicator`, `D/C`, `Direction` | Optional |
| `balance` | `Closing Balance`, `Balance`, `Running Balance`, `Net Balance`, `Available Balance`, `Book Balance` | Optional |
| `ref_no` | `Chq/Ref No`, `Ref No`, `Reference No`, `Cheque No`, `UTR`, `Txn ID`, `Transaction ID` | Optional |

### Ambiguity Detection & User Overrides
- **Single Amount Ambiguity**: If a CSV has an `Amount` column without a `Dr / Cr` indicator column, and the values are unsigned positive numbers, the engine marks `is_ambiguous = True` with `mapping_confidence = 0.70`, surfacing an alert in the preview UI.
- **Manual Mapping Override**: Users can correct mappings via dropdowns in the web UI or pass `column_mapping` / `column_mapping_override` as a JSON string to `POST /api/imports/preview` or `POST /api/imports/commit`.

---

## 6. Financial Data Validation & Reconciliation

The engine runs a two-tier reconciliation check:

### Tier 1: Opening-to-Closing Balance Reconciliation
$$\text{Opening Balance} + \sum_{i=1}^N \text{Transaction Amount}_i \stackrel{?}{=} \text{Closing Balance}$$
- If the delta is `0 paise`, status is `PASSED`.
- If a delta exists, status is `DISCREPANCY (Delta: ₹XX.XX)`.

### Tier 2: Row-by-Row Running Balance Verification
For statements containing a running balance column:
$$B_t = B_{t-1} + \Delta_t$$
- The engine automatically detects chronological ordering (ascending vs descending).
- If any transaction creates a discrepancy, the engine flags `running_balance_status = "DISCREPANCY"` and returns the exact list of breaks:
  ```json
  {
    "row": 3,
    "date": "2024-05-10",
    "previous_balance_minor": 8000000,
    "amount_minor": -100000,
    "actual_balance_minor": 7850000,
    "expected_balance_minor": 7900000,
    "delta_minor": -50000
  }
  ```

---

## 7. Dataset Research, Licensing & Privacy Audit

In accordance with Objective 2, available public and synthetic financial datasets were evaluated:

| Dataset Candidate | Source & License | Structure & Format | PII Assessment | FDL Suitability & Recommendation |
|---|---|---|---|---|
| **Aarav & Priya Synthetic Suite** | FDL Internal (MIT / Apache 2.0) | CSV & PDF; 8 months; HDFC + SBI + ICICI | **Zero PII** (Deterministic synthetic generation) | **Primary Benchmark**: 100% compliant with FDL Golden Rules; used for automated CI/CD. |
| **Kaggle: Bank Account Transactions** | Community uploads (Unspecified / CC-BY-NC) | Single CSV; Date, Narration, Debit, Credit, Balance | **High Risk**: Contains real customer names and transaction remarks. | **Rejected**: Cannot commit real customer banking data into repository. |
| **Czech Banking Dataset (PKDD'99 / Berka)** | Academic Open Research (Open Access) | Relational CSVs (Trans, Account, Disp, Order) | Anonymized academic benchmark | **Compatible with Mapping**: Historical CZK currency; demonstrates multi-account relationships. |
| **PaySim Mobile Money Simulation** | Synthetic Financial Simulator (CC0) | CSV; Step, Type, Amount, NameOrig, OldBalance, NewBalance | **Zero PII** (Multi-agent synthetic simulation) | **Useful for Scaling**: Tested for 1,000+ row throughput and stress-testing. |
| **FDL Diverse Format Suite** (`data/synthetic/test_formats`) | FDL Synthetic (MIT / Local-First) | 15 CSV formats covering HDFC, SBI, ICICI, Axis, Kotak, TSV, Pipe, Latin-1 | **Zero PII** (Fully synthetic, reproducible generator) | **Adopted as Standard Benchmark**: Validated by `engine.dataset_validator`. |

### Repeatable Dataset Validation Process
Any external or synthetic statement can be audited at any time using:
```python
from engine.dataset_validator import validate_statement_dataset

report = validate_statement_dataset("path/to/statement.csv")
print(report["quality_grade"])  # "EXCELLENT" | "ACCEPTABLE" | "WARNING" | "DEFECTIVE"
print(report["financial_summary"])
print(report["validation_checks"])
```

---

## 8. Frontend Import Experience

An interactive statement import workflow was implemented in `apps/web`:
- **`StatementUploadModal.tsx`**: Modal accessible from the global top navigation bar, Dashboard, and Transactions Explorer.
- **Workflow Steps**:
  1. **Upload & Sniffing**: File drag-and-drop with bank hint selector and optional PDF password input.
  2. **Extraction Preview**:
     - Bank badge, delimiter, encoding, row count, and date range.
     - 3-card balance summary (Opening, Net Cash Flow, Closing).
     - Reconciliation status badge with green checkmark or discrepancy delta.
     - Row running balance verification badge.
  3. **Interactive Column Mapping**:
     - Mapping confidence score pill.
     - Dropdowns for Date, Description, Withdrawal, Deposit, Amount, and Balance.
     - "Re-Preview with Custom Mapping" button.
  4. **Row Warnings & Sample Transactions Table**:
     - Shows first 10 parsed rows with formatted INR amounts and payment channels.
  5. **Confirm & Commit**:
     - Sends verified column mappings to `POST /api/imports/commit`.
     - Displays summary of inserted rows, merged duplicates, and paired transfers.
     - Automatically refreshes the UI.

---

## 9. Verification & Automated Test Results

### Test Suite Execution
- **Command**: `pytest apps/api/tests -v`
- **Results**: **58 passed, 0 failed** in 12.83s.
- **Dynamic CSV Engine Suite**: 24 dedicated test cases in `apps/api/tests/test_dynamic_csv_engine.py` verifying:
  - Exact integer paise conversion without floating point drift
  - 19 date formats and timestamp stripping
  - Delimiter sniffing (`,`, `;`, `\t`, `|`)
  - Encoding sniffer (UTF-8, UTF-8-BOM, Latin-1 / CP1252)
  - 8 specific bank format profiles (HDFC, SBI preamble, ICICI, Axis, Kotak Dr/Cr, Semicolon, TSV, Pipe)
  - Headerless CSV data-type inference
  - Quoted descriptions with embedded commas
  - Indian numbering formatting (lakhs grouping, currency symbols, DR/CR suffixes)
  - Malformed row skipping and footer summary dropping
  - Row-by-row running balance break detection
  - Explicit column mapping overrides
  - 1,000-row statement performance
  - Dataset validator engine
  - API `/preview` and `/commit` endpoints integration

### Next.js Production Build
- **Command**: `pnpm build`
- **Result**: Compiled and type-checked successfully across all workspaces (`@fdl/shared` and `web`).


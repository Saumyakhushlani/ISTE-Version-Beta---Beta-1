# System Architecture Audit — Financial Decision Lab (FDL)

**Audit Date**: October 2026  
**Auditor**: Senior Software Architect  
**Scope**: High-Level System Architecture, Component Interactions, Data Pipelines, and Security Boundaries  

---

## 1. High-Level Architecture Overview

Financial Decision Lab is designed with a **decoupled, multi-tier architecture** adhering to strict local-first and deterministic invariants:

```mermaid
graph TD
    subgraph Browser ["Client Presentation Layer (apps/web)"]
        UI_Dash["Dashboard View (KPIs, Charts)"]
        UI_Lab["Affordability & What-If Lab"]
        UI_Txns["Transactions Explorer"]
        UI_Rec["Recurring Commitments"]
        UI_Anom["Anomaly Alerts"]
        UI_Priv["Privacy & Egress Audit"]
        API_Client["Typed API Client (lib/api.ts)"]
    end

    subgraph Contracts ["Shared Contract Layer (packages/shared)"]
        Types["Domain Interfaces & Unions"]
        Constants["PRD Constants (k, CV, tolerances)"]
        Formatters["formatINR & Currency Utils"]
    end

    subgraph Backend ["FastAPI Application Layer (apps/api)"]
        Main["FastAPI Entrypoint (main.py)"]
        Cors["CORS Middleware (localhost:3000)"]
        Routers["9 Modular APIRouters"]
        
        subgraph EngineLayer ["Deterministic Calculation Engines"]
            AffordEngine["Affordability Decision & Ledger"]
            BufferEngine["Dynamic Safety Buffer (CV, k)"]
            MCEngine["Monte Carlo Simulator (5,000 runs)"]
            SuffEngine["Data Sufficiency Gate (4 Points)"]
            RecEngine["Recurring Cadence Detector"]
            AnomEngine["Anomaly Detector (MAD, Mod Z)"]
            LiqEngine["Multi-Bank Liquidity Advisory"]
            DedupeEngine["Hash Fingerprint & Transfer Pairing"]
        end

        subgraph IngestionLayer ["Statement Ingestion & Normalization"]
            CSVParser["Auto-Detecting CSV Parser"]
            PDFParser["pdfplumber Table Extractor"]
            Normalizer["Narration Cleaner & UPI Stripper"]
            Categorizer["Rules + Naive Bayes Classifier"]
            JobQueue["Async Statement Parse Queue"]
        end

        subgraph GuardLayer ["AI & Safety Guard"]
            Extractor["Natural Language Query Extractor"]
            Guard["Number-Verification Regex Guard"]
            Narrator["Guarded English Narrator"]
            LLMClient["Ollama & Gemini REST Connector"]
            Egress["Egress Logger & Air-Gap Filter"]
        end
    end

    subgraph Storage ["Local Storage Layer"]
        DB[(SQLite Database: fdl.db)]
    end

    UI_Dash --> API_Client
    UI_Lab --> API_Client
    UI_Txns --> API_Client
    UI_Rec --> API_Client
    UI_Anom --> API_Client
    UI_Priv --> API_Client

    API_Client -.-> Contracts
    API_Client -->|HTTP / JSON / Multipart| Main
    Main --> Cors --> Routers

    Routers --> EngineLayer
    Routers --> IngestionLayer
    Routers --> GuardLayer

    EngineLayer --> DB
    IngestionLayer --> DB
    GuardLayer --> Egress --> DB
```

---

## 2. Component Relationships & Responsibilities

### 2.1 Presentation Tier (`apps/web`)
- **Technology**: Next.js 14.2+ (App Router), React 18, Tailwind CSS, Framer Motion, Recharts.
- **Role**: Renders financial dashboards, interactive What-If scenario comparisons, transaction lists, upcoming payment calendars, and anomaly warnings.
- **Rule**: Never calculates financial balances or headroom. Always displays formatted currency (`formatINR`) sourced from integer paise.

### 2.2 Contract Tier (`packages/shared`)
- **Technology**: TypeScript 5.7, Zod 3.24.
- **Role**: Single source of truth for:
  - `MinorAmount`: Integer paise representation of money.
  - Domain constants: `BUFFER_K_STABLE = 1.0`, `BUFFER_K_VARIABLE = 1.5`, `BUFFER_K_IRREGULAR = 2.0`, `MIN_HISTORY_DAYS = 90`, `MAX_TOLERATED_GAP_DAYS = 7`.
  - Type definitions for `Account`, `Transaction`, `RecurringItem`, `Anomaly`, `LedgerStep`, `AffordabilityVerdict`, and `SufficiencyReport`.

### 2.3 Backend API Service (`apps/api`)
- **Technology**: Python 3.13, FastAPI, SQLAlchemy 2.1, SQLite.
- **Structure**:
  - `routers/`: 9 decoupled route modules handling HTTP validation and serialization.
  - `engine/`: Pure Python financial calculation algorithms.
  - `parsers/`: Bank statement format detectors, CSV and PDF table extractors.
  - `ml/`: Merchant categorization logic.
  - `ai/`: Guarded LLM narration and parameter extraction.
  - `db/`: Database configuration, SQLite session lifecycle, and 10 ORM models.

---

## 3. Data Pipeline & Calculation Architecture

### 3.1 Ingestion & Normalization Subsystem
The ingestion pipeline processes arbitrary Indian bank statements (HDFC, SBI, ICICI, Axis, PhonePe) through multi-stage normalization:

```mermaid
flowchart LR
    Upload[Bank Statement CSV / PDF] --> Detect[Bank & Masked Last4 Detection]
    Detect --> Parse[Amount & Date Extraction]
    Parse --> Reconcile{Reconciliation Balance Check}
    Reconcile -->|Passed| Stage[Staged Preview Cache]
    Reconcile -->|Discrepancy| StageWithWarn[Staged Preview with Discrepancy Flag]
    Stage --> Commit[Commit to Database]
    Commit --> Dedupe[Deduplication SHA-256 Fingerprint]
    Dedupe --> Cat[Categorization: Rule + ML]
    Cat --> Transfer[Internal Transfer Pairing]
    Transfer --> RecScan[Recurring Cadence Scan]
    RecScan --> AnomScan[Modified Z-Score Outlier Scan]
    AnomScan --> Save[(SQLite Transactions)]
```

### 3.2 Affordability Decision & Reasoning Ledger Subsystem
The core decision engine executes an 8-step deterministic proof:

| Step No. | Ledger Step | Formula / Description | Input Sources |
|---|---|---|---|
| **Step 1** | Starting Liquid Balances | Aggregate current ledger balances across all active accounts | `accounts`, latest `transactions.balance_after_minor` |
| **Step 2** | Expected Monthly Income | Inflow projection based on recurring salary or median monthly credits | `recurring_items` (salary) or credit transactions |
| **Step 3** | Committed Fixed Obligations | Mandatory recurring debits (Rent, EMIs, SIPs, utilities, insurance) | `recurring_items` |
| **Step 4** | Discretionary Spending Allowance | Variable spending estimate based on historical category distributions | Historical discretionary debit transactions |
| **Step 5** | Required Safety Buffer | Dynamic buffer: $\max(\text{Floor}, k \cdot \text{Monthly Essentials})$ where $k \in \{1.0, 1.5, 2.0\}$ | Income volatility $CV$, monthly essentials |
| **Step 6** | Proposed Purchase Allocation | Upfront cash deduction or monthly EMI installment | Purchase query parameters |
| **Step 7** | Net Projected Headroom | Net cushion remaining: $\text{Starting} + \text{Inflow} - \text{Committed} - \text{Variable} - \text{Buffer} - \text{Purchase}$ | Computed from Steps 1–6 |
| **Step 8** | Final Affordability Verdict | Verdict classification (`AFFORDABLE`, `TIGHT`, `NOT_ADVISABLE`, `NOT_AFFORDABLE`) | 5,000 Monte Carlo runs ($seed = 42$), breach probability |

---

## 4. Database Architecture & ERD

The SQLite database contains 10 primary relational tables:

```mermaid
erDiagram
    Account ||--o{ Transaction : owns
    Account ||--o{ SourceFile : imported
    SourceFile ||--o{ Transaction : contains
    Transaction ||--o{ Anomaly : flagged
    ForecastSnapshot ||--o{ Scenario : baselines
    Scenario ||--o{ ScenarioAdjustment : configures
    Category ||--o{ Transaction : categorizes

    Account {
        string id PK
        string nickname
        string bank
        string type
        string masked_last4
        bigint opening_balance_minor
        string currency
        datetime created_at
    }

    SourceFile {
        string id PK
        string account_id FK
        string filename
        string kind
        string sha256
        string period_start
        string period_end
        bigint opening_balance_minor
        bigint closing_balance_minor
        string reconciliation_status
        text parse_report_json
        datetime imported_at
    }

    Transaction {
        string id PK
        string account_id FK
        string source_file_id FK
        int source_row
        string posted_date
        string value_date
        bigint amount_minor
        string currency
        text raw_description
        string normalized_description
        string channel
        string merchant_id
        string category_id
        string category_source
        float category_confidence
        bigint balance_after_minor
        string fingerprint
        int occurrence_index
        boolean is_transfer
        string transfer_pair_id
        string status
        datetime created_at
    }

    Category {
        string id PK
        string name
        string parent_id
        string kind
        string color
    }

    RecurringItem {
        string id PK
        string merchant
        string type
        string cadence
        bigint typical_amount_minor
        bigint amount_min_minor
        bigint amount_max_minor
        string last_paid_date
        string next_expected_date
        int occurrences
        float confidence
        string status
        string user_status
        boolean is_manual
    }

    Anomaly {
        string id PK
        string txn_id FK
        string type
        string rule_id
        bigint amount_minor
        text reason_text
        string severity
        string user_feedback
        datetime created_at
    }

    CorrectionLog {
        string id PK
        datetime ts
        string action
        string scope
        text affected_txn_ids_json
        text before_json
        text after_json
        datetime undone_at
    }

    ForecastSnapshot {
        string id PK
        datetime ts
        string asof_date
        string engine_version
        int seed
        text params_json
        string input_hash
        text outputs_json
        text ledger_json
        text confidence_json
        string gate_status
    }

    Scenario {
        string id PK
        string name
        string base_snapshot_id FK
        datetime created_at
        boolean active
    }

    ScenarioAdjustment {
        string id PK
        string scenario_id FK
        int seq
        string type
        text params_json
    }

    EgressLog {
        string id PK
        datetime ts
        string purpose
        text payload_json
        string mode
        string destination
    }
```

---

## 5. Security & Authentication Model

1. **Current Authentication Architecture**:
   - The system is architected as a **local single-user desktop/workstation tool**.
   - No authentication credentials, passwords, session tokens, or JWT headers are currently checked on any backend route.
   - Any client that can reach `http://127.0.0.1:8000` has complete administrative access to query all balances, upload statements, and execute category mutations.
2. **Network Security Boundaries**:
   - `CORS`: Allowed origins explicitly restricted to `http://localhost:3000` and `http://127.0.0.1:3000`.
   - `Egress Control`: `PRIVACY_MODE=local` (default). All external outbound HTTP dispatches are intercepted and audited in `egress_log`.
3. **Database Security**:
   - All queries use parameterized SQLAlchemy models.
   - Zero dynamic SQL string formatting exists in the codebase.


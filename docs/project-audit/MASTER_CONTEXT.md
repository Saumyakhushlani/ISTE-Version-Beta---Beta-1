# Master Context & Project Ground Truth — Financial Decision Lab (FDL)

> **PRIMARY OPERATIONAL HANDOFF FOR AI CODING AGENTS & HUMAN ENGINEERS**  
> *Read this single document first before inspecting or modifying any other code in this repository.*

---

## 1. What the Project Is & Why It Exists

**Financial Decision Lab (FDL)** is an evidence-backed personal financial decision assistant designed to answer one central question:
> *"Can I afford this next month?"*

Most financial chatbots fail because they generate hallucinated balances, guess future headroom, or use ungrounded advice. FDL solves this through **five non-negotiable architectural pillars**:

1. **Deterministic Financial Math**: 100% of calculations (balances, cash flows, safety buffers, headroom, EMI amortization, and affordability verdicts) are computed by deterministic Python code. The LLM **never** calculates balances or makes decisions.
2. **Explainable Reasoning Ledger**: Every decision generates an 8-step mathematical proof (`LedgerStep`) tracing starting balances, expected cash flows, recurring obligations, variable spend, safety buffers, and headroom.
3. **Number-Verification Guard**: Every numerical figure, currency amount, or percentage generated in natural-language narration is validated by a strict regex guard ensuring it exists verbatim in the Reasoning Ledger before presentation.
4. **Data Sufficiency Gate ("Say When It Doesn't Know")**: If data is insufficient (< 90 days history, gaps > 7 days, or missing recurring income credits), the system refuses to speculate and returns an `INSUFFICIENT_DATA` verdict with an actionable remediation checklist.
5. **Local-First & Air-Gapped Privacy**: Sensitive bank statement text, account numbers, and transaction ledgers reside locally in an SQLite database (`fdl.db`). Outbound calls are logged to an audit table (`egress_log`).

---

## 2. Technology Stack Actually in Use

- **Monorepo**: Turborepo 2.11+, pnpm 11.5+
- **Frontend (`apps/web`)**: Next.js 14.2+ (App Router), React 18.3, Tailwind CSS 3.4, Framer Motion 14.8, Recharts 2.15, Lucide React, Zustand 5.0.
- **Backend API (`apps/api`)**: Python 3.13+, FastAPI 0.162+, Starlette, Uvicorn 0.54+, SQLAlchemy 2.1+, SQLite 3, NumPy 2.5+, Pandas 3.1+, SciPy 1.18+, Scikit-learn 1.9+, `pdfplumber` 0.11+, `pypdf` 6.21+, `pytest` 9.2+.
- **Shared Contracts (`packages/shared`)**: TypeScript 5.7, Zod 3.24 (`@fdl/shared`).
- **AI Integrations**: Local Ollama (`http://localhost:11434`) + optional Google Gemini REST API (`gemini-1.5-flash`), strictly audited by `ai/guard.py`.

---

## 3. Architecture & Monorepo Map

```
.
├── apps/
│   ├── api/                     # Python FastAPI Backend
│   │   ├── main.py              # App entrypoint, CORS (localhost:3000), router inclusion
│   │   ├── requirements.txt     # Verified backend dependencies
│   │   ├── seed_demo.py         # Loads Aarav's HDFC + SBI statements into fdl.db
│   │   ├── ai/                  # AI query parsing, guarded narration, number guard
│   │   ├── db/                  # database.py (SessionLocal, get_db) & models.py (10 tables)
│   │   ├── engine/              # Pure Python deterministic financial algorithms
│   │   │   ├── sufficiency.py   # 4-point data gate evaluator (<90d, gaps, credits, rec)
│   │   │   ├── recurring.py     # Cadence clustering (weekly, monthly, annual) & confidence
│   │   │   ├── anomaly.py       # Modified Z-Score (MAD) & duplicate/new-merchant detector
│   │   │   ├── forecast.py      # 5,000-run Monte Carlo simulation (seed=42)
│   │   │   ├── buffer.py        # Dynamic buffer: max(Floor, k * Essentials), k in {1.0, 1.5, 2.0}
│   │   │   ├── affordability.py # 8-step Reasoning Ledger & verdict evaluator
│   │   │   ├── liquidity.py     # Multi-bank aggregation & investment sourcing advice
│   │   │   ├── dedupe.py        # SHA-256 fingerprint deduplication & transfer pairing
│   │   │   ├── correction.py    # Category override & transactional undo rollback
│   │   │   └── job_queue.py     # Async statement background processing queue
│   │   ├── parsers/             # csv_parser.py, pdf_parser.py, bank_detector.py, normalizer.py
│   │   ├── ml/                  # categorizer.py (Rules + Naive Bayes classifier)
│   │   ├── routers/             # 9 APIRouter modules (dashboard, imports, txns, affordability, etc.)
│   │   └── tests/               # 10 Pytest test files (34 automated tests)
│   │
│   └── web/                     # Next.js 14 Frontend Web Application
│       ├── src/app/
│       │   ├── page.tsx         # Executive Dashboard (KPIs, Cash Flow, Spend, Forecast)
│       │   ├── lab/page.tsx     # Affordability & What-If Simulation Lab
│       │   ├── transactions/    # Transactions Explorer table & filters
│       │   ├── recurring/       # Detected subscriptions & recurring bills
│       │   ├── anomalies/       # Outlier & spike alerts
│       │   └── privacy/         # Air-gap verification & local mode overview
│       └── src/lib/api.ts       # Typed API client
│
├── packages/
│   └── shared/                  # Shared TypeScript Contracts (@fdl/shared)
│       └── src/
│           ├── types/index.ts   # Core domain interfaces (MinorAmount, LedgerStep, etc.)
│           ├── constants/index.ts# Domain constants (k, CV, threshold tolerances)
│           └── utils/index.ts   # formatINR, rupeesToPaise, paiseToRupees
│
├── data/synthetic/              # Test datasets (Aarav, Priya, Short, Gappy, TimeTravel)
└── docs/project-audit/          # Full Technical Audit Documentation Package
```

---

## 4. Non-Negotiable Invariants & Ground Truths

When modifying or extending this codebase, **always adhere to these 7 golden rules**:

1. **Integer Paise Precision Only**: All monetary figures are stored and calculated in **integer paise** (`MinorAmount` / `BigInteger`). ₹1.00 = 100 paise; ₹80,000.00 = 8,000,000 paise. **Never use floating-point for money**.
2. **Signed Amounts**: In transactions: **Credits (inflow) are positive (`> 0`)**; **Debits (outflow) are negative (`< 0`)**.
3. **Zero Math in LLM**: LLMs are restricted strictly to parsing natural-language input and translating structured ledger steps into plain English. Calculations and verdicts are 100% computed in Python.
4. **Number-Verification Guard**: Every number, percentage, or currency figure cited in natural language must match a value in the Reasoning Ledger verbatim. If any figure fails to match, fallback to deterministic template text.
5. **Data Sufficiency First**: Always evaluate the 4-point `SufficiencyReport` before rendering verdicts. If data is insufficient, return verdict `INSUFFICIENT_DATA`.
6. **Deterministic Random Seeds**: All stochastic processes (5,000-run Monte Carlo simulations) must accept an explicit seed (`seed=42`) for 100% reproducibility.
7. **Local-First Air-Gap**: Never send raw bank statements or account numbers to external APIs. Log all external calls to `egress_log`.

---

## 5. Complete API Inventory Overview

FastAPI backend exposes **24 distinct endpoints across 9 routers**:

- **Health**: `GET /health`
- **Dashboard**: `GET /api/dashboard`, `POST /api/dashboard/investment-advice`
- **Imports**: `POST /api/imports/preview`, `POST /api/imports/preview/async`, `GET /api/imports/jobs/{job_id}`, `POST /api/imports/commit`
- **Transactions**: `GET /api/transactions`, `GET /api/transactions/corrections`, `PATCH /api/transactions/{id}/category`, `POST /api/transactions/{id}/category`, `POST /api/transactions/undo`
- **Affordability**: `POST /api/affordability`, `POST /api/affordability/ask`
- **What-If Lab**: `POST /api/scenarios/compare`
- **Sufficiency**: `GET /api/sufficiency`
- **Recurring**: `GET /api/recurring`, `GET /api/recurring/upcoming`, `PATCH /api/recurring/{id}`
- **Anomalies**: `GET /api/anomalies`, `POST /api/anomalies/{id}/feedback`, `PATCH /api/anomalies/{id}/feedback`
- **Privacy**: `GET /api/privacy/status`, `GET /api/privacy/egress-log`

*(See [`API_AUDIT.md`](file:///docs/project-audit/API_AUDIT.md) for full schemas and test cases).*

---

## 6. Current Implementation Status & Gaps

### What is Completed & 100% Verified
- Complete deterministic Python calculation engines: Data Sufficiency Gate, Dynamic Buffer, 5,000-run Monte Carlo Simulator, 8-Step Reasoning Ledger, Modified Z-Score Outlier Detector, Cadence Detector, Hash Fingerprint Deduplication, and Internal Transfer Pairing.
- Complete Statement Parser: Auto-detecting CSV & encrypted PDF table parser with password validation.
- Number-Verification Guard: Regex validator preventing numerical LLM hallucinations.
- Next.js Web UI: Beautiful dark dashboard with KPI metrics, Recharts cash flow, category spend, What-If simulation lab, transaction list, recurring obligations, and anomalies.
- Test Suite: 34 out of 34 Pytest tests pass; 42 out of 42 endpoint audit tests pass.

### What is Incomplete / Gaps to Address
1. **Frontend Statement Upload UI**: While the backend endpoints `/api/imports/preview` and `/commit` work completely, there is currently **no file upload modal or button in the web UI**. Users currently must seed data via `seed_demo.py` or call the API.
2. **Frontend Mutation Buttons**: Transaction category reclassification & undo, recurring item confirmation/rejection, and anomaly feedback endpoints are fully functional on the backend, but the frontend views are currently **read-only tables**.
3. **Privacy Egress View**: `apps/web/src/app/privacy/page.tsx` displays static mock text instead of querying `/api/privacy/egress-log`.
4. **Contract Type Mismatch**: `@fdl/shared` defines `narration` as `{text, guard_status}`, while backend returns a `str` and frontend renders `{decision.narration}` directly as a string.
5. **Endpoint Naming Discrepancy**: Documented as `/api/dashboard/liquidity/advice`, implemented as `/api/dashboard/investment-advice`.
6. **Authentication**: All endpoints are currently unauthenticated (single-tenant local model).

---

## 7. How to Run & Test the Application

### Prerequisites
- Node.js 18+ (tested on Node 22.12.0)
- pnpm 9+ (tested on pnpm 11.5.2)
- Python 3.13+ (tested on Python 3.13.14)

### Setup & Run
```bash
# 1. Install workspace dependencies
pnpm install

# 2. Set up Python virtual environment
cd apps/api
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt

# 3. Seed demo data (Aarav HDFC & SBI statements)
python seed_demo.py

# 4. Run development servers (Turbo)
cd ../..
pnpm dev

# Or run services independently:
# Backend (http://localhost:8000 / Swagger at /docs):
pnpm dev:api
# Frontend (http://localhost:3000):
pnpm dev:web
```

### Running Test Suites
```bash
# Run backend pytest suite (58 tests: 34 domain/api tests + 24 dynamic CSV engine tests)
cd apps/api
.venv\Scripts\activate
pytest -v

# Run comprehensive endpoint audit suite (42 tests)
python "C:\Users\ASUS\.gemini\antigravity\brain\7d388259-8a6f-45f2-bae2-dc310a57f583\scratch\audit_endpoint_test.py"

# Run frontend typecheck & build
cd ../..
pnpm --filter @fdl/shared typecheck
pnpm --filter web build
```

---

## 8. Prioritized Next Steps for Developers

If continuing development on this project, address tasks in this exact order:

1. ~~**Add `conftest.py` in `apps/api/tests/`**~~ — **RESOLVED**: Session-scoped test database initialization fixture added in `apps/api/tests/conftest.py` (`KI-01`).
2. ~~**Add Statement Upload Modal to Frontend**~~ — **RESOLVED**: Full-featured `StatementUploadModal` implemented in `apps/web/src/components/StatementUploadModal.tsx` with layout trigger and transactions page integration (`KI-04`).
3. **Add Interactive Mutation Buttons** to `transactions/page.tsx` (Category dropdown & Undo button), `recurring/page.tsx` (Confirm/Reject buttons), and `anomalies/page.tsx` (Expected/Duplicate feedback) (`KI-05`).
4. **Align `narration` Type Definition** in `@fdl/shared/src/types/index.ts` so it matches the string format used by FastAPI and rendered by React (`KI-02`).
5. **Add Endpoint Alias in `routers/dashboard.py`** for `/liquidity/advice` pointing to `get_investment_advice` (`KI-03`).
6. **Connect Privacy Page** `apps/web/src/app/privacy/page.tsx` to `api.getEgressLogs()` to render live outbound call records (`KI-06`).
7. **Add SQLite Connection Pragma** for `PRAGMA foreign_keys = ON;` in `apps/api/db/database.py` (`KI-10`).

---

## 9. Audit Documentation Package Links

For deep architectural analyses, test logs, and schema dictionaries, refer to the accompanying audit files:

- [Project Overview](file:///docs/project-audit/PROJECT_OVERVIEW.md): Comprehensive project mission, components, and workflows.
- [System Architecture](file:///docs/project-audit/ARCHITECTURE.md): Component diagrams, sequence flows, and design invariants.
- [API Inventory & Test Audit](file:///docs/project-audit/API_AUDIT.md): Complete 24-endpoint matrix and 42 executed test cases.
- [Database Schema Audit](file:///docs/project-audit/DATABASE_AUDIT.md): 10 table specifications, data integrity, and SQLite configurations.
- [Test Results Report](file:///docs/project-audit/TEST_RESULTS.md): Full pytest, build, and typecheck execution logs.
- [Security & Privacy Audit](file:///docs/project-audit/SECURITY_AUDIT.md): Threat modeling, IDOR vulnerabilities, and air-gap verification.
- [Implementation Status](file:///docs/project-audit/IMPLEMENTATION_STATUS.md): PRD vs code matrix and documentation discrepancies.
- [Known Issues & Bug Register](file:///docs/project-audit/KNOWN_ISSUES.md): 10 identified defects with reproduction steps and resolutions.


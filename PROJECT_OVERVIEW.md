# Financial Decision Lab (FDL) — Project Overview & Architecture Guide

> **"Can I afford this next month?"**  
> A personal finance decisioning system built on **100% deterministic financial mathematics**, provable audit ledgers, zero hallucinations, and transparent uncertainty modeling ($P_{10} / P_{50} / P_{90}$).

---

## 1. Executive Summary: What is Financial Decision Lab?

**Financial Decision Lab (FDL)** is an air-gapped, local-first personal finance platform designed to answer the single most critical forward-looking question:  
*"Can I afford this upcoming purchase or recurring obligation next month without risking my financial safety?"*

Unlike existing personal finance applications that only provide backward-looking pie charts or LLM wrappers that hallucinate calculations, FDL establishes an uncompromising standard:
- **Zero Math in the LLM**: All balances, cash flows, safety buffers, affordability verdicts, and tax implications are calculated strictly by deterministic Python/TypeScript code.
- **Explainability & Reasoning Ledger**: Every decision produces a step-by-step audit trail linking starting balances, recurring commitments, variable spend, and safety buffers.
- **Say When It Doesn't Know**: If data is incomplete (< 90 days of history, gaps > 7 days, or unreconciled balances), the system refuses to guess and generates an actionable remediation checklist.
- **Air-Gapped & Local-First**: Financial transactions and statement text never leave the user's machine by default.

---

## 2. Core Flagship Features (The 4 Pillars)

The platform is anchored around **4 primary flagship capabilities**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               4 CORE FLAGSHIP PILLARS                                   │
├────────────────────────────┬────────────────────────────┬───────────────────────────────┤
│  1. SYNC FROM GMAIL        │  2. ITR FILING HELP        │  3. DECISION LAB              │
│  • Automated OAuth sync    │  • AY 2026-27 ITR-1 Sahaj  │  • "Can I afford this?"       │
│  • Bank e-statements       │  • 80C/80D/80CCD detection │  • Cash vs. EMI Amortization  │
│  • Zero-manual entry       │  • Old vs New Regime tax   │  • 5,000-run Monte Carlo      │
│  • Local parsing & privacy │  • Downloadable PDF report │  • Step-by-step Ledger proof  │
├────────────────────────────┴────────────────────────────┴───────────────────────────────┤
│  4. INVESTMENT SUGGESTION & DISCUSSION                                                  │
│  • Multi-bank liquid runway telemetry       • Strict Savings Gate (validates before investing)   │
│  • Risk-profile matched asset allocation    • Conversational Advisor with Regex Number Guard    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Pillar 1: Sync from Gmail (Automated Ingestion)
- **Automated Bank Statement & Alert Ingestion**: Directly connects to the user's Gmail inbox via secure Google OAuth 2.0 to fetch and parse official e-statements and real-time transaction notifications (HDFC, SBI, ICICI, Axis, Kotak, etc.).
- **Zero Manual Effort**: Users do not need to download, rename, and upload monthly CSV or PDF statements manually.
- **Local-First Privacy**: Only financial emails from verified banking domains are scanned; processing happens strictly in the local Python backend, keeping raw emails off third-party servers.
- **Continuous Freshness**: Eliminates the 30-day statement gap by continuously syncing modern transactional receipts and credit/debit alerts.

---

### Pillar 2: ITR Filing Help (Indian Tax Intelligence Assistant)
- **Specialized for Salaried Individuals (ITR-1 Sahaj for AY 2026-27 / FY 2025-26)**: Engineered specifically for Indian salaried professionals filing income tax returns.
- **Automated Deduction Discovery**: Scans transaction narrations with specialized regex patterns to detect eligible tax deductions:
  - **Section 80C (up to ₹1.5 Lakh)**: PPF deposits, ELSS tax-saver mutual funds, Life Insurance (LIC, HDFC Life, SBI Life, ICICI Pru), and Home Loan Principal repayments.
  - **Section 80D (Health Insurance)**: Mediclaim and health insurance premiums for self, spouse, children, and senior citizen parents.
  - **Section 80CCD(1B)**: Additional voluntary National Pension System (NPS) contributions up to ₹50,000.
- **Smart Exclusion of Non-Taxable Credits**: Distinguishes true taxable salary/interest income from internal transfers, expense reimbursements, refunds, cashbacks, and reversal credits to avoid overstating income.
- **Old vs. New Tax Regime Comparison**: Deterministically calculates tax liabilities under both regimes based on discovered deductions, advising which regime yields higher net savings.
- **Downloadable Tax Advisory PDF**: Generates a professional, structured PDF advisory document summarizing eligible deductions, income credits, and regime recommendations.

---

### Pillar 3: Decision Lab (Affordability & What-If Simulation)
- **The Core Forward-Looking Engine**: Solves the fundamental question: *"Can I afford this upcoming purchase next month?"*
- **Upfront Cash vs. EMI Comparison**:
  - Amortization formula calculates true monthly EMI, total interest paid, and tenure trade-offs (3, 6, 9, 12, 24 months).
  - Simulates headroom impact across multiple future billing cycles.
- **5,000-Run Monte Carlo Simulation (`seed=42`)**:
  - Samples daily discretionary spend from historical empirical distributions.
  - Simulates 5,000 potential cash paths over 30/60/90 days.
  - Generates transparent percentile projections:
    - **$P_{10}$ Headroom (Pessimistic / Stress Test)**: 90% probability balance remains above this number.
    - **$P_{50}$ Headroom (Expected / Median)**: Most likely baseline trajectory.
    - **$P_{90}$ Headroom (Optimistic)**: Favorable spending scenario.
- **Four Deterministic Verdicts**:
  - **`AFFORDABLE`**: $P_{10}\text{ Headroom} > \text{Safety Buffer}$. Safe even in a stress scenario.
  - **`STRETCH`**: $P_{50}\text{ Headroom} > \text{Safety Buffer}$, but $P_{10} \le \text{Safety Buffer}$. Possible, but unexpected expenses will breach safety reserves.
  - **`UNSAFE`**: $P_{50}\text{ Headroom} \le \text{Safety Buffer}$. Direct risk of overdraft or defaulting on essential obligations.
  - **`INSUFFICIENT_DATA`**: Data gate tests failed. Refuses to guess until missing statements are provided.
- **Step-by-Step Reasoning Ledger**: Every verdict comes with an unassailable mathematical proof table:
  $$\text{Opening Balance} + \text{Expected Inflows} - \text{Fixed Obligations} - \text{Variable Spend} - \text{Safety Buffer} = \text{Headroom}$$

---

### Pillar 4: Investment Suggestion & Discussion
- **Multi-Bank Liquid Telemetry**: Aggregates balances across verified bank accounts, deducting floor buffers to determine real investable cash.
- **Strict Savings Validation Gate**: Enforces a non-negotiable rule: the system **refuses to recommend aggressive investments** if the user's monthly cash flow is negative or savings rate is insufficient.
- **Risk-Profile Matched Allocation**: Recommends appropriate financial instruments based on runway:
  - *Short-Term Runway (< 6 months)*: Liquid funds, sweep-in FDs, high-yield savings to build an Emergency Fund.
  - *Healthy Surplus (> 6 months runway)*: Systematic Investment Plans (SIPs) in broad-market index funds and tax-saving ELSS.
- **Conversational Investment Discussion**: Interactive AI dialogue interface (powered by Gemini & Groq) allowing users to discuss financial strategies, query their portfolio health, and evaluate investment ideas.
- **Strict Number-Verification Guard**: Every numerical figure mentioned in the AI's explanation is regex-verified against the deterministic engine ledger before being shown to the user.

---

## 3. Complete Technology Stack

The project is structured as a high-performance **Turborepo monorepo** managed with `pnpm` (frontend & shared packages) and Python virtual environment (backend).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 14 FRONTEND                             │
│       React 18 • Tailwind CSS • Zustand • Recharts • Framer Motion    │
│            Lottie (DotLottie) • Lucide React • Radix UI                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ REST APIs & JSON Schemas
┌────────────────────────────────────▼───────────────────────────────────┐
│                     FASTAPI BACKEND SERVICE (Python 3.13)              │
│       Pydantic v2 • SQLAlchemy ORM • SQLite • Uvicorn                  │
├────────────────────────────────────────────────────────────────────────┤
│                     DETERMINISTIC MATH & STAT ENGINES                  │
│       NumPy • SciPy • Pandas • Scikit-learn • pdfplumber               │
├────────────────────────────────────────────────────────────────────────┤
│                     AI INTERFACE & GUARDRAILS                          │
│       Google Gemini API • Groq API • Regex Number-Verification Guard   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Shared Contracts & Utils
┌────────────────────────────────────▼───────────────────────────────────┐
│                     SHARED CONTRACT PACKAGE (@fdl/shared)              │
│       TypeScript Types • Integer Paise Math • Domain Constants        │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Frontend (`apps/web`)
- **Framework**: **Next.js 14.2+ (App Router)** with React 18.3 & TypeScript 5.7
- **Styling**: **Tailwind CSS 3.4** with custom Slate dark-mode palette and CSS variables
- **State Management**: **Zustand 5.0+** for auth state, multi-account filters, and UI toggles
- **Visualizations**: **Recharts 2.15+** (cash flow projections, percentile fans, anomaly scatters)
- **Animations**: 
  - **@lottiefiles/dotlottie-react 0.17+** (hardware-accelerated WebAssembly `.lottie` streaming)
  - **Framer Motion 14.8+** & **GSAP 3.15+** (fluid component transitions and micro-interactions)
- **Icons & UI Primitives**: **Lucide React**, **Radix UI** primitives (`@radix-ui/react-tooltip`, `switch`, `slot`, `label`)

### 3.2 Backend API (`apps/api`)
- **Language & Runtime**: **Python 3.13+**
- **Framework**: **FastAPI >= 0.115.0** (asynchronous REST APIs, automatic OpenAPI docs)
- **Server**: **Uvicorn >= 0.34.0**
- **Data Validation**: **Pydantic v2 (>= 2.10.0)** for request and response models
- **Database / ORM**: **SQLite 3** managed via **SQLAlchemy >= 2.0.38**

### 3.3 Math, Statistics & Machine Learning
- **NumPy (>= 2.2.0)**: Vectorized array operations, seed-controlled pseudorandom generation
- **SciPy (>= 1.15.0)**: Percentile calculations ($P_{10}, P_{50}, P_{90}$), Interquartile Range (IQR), Median Absolute Deviation (MAD)
- **Pandas (>= 2.2.3)**: Tabular statement aggregation, daily rolling cash balances, and time-series bucketing
- **Scikit-learn (>= 1.6.0)**: TF-IDF vectorization and Multinomial Naive Bayes classifier for transaction description categorization
- **pdfplumber (>= 0.11.4) & pypdf (>= 5.1.0)**: High-fidelity bank statement PDF table extraction

### 3.4 Shared Contract Package (`packages/shared`)
- **Package**: `@fdl/shared` consumed directly across the monorepo
- **Type Definitions**: TypeScript contracts for accounts, transactions, affordability queries, and sufficiency reports
- **Currency Handling**: Indian numbering system (`formatINR`), rupee-to-paise and paise-to-rupee conversions

---

## 4. Supporting Platform Capabilities

In addition to the 4 flagship pillars, FDL includes supporting platform features:

1. **Multi-Bank Statement Parser Engine**: Automated format recognition for HDFC, SBI, and ICICI bank statements (CSV and password-protected/unprotected PDFs) with SHA-256 cryptographic idempotency and balance reconciliation checks.
2. **Transaction Normalization & ML Categorization**: UPI/IMPS/NEFT string cleaner + TF-IDF Naive Bayes classifier that automatically groups spend into essentials vs. discretionary and excludes intra-account transfers.
3. **Recurring Obligations & Subscription Tracker**: Cadence clustering algorithm that automatically surfaces Netflix, Spotify, gym memberships, utility bills, and loan EMIs with confidence scores.
4. **Spending Anomaly & Spike Detector**: Modified Z-Score using Median Absolute Deviation (MAD) to alert on unusual debit spikes ($|M_i| > 3.5$).
5. **Multi-Goal Optimizer & Feasibility Engine**: Projects completion dates for multiple concurrent goals and simulates the acceleration of timelines when discretionary recurring subscriptions are cancelled.
6. **Air-Gapped Privacy & Local Audit Log**: 100% local SQLite storage (`fdl.db`) with an `egress_log` tracking any outbound API calls, accompanied by a 1-click privacy toggle to disable all cloud egress.
7. **Conversational Purchase Advisor**: Natural language query interface with a built-in Indian retail pricing catalog (iPhone 16, MacBooks, travel benchmarks) to evaluate affordability on conversational prompts.
8. **Modern UI Showcase**: Responsive dark/light theme, persona switching (Aarav - salaried engineer vs. Priya - freelance designer), and borderless Lottie payment card animations.

---

## 5. Core Architectural Invariants (The 7 Golden Rules)

Every module, calculation, and feature strictly adheres to the following engineering invariants:

| # | Invariant | Technical Implementation | Purpose |
|---|---|---|---|
| **1** | **Integer Paise Only** | All monetary amounts stored as signed integers (paise). ₹1.00 = 100 paise; ₹85,000.00 = 8,500,000 paise. | Completely eliminates floating-point rounding drift. |
| **2** | **Signed Transactions** | Credits (inflows) are **positive (`> 0`)**; Debits (outflows) are **negative (`< 0`)**. | Prevents inverted cash flows and double counting. |
| **3** | **Zero Math in LLM** | LLMs are restricted strictly to query parameter extraction and narrative synthesis. | Eliminates hallucinations and invented financial figures. |
| **4** | **Number-Verification Guard** | Every number output in natural language is regex-validated against the Reasoning Ledger. | If any figure is ungrounded, system falls back to a deterministic template. |
| **5** | **Sufficiency First** | 4-point data gate evaluates statement completeness before affordability calculations. | System refuses to give advice on incomplete or gappy data (`INSUFFICIENT_DATA`). |
| **6** | **Deterministic Reproducibility** | All Monte Carlo simulations accept a fixed random seed (`seed=42`). | 100% reproducible test outputs and traceable decision audits. |
| **7** | **Air-Gapped & Local-First** | All statement data stored in local SQLite (`fdl.db`). External egress logged in `egress_log`. | Financial privacy by design. |

---

## 6. How FDL Compares to Alternatives

| Capability | Traditional Budgeting Apps | Generic LLM Chatbots | Financial Decision Lab (FDL) |
|---|---|---|---|
| **Forward Looking** | ❌ Backward-looking only | ⚠️ Unreliable predictions |  **5,000-run Monte Carlo projections** |
| **Mathematical Accuracy** | ⚠️ Floating-point rounding | ❌ Frequent hallucinations |  **100% Deterministic Integer Paise** |
| **Data Sufficiency Check** | ❌ Silently produces bad data | ❌ Never admits ignorance |  **Formal 4-point Sufficiency Gate** |
| **Auditability** | ⚠️ Opaque aggregate totals | ❌ Black box answers |  **Full Step-by-Step Reasoning Ledger** |
| **Uncertainty Communication** | ❌ Single static number | ❌ Confident guesswork |  **Explicit P10 / P50 / P90 Percentiles** |
| **Data Privacy** | ❌ Cloud servers & telemetry | ❌ Data sent to cloud AI |  **100% Local SQLite & Egress Audit** |
| **Gmail E-Statement Sync** | ❌ Complex or absent | ❌ None |  **Direct Google OAuth sync** |
| **Indian Tax Intelligence** | ❌ Not supported | ⚠️ Generic advice |  **AY 2026-27 ITR-1 Sahaj Deductions + PDF** |
| **Investment Discussion** | ❌ Third-party affiliate ads | ⚠️ Unguarded advice |  **Strict Savings Gate + Regex Guard** |

---

## 7. Monorepo Project Structure

```
.
├── apps/
│   ├── api/                           # Python 3.13 FastAPI Backend
│   │   ├── main.py                    # API entrypoint, CORS & router registrations
│   │   ├── requirements.txt           # Python dependencies
│   │   ├── db/
│   │   │   ├── database.py            # SQLite engine, sessions & Base
│   │   │   └── models.py              # 12 core tables (Account, Transaction, Goal, etc.)
│   │   ├── routers/                   # REST API Endpoints
│   │   │   ├── affordability.py       # /api/affordability & /ask (Decision Lab)
│   │   │   ├── email_sync.py          # /api/email-sync (Gmail Integration)
│   │   │   ├── tax.py                 # /api/tax (ITR Filing Intelligence & PDF)
│   │   │   ├── investments.py         # /api/investments (Investment Suggestions)
│   │   │   ├── dashboard.py           # /api/dashboard metrics & runway
│   │   │   ├── imports.py             # /api/imports (CSV/PDF parsers & SHA-256)
│   │   │   ├── sufficiency.py         # /api/sufficiency data health gate
│   │   │   ├── recurring.py           # /api/recurring subscriptions & bills
│   │   │   ├── anomalies.py           # /api/anomalies outlier detector
│   │   │   ├── goals.py               # /api/goals multi-goal optimizer
│   │   │   └── privacy.py             # /api/privacy egress inspector
│   │   ├── engine/                    # Deterministic Financial Engines
│   │   │   ├── affordability.py       # Decision Lab & EMI amortizer
│   │   │   ├── gmail_ingestion.py     # Gmail transaction parser
│   │   │   ├── tax_intelligence.py    # 80C/80D detector & regime evaluator
│   │   │   ├── tax_pdf_generator.py   # High-resolution PDF advisory generator
│   │   │   ├── investments.py         # Multi-bank liquid telemetry & savings gate
│   │   │   ├── forecast.py            # Monte Carlo cash flow simulation (Seed=42)
│   │   │   ├── buffer.py              # Dynamic safety buffer calculator
│   │   │   ├── sufficiency.py         # 4-point data gate evaluator
│   │   │   ├── recurring.py           # Cadence clustering & confidence scoring
│   │   │   └── anomaly.py             # Modified Z-score & MAD outlier detector
│   │   ├── ml/                        # ML Categorizer & Normalizer
│   │   │   ├── categorizer.py         # Rules + TF-IDF Naive Bayes classifier
│   │   │   └── normalizer.py          # UPI/NEFT/IMPS string cleaner
│   │   └── ai/                        # AI Interface & Guardrails
│   │       ├── investment_chat.py     # Investment Discussion & Strategy AI
│   │       ├── purchase_advisor.py    # Decision Lab Conversational Advisor
│   │       ├── extractor.py           # NL query to parameters
│   │       ├── narrator.py            # Ledger to narrative generator
│   │       └── guard.py               # Strict Regex Number-Verification Guard
│   │
│   └── web/                           # Next.js 14 Frontend Application
│       ├── public/                    # Static assets & .lottie animation bundles
│       └── src/
│           ├── app/
│           │   ├── lab/page.tsx       # Decision Lab (Cash vs EMI, Monte Carlo, Ledger)
│           │   ├── tax/page.tsx       # ITR Filing Help (80C/80D, Old vs New, PDF download)
│           │   ├── investments/       # Investment Suggestions & AI Discussion
│           │   ├── upload/page.tsx    # Bank statement upload & Gmail sync
│           │   ├── dashboard/page.tsx # Financial health overview & cash flow curves
│           │   ├── transactions/      # Cleaned transaction table & categorization
│           │   ├── recurring/         # Subscriptions, obligations & cadence
│           │   ├── anomalies/         # Spike scatter plot & alerts
│           │   ├── goals/             # Goal feasibility & acceleration toggles
│           │   ├── privacy/           # Egress log viewer & local-only toggle
│           │   └── login/page.tsx     # Persona authentication & Lottie cards
│           ├── components/            # Reusable UI components
│           └── lib/                   # API client, Zustand stores & formatting utils
│
├── packages/
│   └── shared/                        # Shared TypeScript Domain Contracts
│       ├── types/index.ts             # Domain interfaces & verdicts
│       ├── constants/index.ts         # Threshold constants & buffer rules
│       └── utils/index.ts             # formatINR & paise conversion helpers
│
└── PROJECT_OVERVIEW.md                # This master document
```

---

## 8. Development Setup & Execution Commands

### 8.1 Prerequisites
- **Node.js**: `v18.18+` or `v20+` / `v24+`
- **pnpm**: `pnpm >= 9.0`
- **Python**: `3.13+`

### 8.2 Installation
```bash
# 1. Install frontend & monorepo workspace dependencies
pnpm install

# 2. Set up Python backend virtual environment
cd apps/api
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install Python requirements
pip install -r requirements.txt
cd ../..
```

### 8.3 Running Development Servers
```bash
# Option 1: Run frontend and backend concurrently via Turborepo
pnpm dev

# Option 2: Run backend and frontend individually
# Terminal 1 - Backend:
pnpm dev:api
# API available at: http://localhost:8000
# Interactive Swagger docs: http://localhost:8000/docs

# Terminal 2 - Frontend:
pnpm dev:web
# Frontend UI available at: http://localhost:3000
```

### 8.4 Running Automated Tests
```bash
# Run backend pytest suite
cd apps/api
pytest -v

# Run frontend type checking & build verification
pnpm build
```

---

## 9. Conclusion: The Core Value Proposition

Financial Decision Lab brings together **rigorous mathematical engineering** and **practical everyday utility**:
1. **Sync from Gmail**: Effortless continuous data ingestion directly from your inbox.
2. **ITR Filing Help**: Intelligent detection of Section 80 deductions and Old vs. New regime advice with downloadable PDF reports.
3. **Decision Lab**: Deterministic mathematical proof answering *"Can I afford this?"* via cash vs. EMI simulations and 5k Monte Carlo stress tests.
4. **Investment Suggestions & Discussion**: Disciplined surplus validation with safe-to-spend gates and hallucination-free AI discussions.

# Financial Decision Lab (FDL) — Key Features & Project Overview

> **"Can I afford this next month?"**  
> A personal finance decisioning system built on **100% deterministic financial mathematics**, provable audit ledgers, zero hallucinations, and transparent uncertainty modeling ($P_{10} / P_{50} / P_{90}$).

---

## 1. What is Financial Decision Lab?

**Financial Decision Lab (FDL)** is an air-gapped, local-first personal finance platform engineered to answer the single most critical forward-looking question:  
*"Can I afford this upcoming purchase or recurring obligation next month without risking my financial safety?"*

Unlike existing budgeting apps that only show historical pie charts or LLM chatbots that hallucinate numbers, FDL operates on strict mathematical principles:
- **Zero Math in the LLM**: All calculations, headroom projections, safety buffers, and tax liabilities are calculated strictly by deterministic Python/TypeScript code.
- **Explainability & Reasoning Ledger**: Every financial verdict produces an unassailable mathematical proof table.
- **Say When It Doesn't Know**: If data is incomplete (< 90 days history, large gaps > 7 days, or unreconciled balances), the system refuses to guess and outputs an actionable remediation checklist.
- **Air-Gapped & Local-First**: Financial transactions and statement text never leave the user's local machine by default.

---

## 2. The 4 Key Flagship Features

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

### Feature 1: Sync from Gmail (Automated Ingestion)
- **Zero Manual Effort**: Securely connects to the user's Gmail inbox via Google OAuth 2.0 to automatically fetch and parse official bank e-statements and real-time transaction notifications (HDFC, SBI, ICICI, Axis, Kotak, etc.).
- **Solves the Statement Gap**: Eliminates the 30-day lag of monthly statements by continuously syncing transactional receipts, debit/credit alerts, and UPI notifications in real-time.
- **Local-First Privacy**: Only emails from verified banking domains are scanned; processing occurs strictly in the local Python backend, keeping financial communications off third-party servers.
- **Automated Balance Reconciliation**: Parses signed amounts, runs cryptographic SHA-256 deduplication to prevent duplicate entries, and verifies mathematical integrity:
  $$\text{Opening Balance} + \sum \text{Transactions} = \text{Closing Balance}$$

---

### Feature 2: ITR Filing Help (Indian Tax Intelligence Assistant)
- **Engineered for Salaried Individuals (ITR-1 Sahaj for AY 2026-27 / FY 2025-26)**: Designed specifically for Indian salaried professionals navigating income tax filing.
- **Automated Deduction Discovery**: Scans transaction narrations with specialized regex patterns to detect tax-saving deductions:
  - **Section 80C (up to ₹1.5 Lakh)**: PPF deposits, ELSS tax-saver mutual funds, Life Insurance premiums (LIC, HDFC Life, SBI Life, ICICI Pru), and Home Loan Principal repayments.
  - **Section 80D (Health Insurance)**: Mediclaim and health insurance premiums for self, spouse, children, and senior citizen parents.
  - **Section 80CCD(1B)**: Additional voluntary National Pension System (NPS) contributions up to ₹50,000.
- **Smart Exclusion of Non-Taxable Credits**: Distinguishes true taxable salary/interest income from internal transfers, expense reimbursements, refunds, cashbacks, and credit reversals to prevent accidental overstatement of taxable income.
- **Old vs. New Tax Regime Comparison**: Deterministically calculates tax liabilities under both regimes based on discovered deductions, advising which regime yields higher net savings.
- **Downloadable Tax Advisory PDF**: Generates and downloads a structured PDF tax report summarizing eligible deductions, income credits, and regime recommendations.

---

### Feature 3: Decision Lab (Affordability & What-If Simulation)
- **The Core Forward-Looking Engine**: Solves the fundamental question: *"Can I afford this upcoming purchase next month?"*
- **Upfront Cash vs. EMI Amortization**:
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

### Feature 4: Investment Suggestion & Discussion
- **Multi-Bank Liquid Telemetry**: Aggregates balances across verified bank accounts, deducting floor buffers to determine real investable cash.
- **Strict Savings Validation Gate**: Enforces a non-negotiable rule: the system **refuses to recommend aggressive investments** if the user's monthly cash flow is negative or savings rate is insufficient.
- **Risk-Profile Matched Allocation**: Recommends appropriate financial instruments based on runway:
  - *Short-Term Runway (< 6 months)*: Liquid funds, sweep-in FDs, high-yield savings to build an Emergency Fund.
  - *Healthy Surplus (> 6 months runway)*: Systematic Investment Plans (SIPs) in broad-market index funds and tax-saving ELSS.
- **Conversational Investment Discussion**: Interactive AI dialogue interface (powered by Gemini & Groq) allowing users to discuss financial strategies, query their portfolio health, and evaluate investment ideas.
- **Strict Number-Verification Guard**: Every numerical figure mentioned in the AI's explanation is regex-verified against the deterministic engine ledger before being shown to the user.

---

## 3. Technology Stack

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

| Component | Technology | Role & Purpose |
|---|---|---|
| **Frontend Framework** | **Next.js 14.2+ (App Router)** | High-performance React 18 server and client components |
| **Styling** | **Tailwind CSS 3.4** | Modern dark-mode palette, responsive layouts |
| **State Management** | **Zustand 5.0+** | Multi-account state, user auth, and simulation parameters |
| **Data Visualizations** | **Recharts 2.15+** | Interactive cash flow curves, percentile fans, and scatter plots |
| **Animations** | **@lottiefiles/dotlottie-react** | Streaming `.lottie` hardware-accelerated card animations |
| **UI Motion & Icons** | **Framer Motion + Lucide React** | Fluid UI transitions and accessible icons |
| **Backend Framework** | **FastAPI >= 0.115.0 (Python 3.13)** | Asynchronous, typed REST APIs with OpenAPI docs |
| **Database & ORM** | **SQLite 3 + SQLAlchemy >= 2.0.38** | Local-first, air-gapped relational storage |
| **Validation** | **Pydantic v2 (>= 2.10.0)** | Strict schema validation for request and response payloads |
| **Scientific Math** | **NumPy & SciPy** | Vectorized math, percentiles ($P_{10}/P_{50}/P_{90}$), MAD |
| **Data Aggregation** | **Pandas >= 2.2.3** | Time-series daily cash bucketing and tabular aggregation |
| **Machine Learning** | **Scikit-learn (TF-IDF + Naive Bayes)** | Automated transaction categorization and normalizer |
| **Statement Parsers** | **pdfplumber & pypdf** | High-fidelity bank statement PDF table extraction |
| **Shared Contracts** | **TypeScript (@fdl/shared)** | Shared interfaces, paise integer math, and constants |
| **AI Integration** | **Google Gemini & Groq APIs** | Natural language synthesis with Regex Number-Verification Guard |

---

## 4. Why Financial Decision Lab is Unique

| Feature | Traditional Budgeting Apps | Generic LLM Chatbots | Financial Decision Lab (FDL) |
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

## 5. Quickstart & Execution

```bash
# 1. Install frontend and workspace dependencies
pnpm install

# 2. Set up Python backend
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate | Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cd ../..

# 3. Start development servers
# Both services concurrently:
pnpm dev

# Or individually:
pnpm dev:api   # Backend at http://localhost:8000 (Swagger docs at /docs)
pnpm dev:web   # Frontend at http://localhost:3000
```

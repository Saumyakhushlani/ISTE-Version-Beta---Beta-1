# CLAUDE.md — Financial Decision Lab (FDL)

Cheat sheet and high-density reference for Claude Code & AI pair programmers.

## Commands

```bash
# Setup
pnpm install
cd apps/api && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt && cd ../..

# Dev Servers
pnpm dev              # Runs both via Turbo
pnpm dev:web          # Next.js frontend (http://localhost:3000)
pnpm dev:api          # FastAPI backend (http://127.0.0.1:8000)

# Build & Lint
pnpm build            # Builds all workspaces
pnpm lint             # Turbo linting

# Tests
cd apps/api && pytest -v             # Run backend test suite
cd apps/api && pytest -k "test_name" # Run single test
```

## Non-Negotiable Core Rules

1. **Integer Paise Currency**: Store and compute all amounts in paise (`MinorAmount` / `BigInteger`). ₹1.00 = 100 paise. Never use floating-point numbers for money.
2. **Signed Amounts**: Credits (income/inflow) are positive (`> 0`); Debits (spending/outflow) are negative (`< 0`).
3. **No Math in LLMs**: Deterministic Python/TypeScript engines do all calculations, Monte Carlo simulations, and affordability evaluations. LLMs only parse queries and summarize verified numbers into sentences.
4. **Number-Verification Guard**: Every numerical figure in an LLM narrative must match a number in the Reasoning Ledger. Otherwise, reject and return template fallback.
5. **Data Sufficiency First**: If statement history < 90 days or contains gaps > 7 days, refuse verdict with `INSUFFICIENT_DATA` and checklist.
6. **Local-First Privacy**: Never send statement text or account numbers to external APIs. Log any remote requests to `egress_log`.
7. **Deterministic Seeds**: Always pass `seed=42` to numpy/scipy random processes.

## Architecture & Code Structure

- **Monorepo**: Turborepo + pnpm workspaces.
- **Backend (`apps/api`)**: Python 3.13, FastAPI, SQLite + SQLAlchemy 2.0, pandas, numpy, scipy, scikit-learn, pdfplumber.
  - `db/models.py`: 10 tables (`Account`, `Transaction`, `Category`, `RecurringItem`, `Anomaly`, `CorrectionLog`, `ForecastSnapshot`, `Scenario`, `ScenarioAdjustment`, `EgressLog`).
  - `routers/`: `affordability.py`, `dashboard.py`, `imports.py`, `sufficiency.py`, `transactions.py`, `whatif.py`.
  - `engine/`: Core deterministic financial calculations (`sufficiency`, `recurring`, `anomaly`, `forecast`, `buffer`, `affordability`).
  - `ai/`: Query parser, narrator, and `guard.py` (number verification).
- **Frontend (`apps/web`)**: Next.js 14 App Router, React 18, Tailwind CSS, Lucide icons, Recharts, Zustand.
- **Shared Contracts (`packages/shared`)**: `@fdl/shared` TypeScript types, `DOMAIN_CONSTANTS`, and `formatINR` utility.

## Key Types (`@fdl/shared`)

- `MinorAmount`: Integer paise (`number`).
- `AffordabilityVerdictCode`: `'AFFORDABLE' | 'TIGHT' | 'NOT_ADVISABLE' | 'NOT_AFFORDABLE' | 'INSUFFICIENT_DATA'`.
- `GateStatus`: `'OK' | 'LOW_CONFIDENCE' | 'INSUFFICIENT'`.
- `LedgerStep`: Discrete step with `step_no`, `label`, `value_minor`, `formula_text`, `status`.

## References

- Comprehensive guide: [`AGENTS.md`](file:///AGENTS.md)
- Architecture details: [`ARCHITECTURE.md`](file:///ARCHITECTURE.md)
- Mathematical formulas: [`docs/DOMAIN_ENGINE_SPEC.md`](file:///docs/DOMAIN_ENGINE_SPEC.md)
- REST API contracts: [`docs/API_REFERENCE.md`](file:///docs/API_REFERENCE.md)

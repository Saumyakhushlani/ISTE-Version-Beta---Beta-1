# Development & Contributor Workflow — Financial Decision Lab (FDL)

This guide provides practical instructions for human developers and AI pair programmers to set up the development environment, execute tests, load synthetic datasets, and implement new features.

---

## 1. Prerequisites & Environment Setup

### Required Tools
- **Node.js**: `>= 18.18.0` (Recommended: Node 20 LTS)
- **pnpm**: `>= 9.0.0` (Monorepo package manager)
- **Python**: `>= 3.13.0` (FastAPI backend)
- **Git**

### First-Time Setup

```bash
# 1. Clone repository and navigate to root
cd ISTE-Version-Beta---Beta-1

# 2. Copy environment variables template
cp .env.example .env

# 3. Install JavaScript/TypeScript dependencies
pnpm install

# 4. Set up Python virtual environment for apps/api
cd apps/api
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
# .venv\Scripts\activate.bat
# On Linux/macOS:
# source .venv/bin/activate

# 5. Install Python dependencies
pip install -r requirements.txt

# 6. Return to root
cd ../..
```

---

## 2. Running Local Services

### Running Both Services via Turborepo
```bash
# Starts both Next.js frontend (port 3000) and FastAPI backend (port 8000)
pnpm dev
```

### Running Services Independently

#### Terminal 1 — FastAPI Backend:
```bash
# From repository root:
pnpm dev:api

# Or directly in apps/api:
cd apps/api
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Swagger Interactive UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

#### Terminal 2 — Next.js Frontend:
```bash
# From repository root:
pnpm dev:web
```
- Web Application: `http://localhost:3000`

---

## 3. Working with Synthetic Test Datasets

The repository includes synthetic data profiles in `data/synthetic/` designed to test the financial engine and showcase key hackathon evaluation journeys:

| Dataset | Persona Profile | Key Characteristics | Expected Engine Behavior |
|---|---|---|---|
| **Aarav** | Salaried Software Engineer (26) | 8 months data, HDFC CSV + SBI PDF, overlapping imports, rent, car EMI, Swiggy/Zomato spend. | Status `OK`, Stable income ($CV \le 0.10$), $k = 1.0$, Verdict `TIGHT` on ₹80k phone. |
| **Priya** | Freelance Designer (31) | 9 months data, irregular invoice credits, variable quarterly tax, high income variance ($CV \approx 0.28$). | Status `OK`, Variable income, $k = 1.5$ safety buffer, conservative P10 headroom. |
| **Short** | First-Time User (< 60 Days) | Only 45 days of statement data provided. | **Data Sufficiency Gate Refusal**: Returns `INSUFFICIENT_DATA` + checklist asking for 2 more months. |
| **Gappy** | User with Missing Months | 6 months of data but has a 25-day gap in statement history. | **Gate Warning**: Returns `LOW_CONFIDENCE` with warning: *"Date gap detected between 2024-11-05 and 2024-12-01"*. |
| **Messy** | Uncategorized Outliers | Multiple unmapped merchant UPI strings, sudden ₹25,000 electronics spike. | Triggers `new_merchant` and `large_amount` anomalies; demonstrates bulk user category correction. |
| **TimeTravel** | Evaluator Backtesting | Baseline statement up to Month $M$, plus actual statement for Month $M+1$. | Enables forecast track record calibration and cash-flow backtest comparison. |

---

## 4. Testing Suite

### Running Backend Unit Tests (`apps/api`)
```bash
cd apps/api
.venv\Scripts\activate

# Run all tests
pytest -v

# Run with coverage report
pytest --cov=engine --cov=parsers -v

# Run a specific test module
pytest tests/test_engine.py -v
```

### Writing a New Test
Create test files in `apps/api/tests/test_<feature>.py`. Always test integer paise values:

```python
import pytest
from engine.buffer import calculate_safety_buffer

def test_buffer_stable_salary():
    # 1.5x essentials for variable income
    essentials_paise = 3870000 # ₹38,700
    income_cv = 0.08 # Stable salary
    
    buffer = calculate_safety_buffer(
        monthly_essentials_minor=essentials_paise,
        income_cv=income_cv
    )
    
    assert buffer["binding_term"] == "k_x_essentials"
    assert buffer["k"] == 1.0
    assert buffer["value_minor"] == 3870000
```

### Running Frontend Type-Checking
```bash
# Verify TypeScript strict types across packages
pnpm build
```

---

## 5. Adding New Features (Step-by-Step)

### 5.1 Adding a New Bank Statement Parser
1. Create a parser module in `apps/api/parsers/<bank_name>_parser.py`.
2. Implement the standard extraction interface:
   ```python
   def parse_statement(file_bytes: bytes, filename: str) -> dict:
       """
       Returns:
       {
           "bank": str,
           "period_start": str, # YYYY-MM-DD
           "period_end": str,   # YYYY-MM-DD
           "opening_balance_minor": int,
           "closing_balance_minor": int,
           "transactions": list[dict] # source_row, posted_date, amount_minor, raw_description
       }
       """
   ```
3. Register the parser in `apps/api/parsers/__init__.py`.
4. Add bank profile unit tests with sample snippet in `apps/api/tests/test_parsers.py`.

### 5.2 Adding a New Financial Engine Module
1. Review the mathematical specification in [`docs/DOMAIN_ENGINE_SPEC.md`](file:///docs/DOMAIN_ENGINE_SPEC.md).
2. Implement deterministic functions in `apps/api/engine/<feature>.py`.
3. Never use floating-point for money: all inputs and outputs must be signed integer paise.
4. Ensure all stochastic components accept an explicit `seed: int = 42`.
5. Return a list of `LedgerStep` dictionaries for every calculation to maintain audit trail transparency.

### 5.3 Adding a New Frontend Page or View
1. Create page component in `apps/web/src/app/<route>/page.tsx`.
2. Import domain types from `@fdl/shared`.
3. Fetch data from backend API (`http://localhost:8000/api/...`).
4. Format all paise amounts using `formatINR(paise)`.
5. Maintain the dark slate Tailwind aesthetic (`bg-slate-950`, `bg-slate-900`, `border-slate-800`).

---

## 6. Pre-Commit Checklist for AI Agents & Developers

Before completing any task, ensure:
- [ ] No floating-point arithmetic used for currency (all amounts in integer paise).
- [ ] Debits are signed negative (`< 0`) and credits are signed positive (`> 0`).
- [ ] Dates formatted strictly as `YYYY-MM-DD`.
- [ ] All new backend endpoints validate inputs using Pydantic schemas.
- [ ] No LLMs perform arithmetic or decision logic.
- [ ] All LLM narrative outputs pass through `guard.py` number verification.
- [ ] Frontend builds cleanly with zero TypeScript errors (`pnpm build`).
- [ ] Pytest passes with zero failures (`pytest -v`).

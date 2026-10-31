# Known Issues & Bug Register — Financial Decision Lab (FDL)

**Audit Date**: October 2026  
**Auditor**: Senior QA Engineer & Backend Architect  
**Scope**: Identified Bugs, Edge Cases, Discrepancies, and Technical Debt  

---

## 1. Summary of Identified Issues

| Bug ID | Title | Severity | Component | Resolution Effort |
|---|---|---|---|---|
| **KI-01** | Pytest Order-Dependent Database Schema Initialization | **HIGH** | `apps/api/tests/` | **RESOLVED** (Added `conftest.py`) |
| **KI-02** | Type Contract Mismatch on `narration` (`string` vs `object`) | **MEDIUM** | `@fdl/shared`, `apps/web/lab` | Low (Align type definition) |
| **KI-03** | Endpoint Path Discrepancy (`investment-advice` vs `liquidity/advice`) | **MEDIUM** | `apps/api/routers/dashboard.py`, Docs | Low (Add route alias) |
| **KI-04** | Missing Statement Ingestion UI Component in Web App | **HIGH** | `apps/web/src/app` | **RESOLVED** (Implemented `StatementUploadModal`) |
| **KI-05** | Read-Only Frontend for Category, Recurring, and Anomaly Mutations | **MEDIUM** | `apps/web/src/app` | Medium (Add action buttons) |
| **KI-06** | Privacy Page Displays Static Mock Instead of Querying Live Egress Logs | **MEDIUM** | `apps/web/src/app/privacy` | Low (Fetch from `api.ts`) |
| **KI-07** | Missing ESLint Dependencies & Config Causing `pnpm lint` Failure | **LOW** | `packages/shared`, `apps/web` | Low (Install eslint & config) |
| **KI-08** | Environment Variable Mismatch (`GROQ_API_KEY` vs `GEMINI_API_KEY`) | **LOW** | `.env.example`, `llm_client.py` | Low (Update `.env.example`) |
| **KI-09** | Hardcoded Merchant String Matching in Dashboard Router | **LOW** | `apps/api/routers/dashboard.py` | Low (Query transaction record) |
| **KI-10** | SQLite Foreign Key Constraints Not Enabled by Default Connection Pragma | **MEDIUM** | `apps/api/db/database.py` | Low (Add connect event listener) |

---

## 2. Detailed Bug Reports & Reproduction Steps

### KI-01: Pytest Order-Dependent Database Schema Initialization
- **Severity**: **HIGH**
- **Affected Module**: `apps/api/tests/`
- **Description**: Running `pytest` on a fresh machine or without prior database state fails on `test_affordability_engine.py::test_api_affordability_and_whatif_endpoints` with `sqlite3.OperationalError: no such table: accounts`.
- **Root Cause**: `test_api_endpoints.py` defines `@pytest.fixture(autouse=True) def setup_clean_db()` internally. Because `test_affordability_engine.py` executes before `test_api_endpoints.py` in alphabetical sort, tables do not yet exist when it runs.
- **Reproduction**:
  ```bash
  rm apps/api/fdl.db
  cd apps/api
  pytest tests/test_affordability_engine.py -v
  ```
- **Expected Behavior**: All tests create necessary tables before executing API requests.
- **Actual Behavior**: Fails with `OperationalError: no such table: accounts`.
- **Suggested Resolution**: Create a shared `apps/api/tests/conftest.py` containing:
  ```python
  import pytest
  from db.database import Base, engine

  @pytest.fixture(scope="session", autouse=True)
  def initialize_test_database():
      Base.metadata.create_all(bind=engine)
      yield
  ```

---

### KI-02: Type Contract Mismatch on `narration` (`string` vs `object`)
- **Severity**: **MEDIUM**
- **Affected Module**: `packages/shared/src/types/index.ts`, `apps/api/routers/affordability.py`, `apps/web/src/app/lab/page.tsx`
- **Description**: The shared TypeScript contract `AffordabilityResponse` defines `narration` as:
  ```typescript
  narration?: {
    text: string;
    guard_status: 'passed' | 'fallback_template';
  };
  ```
  However, the backend returns `decision["narration"] = "Verdict: Affordable..."` (a plain Python `str`), and `apps/web/src/app/lab/page.tsx` renders `<p>{decision.narration}</p>`. If the backend were to return the object as specified in `@fdl/shared`, React would crash with `Objects are not valid as a React child`.
- **Suggested Resolution**: Either update `@fdl/shared` to `narration?: string | { text: string; guard_status: string }` or update the backend to return the object and frontend to render `{typeof decision.narration === 'string' ? decision.narration : decision.narration?.text}`.

---

### KI-03: Endpoint Path Discrepancy for Investment Advice
- **Severity**: **MEDIUM**
- **Affected Module**: `apps/api/routers/dashboard.py`, `docs/API_PROPS_AND_ENDPOINTS.md`
- **Description**: `docs/API_PROPS_AND_ENDPOINTS.md` line 152 documents `POST /api/dashboard/liquidity/advice`. The router in `dashboard.py` line 393 implements `@router.post("/investment-advice")`, making the path `POST /api/dashboard/investment-advice`.
- **Suggested Resolution**: Add an endpoint alias in `routers/dashboard.py` so both `/investment-advice` and `/liquidity/advice` resolve to the same handler:
  ```python
  @router.post("/liquidity/advice")
  @router.post("/investment-advice")
  def get_investment_advice(...):
  ```

---

### KI-04: Missing Statement Ingestion UI Component in Web App
- **Severity**: **HIGH**
- **Affected Module**: `apps/web/src/app/`
- **Description**: While `apps/web/src/lib/api.ts` defines `previewStatement` and `commitStatement`, there is no button, modal, or page in the frontend UI allowing a user to upload their bank statement. Currently, statements must be loaded via the Python CLI script `seed_demo.py` or curl/Postman.
- **Suggested Resolution**: Add an "Upload Statement" modal on the Dashboard (`apps/web/src/app/page.tsx`) and Navigation Bar (`apps/web/src/app/layout.tsx`) that prompts for file drag-and-drop, calls `api.previewStatement`, displays the preview summary, and commits.

---

### KI-05: Read-Only Frontend for Category, Recurring, and Anomaly Mutations
- **Severity**: **MEDIUM**
- **Affected Module**: `apps/web/src/app/transactions/page.tsx`, `recurring/page.tsx`, `anomalies/page.tsx`
- **Description**: The backend provides fully functioning, tested endpoints for:
  - `PATCH /api/transactions/{id}/category` (reclassify category with merchant scope)
  - `POST /api/transactions/undo` (revert category change)
  - `PATCH /api/recurring/{id}` (confirm/reject detected subscription)
  - `POST /api/anomalies/{id}/feedback` (mark as expected, duplicate, or disputed)
  However, all three corresponding frontend pages are currently read-only display tables with no interactive action buttons or dropdowns.
- **Suggested Resolution**: Add UI controls to trigger these existing API endpoints from the respective web pages.

---

### KI-06: Privacy Page Displays Static Mock Instead of Live Egress Logs
- **Severity**: **MEDIUM**
- **Affected Module**: `apps/web/src/app/privacy/page.tsx`
- **Description**: `apps/web/src/app/privacy/page.tsx` line 110 displays hardcoded text: *"Local Mode Active: 0 external egress calls recorded"*. It does not call `api.getEgressLogs()` or `/api/privacy/status` to show actual database egress records.
- **Suggested Resolution**: Add `useEffect` to fetch live egress events from `api.getEgressLogs()` and render them in a real-time table.

---

### KI-07: Missing ESLint Dependencies & Config Causing `pnpm lint` Failure
- **Severity**: **LOW**
- **Affected Module**: `packages/shared/package.json`, `apps/web`
- **Description**: Running `pnpm lint` in the repository root fails because `packages/shared` has `"lint": "eslint ."` but `eslint` is not installed, and `apps/web` lacks an `.eslintrc.json`.
- **Suggested Resolution**: Add `eslint` to root `devDependencies` and add standard `.eslintrc.json` files to `packages/shared` and `apps/web`.

---

### KI-08: Environment Variable Naming Mismatch for AI Services
- **Severity**: **LOW**
- **Affected Module**: `.env.example`, `apps/api/ai/llm_client.py`
- **Description**: `.env.example` documents `GROQ_API_KEY` and `OLLAMA_BASE_URL`. However, `apps/api/ai/llm_client.py` looks for `GEMINI_API_KEY` and `OLLAMA_HOST`. Groq is never referenced in code.
- **Suggested Resolution**: Update `.env.example` to list `GEMINI_API_KEY=` and `OLLAMA_HOST=http://localhost:11434`.

---

### KI-09: Hardcoded Merchant String Matching in Dashboard Router
- **Severity**: **LOW**
- **Affected Module**: `apps/api/routers/dashboard.py` lines 284–291
- **Description**: The dashboard router determines merchant labels for anomalies using hardcoded string matching (`"RELIANCE DIGITAL"`, `"GADGET"`, `"XYZ"`). If statements contain other merchants, they default to `"XYZ Store"`.
- **Suggested Resolution**: Sourced merchant name directly from the joined `Transaction.normalized_description` or `Transaction.merchant_id`.

---

### KI-10: SQLite Foreign Key Constraints Not Enabled by Default
- **Severity**: **MEDIUM**
- **Affected Module**: `apps/api/db/database.py`
- **Description**: Foreign key enforcement is disabled by default in SQLite. Deleting an account or source file does not trigger relational integrity errors unless `PRAGMA foreign_keys = ON;` is set.
- **Suggested Resolution**: Add SQLAlchemy engine connect event listener in `apps/api/db/database.py` to enable foreign keys on every connection.


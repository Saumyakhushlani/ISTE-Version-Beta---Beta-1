# Backend API Inventory & Execution Audit — Financial Decision Lab (FDL)

**Audit Date**: October 2026  
**Auditor**: Senior QA & Backend Engineer  
**Scope**: 100% of Registered Endpoints, HTTP Methods, Validation, and Runtime Behavior  

---

## 1. Master API Inventory

The FastAPI application registers **24 distinct endpoint operations** across 9 router modules and 1 health endpoint. None of the endpoints require authentication headers (local single-tenant architecture).

| # | Method | Endpoint Path | Module | Auth | Input Format | Expected Response | Runtime Status | Verified Result | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **1** | `GET` | `/health` | `main.py` | None | None | `{"status": "healthy", ...}` | `200 OK` | **PASS** | Returns service health & storage engine |
| **2** | `GET` | `/api/dashboard` | `routers/dashboard.py` | None | Query params (`account_id`, `months`, `start_date`, `end_date`) | JSON summary (KPIs, categories, cash flow, forecast, accounts) | `200 OK` | **PASS** | Handles both empty DB and multi-bank states |
| **3** | `POST` | `/api/dashboard/investment-advice` | `routers/dashboard.py` | None | JSON body (`target_amount_paise`, `investment_label`) | JSON allocation & feasibility | `200 OK` | **PASS** | Documented as `/liquidity/advice` in PRD |
| **4** | `POST` | `/api/imports/preview` | `routers/imports.py` | None | `multipart/form-data` (`file`, `bank_hint`, `password`) | Staged preview object with `file_id`, sample rows | `200 OK` | **PASS** | Parses CSV & encrypted PDFs without saving |
| **5** | `POST` | `/api/imports/preview/async` | `routers/imports.py` | None | `multipart/form-data` (`file`, `bank_hint`, `password`) | `{"job_id": "...", "status": "QUEUED"}` | `200 OK` | **PASS** | Background queue parsing for large files |
| **6** | `GET` | `/api/imports/jobs/{job_id}` | `routers/imports.py` | None | Path param (`job_id`) | Background job status & parsed payload | `200 OK` / `404` | **PASS** | Status transitions from QUEUED to COMPLETED |
| **7** | `POST` | `/api/imports/commit` | `routers/imports.py` | None | Form data (`file_id`, `account_id`) | Ingestion report (`inserted`, `duplicates`, etc.) | `200 OK` / `404` | **PASS** | Commits to DB, pops staged cache (idempotent) |
| **8** | `GET` | `/api/transactions` | `routers/transactions.py` | None | Query params (`limit`, `offset`, `account_id`, `type`, etc.) | Paginated transaction list | `200 OK` | **PASS** | Supports multi-parameter filtering & search |
| **9** | `GET` | `/api/transactions/corrections` | `routers/transactions.py` | None | Query params (`limit`, `offset`) | Category correction audit ledger | `200 OK` | **PASS** | Used for undo tracking |
| **10** | `PATCH` | `/api/transactions/{txn_id}/category` | `routers/transactions.py` | None | Path param + JSON body (`category_id`, `scope`, `dry_run`) | Update result with `log_id` | `200 OK` / `404` | **PASS** | Supports single txn, merchant scope, dry run |
| **11** | `POST` | `/api/transactions/{txn_id}/category` | `routers/transactions.py` | None | Path param + JSON body | Same as PATCH | `200 OK` / `404` | **PASS** | Dual HTTP method support |
| **12** | `POST` | `/api/transactions/undo` | `routers/transactions.py` | None | JSON body (`log_id`) | Rollback status & restored `category_id` | `200 OK` / `404` | **PASS** | Restores prior category and marks undone |
| **13** | `POST` | `/api/affordability` | `routers/affordability.py` | None | JSON body (`purchase_amount_minor`, `timing`, `payment_type`) | 8-step Reasoning Ledger, Verdict, Headroom | `200 OK` | **PASS** | Core 5,000 Monte Carlo decision calculation |
| **14** | `POST` | `/api/affordability/ask` | `routers/affordability.py` | None | JSON body (`question`) | Parsed query parameters + Affordability response | `200 OK` | **PASS** | Natural language extraction + guarded narration |
| **15** | `POST` | `/api/scenarios/compare` | `routers/whatif.py` | None | JSON body (`purchase_amount_minor`, `scenarios`) | Baseline summary vs simulated What-If overlays | `200 OK` | **PASS** | Computes side-by-side delta headroom |
| **16** | `GET` | `/api/sufficiency` | `routers/sufficiency.py` | None | None | 4-point gate status, checks, missing items | `200 OK` | **PASS** | Gate status: `OK`, `LOW_CONFIDENCE`, `INSUFFICIENT` |
| **17** | `GET` | `/api/recurring` | `routers/recurring.py` | None | Query params (`type_filter`, `cadence`, `search`) | List of detected recurring obligations | `200 OK` | **PASS** | Median amount in paise, cadence confidence |
| **18** | `GET` | `/api/recurring/upcoming` | `routers/recurring.py` | None | Query params (`days`, `months`, `is_income`, `account_id`) | Upcoming calendar with bank attribution | `200 OK` | **PASS** | Generates calendar events up to 90 days out |
| **19** | `PATCH` | `/api/recurring/{item_id}` | `routers/recurring.py` | None | Path param + JSON body (`user_status`, `typical_amount_minor`) | Updated recurring item | `200 OK` / `404` | **PASS** | User confirm/reject or amount modification |
| **20** | `GET` | `/api/anomalies` | `routers/anomalies.py` | None | Query params (`type_filter`, `severity_filter`, `search`) | Flagged anomalies with full transaction info | `200 OK` | **PASS** | Outliers (MAD Mod Z > 3.5), duplicate charges |
| **21** | `POST` | `/api/anomalies/{anomaly_id}/feedback` | `routers/anomalies.py` | None | Path param + JSON body (`feedback`) | Feedback status (`expected`, `real_duplicate`, etc.) | `200 OK` / `404` | **PASS** | Records user resolution feedback |
| **22** | `PATCH` | `/api/anomalies/{anomaly_id}/feedback` | `routers/anomalies.py` | None | Path param + JSON body (`feedback`) | Same as POST | `200 OK` / `404` | **PASS** | Dual HTTP method support |
| **23** | `GET` | `/api/privacy/status` | `routers/privacy.py` | None | None | `{"privacy_mode": "local", "air_gap_status": "ENFORCED"}` | `200 OK` | **PASS** | Air-gap verification and local DB location |
| **24** | `GET` | `/api/privacy/egress-log` | `routers/privacy.py` | None | Query params (`mode_filter`, `destination`, `limit`) | Paginated outbound network audit log | `200 OK` | **PASS** | Cryptographic logging of external dispatches |

---

## 2. Comprehensive Test Execution Results (42 Test Cases)

All 42 test cases were executed against an isolated, clean test instance using real synthetic statement inputs (`data/synthetic/aarav/`):

| Test ID | Method | Endpoint Path | Scenario Category | Test Payload / Query | Expected Status | Actual Status | Result | Findings & Details |
|---|---|---|---|---|---|---|---|---|
| `TC-01` | `GET` | `/health` | Happy Path | None | 200 | 200 | **PASS** | Health status: "healthy", storage: "sqlite", privacy: "local". |
| `TC-02` | `GET` | `/api/dashboard` | Empty State | None (Zero DB records) | 200 | 200 | **PASS** | Gracefully handles empty DB: `combined_liquid_paise = 0`, `health_status = "INSUFFICIENT"`. |
| `TC-03` | `POST` | `/api/imports/preview` | Happy Path | Aarav HDFC CSV (75 rows) | 200 | 200 | **PASS** | Parsed 75 rows, reconciliation status: PASSED, file_id generated. |
| `TC-04` | `POST` | `/api/imports/preview` | Validation | Missing `file` field | 422 | 422 | **PASS** | FastAPI Pydantic validator correctly rejected request. |
| `TC-05` | `POST` | `/api/imports/preview/async` | Happy Path | Aarav HDFC CSV async upload | 200 | 200 | **PASS** | Background thread started, status: QUEUED, job_id generated. |
| `TC-06` | `GET` | `/api/imports/jobs/{job_id}` | Happy Path | Valid job_id from TC-05 | 200 | 200 | **PASS** | Polling retrieved status: COMPLETED with parsed transaction summary. |
| `TC-07` | `GET` | `/api/imports/jobs/{job_id}` | Error Handling | Nonexistent job ID | 404 | 404 | **PASS** | Returns 404 with detail "Job not found or expired." |
| `TC-08` | `POST` | `/api/imports/commit` | Happy Path | Staged file_id from TC-03 | 200 | 200 | **PASS** | Created account, committed 75 transactions, detected 1 anomaly, updated 6 recurring items. |
| `TC-09` | `POST` | `/api/imports/commit` | Error Handling | Re-commit consumed file_id | 404 | 404 | **PASS** | File preview correctly popped from memory staging cache; prevents duplicate commit. |
| `TC-10` | `GET` | `/api/dashboard` | Happy Path | Seeded state (HDFC + SBI) | 200 | 200 | **PASS** | Combined liquid paise: 35,825,800, 2 accounts, 90-day forecast generated, health=OK. |
| `TC-11` | `GET` | `/api/dashboard` | Filtering | `account_id` and `months=3` | 200 | 200 | **PASS** | Correctly filters transactions and returns filtered KPI metrics. |
| `TC-12` | `GET` | `/api/dashboard` | Validation | `months=0` (out of bounds) | 422 | 422 | **PASS** | Pydantic `ge=1` validation caught boundary violation. |
| `TC-13` | `POST` | `/api/dashboard/investment-advice` | Happy Path | `target_amount_paise = 5000000` | 200 | 200 | **PASS** | Verdict: FEASIBLE, allocated ₹50,000 from account with highest surplus. |
| `TC-14` | `POST` | `/api/dashboard/investment-advice` | Validation | Empty JSON body `{}` | 422 | 422 | **PASS** | Caught missing required field `target_amount_paise`. |
| `TC-15` | `GET` | `/api/transactions` | Happy Path | `limit=20`, `offset=0` | 200 | 200 | **PASS** | Total: 99 transactions, returned exactly 20 records. |
| `TC-16` | `GET` | `/api/transactions` | Filtering | `type=credit` | 200 | 200 | **PASS** | 100% of returned items have `amount_minor > 0`. |
| `TC-17` | `GET` | `/api/transactions` | Filtering | `type=debit` | 200 | 200 | **PASS** | 100% of returned items have `amount_minor < 0`. |
| `TC-18` | `GET` | `/api/transactions` | Validation | `limit=0` (out of bounds) | 422 | 422 | **PASS** | Caught boundary violation (`limit ge 1`). |
| `TC-19` | `PATCH` | `/api/transactions/{id}/category` | Happy Path | `category_id="cat_entertainment"` | 200 | 200 | **PASS** | Mutated transaction, created `CorrectionLog` record with `before_json` and `after_json`. |
| `TC-20` | `POST` | `/api/transactions/{id}/category` | Happy Path | `dry_run=true` | 200 | 200 | **PASS** | Returned affected preview count without mutating database. |
| `TC-21` | `PATCH` | `/api/transactions/{id}/category` | Error Handling | Nonexistent `txn_id` | 404 | 404 | **PASS** | Returns 404 "Transaction not found." |
| `TC-22` | `GET` | `/api/transactions/corrections` | Happy Path | List corrections | 200 | 200 | **PASS** | Retrieved audit log containing correction from TC-19. |
| `TC-23` | `POST` | `/api/transactions/undo` | Happy Path | `log_id` from TC-19 | 200 | 200 | **PASS** | Successfully restored previous category; marked `undone_at`. |
| `TC-24` | `POST` | `/api/transactions/undo` | Error Handling | Re-undo already undone log | 404 | 404 | **PASS** | Returns 404 "No active correction found to undo." |
| `TC-25` | `POST` | `/api/affordability` | Happy Path | ₹80,000 cash next month | 200 | 200 | **PASS** | Evaluated 5,000 runs, returned 8-step Reasoning Ledger, buffer, headroom, verdict. |
| `TC-26` | `POST` | `/api/affordability` | Happy Path | ₹80,000 on 6-month EMI | 200 | 200 | **PASS** | Recomputed with ₹13,333/mo EMI installment; verdict returned AFFORDABLE. |
| `TC-27` | `POST` | `/api/affordability` | Validation | Missing `purchase_amount_minor` | 422 | 422 | **PASS** | Caught missing required field. |
| `TC-28` | `POST` | `/api/affordability/ask` | Happy Path | "Can I buy a laptop for 75,000?" | 200 | 200 | **PASS** | Extracted `purchase_amount_minor = 7500000`, returned decision + guarded narrative. |
| `TC-29` | `POST` | `/api/scenarios/compare` | Happy Path | Baseline vs 2 What-If scenarios | 200 | 200 | **PASS** | Compared EMI vs Delay; computed `delta_headroom_paise` accurately. |
| `TC-30` | `GET` | `/api/sufficiency` | Happy Path | Evaluate data sufficiency | 200 | 200 | **PASS** | Status: OK, coverage: 240 days, 4/4 checks passed. |
| `TC-31` | `GET` | `/api/recurring` | Happy Path | List recurring obligations | 200 | 200 | **PASS** | Returned 10 detected items (Salary, Rent, Car EMI, Netflix, Swiggy, etc.). |
| `TC-32` | `GET` | `/api/recurring` | Filtering | `type_filter=salary` | 200 | 200 | **PASS** | Filtered exactly to recurring income credit. |
| `TC-33` | `GET` | `/api/recurring/upcoming` | Happy Path | `days=60` projection | 200 | 200 | **PASS** | Sourced 22 payment events linked to specific bank accounts. |
| `TC-34` | `GET` | `/api/recurring/upcoming` | Filtering | `is_income=false` | 200 | 200 | **PASS** | Filtered exclusively to expense events. |
| `TC-35` | `PATCH` | `/api/recurring/{id}` | Happy Path | `user_status="confirmed"` | 200 | 200 | **PASS** | Successfully updated user verification tag. |
| `TC-36` | `PATCH` | `/api/recurring/{id}` | Error Handling | Nonexistent `item_id` | 404 | 404 | **PASS** | Returns 404 "Recurring item not found." |
| `TC-37` | `GET` | `/api/anomalies` | Happy Path | List anomalies | 200 | 200 | **PASS** | Returned flagged outliers with transaction date, merchant, and rule ID. |
| `TC-38` | `POST` | `/api/anomalies/{id}/feedback` | Happy Path | `feedback="expected"` | 200 | 200 | **PASS** | Persisted user feedback resolution in database. |
| `TC-39` | `PATCH` | `/api/anomalies/{id}/feedback` | Happy Path | `feedback="real_duplicate"` | 200 | 200 | **PASS** | Updated feedback via PATCH. |
| `TC-40` | `POST` | `/api/anomalies/{id}/feedback` | Error Handling | Nonexistent `anomaly_id` | 404 | 404 | **PASS** | Returns 404 "Anomaly not found." |
| `TC-41` | `GET` | `/api/privacy/status` | Happy Path | Check air-gap status | 200 | 200 | **PASS** | Verified `privacy_mode="local"`, `air_gap_status="ENFORCED"`. |
| `TC-42` | `GET` | `/api/privacy/egress-log` | Happy Path | Audit outbound calls | 200 | 200 | **PASS** | Sourced egress events from `egress_log` table. |

---

## 3. Key Findings & Discrepancies

1. **Endpoint Name Discrepancy**:
   - `docs/API_PROPS_AND_ENDPOINTS.md` documents `POST /api/dashboard/liquidity/advice`.
   - The actual implementation in `routers/dashboard.py` line 393 registers `@router.post("/investment-advice")`, making the real endpoint `POST /api/dashboard/investment-advice`.
2. **Narration Schema Divergence**:
   - `packages/shared/src/types/index.ts` specifies:
     ```typescript
     narration?: { text: string; guard_status: 'passed' | 'fallback_template'; }
     ```
   - The actual backend endpoint `POST /api/affordability` returns `narration: str` directly. The frontend `apps/web/src/app/lab/page.tsx` line 293 renders `{decision.narration}` as a string.
3. **No Authentication on Any Endpoint**:
   - Every single endpoint is unauthenticated. Any client capable of reaching `http://127.0.0.1:8000` has complete unrestricted read/write access.


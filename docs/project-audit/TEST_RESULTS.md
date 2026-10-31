# Test Results & Verification Report — Financial Decision Lab (FDL)

**Audit Date**: October 2026  
**Auditor**: Senior QA Engineer  
**Scope**: Full Test Suite Execution, Build Verifications, Type-Checking, and Static Analysis  

---

## 1. Test Execution Summary

| Test Domain | Executed | Passed | Failed | Blocked | Pass Rate | Status |
|---|---|---|---|---|---|---|
| **FastAPI Backend Pytest Suite** | 34 | 34 | 0 | 0 | 100% | **PASS** |
| **Comprehensive Endpoint Audit Suite** | 42 | 42 | 0 | 0 | 100% | **PASS** |
| **Shared Contracts TypeScript Typecheck** | 1 | 1 | 0 | 0 | 100% | **PASS** |
| **Next.js Web App Production Build** | 1 | 1 | 0 | 0 | 100% | **PASS** |
| **Turborepo Workspace Linting** | 1 | 0 | 1 | 0 | 0% | **FAIL** |
| **Total Automated Verifications** | **79** | **78** | **1** | **0** | **98.7%** | **HEALTHY** |

---

## 2. Backend Automated Test Results (`pytest`)

**Command**: `cd apps/api && .venv\Scripts\pytest.exe -v`  
**Execution Time**: 12.59 seconds  
**Environment**: Python 3.13.14 (win32), pytest 9.2.0, pluggy 1.7.0  

| Test File | Test Case Name | Verified Behavior | Status |
|---|---|---|---|
| `test_affordability_engine.py` | `test_income_volatility_and_buffer_multiplier` | Stable salary $CV \le 0.10 \Rightarrow k = 1.0$; Variable income $CV > 0.30 \Rightarrow k = 2.0$. | **PASSED** |
| `test_affordability_engine.py` | `test_emi_amortization_paise` | ₹60,000 on 6-month 0% EMI = 1,000,000 paise/mo; ₹100,000 at 12% 12-month EMI is accurate. | **PASSED** |
| `test_affordability_engine.py` | `test_monte_carlo_reproducibility` | Seed 42 produces identical P10 and P50 lowest balance on repeated runs. | **PASSED** |
| `test_affordability_engine.py` | `test_number_verification_guard_prevents_hallucination` | Accepts verified ledger figures; rejects unverified ₹99,999 hallucinations. | **PASSED** |
| `test_affordability_engine.py` | `test_natural_language_extractor` | Parses "₹79,900 next month" $\Rightarrow 7990000$ paise; "1.2 lakh on 6 months EMI" $\Rightarrow 12000000$ paise. | **PASSED** |
| `test_affordability_engine.py` | `test_affordability_verdict_transitions` | Affordable vs impossible purchase classification. | **PASSED** |
| `test_affordability_engine.py` | `test_api_affordability_and_whatif_endpoints` | Tests live `/api/affordability` and `/api/affordability/ask` endpoints. | **PASSED** |
| `test_api_endpoints.py` | `test_health_check` | `GET /health` returns status healthy and sqlite storage. | **PASSED** |
| `test_api_endpoints.py` | `test_preview_and_commit_hdfc_statement` | Parses 75 rows, reconciliation PASSED, commits to DB. | **PASSED** |
| `test_api_filters_and_pagination.py` | `test_dashboard_query_parameters` | Filters dashboard metrics by account and months. | **PASSED** |
| `test_api_filters_and_pagination.py` | `test_transactions_filters_and_pagination` | Slices transactions by limit, offset, and categories. | **PASSED** |
| `test_api_filters_and_pagination.py` | `test_transactions_corrections_listing` | Lists category correction audit trail. | **PASSED** |
| `test_api_filters_and_pagination.py` | `test_recurring_filters_and_pagination` | Slices recurring items by cadence and search. | **PASSED** |
| `test_api_filters_and_pagination.py` | `test_anomalies_filters_and_pagination` | Filters anomalies by severity and time. | **PASSED** |
| `test_api_filters_and_pagination.py` | `test_privacy_egress_log_filters` | Filters egress logs by mode and destination. | **PASSED** |
| `test_async_job_queue.py` | `test_async_statement_preview_queue` | Asynchronous file parsing job submission and polling. | **PASSED** |
| `test_category_undo.py` | `test_category_correction_and_undo_flow` | Mutates category, logs correction, rolls back via `/undo`. | **PASSED** |
| `test_data_pipeline.py` | `test_indian_amount_parsing_to_paise` | "80,000.00" $\Rightarrow 8000000$ paise; "1,500.50" $\Rightarrow 150050$ paise. | **PASSED** |
| `test_data_pipeline.py` | `test_aarav_hdfc_reconciliation` | Verifies opening + delta = closing balance. | **PASSED** |
| `test_data_pipeline.py` | `test_deduplication_idempotence` | Merges duplicate rows based on hash fingerprint. | **PASSED** |
| `test_data_pipeline.py` | `test_internal_transfer_pairing` | Pairs debit on HDFC with credit on SBI within 2-day window. | **PASSED** |
| `test_data_pipeline.py` | `test_categorization_rules` | Matches Swiggy, Netflix, Salary correctly. | **PASSED** |
| `test_data_pipeline.py` | `test_sufficiency_gate_refusal_on_short_data` | Short 45-day statement triggers INSUFFICIENT_DATA refusal. | **PASSED** |
| `test_data_pipeline.py` | `test_recurring_cadence_detection` | Detects monthly salary and subscriptions with confidence $\ge 0.65$. | **PASSED** |
| `test_data_pipeline.py` | `test_anomaly_detection` | Flags Modified Z-Score $> 3.5$ spending outliers. | **PASSED** |
| `test_egress_logging.py` | `test_egress_logging_and_air_gap_enforcement` | Enforces local air-gap and logs events to `egress_log`. | **PASSED** |
| `test_llm_guard_integration.py` | `test_prompt_generation_and_fallback` | Validates prompt construction and deterministic fallback. | **PASSED** |
| `test_multi_account_liquidity.py` | `test_multi_bank_import_and_liquidity_breakdown` | HDFC + SBI multi-bank combined liquidity math. | **PASSED** |
| `test_multi_account_liquidity.py` | `test_cumulative_upload_continuity` | Seamless continuous balance tracking across uploads. | **PASSED** |
| `test_multi_account_liquidity.py` | `test_upcoming_payments_calendar_with_bank_attribution` | Attributes upcoming bills to specific accounts. | **PASSED** |
| `test_multi_account_liquidity.py` | `test_investment_advice_sourcing` | Selects account with maximum surplus for capital deployment. | **PASSED** |
| `test_multi_account_liquidity.py` | `test_anomalies_api_endpoint` | Retrieves flagged anomalies via REST API. | **PASSED** |
| `test_pdf_decryption.py` | `test_encrypted_pdf_requires_password` | Requires password for encrypted PDF statements. | **PASSED** |
| `test_pdf_decryption.py` | `test_encrypted_pdf_rejects_wrong_password` | Returns 400 Bad Request on incorrect password. | **PASSED** |

---

## 3. Frontend & Shared Workspace Build Results

### 3.1 Shared Contracts (`@fdl/shared`)
- **Command**: `pnpm --filter @fdl/shared typecheck`
- **Output**: `tsc --noEmit` exited with code 0.
- **Result**: **PASS** (Zero TypeScript errors).

### 3.2 Next.js Web Application (`apps/web`)
- **Command**: `pnpm --filter web build`
- **Build Output**:
  ```
  ▲ Next.js 14.2.24
  ✓ Compiled successfully
  Linting and checking validity of types ...
  Collecting page data ...
  Generating static pages (9/9)
  Finalizing page optimization ...

  Route (app)                              Size     First Load JS
  ┌ ○ /                                    121 kB          264 kB
  ├ ○ /_not-found                          874 B          88.3 kB
  ├ ○ /anomalies                           2.87 kB         135 kB
  ├ ○ /lab                                 4.93 kB         140 kB
  ├ ○ /privacy                             1.98 kB         135 kB
  ├ ○ /recurring                           2.83 kB         135 kB
  └ ○ /transactions                        3.21 kB         136 kB
  ```
- **Result**: **PASS** (All 6 core application routes statically generated with zero errors).

### 3.3 Linting Execution
- **Command**: `pnpm lint`
- **Error Output**:
  ```
  @fdl/shared:lint: 'eslint' is not recognized as an internal or external command
  ```
- **Result**: **FAIL**
- **Cause**: `packages/shared/package.json` contains `"lint": "eslint ."` but `eslint` is not listed in `devDependencies`. Furthermore, `apps/web` does not have an initialized `.eslintrc.json`.

---

## 4. Step-by-Step Reproduction Instructions

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Activate Python environment and run backend tests
cd apps/api
.venv\Scripts\activate
pytest -v

# 3. Run endpoint audit verification harness
python "C:\Users\ASUS\.gemini\antigravity\brain\7d388259-8a6f-45f2-bae2-dc310a57f583\scratch\audit_endpoint_test.py"

# 4. Run TypeScript contract check
cd ../..
pnpm --filter @fdl/shared typecheck

# 5. Run Next.js production build
pnpm --filter web build
```


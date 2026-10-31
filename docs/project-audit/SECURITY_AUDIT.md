# Security & Privacy Audit — Financial Decision Lab (FDL)

**Audit Date**: October 2026  
**Auditor**: Senior Application Security Engineer  
**Scope**: Codebase Static Analysis, Runtime Attack Surface, Privacy Air-Gap, and Data Protection  

---

## 1. Executive Summary & Threat Profile

Financial Decision Lab is designed with a **Local-First, Air-Gapped Privacy Architecture**. Financial records, account balances, and statement text are processed on the user's machine and persisted in a local SQLite file (`fdl.db`).

However, from an application security standpoint, the application currently functions as an **unauthenticated local utility**. If exposed to a local area network (LAN) or deployed to a remote server without a reverse proxy authentication barrier, it presents critical vulnerabilities.

---

## 2. Security Vulnerability Findings & Matrix

| Vulnerability ID | Title | Severity | Affected Component / Files | Status |
|---|---|---|---|---|
| **SEC-01** | Total Absence of API Authentication & Authorization | **HIGH** | `apps/api/routers/*.py`, `apps/api/main.py` | **CONFIRMED** |
| **SEC-02** | Insecure Direct Object References (IDOR) on Mutations | **MEDIUM** | `transactions.py` L213, `recurring.py` L159, `anomalies.py` L118 | **CONFIRMED** |
| **SEC-03** | Missing File Upload Size & Memory Limits | **MEDIUM** | `apps/api/routers/imports.py` L33, L105 | **CONFIRMED** |
| **SEC-04** | Missing API Rate Limiting | **LOW** | `apps/api/main.py` | **CONFIRMED** |
| **SEC-05** | CORS Allow Credentials with Localhost Ports | **LOW** | `apps/api/main.py` L38–44 | **CONFIRMED** |
| **SEC-06** | SQL Injection Resistance | **INFO** | `apps/api/db/`, `apps/api/engine/` | **VERIFIED CLEAN** |
| **SEC-07** | Sensitive Data Exposure & Masking | **INFO** | `models.py`, `parsers/` | **VERIFIED CLEAN** |
| **SEC-08** | Committed Secrets Audit | **INFO** | Entire Repository, `.env.example` | **VERIFIED CLEAN** |

---

## 3. Detailed Vulnerability Analyses

### SEC-01: Total Absence of Authentication & Authorization (HIGH)
- **Affected Files**: All files in `apps/api/routers/`
- **Description**: None of the 24 backend endpoints enforce authentication. There are no session cookies, JWT bearer tokens, API keys, or user identities (`Depends(get_current_user)` is absent).
- **Impact**: Any process or device capable of sending HTTP requests to `http://127.0.0.1:8000` (or `http://0.0.0.0:8000` if bound to all interfaces) can read complete historical bank statements, account numbers, transactions, salary credits, and trigger category reclassifications or deletions.
- **Remediation**:
  1. For local desktop mode: Ensure FastAPI binds strictly to `127.0.0.1` (`API_HOST=127.0.0.1`) and never `0.0.0.0`.
  2. For web or multi-user deployment: Implement standard session authentication (e.g. FastAPI OAuth2 with HTTP-only cookies or JWT tokens).

### SEC-02: Insecure Direct Object Reference (IDOR) on Mutations (MEDIUM)
- **Affected Files**:
  - `apps/api/routers/transactions.py` (Line 213: `PATCH /{txn_id}/category`)
  - `apps/api/routers/recurring.py` (Line 159: `PATCH /{item_id}`)
  - `apps/api/routers/anomalies.py` (Line 118: `POST /{anomaly_id}/feedback`)
- **Description**: Mutations are performed directly by querying the primary key UUID (`Transaction.id`, `RecurringItem.id`, `Anomaly.id`) without scoping to a verified tenant or user ID (`db.query(Transaction).filter_by(id=txn_id).first()`).
- **Impact**: In a multi-user environment, any user who knows or guesses a UUID can mutate other users' transaction categories, recurring statuses, and anomaly feedback.
- **Remediation**: Filter all queries by both entity ID and the authenticated user's `account_id` / `user_id`.

### SEC-03: Missing File Upload Size & Memory Limits (MEDIUM)
- **Affected Files**: `apps/api/routers/imports.py` (Lines 47, 114)
- **Description**: The endpoints `POST /api/imports/preview` and `POST /api/imports/preview/async` call `await file.read()` directly into memory without checking `Content-Length` or enforcing a maximum file size limit.
- **Impact**: Uploading a multi-gigabyte crafted file or PDF zip bomb can exhaust host RAM, triggering an Out-Of-Memory (OOM) Denial-of-Service crash.
- **Remediation**: Add a streaming chunk reader with a hard threshold (e.g. 25MB max):
  ```python
  MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
  contents = await file.read(MAX_FILE_SIZE + 1)
  if len(contents) > MAX_FILE_SIZE:
      raise HTTPException(status_code=413, detail="Uploaded statement exceeds 25MB limit.")
  ```

### SEC-04: Missing API Rate Limiting (LOW)
- **Affected Files**: `apps/api/main.py`
- **Description**: Endpoints that invoke computationally intensive operations (e.g. `POST /api/affordability` which runs 5,000 Monte Carlo paths and SciPy statistical evaluations) have no rate limiting (`slowapi` or token bucket).
- **Impact**: Rapid automated POST requests can saturate CPU cores.
- **Remediation**: Integrate `slowapi` or an in-memory token-bucket limiter on `/api/affordability` and `/api/scenarios/compare` (e.g. 30 requests/minute).

### SEC-05: CORS Allow Credentials with Localhost Ports (LOW)
- **Affected Files**: `apps/api/main.py` Lines 38–44
- **Description**: `CORSMiddleware` allows `allow_credentials=True` with `allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"]`.
- **Impact**: If an attacker runs a malicious local web server on port 3000, it can make cross-origin requests with credentials.
- **Remediation**: In production, bind origins strictly to the production domain.

---

## 4. Privacy & Air-Gap Verification

### 4.1 Number-Verification Guard Verification
- **File**: `apps/api/ai/guard.py`
- **Mechanism**: Extracts every numeric token (currency, integer, float, percentage) from LLM output using regular expressions and cross-checks against the set of authorized values from the `Reasoning Ledger`.
- **Audit Result**: **PASSED**. Tested in `TC-28` and unit tests: hallucinations like ₹99,999 or ₹1,50,000 are rejected and replaced with deterministic fallback text.

### 4.2 Egress Logging & Air-Gap Enforcement
- **File**: `apps/api/middleware/egress.py`
- **Audit Result**: **PASSED**.
  - Default `PRIVACY_MODE="local"` blocks outbound cloud LLM requests and records local usage in `egress_log`.
  - Account numbers in `models.py` are strictly stored as `masked_last4` (`String(4)`). Full 16-digit account numbers are never persisted in the database.


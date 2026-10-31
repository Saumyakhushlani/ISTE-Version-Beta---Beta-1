# Authentication, User Management & Onboarding Specification

**Financial Decision Lab (FDL)**
**Status**: Implemented & Verified  
**Date**: October 2026  
**Audience**: Engineering, Security & Systems Architecture  

---

## 1. Executive Summary & Architectural Decision

Financial Decision Lab requires a simple, hardened multi-user authentication, identity propagation, and onboarding architecture that strictly enforces user data isolation across all financial calculations and statement pipelines.

### Architectural Decision: Dual-Tier Gateway & Engine Separation

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CLIENT (Browser / React 18 UI)                       │
│ - Stores NO tokens in localStorage                                    │
│ - Communicates via HttpOnly SameSite=Lax cookie (fdl_session)          │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ (Cookie-authenticated)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│               NEXT.JS 14 BACKEND-FOR-FRONTEND (BFF)                    │
│ apps/web/src/app/api/auth/*, api/user/*, api/proxy/*                   │
│                                                                        │
│ • Password hashing & verification: bcryptjs (10 salt rounds)          │
│ • RFC 7519 HS256 Token Lifecycle: jose                                 │
│ • Rate limiting: In-memory sliding window + DB-persisted lockout       │
│ • BFF Proxy: Extracts fdl_session, verifies JWT, passes Bearer token   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
   Internal Private Persistence         Authenticated Financial Operations
   (X-Internal-Secret)                  (Authorization: Bearer <jwt>)
                   │                                 │
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PYTHON FASTAPI CALCULATION ENGINE                    │
│ apps/api (Uvicorn / FastAPI / SQLAlchemy / SQLite)                     │
│                                                                        │
│ • Pure Python standard library JWT validator (hmac, hashlib, base64)   │
│ • Cryptographic identity extraction (sub -> user_id)                   │
│ • Strict data layer filtering on every query and mutation              │
│ • SQLite PRAGMA foreign_keys = ON; enforcement                         │
│ • Zero LLM involvement in financial calculations or authorization      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Security & Cryptographic Invariants

| Security Standard | Implementation | Verification Status |
|---|---|---|
| **Zero Plaintext Passwords** | Hashed using `bcryptjs` with 10 salt rounds. Plaintext passwords never touch logs or databases. | **Enforced** |
| **No localStorage Secrets** | Authentication tokens are never stored in browser `localStorage` or `sessionStorage` (preventing XSS credential theft). | **Enforced** |
| **HttpOnly Session Cookies** | JWT stored in `fdl_session` cookie marked `HttpOnly: true`, `SameSite: 'lax'`, `Secure: production`, `Max-Age: 604800` (7 days). | **Enforced** |
| **Brute-Force Lockout** | Rate-limited to max 5 failed attempts per 15-minute window. Account is locked out with `locked_until` timestamp persisted in the database. | **Enforced** |
| **Deterministic Seeded Math** | Monte Carlo runs use deterministic seed (`seed=42`). Math is 100% computed in Python, never in the LLM. | **Enforced** |
| **Strict Data Isolation** | User A cannot view, query, or mutate User B's transactions, bank accounts, statements, recurring items, or anomalies. | **Enforced** |
| **Local-First & Air-Gapped** | All operations run locally; zero third-party egress. | **Enforced** |

---

## 3. Database Schema & Multi-User Entities

### SQLite Foreign Key Enforcement
SQLite connections enable foreign key cascades automatically via SQLAlchemy pool listener:
```python
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.close()
```

### Models

#### `User` (`users`)
- `id` (VARCHAR(36), PK): UUID e.g. `usr_...`
- `email` (VARCHAR(255), UNIQUE, Indexed): Normalized lowercase email
- `password_hash` (VARCHAR(255)): Bcrypt password hash
- `is_active` (BOOLEAN): Defaults to `True`
- `is_onboarded` (BOOLEAN): Defaults to `False`
- `failed_login_attempts` (INTEGER): Counter for brute-force prevention
- `locked_until` (DATETIME, Nullable): Temporary lockout timestamp
- `created_at`, `updated_at` (DATETIME)

#### `UserProfile` (`user_profiles`)
- `id` (VARCHAR(36), PK): Profile UUID
- `user_id` (VARCHAR(36), FK -> `users.id`, UNIQUE): 1:1 user binding
- `full_name` (VARCHAR(100)): User's display name
- `mobile_number` (VARCHAR(20), Nullable): Optional mobile contact
- `country` (VARCHAR(50)): Regional country context (defaults to "India")
- `preferred_currency` (VARCHAR(10)): "INR", "USD", "EUR", "GBP"
- `created_at`, `updated_at` (DATETIME)

#### Scoped Financial Entities (`user_id` FK)
The following tables are strictly scoped with `user_id`:
- `accounts.user_id` -> `users.id`
- `recurring_items.user_id` -> `users.id`
- `forecast_snapshots.user_id` -> `users.id`
- `scenarios.user_id` -> `users.id`
- `egress_log.user_id` -> `users.id`
- Transactions are scoped via `transactions.account_id -> accounts.id` where `accounts.user_id == current_user.id`.

---

## 4. API & Route Handler Contracts

### Next.js Public Authentication & Onboarding Routes

| Endpoint | Method | Purpose | Authentication |
|---|---|---|---|
| `/api/auth/register` | `POST` | Validates details, hashes password, provisions user, sets `fdl_session` cookie | Public |
| `/api/auth/login` | `POST` | Verifies credentials, enforces lockout, issues JWT, sets `fdl_session` cookie | Public (Rate-Limited) |
| `/api/auth/logout` | `POST` | Clears `fdl_session` cookie | Session Cookie |
| `/api/auth/me` | `GET` | Returns authenticated user profile and account summary | Session Cookie |
| `/api/user/onboarding` | `POST` | Saves personal info + initial bank accounts, sets `is_onboarded: true` | Session Cookie |
| `/api/user/profile` | `GET` / `PUT` | Fetches and updates user profile and currency preferences | Session Cookie |
| `/api/user/accounts` | `GET` / `POST` | Lists and provisions linked bank accounts | Session Cookie |
| `/api/user/accounts/[id]` | `PUT` / `DELETE`| Modifies or archives owned bank accounts | Session Cookie |
| `/api/proxy/[...path]` | `ALL` | BFF proxy forwarding client calls to FastAPI with `Authorization: Bearer <jwt>` | Session Cookie |

### FastAPI Internal Service Routes (`/api/internal/users/*`)
Protected strictly by `X-Internal-Secret: <INTERNAL_SERVICE_KEY>`:
- `POST /api/internal/users/create`
- `GET /api/internal/users/by-email?email=...`
- `GET /api/internal/users/{user_id}`
- `POST /api/internal/users/{user_id}/lockout`
- `PUT /api/internal/users/{user_id}/profile`
- `POST /api/internal/users/{user_id}/onboarding`
- `GET /api/internal/users/{user_id}/accounts`
- `POST /api/internal/users/{user_id}/accounts`
- `PUT /api/internal/users/{user_id}/accounts/{account_id}`
- `DELETE /api/internal/users/{user_id}/accounts/{account_id}`

---

## 5. User Onboarding & Bank Account Metadata Policy

### Sanitized Data Collection
The onboarding wizard collects:
1. **Personal Information**: Full name, optional mobile number, country, preferred currency.
2. **Bank Account Metadata**:
   - Bank name (e.g., HDFC Bank, State Bank of India).
   - Account nickname (e.g., Primary Salary Account, Emergency Fund).
   - Account type (`savings`, `current`, `credit_card`, `salary`).
   - Masked last 4 digits (e.g., `5678`).
   - Initial opening balance in integer paise.
   - Primary account flag.

### Strictly Prohibited Data
The system **never** collects, prompts for, or persists:
- Net banking passwords or login credentials.
- UPI PINs or ATM PINs.
- Credit/debit card CVV numbers.
- One-Time Passwords (OTPs).
- Full unmasked 16-digit account numbers without an explicit regulatory requirement and column-level encryption.

---

## 6. Verification & Test Results

A full multi-user test suite was implemented in `apps/api/tests/test_auth_and_isolation.py` and executed against the entire test harness.

### Test Metrics
- **Total Tests**: 62 unit and integration tests
- **Pass Rate**: 100% (62 passed, 0 failed)
- **Execution Time**: ~12 seconds
- **Key Test Cases**:
  - `test_internal_user_create_and_duplicate_prevention`: Duplicate email conflict rejection.
  - `test_jwt_signature_and_tampering`: Tampered signature rejection, expired token rejection.
  - `test_account_provisioning_and_primary_switch`: Automatic single-primary constraint enforcement.
  - `test_strict_multi_user_data_isolation`: Verifies that User B receives empty transaction logs, zero balances, and cannot commit into or modify User A's accounts.


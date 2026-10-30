# REST API Reference — Financial Decision Lab (FDL)

This document provides the complete API specification for the Financial Decision Lab FastAPI backend (`apps/api`). All monetary amounts across all endpoints are transmitted in **signed integer paise** (`MinorAmount`).

- **Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

---

## 1. System & Health

### `GET /health`
Returns system health status and currency denomination.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "service": "Financial Decision Lab API",
  "version": "1.0.0",
  "currency": "INR (paise minor units)"
}
```

---

## 2. Statement Ingestion

### `POST /api/imports/preview`
Parses an uploaded CSV or PDF statement file and returns an extraction preview without committing changes to the database.

#### Request
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Binary file upload (CSV or PDF).
  - `bank_hint` *(optional, string)*: Bank layout identifier (`"auto"`, `"hdfc"`, `"sbi"`, `"icici"`). Default: `"auto"`.

#### Response `200 OK`
```json
{
  "filename": "HDFC_Statement_Aarav.csv",
  "content_type": "text/csv",
  "bank_detected": "HDFC Bank",
  "rows_detected": 142,
  "date_range": {
    "start": "2024-10-01",
    "end": "2025-03-31"
  },
  "opening_balance_minor": 4500000,
  "closing_balance_minor": 7400000,
  "reconciliation_status": "PASSED",
  "sample_rows": [
    {
      "source_row": 1,
      "posted_date": "2024-10-01",
      "raw_description": "ACH/SALARY/ACME CORP",
      "amount_minor": 7800000,
      "balance_after_minor": 12300000
    },
    {
      "source_row": 2,
      "posted_date": "2024-10-03",
      "raw_description": "UPI/SWIGGY/ORDER_9823",
      "amount_minor": -45000,
      "balance_after_minor": 12255000
    }
  ],
  "warnings": []
}
```

---

### `POST /api/imports/commit`
Commits parsed statement transactions to the database, executing deduplication, internal-transfer pairing, categorization, and anomaly detection.

#### Request
- **Content-Type**: `application/x-www-form-urlencoded`
- **Form Fields**:
  - `file_id` *(string, required)*: Identifier of previewed file or staging ID.
  - `account_id` *(string, required)*: Target user bank account UUID.

#### Response `200 OK`
```json
{
  "status": "success",
  "source_file_id": "sf_98234-abcd-ef01",
  "imported_rows": 142,
  "duplicates_merged": 14,
  "transfers_detected": 6,
  "anomalies_flagged": 3,
  "new_recurring_items_found": 2
}
```

---

## 3. Data Health & Sufficiency Gate

### `GET /api/sufficiency`
Evaluates the 4-point data gate required before any ungrounded financial decisions are rendered.

#### Response `200 OK (Gate Passed)`
```json
{
  "status": "OK",
  "coverage_days": 182,
  "checks": [
    {
      "id": "history_length",
      "title": "History Length",
      "passed": true,
      "detail": "6 months of continuous history found (182 days >= 90 days)",
      "severity": "info"
    },
    {
      "id": "income_present",
      "title": "Income Credits",
      "passed": true,
      "detail": "Regular salary identified from ACME Corp",
      "severity": "info"
    },
    {
      "id": "date_gaps",
      "title": "Date Continuity",
      "passed": true,
      "detail": "No activity gaps > 7 days detected",
      "severity": "info"
    },
    {
      "id": "balance_anchor",
      "title": "Balance Reconciliation",
      "passed": true,
      "detail": "Opening balance + transaction sum matches closing balance",
      "severity": "info"
    }
  ],
  "missing_items": [],
  "fix_actions": []
}
```

#### Response `200 OK (Gate Refusal / Insufficient Data)`
```json
{
  "status": "INSUFFICIENT",
  "coverage_days": 42,
  "checks": [
    {
      "id": "history_length",
      "title": "History Length",
      "passed": false,
      "detail": "Only 42 days of history detected (Minimum 90 days required)",
      "severity": "error"
    },
    {
      "id": "income_present",
      "title": "Income Credits",
      "passed": true,
      "detail": "Salary credits identified",
      "severity": "info"
    }
  ],
  "missing_items": [
    "Statements for months prior to February 2025"
  ],
  "fix_actions": [
    {
      "action": "UPLOAD_MORE_STATEMENTS",
      "label": "Upload at least 2 additional consecutive bank statements",
      "detail": "We require a minimum 90-day baseline to establish reliable recurring spend patterns."
    }
  ]
}
```

---

## 4. Financial Dashboard

### `GET /api/dashboard`
Fetches aggregate net position, category spending distribution, monthly historical trend, and data sufficiency health for the dashboard view.

#### Response `200 OK`
```json
{
  "net_balance_paise": 11240000,
  "health_status": "OK",
  "monthly_summary": [
    { "month": "2024-11", "income_paise": 7800000, "spend_paise": 5600000 },
    { "month": "2024-12", "income_paise": 7800000, "spend_paise": 6200000 },
    { "month": "2025-01", "income_paise": 7800000, "spend_paise": 5900000 },
    { "month": "2025-02", "income_paise": 7800000, "spend_paise": 5400000 },
    { "month": "2025-03", "income_paise": 7800000, "spend_paise": 5630000 }
  ],
  "category_spend": [
    { "category": "Rent & Housing", "amount_paise": 2000000, "color": "#6366f1" },
    { "category": "Dining & Takeout", "amount_paise": 950000, "color": "#f97316" },
    { "category": "Groceries", "amount_paise": 840000, "color": "#0ea5e9" },
    { "category": "Loan & EMI", "amount_paise": 750000, "color": "#ef4444" },
    { "category": "Utilities", "amount_paise": 450000, "color": "#3b82f6" },
    { "category": "Shopping", "amount_paise": 380000, "color": "#eab308" },
    { "category": "Subscriptions", "amount_paise": 260000, "color": "#a855f7" }
  ]
}
```

---

## 5. Transactions & User Corrections

### `GET /api/transactions`
Retrieves paginated, filtered transaction records.

#### Query Parameters
- `account_id` *(optional, string)*: Filter by bank account ID.
- `category_id` *(optional, string)*: Filter by category ID.
- `search` *(optional, string)*: Text search on description or merchant.
- `limit` *(optional, int)*: Page size (default: 50, max: 200).
- `offset` *(optional, int)*: Page offset (default: 0).

#### Response `200 OK`
```json
{
  "total": 142,
  "limit": 50,
  "offset": 0,
  "transactions": [
    {
      "id": "txn_839201",
      "account_id": "acc_hdfc_01",
      "posted_date": "2025-03-25",
      "amount_minor": -85000,
      "currency": "INR",
      "raw_description": "UPI/SWIGGY/ORDER_98234",
      "normalized_description": "Swiggy",
      "channel": "UPI",
      "category_id": "cat_food_dining",
      "category_confidence": 0.94,
      "balance_after_minor": 7400000,
      "is_transfer": false,
      "status": "active"
    }
  ]
}
```

---

### `PATCH /api/transactions/{txn_id}/category`
Applies a user category correction and optionally propagates across similar merchants.

#### Request Body
```json
{
  "category_id": "cat_food_dining",
  "scope": "same_merchant",
  "dry_run": false
}
```
- `scope`: `"this_txn"` | `"same_merchant"` | `"similar"`.
- `dry_run`: If `true`, returns affected count and financial impact preview without committing.

#### Response `200 OK`
```json
{
  "dry_run": false,
  "affected_count": 11,
  "merchant": "Swiggy",
  "old_category": "cat_shopping",
  "new_category": "cat_food_dining",
  "diff_summary": "Food & Dining +₹6,140; Shopping -₹6,140"
}
```

---

## 6. Affordability Decision & Ask

### `POST /api/affordability`
Core decision endpoint: Evaluates whether a proposed purchase is affordable next month. Produces the structured `Reasoning Ledger`, percentile headroom, dynamic safety buffer rationale, and verdict.

#### Request Body
```json
{
  "purchase_amount_minor": 8000000,
  "label": "New iPhone 16 Pro",
  "timing": "next_month",
  "payment_type": "cash",
  "emi_months": null,
  "emi_interest_rate_pct": null,
  "buffer_multiplier_override": null
}
```

#### Response `200 OK`
```json
{
  "snapshot_id": "fs_demo_001",
  "as_of_date": "2025-04-01",
  "verdict": {
    "code": "TIGHT",
    "headline": "Likely affordable but exposed if income or spending comes in worse than usual.",
    "breach_probability": 0.24,
    "prob_negative_balance": 0.02,
    "confidence": {
      "score": 74,
      "label": "Medium",
      "factors": [
        "Stable salary detected (6 months)",
        "Low uncategorized spend (8%)"
      ]
    }
  },
  "headroom": {
    "p10_minor": -500000,
    "p50_minor": 330000,
    "p90_minor": 1100000
  },
  "buffer": {
    "value_minor": 5800000,
    "binding_term": "k_x_essentials",
    "k": 1.5,
    "essentials_monthly_minor": 3870000,
    "floor_minor": 500000,
    "variability_reserve_minor": 2100000,
    "reason": "1.5 × monthly essentials because income is variable (CV 0.21)"
  },
  "lowest_balance": {
    "date": "2025-04-27",
    "p50_minor": 6130000,
    "p10_minor": 5300000
  },
  "ledger": [
    {
      "step_no": 1,
      "label": "Current balance (all accounts)",
      "value_minor": 11240000,
      "formula_text": "HDFC (₹74,000) + SBI (₹38,400)",
      "status": "ok"
    },
    {
      "step_no": 2,
      "label": "Expected next month income",
      "value_minor": 7800000,
      "formula_text": "Median of last 6 salary credits",
      "status": "ok"
    },
    {
      "step_no": 3,
      "label": "Committed payments (Rent, EMI, SIP, Subs)",
      "value_minor": -3180000,
      "formula_text": "Sum of 9 active recurring obligations",
      "status": "ok"
    },
    {
      "step_no": 4,
      "label": "Variable spending estimate",
      "value_minor": -2450000,
      "formula_text": "Median Food + Utilities + Discretionary",
      "status": "ok"
    },
    {
      "step_no": 5,
      "label": "Safety buffer",
      "value_minor": 5800000,
      "formula_text": "1.5 × monthly essentials (₹38,700)",
      "status": "ok"
    },
    {
      "step_no": 6,
      "label": "Purchase cost",
      "value_minor": -8000000,
      "formula_text": "One-off cash outflow",
      "status": "ok"
    },
    {
      "step_no": 7,
      "label": "Projected lowest balance date",
      "value_minor": 6130000,
      "formula_text": "Dips to ₹61,300 on 27th before next salary",
      "status": "ok"
    },
    {
      "step_no": 8,
      "label": "Headroom vs buffer",
      "value_minor": 330000,
      "formula_text": "Lowest balance ₹61,300 − Buffer ₹58,000",
      "status": "ok"
    }
  ],
  "helpers": {
    "max_affordable_now_minor": 7670000,
    "min_delay_months": 1
  },
  "narration": {
    "text": "Buying this ₹80,000 phone in cash next month is tight. While your median balance remains positive, you have a 24% probability of dipping below your ₹58,000 safety buffer on April 27th.",
    "guard_status": "passed"
  }
}
```

---

### `POST /api/affordability/ask`
Accepts a natural language question, extracts the structured parameters, runs the affordability calculation, runs the number-verification guard on the summary, and returns the complete decision package.

#### Request Body
```json
{
  "question": "Can I afford to buy an 80k laptop next month?"
}
```

#### Response `200 OK`
Same schema as `POST /api/affordability`.

---

## 7. What-If Scenario Lab

### `POST /api/scenarios/compare`
Simulates alternative adjustments side-by-side against the baseline without modifying underlying transaction tables.

#### Request Body
```json
[
  {
    "name": "Baseline (Cash Now)",
    "base_snapshot_id": "fs_demo_001",
    "adjustments": []
  },
  {
    "name": "Scenario A: 6-Month No-Cost EMI",
    "base_snapshot_id": "fs_demo_001",
    "adjustments": [
      {
        "type": "purchase_emi",
        "params": {
          "total_amount_paise": 8000000,
          "months": 6,
          "interest_rate_pct": 0.0
        }
      }
    ]
  },
  {
    "name": "Scenario B: Wait 2 Months + Cancel 2 Subs",
    "base_snapshot_id": "fs_demo_001",
    "adjustments": [
      {
        "type": "delay_purchase",
        "params": { "delay_months": 2 }
      },
      {
        "type": "cancel_recurring",
        "params": { "recurring_ids": ["rec_sub_netflix", "rec_sub_gym"] }
      }
    ]
  }
]
```

#### Response `200 OK`
```json
{
  "baseline": {
    "name": "Baseline (Cash Now)",
    "lowest_balance_paise": 6130000,
    "headroom_paise": 330000,
    "breach_probability": 0.24,
    "verdict": "TIGHT"
  },
  "scenarios": [
    {
      "name": "Scenario A: 6-Month No-Cost EMI",
      "lowest_balance_paise": 9850000,
      "headroom_paise": 4050000,
      "breach_probability": 0.05,
      "verdict": "AFFORDABLE"
    },
    {
      "name": "Scenario B: Wait 2 Months + Cancel 2 Subs",
      "lowest_balance_paise": 12400000,
      "headroom_paise": 6600000,
      "breach_probability": 0.02,
      "verdict": "AFFORDABLE"
    }
  ]
}
```

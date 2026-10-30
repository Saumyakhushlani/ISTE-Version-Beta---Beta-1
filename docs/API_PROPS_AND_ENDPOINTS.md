# Financial Decision Lab (FDL) — API Reference & Props Guide

This document lists every backend API endpoint in the Financial Decision Lab system, detailing:
- **HTTP Method & URL**
- **Purpose & Workflow**
- **Input Props / Request Parameters** (Form Data, Query Params, JSON Request Body)
- **Output Response Schema** (Fields, types, and sample JSON)
- **Error Codes & Fallbacks**

---

## 1. Important Global Invariants

1. **Integer Paise Precision**: All monetary values are strictly represented in **integer paise** (`1 Rupee = 100 paise`).
   - Example: ₹80,000 is represented as `8000000`.
2. **Signed Amounts**: In transactions:
   - **Credits (Inflows / Income)** are **positive** (`> 0`).
   - **Debits (Outflows / Expenses)** are **negative** (`< 0`).
3. **Dates**: All dates are formatted as ISO 8601 strings: `YYYY-MM-DD`.

---

## 2. API Endpoints Catalog

### 2.1 Statement Ingestion APIs

#### `POST /api/imports/preview`
Parses an uploaded bank statement (CSV or PDF) and extracts its data for user preview **without** saving to the database.

- **Request Type**: `multipart/form-data`
- **Input Props / Form Fields**:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `file` | `UploadFile` (Binary) | **Yes** | CSV or PDF bank statement file. |
  | `bank_hint` | `string` | No (default: `"auto"`) | Optional bank name hint (`"HDFC"`, `"SBI"`, `"ICICI"`, `"Axis"`, `"PhonePe"`, etc.). If `"auto"`, the system automatically detects the bank using statement headers and IFSC keywords. |

- **Output Response (`200 OK`)**:
  ```json
  {
    "file_id": "staged_6d78a9c2",
    "filename": "hdfc_statement.csv",
    "content_type": "text/csv",
    "bank_detected": "HDFC",
    "masked_last4": "5521",
    "rows_detected": 142,
    "date_range": {
      "start": "2026-05-01",
      "end": "2026-10-25"
    },
    "opening_balance_minor": 7400000,
    "closing_balance_minor": 11240000,
    "reconciliation_status": "PASSED",
    "sample_rows": [
      {
        "posted_date": "2026-10-25",
        "description": "UPI/SWIGGY/ORDER_982",
        "amount_minor": -45000,
        "balance_after_minor": 11240000
      }
    ],
    "warnings": []
  }
  ```

---

#### `POST /api/imports/commit`
Commits a previously previewed statement into the database. Performs deduplication, internal transfer pairing, categorization, recurring cadence detection, and anomaly screening across the cumulative dataset.

- **Request Type**: `application/x-www-form-urlencoded` or `multipart/form-data`
- **Input Props / Form Fields**:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `file_id` | `string` | **Yes** | The temporary `file_id` returned by the `/preview` endpoint. |
  | `account_id` | `string` | No | Optional account ID. If omitted, the system links to an existing account matching the bank & last 4 digits or creates a new one. |

- **Output Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "account_id": "acc_001_hdfc",
    "source_file_id": "sf_99812",
    "bank": "HDFC",
    "masked_last4": "5521",
    "total_rows": 142,
    "inserted": 142,
    "duplicates_skipped": 0,
    "internal_transfers_detected": 4,
    "anomalies_detected": 2,
    "recurring_items_updated": 6
  }
  ```

---

### 2.2 Dashboard & Liquidity Advisory APIs

#### `GET /api/dashboard`
Returns the complete financial summary across all connected bank accounts, net position, multi-bank inflow/outflow breakdown, recurring bills, and safety buffer.

- **Input Props**: None (reads current database state).
- **Output Response (`200 OK`)**:
  ```json
  {
    "net_position_paise": 11240000,
    "monthly_essentials_paise": 3870000,
    "safety_buffer": {
      "value_paise": 5800000,
      "binding_term": "k_x_essentials",
      "k": 1.5,
      "reason": "1.5 × monthly essentials (₹38,700) based on income volatility"
    },
    "multi_bank_liquidity": {
      "combined": {
        "total_current_balance_paise": 11240000,
        "total_inflow_paise": 48000000,
        "total_outflow_paise": 36760000,
        "total_net_flow_paise": 11240000,
        "active_account_count": 2
      },
      "accounts": [
        {
          "account_id": "acc_001",
          "nickname": "HDFC Salary Account",
          "bank": "HDFC",
          "masked_last4": "5521",
          "current_balance_paise": 7400000,
          "inflow_paise": 32000000,
          "outflow_paise": 24600000,
          "net_flow_paise": 7400000,
          "transaction_count": 94
        },
        {
          "account_id": "acc_002",
          "nickname": "SBI Savings",
          "bank": "SBI",
          "masked_last4": "1192",
          "current_balance_paise": 3840000,
          "inflow_paise": 16000000,
          "outflow_paise": 12160000,
          "net_flow_paise": 3840000,
          "transaction_count": 48
        }
      ]
    },
    "recent_transactions": [...]
  }
  ```

---

#### `POST /api/dashboard/liquidity/advice`
Calculates from which bank account to source a large investment (e.g., FD, Mutual Fund, or SIP) so that upcoming committed payments (rent, EMIs, credit card bills) are preserved without risking overdraft.

- **Request Type**: `application/json`
- **Input Props / JSON Body**:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `target_investment_minor` | `int` | **Yes** | Amount in paise intended for investment (e.g. `10000000` for ₹1,00,000). |

- **Output Response (`200 OK`)**:
  ```json
  {
    "target_investment_paise": 10000000,
    "verdict": "FEASIBLE",
    "total_safe_surplus_paise": 11240000,
    "recommendation": "Debit ₹1,00,000 from HDFC (leaves safe cushion of ₹24,000).",
    "allocation": [
      {
        "bank": "HDFC",
        "account_id": "acc_001",
        "amount_paise": 10000000
      }
    ],
    "account_health": [
      {
        "bank": "HDFC",
        "current_balance_paise": 7400000,
        "upcoming_bills_paise": 0,
        "safe_surplus_paise": 7400000
      },
      {
        "bank": "SBI",
        "current_balance_paise": 3840000,
        "upcoming_bills_paise": 0,
        "safe_surplus_paise": 3840000
      }
    ]
  }
  ```

---

### 2.3 Transactions APIs

#### `GET /api/transactions`
Fetches paginated list of transactions across all accounts with category details and transfer pairing status.

- **Input Props / Query Parameters**:
  | Param | Type | Required | Description |
  |---|---|---|---|
  | `limit` | `int` | No (default: `50`) | Number of transactions to return. |
  | `offset` | `int` | No (default: `0`) | Starting offset index. |
  | `account_id` | `string` | No | Optional account filter. |
  | `category_id` | `string` | No | Optional category filter. |

- **Output Response (`200 OK`)**:
  ```json
  {
    "total": 142,
    "limit": 50,
    "offset": 0,
    "transactions": [
      {
        "id": "txn_8192a",
        "account_id": "acc_001",
        "posted_date": "2026-10-25",
        "amount_minor": -45000,
        "raw_description": "UPI/SWIGGY/ORDER_982/HDFC001",
        "normalized_description": "Swiggy",
        "channel": "UPI",
        "category_id": "cat_food_dining",
        "is_transfer": false,
        "balance_after_minor": 11240000
      }
    ]
  }
  ```

---

#### `POST /api/transactions/{txn_id}/category`
Allows the user to correct or re-categorize a transaction. Creates an entry in `correction_log` and updates category propagation rules.

- **Input Props / Path & Body**:
  - `txn_id` (`string`): Transaction ID in URL path.
  - JSON Body:
    | Field | Type | Required | Description |
    |---|---|---|---|
    | `category_id` | `string` | **Yes** | New category ID (e.g. `"cat_groceries"`). |
    | `propagate_future` | `boolean`| No (default: `true`) | Whether to auto-apply to future transactions from this merchant. |

---

### 2.4 Recurring & Upcoming Obligations APIs

#### `GET /api/recurring`
Returns all detected subscriptions, recurring bills, EMIs, rent, SIPs, and salary credits.

- **Input Props**: None.
- **Output Response (`200 OK`)**:
  ```json
  {
    "recurring_items": [
      {
        "id": "rec_001",
        "merchant": "Netflix",
        "type": "subscription",
        "cadence": "monthly",
        "typical_amount_minor": 64900,
        "next_expected_date": "2026-11-14",
        "occurrences": 6,
        "confidence": 0.94,
        "status": "active"
      },
      {
        "id": "rec_002",
        "merchant": "HDFC Home Loan",
        "type": "emi",
        "cadence": "monthly",
        "typical_amount_minor": 2500000,
        "next_expected_date": "2026-11-10",
        "occurrences": 6,
        "confidence": 0.98,
        "status": "active"
      }
    ]
  }
  ```

---

#### `GET /api/recurring/upcoming`
Generates a calendar schedule of upcoming payments for the next $N$ days, showing exact due dates, amounts, and which specific bank account will be debited.

- **Input Props / Query Parameters**:
  | Param | Type | Required | Description |
  |---|---|---|---|
  | `days` | `int` | No (default: `30`) | Number of calendar days ahead to project. |

- **Output Response (`200 OK`)**:
  ```json
  {
    "horizon_days": 30,
    "schedule": [
      {
        "due_date": "2026-11-05",
        "merchant": "Rent Payment",
        "type": "rent",
        "typical_amount_paise": 2500000,
        "bank_attributed": "HDFC",
        "cadence": "monthly"
      },
      {
        "due_date": "2026-11-10",
        "merchant": "Car Loan EMI",
        "type": "emi",
        "typical_amount_paise": 1200000,
        "bank_attributed": "SBI",
        "cadence": "monthly"
      }
    ]
  }
  ```

---

### 2.5 Outlier & Anomaly Detection APIs

#### `GET /api/anomalies`
Returns detected unusual transactions with exact mathematical proof (Median Absolute Deviation Modified Z-Score $M_i > 3.5$, sudden duplicates $\le 3$ days, or high-value new merchants).

- **Input Props**: None.
- **Output Response (`200 OK`)**:
  ```json
  {
    "anomalies": [
      {
        "id": "anom_01",
        "txn_id": "txn_8921",
        "type": "large_amount",
        "rule_id": "rule_outlier_mad_zscore",
        "amount_minor": 1450000,
        "reason_text": "Amount ₹14,500 in Dining is an extreme outlier (Modified Z-Score 4.21 > 3.5 vs category median ₹850).",
        "severity": "high"
      },
      {
        "id": "anom_02",
        "txn_id": "txn_8924",
        "type": "duplicate_charge",
        "rule_id": "rule_duplicate_charge",
        "amount_minor": 199900,
        "reason_text": "Duplicate charge of ₹1,999 to Amazon within 1 day.",
        "severity": "medium"
      }
    ]
  }
  ```

---

### 2.6 Data Sufficiency Gate API

#### `GET /api/sufficiency`
Evaluates the 4-point data gate (`history_length`, `date_gaps`, `income_present`, `balance_anchor`) to verify whether uploaded statements are sufficient to generate financial advice without hallucinating.

- **Input Props**: None.
- **Output Response (`200 OK`)**:
  ```json
  {
    "status": "OK",
    "coverage_days": 178,
    "checks": [
      {
        "id": "history_length",
        "title": "History Length",
        "passed": true,
        "detail": "178 continuous calendar days detected (>= 90 days threshold).",
        "severity": "none"
      },
      {
        "id": "date_gaps",
        "title": "Date Continuity",
        "passed": true,
        "detail": "No gap > 7 days detected.",
        "severity": "none"
      },
      {
        "id": "income_present",
        "title": "Income Credits",
        "passed": true,
        "detail": "6 regular salary credits identified.",
        "severity": "none"
      },
      {
        "id": "balance_anchor",
        "title": "Balance Reconciliation",
        "passed": true,
        "detail": "Opening balance + transactions matches closing balance.",
        "severity": "none"
      }
    ],
    "missing_items": [],
    "fix_actions": []
  }
  ```

---

### 2.7 Affordability Decision & What-If Engine APIs

#### `POST /api/affordability`
The core engine endpoint. Runs 5,000 Monte Carlo runs (seed 42), computes dynamic safety buffer, headroom at P10/P50/P90, generates the 8-step Reasoning Ledger, and produces Number-Guarded narration.

- **Request Type**: `application/json`
- **Input Props / JSON Body**:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `purchase_amount_minor` | `int` | **Yes** | Amount in paise (e.g. `8000000` for ₹80,000). |
  | `label` | `string` | No (default: `"Purchase"`) | Name of purchase (e.g. `"iPhone 16"`, `"Laptop"`). |
  | `timing` | `string` | No (default: `"next_month"`) | Timing: `"next_month"` or `"this_month"`. |
  | `payment_type` | `string` | No (default: `"cash"`) | `"cash"` or `"emi"`. |
  | `emi_months` | `int` | No | Number of months if EMI (e.g. `6`, `12`). |
  | `emi_interest_rate_pct` | `float` | No | Annual interest rate (e.g. `14.0`, or `0.0` for no-cost EMI). |
  | `buffer_multiplier_override` | `float` | No | Optional override for buffer multiplier $k$. |

- **Output Response (`200 OK`)**:
  ```json
  {
    "snapshot_id": "fs_9981a",
    "verdict": {
      "code": "AFFORDABLE",
      "headline": "Safe to buy. Leaves ₹41,000 cushion above your safety buffer even in conservative conditions.",
      "breach_probability": 0.04,
      "prob_negative_balance": 0.00,
      "confidence": {
        "score": 92,
        "label": "High",
        "factors": ["178 days of statement history verified", "Low income volatility detected"]
      }
    },
    "headroom": {
      "p10_minor": 4100000,
      "p50_minor": 7450000,
      "p90_minor": 10800000
    },
    "buffer": {
      "value_minor": 3870000,
      "binding_term": "k_x_essentials",
      "k": 1.0,
      "essentials_monthly_minor": 3870000,
      "reason": "1.0 × monthly essentials (₹38,700) based on stable income profile"
    },
    "lowest_balance": {
      "date": "2026-11-28",
      "day_index": 28,
      "p10_minor": 7970000,
      "p50_minor": 11320000,
      "p90_minor": 14670000
    },
    "ledger": [
      {
        "step_no": 1,
        "label": "Current balance (all accounts)",
        "value_minor": 11240000,
        "formula_text": "HDFC: ₹74,000 + SBI: ₹38,400",
        "status": "ok"
      },
      {
        "step_no": 2,
        "label": "Expected next month income",
        "value_minor": 8000000,
        "formula_text": "Projected from regular credit pattern (₹80,000)",
        "status": "ok"
      },
      {
        "step_no": 3,
        "label": "Committed payments (Rent, EMI, SIP, Subs)",
        "value_minor": -3180000,
        "formula_text": "Sum of 4 active recurring obligations",
        "status": "ok"
      },
      {
        "step_no": 4,
        "label": "Variable spending estimate",
        "value_minor": -1500000,
        "formula_text": "Median 30-day Food, Utilities & Discretionary spend",
        "status": "ok"
      },
      {
        "step_no": 5,
        "label": "Safety buffer",
        "value_minor": 3870000,
        "formula_text": "1.0 × monthly essentials (₹38,700)",
        "status": "ok"
      },
      {
        "step_no": 6,
        "label": "Purchase cost",
        "value_minor": -5000000,
        "formula_text": "One-off proposed purchase outflow",
        "status": "ok"
      },
      {
        "step_no": 7,
        "label": "Projected lowest balance date",
        "value_minor": 11320000,
        "formula_text": "Projected lowest point reaches ₹1,13,200 around 2026-11-28",
        "status": "ok"
      },
      {
        "step_no": 8,
        "label": "Headroom vs buffer",
        "value_minor": 7450000,
        "formula_text": "Lowest balance (₹1,13,200) − Buffer (₹38,700)",
        "status": "ok"
      }
    ],
    "narration": "Verdict: Affordable. Under median conditions, your balance will remain safe with ₹74,500 in headroom above your required safety buffer of ₹38,700. Even under conservative conditions, you preserve ₹41,000 cushion."
  }
  ```

---

#### `POST /api/affordability/ask`
Parses plain-English questions, extracts parameters automatically, and evaluates affordability.

- **Request Type**: `application/json`
- **Input Props / JSON Body**:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `question` | `string` | **Yes** | e.g. `"Can I buy an iPhone 16 for ₹79,900 next month?"` or `"Can I afford a laptop for 1.2 lakh on 6 months EMI?"`. |

- **Output Response (`200 OK`)**:
  Returns the exact same schema as `POST /api/affordability`, plus an additional `parsed_query` block:
  ```json
  {
    "parsed_query": {
      "purchase_amount_minor": 7990000,
      "label": "Iphone 16",
      "timing": "next_month",
      "payment_type": "cash",
      "emi_months": null
    },
    "verdict": { ... },
    "headroom": { ... },
    "ledger": [ ... ],
    "narration": "..."
  }
  ```

---

#### `POST /api/scenarios/compare`
Simulates multiple What-If options side-by-side against the baseline without mutating the user's ledger.

- **Request Type**: `application/json`
- **Input Props / JSON Body**:
  ```json
  {
    "purchase_amount_minor": 8000000,
    "scenarios": [
      {
        "name": "6-Month No-Cost EMI",
        "adjustments": [
          {
            "type": "purchase_emi",
            "params": { "months": 6, "interest_pct": 0.0 }
          }
        ]
      },
      {
        "name": "Delay by 2 Months",
        "adjustments": [
          {
            "type": "delay_purchase",
            "params": { "months": 2 }
          }
        ]
      }
    ]
  }
  ```

- **Output Response (`200 OK`)**:
  ```json
  {
    "baseline": {
      "name": "Baseline (Cash Next Month)",
      "lowest_balance_paise": 6130000,
      "headroom_paise": 330000,
      "breach_probability": 0.24,
      "verdict": "TIGHT",
      "headline": "Likely affordable but exposed if unexpected expenses occur."
    },
    "scenarios": [
      {
        "name": "6-Month No-Cost EMI",
        "lowest_balance_paise": 9850000,
        "headroom_paise": 4050000,
        "breach_probability": 0.04,
        "verdict": "AFFORDABLE",
        "headline": "Safe to buy with ₹40,500 headroom.",
        "delta_headroom_paise": 3720000
      },
      {
        "name": "Delay by 2 Months",
        "lowest_balance_paise": 11240000,
        "headroom_paise": 5440000,
        "breach_probability": 0.01,
        "verdict": "AFFORDABLE",
        "headline": "Safe to buy with ₹54,400 headroom.",
        "delta_headroom_paise": 5110000
      }
    ]
  }
  ```

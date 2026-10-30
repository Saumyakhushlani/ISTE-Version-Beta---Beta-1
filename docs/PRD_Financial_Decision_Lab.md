# Product Requirements Document (PRD)

# Financial Decision Lab
### A Personal Finance Assistant That Shows Its Work — "Can I afford this next month?"

| Field | Value |
|---|---|
| **Document type** | Product Requirements Document (PRD) + Technical Design |
| **Hackathon track** | Problem Statement 4 — Personal Finance Assistant That Explains Its Answers |
| **Version** | 1.0 (Hackathon build) |
| **Status** | Draft for team review |
| **Primary principle** | *Every number is computed by code, traceable to transactions, and reproducible.* |
| **Currency / locale** | INR (₹), Indian number formatting (lakh/crore), Indian bank formats (HDFC, SBI, ICICI, Axis, Kotak, UPI/NEFT/IMPS/ACH/NACH narrations) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Opportunity](#2-problem-statement--opportunity)
3. [Target Users & Personas](#3-target-users--personas)
4. [Product Vision, Principles & Goals](#4-product-vision-principles--goals)
5. [Scope](#5-scope)
6. [Requirements Traceability Matrix](#6-requirements-traceability-matrix)
7. [User Journeys & Core Scenarios](#7-user-journeys--core-scenarios)
8. [Functional Requirements (Feature Specs)](#8-functional-requirements-feature-specs)
   - 8.1 Statement Ingestion
   - 8.2 Normalization, De-duplication & Internal-Transfer Detection
   - 8.3 Transaction Categorization & Corrections
   - 8.4 Recurring Payment Detection
   - 8.5 Anomaly Detection
   - 8.6 Data Sufficiency Gate ("Say when it doesn't know")
   - 8.7 Income Analysis & Uncertain Income
   - 8.8 Cash-Flow Forecast Engine
   - 8.9 Safety Buffer
   - 8.10 Affordability Decision Engine
   - 8.11 What-If Simulation Lab
   - 8.12 Natural-Language Interface
   - 8.13 Explanation / Reasoning Ledger
   - 8.14 Forecast Track Record (Backtesting)
   - 8.15 Feedback & Self-Correction Loop
   - 8.16 Dashboard
   - 8.17 Privacy & Security
9. [System Architecture](#9-system-architecture)
10. [Technology Stack](#10-technology-stack)
11. [Data Model](#11-data-model)
12. [API Specification](#12-api-specification)
13. [Algorithms & Formulas (Reference)](#13-algorithms--formulas-reference)
14. [AI / LLM Usage & Guardrails](#14-ai--llm-usage--guardrails)
15. [UX & UI Specification](#15-ux--ui-specification)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Testing & Validation Strategy](#17-testing--validation-strategy)
18. [Synthetic Data & Demo Plan](#18-synthetic-data--demo-plan)
19. [Success Metrics](#19-success-metrics)
20. [Risks & Mitigations](#20-risks--mitigations)
21. [Delivery Plan & Team Split](#21-delivery-plan--team-split)
22. [Judging-Criteria Mapping & Pitch Narrative](#22-judging-criteria-mapping--pitch-narrative)
23. [Open Questions & Assumptions](#23-open-questions--assumptions)
24. [Appendices](#24-appendices)

---

## 1. Executive Summary

**Financial Decision Lab (FDL)** is a privacy-first personal finance assistant that ingests a person's bank statements (CSV and PDF) from multiple accounts, builds one clean transaction history, understands recurring commitments and income patterns, forecasts cash flow *with uncertainty ranges*, and answers questions like **"Can I afford an ₹80,000 phone next month?"** with every reasoning step visible, checkable and reproducible.

Most budgeting apps draw charts of the past. FDL answers the forward-looking question and — critically — **shows its homework**:

```
Current balance → Expected income → Committed payments → Variable spending
→ Safety buffer (and WHY that buffer) → Purchase → Headroom → Verdict (+ range + confidence)
```

### What makes it different

| Differentiator | Why it matters |
|---|---|
| **Deterministic calculation core, LLM only for language** | A wrong number can push someone into debt. All arithmetic is in tested code; the LLM never produces a figure. |
| **Reasoning Ledger** | Every line of the answer links to the exact transactions/assumptions behind it. The user can click and verify. |
| **Uncertainty-first forecasting** | Output is a range (P10 / P50 / P90) and a probability of breaching the safety buffer — not a single misleading number. |
| **"I don't know" is a first-class result** | A formal Data Sufficiency Gate refuses to give a confident number when data is short, gappy, or has no income. |
| **What-If Lab** | Cancel a subscription, take an EMI, delay the purchase, drop income 20% — each scenario is independent, reversible, and comparable. |
| **Forecast Track Record** | Backtests the forecaster on the user's own history and tracks forecast-vs-actual after each month, so trust is *earned and shown*. |
| **Privacy by architecture** | Raw statements never leave the device/server boundary; LLM sees only redacted, aggregated, structured data (and can run fully local). |

---

## 2. Problem Statement & Opportunity

### 2.1 The problem
Many people do not know whether they can afford something until the money is already gone. Specifically:

- Bank statements arrive in **different formats** (CSV columns differ per bank; PDFs have different layouts).
- Spending is **rarely categorized**; recurring payments and unusual charges are **easy to miss**.
- Existing tools show **backward-looking charts**, but few answer **"Can I afford this next month?"**
- A wrong answer can **push someone into debt**, so the answer must be **explainable and checkable**.

### 2.2 The opportunity
Build a tool whose *trustworthiness* is the product. The competitive edge is not a prettier chart — it is that a user (and a judge) can **audit the answer line by line**, see **how uncertain it is**, and see **how accurate it has been in the past**.

### 2.3 Why now / why it is feasible in a hackathon
- Deterministic finance math is small and testable.
- CSV/PDF parsing libraries are mature for digitally generated statements.
- LLMs are good at *intent parsing and phrasing* (but must be fenced away from arithmetic).
- Synthetic statements let us demo edge cases (irregular income, duplicates, gaps) reliably.

---

## 3. Target Users & Personas

### Persona 1 — Aarav, 26, Salaried Software Engineer (Primary)
- **Accounts:** HDFC salary account + SBI savings (rent & SIP) + 1 credit card.
- **Pain:** Salary lands on the 1st; by the 20th he is unsure if he can buy a ₹65,000 laptop.
- **Needs:** Quick yes/no with reasons; EMI vs cash comparison; subscription clean-up.
- **Trust need:** "Show me the math, I'll check it."

### Persona 2 — Priya, 31, Freelance Designer (Irregular income — hardest case)
- **Accounts:** ICICI current + Axis savings.
- **Pain:** Income swings ₹30k–₹1.2L; one big bonus/client payment last year, none this year.
- **Needs:** Honest ranges, not false precision; explanation of how much to trust the answer.
- **Trust need:** "Tell me when you're guessing."

### Persona 3 — Meera & Rohit's household finance manager, 38 (Secondary)
- **Pain:** Several EMIs, school fees, utilities; wants to know the impact of a new loan.
- **Needs:** What-if on loans, early-warning on tight months, anomaly alerts for duplicate charges.

### Persona 4 — The Judge / Evaluator (Meta-persona)
- Wants to see baseline requirements met, edge cases handled, reasoning transparent, privacy decision defensible, extras that *work in the demo*.

### Jobs To Be Done
1. *"When I'm about to make a purchase, I want to know if I can afford it without wrecking next month, so I don't end up in debt."*
2. *"When I have multiple accounts, I want one truthful picture, so I'm not fooled by transfers or duplicates."*
3. *"When the tool gives me an answer, I want to verify it, so I can trust it with real money."*
4. *"When my situation changes, I want to test alternatives safely, so I can pick the best plan."*

---

## 4. Product Vision, Principles & Goals

### 4.1 Vision
> *A financial copilot you can audit.* It never asks for blind trust; it earns trust through transparency, calibrated uncertainty, and a visible track record.

### 4.2 Design Principles (non-negotiable)

| # | Principle | Implication |
|---|---|---|
| P1 | **Code computes, LLM communicates** | No financial figure originates from an LLM. Number-verification guard blocks any LLM text containing a number not in the calc output. |
| P2 | **Traceability** | Every figure in an answer has `source_refs` → transaction IDs / assumption IDs / formula IDs. |
| P3 | **Show the steps, always** | Even when the answer is "No", all steps are displayed. |
| P4 | **Calibrated honesty** | Ranges, probabilities, and confidence labels. "Insufficient data" is a valid verdict. |
| P5 | **Never silently destroy data** | Duplicates/transfers are *flagged and reversible*, never deleted. |
| P6 | **Scenarios never mutate truth** | What-if changes live in separate overlay records. |
| P7 | **Privacy by default** | Local-first processing; minimal, redacted egress; explainable data-flow policy. |
| P8 | **User stays in control** | Every automated decision (category, recurring, duplicate, transfer) can be corrected, and the effect of the correction is shown. |
| P9 | **Reproducibility** | Same inputs + same seed ⇒ identical outputs. Calculation snapshots can be exported and replayed. |

### 4.3 Product Goals

| Goal | Description |
|---|---|
| G1 | Meet **100% of baseline requirements** from the problem statement with visible evidence in the demo. |
| G2 | Deliver a **signature feature** (What-If Decision Lab) that works end-to-end on the demo dataset. |
| G3 | Deliver **trust features** (uncertainty ranges, sufficiency gate, forecast track record, correction feedback loop). |
| G4 | Provide a **defensible privacy architecture** that can be explained in <60 seconds. |
| G5 | Ship a **reliable demo** using synthetic statements covering the key edge cases. |

### 4.4 Non-Goals (explicitly out of scope)
- Direct bank integrations (Account Aggregator, Plaid-like). *(Documented as future work.)*
- Moving money / payments / auto-actions.
- Investment advice, credit-score analysis, tax filing.
- Scanned-image PDF OCR as a *guaranteed* path (best-effort stretch only).
- Multi-user households with shared permissions (single-person scope per the problem statement).
- Advanced fraud detection (anomaly detection is for *user awareness*, not fraud adjudication).

---

## 5. Scope

### 5.1 Scope tiers

| Tier | Meaning | Contents |
|---|---|---|
| **MUST (Baseline)** | Required by problem statement; must be demoed | Ingestion (CSV+PDF, multi-account, dedupe), categorization + corrections, recurring detection, anomaly detection, forecast + affordability with visible steps, uncertain-income ranges, "don't know" handling, dashboard, privacy decision |
| **SHOULD (Signature)** | Strong differentiators | What-If Lab (cancel sub, EMI, delay, income shock), reasoning ledger with click-through traceability, internal-transfer detection, daily-granularity forecast (lowest-point-in-month), safety buffer rationale |
| **COULD (Extra points)** | The four "situations" from the PS + polish | Forecast track record/backtest, irregular-income bonus handling, feedback loop with measurable improvement, scenario comparison table, export of calculation audit |
| **WON'T (this build)** | Deferred | Bank APIs, OCR guarantee, mobile app, multi-currency, multi-user |

### 5.2 Assumptions
- Single person, INR, statements digitally generated (text-based PDFs).
- Users upload their own statements; we don't verify authenticity.
- A demo/judging environment may have no internet; local mode must work.

---

## 6. Requirements Traceability Matrix

Maps every line of the problem statement to a feature, an acceptance test, and a demo moment.

| ID | Problem-statement requirement | Feature section | Acceptance criteria (summary) | Demo moment |
|---|---|---|---|---|
| R1 | Accept **CSV & PDF** from **multiple accounts**; single history; **no double counting** | 8.1, 8.2 | 2+ accounts, both formats merged; overlapping uploads produce 0 duplicates; genuine same-day twin payments preserved | Upload overlapping HDFC CSV + SBI PDF → "312 rows in, 14 duplicates merged, 6 internal transfers excluded" |
| R2 | **Categorize** (rent, food, travel, subscriptions…); user **corrects**; correction applies to **similar** transactions; system **says which changed** | 8.3 | Correct "Swiggy"→Food applies to all Swiggy rows; change-list shown with undo | Re-categorize one merchant → diff panel lists 11 changed rows |
| R3 | **Recurring** detection with **amount & next expected date** | 8.4 | Netflix/rent/EMI detected with next date, confidence; user confirm/reject | Recurring table w/ next-due timeline |
| R4 | **Anomalies** with **explanation** | 8.5 | Large amount, duplicate charge, new merchant flagged each with plain-language reason | Anomaly cards: "₹18,400 at 'XYZ' is 6.2× your typical shopping txn" |
| R5 | **Forecast** & **affordability** in natural language; show **every step**; steps shown even for "no"; explain **buffer decision**; **all math in code** | 8.8–8.10, 8.12, 8.13 | Ledger lists balance, income, commitments, variable, buffer (+why), purchase, result; LLM-free arithmetic proven by tests + number-guard | Ask "Can I afford ₹80,000 phone?" → ledger |
| R6 | **Uncertain income** → show **range** | 8.7, 8.8 | P10/P50/P90 & breach probability; income CV shown | Range bar chart on answer |
| R7 | **Say when it does not know**; **<3 months = too short**; say what's missing (no income, date gaps) | 8.6 | Gate returns `INSUFFICIENT` with itemized reasons; no number given | Upload 2-month file → refusal with fix-it checklist |
| R8 | **Dashboard**: spend by category, monthly trend, forecast — no digging | 8.16 | All three visible on first screen | Landing dashboard |
| R9 | **Protect private data**; decide & **explain** what leaves device | 8.17, 14 | Documented data-flow; egress inspector UI; redaction tests | "Privacy Panel" showing exact payload sent to LLM (or "nothing sent — local mode") |
| X1 | Extra: irregular income & bonus | 8.7 | Bonus classified one-time; answer states trust level | Priya persona demo |
| X2 | Extra: checking the forecast | 8.14 | Backtest MAE/coverage; monthly reconciliation of past forecasts | Track-record card |
| X3 | Extra: when the system is wrong | 8.15 | Duplicate/category overrides; impact diff; accuracy metric improves | "Not a duplicate" → numbers update, metric improves |
| X4 | Extra: change of plan | 8.11 | Cancel sub / new loan scenario with same rigor and side-by-side compare | Scenario compare table |

---

## 7. User Journeys & Core Scenarios

### 7.1 Journey A — First-time onboarding (≈ 3 minutes)
1. Land on **Welcome / Privacy Promise** screen (what stays local, what (if anything) goes to the LLM).
2. **Add accounts** → name, bank (auto-detected from file), type (savings/current/credit card), optional opening balance.
3. **Upload statements** (drag-drop CSV/PDF; multiple files; per-account assignment).
4. **Extraction Preview**: parsed rows count, date range, detected columns, parse warnings; user confirms mapping.
5. **Import Summary**: rows read / duplicates merged / transfers excluded / unparseable rows.
6. **Data Health Check** (Sufficiency Gate): green/amber/red with specific gaps.
7. **Review quick wins**: top uncategorized merchants, detected recurring payments (confirm/reject), flagged anomalies.
8. Land on **Dashboard**.

### 7.2 Journey B — "Can I afford X next month?"
1. User types or speaks: *"Can I afford an ₹80,000 phone next month?"*
2. NLU converts to structured intent: `{purchase: 80000, timing: next_month, payment: cash}`; user can see/edit parsed intent chips.
3. Gate check → if fails: **Refusal view** listing missing items (no number shown).
4. Forecast + affordability engine runs → **Answer Card**:
   - Verdict badge (Affordable / Tight / Not affordable / Can't tell)
   - One-line plain-language summary (LLM-phrased, number-verified)
   - **Range bar** (P10–P90) and breach probability
   - **Reasoning Ledger** (expandable, every line clickable)
   - **Buffer rationale**
   - **Trust panel**: data coverage, confidence, backtest record
5. Follow-up chips: *Buy on EMI · Wait 2 months · Cancel 2 subscriptions · Income −20%*.

### 7.3 Journey C — What-if comparison
1. User clicks scenario chips or builds custom scenario(s).
2. Lab shows **Baseline vs Scenario A vs B** side by side: end-of-month balance, lowest balance & date, headroom, breach probability.
3. User can **save/discard** scenarios; baseline history unchanged.
4. Ledger for each scenario shows *only the diffs* highlighted against baseline.

### 7.4 Journey D — Correct the system
1. User opens a flagged duplicate → clicks **"This was a real second payment."**
2. System shows **impact preview**: "Restores ₹2,499; March spend ↑ ₹2,499; forecast headroom ↓ ₹2,499; similar-pattern rule updated for this merchant."
3. User confirms → recalculated; **correction log** updated; **accuracy dashboard** reflects the change.

### 7.5 Journey E — A month later (track record)
1. User uploads the next month's statement.
2. System reconciles the stored forecast snapshot with actuals: *"Predicted closing ₹48k (₹31k–₹62k). Actual ₹44k — inside range."*
3. Track-record card updates; calibration (e.g., "80% range captured actuals in 5 of 6 months").

---

## 8. Functional Requirements (Feature Specs)

> Notation: **FR-x.y** = functional requirement; **AC** = acceptance criteria; **Edge** = edge cases to handle.

---

### 8.1 Statement Ingestion

**Purpose:** Convert heterogeneous CSV/PDF statements from multiple accounts into a canonical stream of raw transactions.

#### FR-1.1 Supported inputs
| Input | Support level |
|---|---|
| CSV (bank exports) | Full |
| XLSX exports | Nice-to-have (convert to CSV in-browser) |
| Digital (text-based) PDF | Full for ≥3 bank layouts + generic table fallback |
| Password-protected PDF | Prompt for password; processed locally; password never stored |
| Scanned/image PDF | Detect & warn; optional OCR (Tesseract.js) marked *low confidence* |

#### FR-1.2 CSV parsing pipeline
1. **Encoding & delimiter sniffing** (UTF-8/UTF-16/Windows-1252; `,` `;` `\t` `|`).
2. **Header/preamble detection:** many bank CSVs have 5–20 lines of metadata before the header; locate the header row by scoring lines against a dictionary (`date`, `narration`, `description`, `withdrawal`, `deposit`, `debit`, `credit`, `balance`, `chq/ref no`, `value date`).
3. **Column mapping:** auto-map via synonyms + fuzzy match; show mapping UI for confirmation; save per-bank **mapping profile** for reuse.
4. **Amount sign normalization:** support (a) single signed amount column, (b) separate debit/credit columns, (c) amount + Dr/Cr indicator column.
5. **Date parsing:** support `DD/MM/YY`, `DD/MM/YYYY`, `DD-Mon-YYYY`, `YYYY-MM-DD`, with **locale-aware disambiguation** (India default DD/MM) and detection by scanning for values > 12 in a position.
6. **Number parsing:** handle `1,23,456.78` (Indian grouping), parentheses negatives, trailing `CR/DR`, currency symbols.
7. **Footer/summary rows** (totals, "Statement Summary") are detected and dropped.
8. **Row-level warnings** list (unparseable date, missing amount) — never silently dropped; shown in preview.

#### FR-1.3 PDF parsing pipeline
1. Extract text items **with coordinates** (pdfjs-dist; Python `pdfplumber` as a fallback microservice if needed).
2. **Layout detection:** cluster x-positions into columns; detect header line; reconstruct rows by y-proximity.
3. **Multi-line narration joining:** rows lacking a date are continuation lines of the previous narration.
4. **Bank fingerprinting:** match on IFSC prefix / header text / logo text to apply bank-specific profile (HDFC, SBI, ICICI, Axis, Kotak) with generic fallback.
5. **Page header/footer removal:** repeated lines across pages stripped.
6. **Balance reconciliation check:** after extraction, verify `opening + Σ(credits) − Σ(debits) == closing` and `running balance` consistency. Mismatch ⇒ flagged *"extraction may be incomplete"* with the row index of first break.
7. **Extraction Preview UI:** side-by-side original PDF page and parsed table with low-confidence rows highlighted.

#### FR-1.4 Account handling
- Each upload is bound to an **Account** (`id`, `nickname`, `bank`, `type`, `masked_number` — last 4 only).
- Account types: `savings`, `current`, `credit_card`, `wallet`, `loan` (liability).
- **Credit card handling:** purchases are expenses on card; card-bill payment from bank is a *transfer*, not an expense (avoid double count — see 8.2).
- **Opening/closing balance** captured from statement when available; otherwise derived/asked.

#### FR-1.5 Import report (shown after every upload)
`rows_read`, `rows_parsed`, `rows_skipped (with reasons)`, `date_range`, `duplicates_merged`, `transfers_detected`, `balance_reconciliation_status`.

**AC**
- AC-1.1 Given a valid HDFC CSV and an SBI PDF, both import without manual code changes (mapping UI allowed).
- AC-1.2 Every skipped row is listed with a reason; zero silent drops.
- AC-1.3 Balance reconciliation passes on all demo statements or clearly flags failure.
- AC-1.4 Imports are idempotent (re-uploading the same file changes nothing).

**Edge:** Mixed currencies (flag & exclude), reversed order (newest-first) rows, merged cells, statements spanning financial-year boundaries, blank lines, BOM characters, Hindi/Unicode narrations.

---

### 8.2 Normalization, De-duplication & Internal-Transfer Detection

#### FR-2.1 Canonical transaction schema
```
txn_id (uuid), account_id, posted_date, value_date?, amount_minor (int paise, signed: debit<0, credit>0),
currency, raw_description, normalized_description, merchant_id?, channel (UPI/NEFT/IMPS/ATM/POS/NACH/CHQ/OTHER),
balance_after_minor?, source_file_id, source_row_index, fingerprint, 
category_id, category_source (rule/ml/llm/user), category_confidence,
is_transfer, transfer_pair_id?, is_duplicate_flag, dup_group_id?, user_overrides{}, created_at
```
> Money stored as **integer paise** to avoid floating-point errors.

#### FR-2.2 Description normalization
- Uppercase, strip digits-only tokens (ref numbers), UPI handles (`@okhdfc`), trailing hashes.
- Channel extraction: `UPI/…`, `NEFT-…`, `IMPS-…`, `ACH D-…`, `NACH`, `POS …`, `ATM WDL`.
- **Merchant extraction & canonicalization:** e.g., `UPI-SWIGGY-swiggy@icici-…` and `SWIGGY BANGALORE` → `Swiggy`. Uses a curated alias table + token-set similarity (Jaro-Winkler/Levenshtein ≥ 0.88) + user-defined aliases.

#### FR-2.3 De-duplication strategy (the crux)

There are **two very different "duplicates"** and they must not be conflated:

| Type | Example | Action |
|---|---|---|
| **Overlap duplicates** (same real transaction appears in two uploaded files: overlapping statement periods, or CSV + PDF of same account) | Jan 1–Mar 31 CSV and Mar 1–Jun 30 PDF both contain 12 Mar's ₹499 | **Auto-merge** (high confidence), keep provenance of both sources, report count |
| **Genuine duplicate charges** (merchant charged twice, or two identical real payments) | Two ₹2,499 charges at same merchant same day | **Keep both**, flag as *possible duplicate charge* for the user (anomaly 8.5) |

**Algorithm: fingerprint + occurrence ordinal**
1. `fingerprint = hash(account_id, posted_date, amount_minor, normalized_description_core)`.
2. Within a **single source file**, if the fingerprint appears *k* times, those are *k genuine* transactions (assign `occurrence_index` 1..k). Use `balance_after` to confirm they are distinct when available.
3. Across **different source files for the same account**, match by `(fingerprint, occurrence_index)`; matches ⇒ same underlying transaction ⇒ merge. If file A has k occurrences and file B has m, the merged count is `max(k, m)` for the overlapping window — not `k+m`.
4. **Balance-chain verification (high confidence):** if both files include running balance, matching `balance_after` is near-conclusive.
5. **Fuzzy fallback** for CSV vs PDF of same account where descriptions differ slightly: same date ±0 days, same amount, description similarity ≥ 0.8 → *candidate merge* (auto if balance matches; otherwise flagged for user).
6. **Never delete:** merged rows retain `merged_from[]` provenance; the user can *Unmerge*.

#### FR-2.4 Internal-transfer detection (prevents false income/expense)
A transfer between the user's own accounts appears as a debit in A and a credit in B.

**Matching rule:** pair debit in account A with credit in account B where:
- `|amount_A| == amount_B` (exact in paise; or within fee tolerance configured ≤ ₹25 for IMPS/NEFT fee cases),
- `|date_A − date_B| ≤ 2 days`,
- different `account_id`,
- hint tokens increase confidence: own name, `SELF`, `OWN A/C`, `NEFT/IMPS to <masked last4>`, `FUND TRANSFER`, same UPI handle, credit-card bill (`CC PAYMENT`, `BILLDESK`, `CRED`).
- Greedy one-to-one matching ordered by confidence; ties resolved by nearest date.

**Outputs:** both legs flagged `is_transfer=true`, linked by `transfer_pair_id`; excluded from income/expense totals and from the "variable spending" estimate; included in balance tracking.

**Unmatched transfer-like rows** (e.g., "Transfer to Rohit" to a third party) remain normal transactions. If a transfer-like row has no pair and the counterparty account may not be uploaded, show *"Possible transfer to an account not uploaded. Treat as expense?"* toggle.

**Credit-card special case:** the *bill payment* from bank is a transfer to the card account; the *card purchases* are the expenses. If the card statement isn't uploaded, the bill payment is treated as an expense (category: `Credit Card Bill`) with a warning that category detail is unavailable.

**AC**
- AC-2.1 Re-importing overlapping files produces no inflated totals (property test).
- AC-2.2 Two identical genuine same-day payments within one file are both retained.
- AC-2.3 A ₹10,000 SBI→HDFC move is excluded from both income and expense.
- AC-2.4 Every merge/transfer decision is visible, explained, and reversible.

---

### 8.3 Transaction Categorization & Corrections

#### FR-3.1 Category taxonomy (default, extensible)
Income (Salary, Freelance, Interest, Refund, Other income) · **Housing** (Rent, Maintenance) · **Food** (Groceries, Dining, Delivery) · **Transport/Travel** (Fuel, Cab, Flights, Hotels) · **Subscriptions** (Streaming, Software, Memberships) · **EMI/Loans** · **Utilities** (Electricity, Internet, Mobile, Gas, Water) · **Shopping** · **Health** · **Education** · **Insurance** · **Investments/SIP** · **Cash Withdrawal** · **Fees & Charges** · **Transfers** (system) · **Credit Card Bill** · **Other/Uncategorized**.

Each category carries a flag: **`essential` / `discretionary` / `committed`** — used by the safety buffer and forecast.

#### FR-3.2 Hybrid categorization pipeline (ordered, first-confident-wins)
1. **User rules** (highest priority; from corrections).
2. **Merchant dictionary** (curated: Swiggy, Zomato, Netflix, IRCTC, BESCOM, Jio, …).
3. **Keyword/regex rules** (`RENT`, `EMI`, `SIP`, `SALARY`, `ELECTRICITY`, …) with channel hints (`ACH D` + `LOAN` ⇒ EMI).
4. **Statistical/ML classifier** (lightweight TF-IDF + logistic regression trained on seed data; runs locally) — optional if time-bound.
5. **LLM-assisted fallback** for *unknown merchants only*, receiving **only the redacted merchant string** (never amount/date/account/name) and returning a category from a closed list with confidence. Cached per merchant.
6. Else → `Uncategorized` (never guessed silently).

Each assignment stores `category_source` and `category_confidence`; low-confidence rows surface in a **"Needs review"** queue.

#### FR-3.3 User correction & propagation
- User changes category of any transaction.
- System prompts **scope** (default = *same merchant*):
  - ☐ This transaction only
  - ☑ All transactions from **this merchant** (past & future)
  - ☐ All similar descriptions (fuzzy ≥ threshold) — shows preview
  - ☐ Only within selected account / date range
- **Impact preview (before apply):** list of N transactions that would change, with old→new category, sums, and month-level effect on spending.
- **After apply:** **Change Report** — *"Updated 11 transactions: Swiggy ×9, Swiggy Instamart ×2. Food ↑ ₹6,140; Shopping ↓ ₹6,140."* Persisted in `correction_log` with **Undo**.
- Creates a **user rule** (merchant → category) so future imports apply it automatically.
- **Conflict handling:** if a more-specific user rule exists for a subset (e.g., "Amazon Prime" = Subscriptions vs "Amazon" = Shopping), the specific rule wins; the report lists *skipped* items with reason.
- **Precedence:** explicit per-transaction override > specific merchant rule > general rule > pipeline.

#### FR-3.4 Category quality indicators
- Share of spend **uncategorized**; share **user-verified**; share **low-confidence**. These feed the confidence score (8.13) and the Sufficiency Gate warning (e.g., >30% uncategorized ⇒ amber).

**AC**
- AC-3.1 Correcting "Swiggy" updates all Swiggy rows and lists them by ID/date/amount.
- AC-3.2 Corrections persist across re-import.
- AC-3.3 Undo restores previous categories exactly.
- AC-3.4 Category accuracy on the labeled synthetic set ≥ 85% before corrections (stretch ≥ 92%).

---

### 8.4 Recurring Payment Detection

#### FR-4.1 Detection method
For each canonical merchant (and `(merchant, amount-band)` group):
1. Gather occurrence dates; compute **inter-arrival intervals**.
2. Classify cadence by interval clustering with tolerance:
   - Weekly (7±1), Fortnightly (14±2), **Monthly (28–33; or same day-of-month ±3)**, Quarterly (89–93), Half-yearly, Annual (360–370).
3. **Amount stability:** coefficient of variation ≤ 0.05 ⇒ *fixed* (subscription/EMI/rent); 0.05–0.30 ⇒ *variable-recurring* (utilities, mobile postpaid).
4. **Minimum evidence:** ≥3 occurrences for monthly; ≥2 for annual with *lower* confidence.
5. **Month-end/weekend drift:** payments that shift due to weekends/holidays (e.g., 1st→3rd) still count (compare using business-day-adjusted anchor).
6. **Classify type:** `subscription`, `emi`, `rent`, `utility`, `insurance`, `sip`, `other_recurring` via category + keywords (`EMI`, `LOAN`, `ACH`, `NACH`, `SIP`).
7. **Income recurrence** is detected symmetrically (salary).

#### FR-4.2 Outputs per recurring item
`merchant`, `type`, `cadence`, `typical_amount` (median), `amount_range`, `last_paid_date`, `**next_expected_date**`, `next_expected_amount` (± range), `occurrences`, `confidence (0–1)`, `status` (`active`, `possibly_ended` if >1.5× cadence overdue, `paused`), `user_status` (`confirmed`, `rejected`, `auto`).

#### FR-4.3 EMI specifics
- Detect EMIs from `ACH D / NACH / LOAN / EMI / FINANCE` narrations with fixed amount.
- If **EMI count remaining** is unknown, *ask the user optionally* ("How many installments left?"); otherwise assume continuing through the forecast horizon and **state the assumption**.

#### FR-4.4 User control
- **Confirm / Reject / Edit** (amount, date, cadence). Rejected patterns are never re-suggested for that merchant unless pattern materially changes.
- **Add manual recurring item** (e.g., a cash rent paid not visible in statements).

**AC**
- AC-4.1 Netflix, rent, EMI, internet, SIP on demo data all detected with correct next dates (±3 days).
- AC-4.2 Non-recurring repeats (e.g., 3 random Zomato orders at irregular gaps) are *not* flagged as subscriptions.
- AC-4.3 Detection confidence displayed; rejection persists.

---

### 8.5 Anomaly Detection

#### FR-5.1 Anomaly types & rules

| Type | Detection logic | Explanation template |
|---|---|---|
| **Sudden large amount** | Robust z-score: `(x − median_cat) / (1.4826·MAD_cat) ≥ 3.5` within the category (and amount ≥ ₹ floor, e.g., 1.5× the category's 90th percentile); for merchants with history, compare against merchant median | "₹18,400 at XYZ is **6.2×** your typical Shopping transaction (median ₹2,950; your 90th percentile is ₹7,800)." |
| **Duplicate charge** | Same merchant + same amount within 0–3 days (or within 24h for subscriptions) **not explained by recurrence**, occurrence in same source file | "Two ₹2,499 payments to Gadget Store within 1 day (12 Mar & 12 Mar). Could be a duplicate charge." |
| **New merchant** | First-ever appearance of a merchant with amount above `new_merchant_threshold` (default max(₹1,500, P75 of category)) | "First payment to 'ABC Traders' — ₹7,200. No earlier history." |
| **Recurring amount change** | Known recurring item's amount differs >10% from median | "Netflix rose from ₹199 → ₹649 (+226%)." |
| **Missed/late recurring** | Expected recurring payment not observed ≥ 5 days past due | "Rent expected ~5 Mar; not seen." |
| **Unusual timing/volume** | Daily spend > P99 or >N transactions in 1 hour at same merchant | "9 transactions at the same merchant in 40 minutes." |
| **Fee/penalty** | Category = Fees & Charges unusual (late fee, overdraft) | "Late payment fee ₹590 charged." |
| **Income anomaly** | Salary deviates materially from usual | "Salary this month ₹28,000 vs median ₹60,000 (−53%)." |

#### FR-5.2 Severity & prioritization
Severity = f(amount impact on headroom, rarity score, user history of dismissals). Show top-5 on dashboard; full list in Anomalies view.

#### FR-5.3 Required: **"Why flagged?"**
Every flag stores `rule_id`, `inputs` (the numbers used), `threshold`, and a rendered plain-English reason. The detection math is code; the LLM may *rephrase* but numbers come from the stored inputs.

#### FR-5.4 User feedback
Buttons: **Expected / Not an issue** (suppress for this merchant), **It was a real second payment** (for duplicates), **Dispute/Note**. Feedback adjusts per-merchant thresholds (8.15).

**AC**
- AC-5.1 Seeded anomalies (one large, one duplicate, one new merchant) are all flagged on demo data, with correct explanation numbers.
- AC-5.2 False-positive rate on normal seed data < 5% of transactions.
- AC-5.3 Anomalies don't hide transactions; they only annotate.

---

### 8.6 Data Sufficiency Gate ("Say when it does not know")

A **hard gate** evaluated before any forecast or affordability answer.

#### FR-6.1 Checks

| Check | Rule | Result if failed |
|---|---|---|
| **History length** | Contiguous covered span < **3 full months** (≥ 90 days), per account used in forecast | **INSUFFICIENT** |
| **Income presence** | No credit classified as income (salary/freelance/other income) in the history window | **INSUFFICIENT** (or "income unknown — enter manually" path) |
| **Date gaps** | Any gap > 7 consecutive days with *zero* transactions in an account that otherwise has frequent activity, or missing calendar months between statements | **INSUFFICIENT** if a whole month is missing; **LOW_CONFIDENCE** for smaller gaps |
| **Balance anchor** | No reliable current balance (no closing balance, reconciliation failure) | **INSUFFICIENT** until user supplies balance |
| **Recency** | Latest transaction older than 45 days ⇒ "forecast would start from a stale balance" | **LOW_CONFIDENCE**/ask for new statement |
| **Account coverage mismatch** | Accounts' coverage windows don't overlap | **LOW_CONFIDENCE**, show coverage timeline |
| **Categorization quality** | Uncategorized share > 30% of spend | **LOW_CONFIDENCE** |
| **Extraction integrity** | Balance reconciliation failed on any file | **LOW_CONFIDENCE** (or INSUFFICIENT if severe) |
| **Income volatility** | Income CV > 0.5 or <3 income observations | **LOW_CONFIDENCE** with wide range |
| **Obligation completeness** | User hasn't confirmed other obligations (cash rent, off-statement loans) | Soft warning; ask once |

#### FR-6.2 Status model
- `OK` → answer allowed, confidence computed.
- `LOW_CONFIDENCE` → answer allowed **with** a prominent warning banner, wider ranges, and "what would improve this" tips.
- `INSUFFICIENT` → **no numeric answer**. Show *"I can't answer this reliably yet"* + checklist of exactly what is missing and how to fix it (e.g., *"Upload Jan 2025 for SBI (gap: 1–31 Jan)"*; *"No salary credits found — add expected income manually or upload an account that receives it"*).

#### FR-6.3 Coverage timeline UI
A horizontal timeline per account showing covered date ranges, gaps in red, and the required 3-month window.

**AC**
- AC-6.1 With 2 months of data, system returns `INSUFFICIENT`, **no figure**, and a specific reason list.
- AC-6.2 With no income found, system names "no income found".
- AC-6.3 Gate decision itself is code-computed and logged in the answer's snapshot.

---

### 8.7 Income Analysis & Uncertain Income

#### FR-7.1 Income classification
Each credit (non-transfer) is classified: `salary` (recurring, same payer, day-of-month stable), `freelance/variable`, `bonus/one-time` (large, isolated, off-cycle, narration contains BONUS/INCENTIVE/ARREARS/REFUND-like keywords), `interest`, `refund/reversal` (matched to earlier debit — *not income*), `gift/other`.

#### FR-7.2 Income model
- **Regular income:** median of last N (≥3) salary credits; expected date = typical day-of-month (business-day adjusted).
- **Variable income:** empirical distribution of monthly totals (from available months); statistics: mean, median, **std, CV**, min, max.
- **One-time income (bonus):** *excluded from baseline expectations by default.* If a bonus appeared last year but not this year, the engine **does not assume it will recur**, and the answer states: *"A ₹1,20,000 bonus was received Apr 2024; none seen in the last 12 months — not included. If you expect one, add it as an assumption."* The user may add an **Expected Income Event** (date, amount, certainty%).
- **Income volatility label:** `Stable (CV<0.10)`, `Variable (0.10–0.30)`, `Irregular (>0.30)`.

#### FR-7.3 How uncertainty is communicated
- Forecast outputs **P10 / P50 / P90** (plus min/max scenarios) of month-end balance and *lowest-balance-in-month*.
- Probability of **breaching safety buffer** and probability of **going below zero**.
- Plain statement: *"Because your income varied between ₹42,000 and ₹98,000 over the last 6 months, I'm giving a range rather than one number."*
- **Conservative-income mode** (default for Irregular): use P25 of income for the "headline" verdict; toggle to median.

#### FR-7.4 Manual overrides
User can input expected income for next month (e.g., signed contract ₹60,000 arriving 10th) with a **certainty** slider; engine treats as probabilistic event.

**AC**
- AC-7.1 Bonus is not auto-included in next-month income.
- AC-7.2 For Priya persona, answer shows a range and trust label; changes with income volatility.
- AC-7.3 Refunds/reversals are excluded from income.

---

### 8.8 Cash-Flow Forecast Engine

> **Deterministic, seeded, unit-tested. No LLM involvement.**

#### FR-8.1 Inputs
| Input | Source |
|---|---|
| Current balance (sum of included accounts, as of latest statement date, rolled forward to *today* using known recurring items only if the statement is stale — flagged) | Statements / user-confirmed |
| Income model | 8.7 |
| Recurring commitments with next dates | 8.4 |
| Variable spending model per category | below |
| Known one-off future items | user-entered (e.g., insurance premium due 20th) |
| Scenario overlays | 8.11 |
| Horizon | default 90 days (daily granularity); affordability question uses the *target month* |

#### FR-8.2 Variable spending model
1. Build **monthly totals per category** from the history, **excluding** recurring (committed), transfers, one-time large anomalies (user-adjustable), and income.
2. For each variable category compute a **robust central estimate**: median of monthly totals (or 20%-trimmed mean when ≥ 6 months).
3. Compute **dispersion**: MAD/IQR of monthly totals → used for sampling.
4. **Seasonality & trend (light):** if ≥ 12 months, optional month-of-year factor; otherwise no seasonality (state that). Trend: simple linear slope check; apply only if statistically meaningful (e.g., |slope| over last 6 months significant) — otherwise ignore (documented).
5. **Intra-month distribution:** spread spending by **day-of-week/day-of-month weights** learned from history (e.g., higher spend on weekends / first week after salary) so the *daily* balance path is realistic.

#### FR-8.3 Daily balance projection (the deterministic "central path")
For each day *d* in horizon:
```
B[d] = B[d-1] + Income_expected[d] − Committed[d] − Variable_expected[d] − OneOffs[d]
```
Reported: **end-of-target-month balance**, **lowest balance in the horizon and its date**, **days below buffer**, **days below zero**.

> *Why daily?* A user can be fine at month-end but run dry on the 24th before salary arrives. The engine reports the **minimum balance date**.

#### FR-8.4 Uncertainty simulation (seeded Monte Carlo — still code, still deterministic)
- Run **N = 5,000** simulations with a fixed seed (stored in snapshot).
- Per run:
  - Sample monthly income from the empirical distribution (bootstrapped from observed months; with Gaussian-kernel jitter for small samples; heavier tails for Irregular).
  - Sample each variable category's monthly spend (bootstrapped from its history; scaled by day-weights).
  - Recurring items: amounts fixed ± observed variation; probability of "payment occurs" = 1 for confirmed, = confidence for auto-detected.
  - Optional correlated shock option (e.g., spend share ↑ when income ↓ is *not* assumed; documented).
- Output: P10, P25, P50, P75, P90 of (a) target-month-end balance, (b) minimum balance; `P(breach buffer)`, `P(balance<0)`.
- **Convergence check:** compare results at N and N/2; flag if shifted > 1%.

#### FR-8.5 Forecast snapshot
Every forecast run persists an immutable **Forecast Snapshot**: input hash, parameters, seed, outputs, engine version — enabling reproducibility, replay and backtesting (8.14).

**AC**
- AC-8.1 Re-running with same data/seed yields byte-identical outputs.
- AC-8.2 Forecast reports lowest-balance date within the month.
- AC-8.3 Unit tests cover each formula with hand-calculated expected values.

---

### 8.9 Safety Buffer

The problem statement requires the system to say **how the safety buffer was decided**.

#### FR-9.1 Default buffer formula (transparent, configurable)

```
Buffer = max( Floor,  k × MonthlyEssentials,  VariabilityReserve )
```
Where:
- **MonthlyEssentials** = median monthly sum of categories flagged *essential/committed* (rent, utilities, EMIs, insurance, groceries, transport baseline).
- **k (months of cover)** depends on income stability:
  | Income volatility | k |
  |---|---|
  | Stable (CV < 0.10) | **1.0** |
  | Variable (0.10–0.30) | **1.5** |
  | Irregular (> 0.30) | **2.0** |
- **VariabilityReserve** = (P50 − P10 of next-month *discretionary + variable* spend and income shortfall) — i.e., the amount needed to absorb a bad-but-plausible month.
- **Floor** = absolute minimum (default ₹5,000; configurable).

The UI shows: *"Safety buffer ₹58,000 = 1.5 × your monthly essentials (₹38,700) because your income is *Variable* (CV 0.21). Floor ₹5,000 and variability reserve ₹41,000 were lower, so they did not apply."*

#### FR-9.2 User control
- Slider/inputs: months of cover `k`, absolute override, floor.
- Presets: **Lean (0.5×) / Standard / Cautious (3×)** with a one-line explanation each.
- Changing the buffer instantly recomputes headroom, and the ledger highlights the change.

#### FR-9.3 Buffer caveat copy
*"A safety buffer is a planning safeguard, not a guarantee. It reflects your past spending; it cannot cover unknown emergencies."*

**AC**
- AC-9.1 Buffer rationale always rendered with the formula, inputs, and which term was binding.
- AC-9.2 Changing `k` changes verdict consistently (unit-tested).

---

### 8.10 Affordability Decision Engine

#### FR-10.1 Inputs (structured)
```json
{
  "purchase": {"amount_minor": 8000000, "label": "Phone"},
  "timing": {"type": "next_month", "date": null},
  "payment": {"type": "cash"},                 // or emi{principal,rate,tenure,fees,down_payment,start_date}
  "buffer_policy": "default",
  "risk_mode": "conservative"                  // headline uses P25 income / P20 spend? see below
}
```

#### FR-10.2 Computation
For a **cash** purchase on date *t* in target month:
```
Projected balance before purchase  B_pre   = forecast balance on day t (P10/P50/P90)
Balance after purchase             B_post  = B_pre − Cost
Headroom                           H       = (min balance from t to end of horizon after purchase) − Buffer
```
> Headroom uses the **minimum future balance after purchase**, not just the end-of-month number.

For **EMI**: include down payment on *t*, then installments on their dates; interest by standard reducing-balance EMI formula:
`EMI = P·r·(1+r)^n / ((1+r)^n − 1)`, with processing fee, GST on interest/fee (optional assumption flagged), and total interest cost displayed.

#### FR-10.3 Verdict logic

| Condition (all using simulated outcomes) | Verdict | Copy |
|---|---|---|
| `P(min balance < buffer) ≤ 10%` **and** P10 headroom ≥ 0 | ✅ **Affordable** | "Comfortably affordable — stays above your buffer in ≥90% of simulated outcomes." |
| P50 headroom ≥ 0 but P10 headroom < 0 (breach probability 10–50%) | 🟡 **Tight / Risky** | "Likely affordable but exposed if income or spending comes in worse than usual." |
| P50 headroom < 0 but P50 min balance ≥ 0 | 🟠 **Not advisable** | "You'd dip below your safety buffer (but not below zero) in a typical month." |
| P50 min balance < 0 **or** P(balance < 0) > 25% | 🔴 **Not affordable** | "You'd likely run out of money before income arrives." |
| Gate = INSUFFICIENT | ⚪ **Can't tell** | "Not enough reliable data — here's what's missing." |

Thresholds are **configurable constants**, documented, and displayed in the UI ("How I decide verdicts").

#### FR-10.4 Required output ("Reasoning Ledger" fields; see 8.13)
1. Current balance (per account + total, as-of date)
2. Expected income (regular / variable / one-time excluded; range)
3. Committed payments (recurring items due before/within target window, with dates)
4. Estimated variable spending (per category, central estimate + range)
5. Safety buffer (value + rationale)
6. Purchase cost (and payment terms)
7. Projected balance after purchase (P10/P50/P90) and lowest point + date
8. Headroom, breach probability
9. Verdict + confidence + caveats
10. **"Shown even when answer is No"** – ledger rendering is unconditional.

#### FR-10.5 "What would make this work?" (constructive helper)
Computed by code (not LLM): minimum delay (months) to afford; maximum affordable amount today (`max_cost = H_P50 + Cost`); required savings/cut per month; EMI tenure at which breach probability < 10%.

**AC**
- AC-10.1 Verdict + ledger rendered for Yes and No cases with identical structure.
- AC-10.2 Hand-calculated test cases match to the rupee.
- AC-10.3 Unit tests assert that LLM output never alters any numeric field.

---

### 8.11 What-If Simulation Lab (Signature Feature)

#### FR-11.1 Scenario model
A **Scenario** = base snapshot + an ordered list of **Adjustments** (overlay operations). It never mutates transactions.

| Adjustment | Parameters | Effect on forecast |
|---|---|---|
| `purchase_cash` | amount, date | one-off outflow |
| `purchase_emi` | principal, rate, tenure, fee, down payment, start | down payment + installments + interest |
| `delay_purchase` | months | shifts purchase date |
| `cancel_recurring` | recurring_id(s), effective date | removes future outflows (with optional cancellation fee / notice period) |
| `add_recurring` | amount, cadence, start | new commitment |
| `new_loan` | principal, rate, tenure, fees, disbursal date | inflow (if disbursed to account) + EMIs |
| `income_shock` | −X% / +X% or ₹ change, duration | scales income distribution |
| `expense_shock` | category, ±%, duration | scales variable category |
| `one_time_income` | amount, date, certainty | probabilistic inflow |
| `buffer_change` | k / absolute | changes buffer |
| `prepay_loan` | amount, date | reduces future EMI / tenure |

#### FR-11.2 Behaviors
- **Independent & reversible:** toggle on/off, delete, duplicate, rename.
- **Composable:** chain adjustments ("cancel 2 subscriptions **and** buy on EMI").
- **Comparable:** side-by-side **Scenario Compare** table with deltas vs baseline:

| Metric | Baseline | A: Cash now | B: EMI 6m | C: Wait 2m + cancel subs |
|---|---|---|---|---|
| Month-end balance (P50) | … | … | … | … |
| Lowest balance & date | … | … | … | … |
| Headroom vs buffer (P10) | … | … | … | … |
| P(breach buffer) | … | … | … | … |
| Total cost (incl. interest) | … | … | … | … |
| Verdict | … | … | … | … |

- **Same trust standard:** every scenario produces its **own Reasoning Ledger**, with diff highlighting versus baseline — solving the "how would the user trust it as much as the first one?" question.
- **Sensitivity / tornado view:** which assumption moves the answer most (income ±10%, groceries ±10%, buffer k ±0.5). Computed by code via one-at-a-time perturbation.
- **Break-even helpers:** "Cancelling Netflix + Prime saves ₹1,198/mo → ₹14,376/yr; not enough alone to make this purchase affordable (needs ₹X)."
- **Natural-language entry:** "What if I wait two months and cancel Hotstar?" → parsed to adjustments (user sees chips to confirm before running).

#### FR-11.3 Persistence
Scenarios stored in `scenarios` & `scenario_adjustments` tables, linked to the base snapshot id, deletable.

**AC**
- AC-11.1 Running a scenario leaves `transactions` table byte-identical (test).
- AC-11.2 Cancelling a subscription changes forecast by exactly its monthly amount × remaining occurrences in horizon.
- AC-11.3 Scenario ledger shows a diff against baseline.

---

### 8.12 Natural-Language Interface

#### FR-12.1 Capabilities
- Parse questions into **structured intents** (JSON schema): `affordability`, `what_if`, `explain_category`, `list_recurring`, `spending_summary`, `why_flagged`, `compare_scenarios`.
- Extract entities: amount (handles "80k", "₹80,000", "1.2 lakh"), timing ("next month", "in March", "after Diwali" → ask clarification), payment method (cash/EMI), scenario modifications.
- **Clarification dialogs** when ambiguous (e.g., timing unspecified → default next month and say so; EMI terms missing → ask).
- **Intent confirmation chips** displayed before computing (transparent parsing).
- Responses: structured card (numbers from engine) + short LLM-phrased narrative that passes the **number-verification guard** (see 14.3).

#### FR-12.2 Fallbacks
- If LLM unavailable/offline → **rule-based parser** (regex/grammar for amounts/timing) + **template narration**. The demo must work with no network.

#### FR-12.3 Out-of-scope handling
Declines investment advice, tax, "guarantee" questions; explains scope. Never gives prescriptive financial advice beyond the calculation (adds disclaimer: *"This is a planning aid, not financial advice."*).

**AC**
- AC-12.1 "Can I afford an ₹80,000 phone next month?" parses correctly with ≥95% on a 50-phrase test set (variants of amount/timing wording).
- AC-12.2 With LLM disabled, the core Q&A still works via templates.

---

### 8.13 Explanation / Reasoning Ledger

The visible, checkable chain of reasoning — the heart of "explains its answers".

#### FR-13.1 Ledger structure
Each ledger is a list of **steps**; each step has:
```
step_no, label, value (or range), formula_id, formula_text (human-readable),
inputs[] (named values), source_refs[] (txn_ids / recurring_ids / assumption_ids),
notes/assumptions[], confidence_flag, status (ok | warning)
```
Example (Aarav's ₹65,000 laptop):

| # | Step | Value | How computed | Evidence |
|---|---|---|---|---|
| 1 | Current balance (HDFC + SBI) | ₹1,12,400 | Sum of latest balances as of 28 Mar | [view 2 statements] |
| 2 | Expected income (next month) | ₹78,000 (range 74k–78k) | Median of last 6 salary credits | [view 6 credits] |
| 3 | Committed payments before month-end | −₹31,800 | Rent 10,000 · EMI 4,500 · SIP 5,000 · Netflix 649 · … | [view 9 items] |
| 4 | Variable spending estimate | −₹24,500 (21k–29k) | Median monthly Food+Travel+Shopping+Other over 6 months | [view by category] |
| 5 | Forecast balance before purchase | ₹1,34,100 (P10 ₹1,18,000 – P90 ₹1,45,000) | 1 + 2 − 3 − 4 | — |
| 6 | Safety buffer | ₹58,000 | 1.5 × essentials ₹38,700 (variable income) | [how decided] |
| 7 | Purchase | −₹65,000 | User input | — |
| 8 | Balance after purchase | ₹69,100 (P10 ₹53,000) | 5 − 7 | — |
| 9 | Lowest balance & date | ₹61,300 on 27 Apr | Daily projection | [view chart] |
| 10 | **Headroom** | **+₹3,300 (P10: −₹5,000)** | Lowest balance − buffer | — |
| 11 | **Verdict** | **Tight** | P50 ≥ 0 but P10 < 0; breach prob 24% | [how I decide] |

*(Illustrative numbers.)*

#### FR-13.2 Interaction
- Click any value → **evidence drawer** listing the exact transactions/assumptions with dates and amounts.
- **"Recalculate by hand" mode:** shows the arithmetic with each operand so the user can verify with a calculator.
- **Export:** *Calculation Audit* as JSON + printable PDF/Markdown (inputs, parameters, seed, engine version, outputs).
- **Assumptions panel:** every assumption listed (e.g., "bonus excluded", "EMI continues through horizon", "no seasonality used (only 6 months)").

#### FR-13.3 Confidence score (0–100) — transparent composition
| Component | Weight | Basis |
|---|---|---|
| Data length & coverage | 25% | months covered, gaps |
| Income stability | 25% | CV, observation count |
| Categorization quality | 15% | % verified / confident |
| Recurring detection coverage | 15% | % of committed spend user-confirmed |
| Backtest accuracy | 20% | historical forecast error (8.14) |

Mapped to labels: **High ≥ 75, Medium 50–74, Low < 50**; with a plain-language list of *what would raise it*.

**AC**
- AC-13.1 Every number on the Answer Card appears in the ledger with ≥1 source ref.
- AC-13.2 Evidence drawer opens the correct transactions for each step (tested on 5 sample numbers).
- AC-13.3 Confidence score reproducible from stored components.

---

### 8.14 Forecast Track Record (Backtesting & Live Tracking) — *Extra: "Checking the forecast"*

#### FR-14.1 Historical backtest (available immediately after import)
- **Walk-forward evaluation:** for each historical month *m* (needs ≥ 3 prior months), run the forecaster using only data before *m*, forecast *m*'s closing balance and category spend, compare with actuals.
- **Metrics:**
  - **MAE / MAPE** of month-end balance.
  - **Interval coverage:** % of months where actual fell within the predicted P10–P90 (target ≈ 80%; reports *calibration*).
  - **Bias** (systematic over/under prediction).
  - **Breach-call accuracy:** when the engine said "Tight/Not advisable", did the buffer actually get breached?
  - Per-component errors: income, committed, variable (identifies *which* part is weak).
- **Display:** track-record card (*"Backtested over 5 months: actual balance landed inside my range 4/5 times; average miss ₹6,200 (5.8%)"*) + chart of forecast bands vs actuals.

#### FR-14.2 Live tracking
- Every answer stores a **Forecast Snapshot**. When new statement data covers the forecast period, a **Reconciliation job** compares predicted vs actual, labels *within range / above / below*, and updates the track record.
- User-facing: "Last month's forecast: predicted ₹48k (₹31–62k); actual ₹44k ✔ in range."

#### FR-14.3 Using results
- Backtest error feeds the confidence score and may **auto-widen intervals** if empirical coverage < 70% (conformal-style calibration widening), with the adjustment disclosed.
- If backtest history is too short (<3 test months), the card states so rather than reporting misleading accuracy.

**AC**
- AC-14.1 Backtest runs on demo data and outputs MAE & coverage.
- AC-14.2 Reconciliation compares a stored snapshot to later actuals (demo via "time-travel" dataset).
- AC-14.3 Interval widening rule is unit-tested.

---

### 8.15 Feedback & Self-Correction Loop — *Extra: "When the system is wrong"*

#### FR-15.1 What the user can correct
| Error | User action | System response |
|---|---|---|
| Flagged duplicate was a real payment | "Not a duplicate" | Restore/keep both; show impact (spend, forecast); learn: this merchant+amount may repeat → relax duplicate rule for that merchant |
| Real duplicate not flagged | "Mark as duplicate" | Exclude from spend; show impact |
| Wrong category (single / merchant / pattern) | Change category | Propagation preview + change report (8.3) |
| Transfer mis-paired / missed | Pair/unpair | Recompute totals, show effect |
| Wrong recurring detection | Confirm/reject/edit | Update commitments; forecast delta shown |
| Wrong income classification (e.g., bonus vs salary) | Reclassify | Income model recalculated, ledger updated |
| Missing obligation | Add manual recurring/one-off | Included, flagged "user-supplied" |

#### FR-15.2 "What changed?" panel (mandatory after any correction)
Shows **before → after** for: categorized spend, monthly totals, committed total, forecast P50, headroom, verdict (if changed), and confidence score — so the user sees consequence, not just a toast message.

#### FR-15.3 Mass-error situation ("categories wrong for a large share")
- **Bulk review mode:** group uncategorized/low-confidence rows by merchant, sorted by spend impact; one decision fixes many rows; progress bar showing *"72% of spend verified → 94%"*.
- **Re-categorize all** with new rules; shows number changed.
- **Rule inspector:** list of user rules, ability to edit/delete.

#### FR-15.4 Measuring improvement ("how would you know it got better?")
Maintain a **Quality Dashboard** (per user, local):
- % transactions user-verified; % uncategorized spend; correction count and **repeat-error rate** (same merchant mis-categorized again; target 0).
- Duplicate-flag **precision** (confirmed duplicates / flags) trending.
- Backtest MAE before vs after corrections.
- For the demo: **offline evaluation harness** with labeled synthetic data: category accuracy before/after applying N corrections (e.g., 78% → 94%).

**AC**
- AC-15.1 Marking a flagged duplicate as real updates totals and shows the delta panel.
- AC-15.2 Repeat-error rate after correction = 0 on re-import.
- AC-15.3 Quality metrics change visibly after corrections.

---

### 8.16 Dashboard

**Requirement:** spending by category, monthly trend, and forecast visible **without digging through screens**.

#### FR-16.1 Layout (single scrollable page, above-the-fold essentials)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Header: [Accounts ▾ All] [Date range ▾] [Data health ●] [Privacy: Local] │
├───────────────┬──────────────────────────────┬───────────────────────────┤
│ Net position  │ Spending by category         │ Monthly trend             │
│ ₹ total       │ (donut/bar, click-through)   │ (income vs spend vs net,  │
│ per account   │                              │  last 6–12 months)        │
├───────────────┴──────────────────────────────┴───────────────────────────┤
│ Forecast (next 60–90 days): daily balance line with P10–P90 band,        │
│ buffer line, marked upcoming recurring payments & income, lowest point    │
├───────────────────────────────┬──────────────────────────────────────────┤
│ ASK: "Can I afford … ?" [___] │ Upcoming (next 14 days) · Anomalies (top)│
│ quick chips                   │ Recurring summary · Needs-review queue   │
└───────────────────────────────┴──────────────────────────────────────────┘
```

#### FR-16.2 Components
1. **Data Health badge** (green/amber/red) → opens coverage timeline.
2. **KPI strip:** current balance, avg monthly income, avg monthly spend, savings rate, committed % of income.
3. **Category chart:** period selectable; excludes transfers; shows % and change vs previous period; click to filter transactions.
4. **Monthly trend:** stacked bars (by category group) + income line; hover for details.
5. **Forecast chart:** median line, shaded P10–P90, buffer threshold line, markers for salary/EMI/rent events, lowest-balance annotation.
6. **Ask bar** (NL input) always present.
7. **Upcoming payments** (next 14/30 days) from recurring detection.
8. **Anomaly feed** (top 5), **Needs-review** counter.
9. **Track-record mini-card**.
10. **Insufficient-data state:** charts for what's available still render; forecast panel shows the explicit "can't forecast yet — here's why" state (never a fake line).

#### FR-16.3 Other screens
- **Transactions** (search, filters, category edit, flags, source provenance, unmerge).
- **Recurring** (table + timeline).
- **Anomalies**.
- **Decision Lab** (answers + scenarios).
- **Forecast & Assumptions** (full detail, backtest).
- **Privacy & Data** (data-flow explainer, egress log, delete data).
- **Settings** (buffer policy, thresholds, categories, rules).

**AC**
- AC-16.1 All three required visuals visible on first load at 1440×900 without scrolling or clicking tabs.
- AC-16.2 Dashboard renders in < 2 s for 5,000 transactions.
- AC-16.3 Fully usable at mobile width (responsive).

---

### 8.17 Privacy & Security

**The design decision (explainable in one paragraph):**

> *"Bank statements never leave the user's own environment. Parsing, categorization (rules/local model), recurring and anomaly detection, forecasting and affordability all run locally. The only optional external call is to an LLM for (a) interpreting the user's question and (b) phrasing the explanation — and that call receives only **redacted, minimal, aggregated** data (category totals, rounded figures, no names, account numbers, merchants-with-personal-identity, or raw descriptions). A **local-LLM mode** sends nothing at all. The user can inspect the exact payload before it is sent."*

#### FR-17.1 Data-flow policy

| Data | Stays local? | Sent to external LLM? |
|---|---|---|
| Raw statement files (CSV/PDF) | ✅ always | ❌ never |
| Raw transaction descriptions, UPI IDs, names, account numbers | ✅ | ❌ never |
| Individual transactions (date+amount+merchant) | ✅ | ❌ never |
| **Merchant name only** for unknown-merchant categorization | ✅ | ⚠️ Only if user enabled "AI categorization", only the *canonical merchant string*, redacted of personal names; cached |
| Aggregated ledger numbers (e.g., "Food ₹6,100/mo") | ✅ | ⚠️ Only the **ledger JSON** (rounded to nearest ₹100 optional) for phrasing — *no identifiers* |
| User's natural-language question | ✅ | ⚠️ Sent for parsing; amount is the only numeric; PII regex-scrubbed |
| Passwords for PDFs | ✅ memory-only | ❌ never |

#### FR-17.2 Mechanisms
1. **Local-first processing:** parsing in browser (WebWorker) or local server process; no cloud storage.
2. **PII Redactor module:** removes account numbers (regex for 9–18 digit sequences), PAN, Aadhaar patterns, phone numbers, emails, UPI handles, IFSC, person names (from a user-provided "my names" list + NER for capitalised tokens), before *any* external payload.
3. **Egress Gateway:** a single module through which all outbound calls pass; enforces **allow-list schema** (only fields in the defined `LLMPayload` types may be sent). Anything else is dropped and logged. Unit-tested.
4. **Egress Inspector UI:** "View what was sent" log with timestamps and exact JSON; toggle **"Ask before every external call"**.
5. **Three privacy modes:**
   - 🔒 **Offline/Local (default for demo-safe):** local LLM (Ollama, e.g., Llama 3.x / Qwen) or rule-based parser + templates; **zero egress**.
   - 🛡️ **Hybrid (redacted aggregates only):** external LLM for language only.
   - ⚙️ **Off:** deterministic templates only.
6. **Encryption:** local DB encrypted at rest (SQLCipher or per-user key derived with Argon2/PBKDF2 + WebCrypto AES-GCM for browser storage); TLS for any server component; secrets in env, not repo.
7. **Retention & deletion:** "Delete all my data" (hard delete DB, caches, uploads); option to **not persist raw files** (parse-and-discard; keep only normalized transactions).
8. **No third-party analytics/trackers;** no logs containing financial data; error reporting scrubbed.
9. **Logs hygiene:** server logs never contain descriptions or amounts (only counts/ids).
10. **Access control:** if a server component exists — authentication, per-user row isolation (RLS), CSRF/XSS protections, file upload validation (type/size/magic bytes), PDF sandboxing (no JS execution), rate limiting.
11. **Threat model (documented):** lost device, shoulder surfing (mask balances toggle), malicious PDF, LLM prompt injection via transaction descriptions (descriptions never enter LLM prompts; and structured-output validation), supply-chain risk (lockfile, minimal deps).

#### FR-17.3 Prompt-injection defense
Transaction text (attacker-controlled, e.g., a merchant named "Ignore previous instructions…") **never** goes into prompts raw. Only canonical merchant strings from a sanitized alias table (or hashed IDs) and numeric aggregates are used, with output schema validation.

**AC**
- AC-17.1 Egress Inspector shows the exact payloads; automated test asserts no raw description/account number is ever in a payload (fuzzed).
- AC-17.2 Local mode works with network disabled.
- AC-17.3 "Delete all data" leaves no residual records (verified by test).

---

## 9. System Architecture

### 9.1 Architectural style
**Local-first modular monolith** with a **pure, framework-free Financial Engine library** shared by UI and API. No microservices, no autonomous agents.

### 9.2 High-level diagram

```
┌────────────────────────────── USER DEVICE / SELF-HOSTED BOUNDARY ───────────────────────────────┐
│                                                                                                  │
│   ┌──────────────────────┐        ┌─────────────────────────────────────────────────────────┐   │
│   │  Web UI (Next.js)    │◄──────►│  Application Layer (Next.js API routes / tRPC)          │   │
│   │  Dashboard · Lab ·   │        │  Orchestration · validation · auth · job queue          │   │
│   │  Txns · Privacy      │        └──────────────┬───────────────────────────┬──────────────┘   │
│   └──────────┬───────────┘                       │                           │                  │
│              │ Web Workers                       ▼                           ▼                  │
│   ┌──────────▼───────────┐        ┌─────────────────────────┐   ┌──────────────────────────┐    │
│   │ Ingestion Workers    │        │  FINANCIAL ENGINE (pure │   │  Data Layer              │    │
│   │ CSV/PDF parsing,     │───────►│  TypeScript, no I/O)    │◄─►│  SQLite/Postgres (Drizzle│    │
│   │ normalization        │        │  • dedupe/transfers     │   │  ORM), encrypted at rest │    │
│   └──────────────────────┘        │  • categorize           │   │  Snapshots · Scenarios   │    │
│                                   │  • recurring/anomaly    │   └──────────────────────────┘    │
│                                   │  • income model         │                                   │
│                                   │  • forecast/Monte Carlo │                                   │
│                                   │  • buffer/affordability │                                   │
│                                   │  • what-if overlays     │                                   │
│                                   │  • backtest             │                                   │
│                                   │  • ledger builder       │                                   │
│                                   └───────────┬─────────────┘                                   │
│                                               │ structured results (JSON)                       │
│                                   ┌───────────▼─────────────┐                                   │
│                                   │ AI Service (language    │   ┌────────────────────────┐      │
│                                   │ only): intent parsing,  │──►│ PII Redactor + Egress  │──┐   │
│                                   │ narration, merchant     │   │ Gateway (allow-list)   │  │   │
│                                   │ category fallback       │   └────────────────────────┘  │   │
│                                   │ + Number-Verification   │                               │   │
│                                   │   Guard                 │                               │   │
│                                   └───────────┬─────────────┘                               │   │
│                                               │ local                                       │   │
│                                   ┌───────────▼─────────────┐                               │   │
│                                   │ Local LLM (Ollama)      │                               │   │
│                                   └─────────────────────────┘                               │   │
└───────────────────────────────────────────────────────────────────────────────────────────────┼───┘
                                                                                                 │ (optional, redacted only)
                                                                                      ┌──────────▼───────────┐
                                                                                      │ External LLM API     │
                                                                                      └──────────────────────┘
```

### 9.3 Module boundaries

| Module | Responsibility | I/O? | Tests |
|---|---|---|---|
| `ingest/` | File→raw rows (CSV, PDF), bank profiles | file I/O | fixtures per bank |
| `normalize/` | Dates, amounts, descriptions, merchants | pure | unit |
| `dedupe/` | Fingerprints, merging, transfer pairing | pure | property-based |
| `categorize/` | Rules, dictionary, ML, rule propagation | pure (LLM via adapter) | unit + labeled set |
| `recurring/` | Cadence detection, next-date prediction | pure | unit |
| `anomaly/` | Rules + explanations | pure | unit |
| `income/` | Classification, distributions | pure | unit |
| `sufficiency/` | Gate checks | pure | unit |
| `forecast/` | Daily projection, Monte Carlo (seeded PRNG) | pure | golden tests |
| `buffer/` | Buffer formula + rationale | pure | unit |
| `affordability/` | Verdicts, EMI math, helpers | pure | golden + property |
| `whatif/` | Scenario overlays, comparison, sensitivity | pure | unit |
| `backtest/` | Walk-forward, reconciliation, calibration | pure | unit |
| `ledger/` | Builds step ledger w/ source refs | pure | snapshot tests |
| `ai/` | NLU, narration, guard, redactor, egress | network | mocked |
| `privacy/` | Redactor, egress gateway, crypto | pure/IO | fuzz |
| `app/` | UI, API | — | e2e |

> **Rule:** `engine/*` modules have **zero dependency on network, DB, or LLM**; they take data in and return data out. This makes them deterministic, fast to test, and demonstrably LLM-free.

### 9.4 Key data flows

**Import:** `File → ingest worker → raw rows → normalize → dedupe/transfer → categorize → recurring → anomaly → persist → gate`
**Ask:** `Question → NLU (LLM/rules) → intent JSON → validate → gate → forecast → affordability → ledger → (LLM narration → number guard) → UI`
**Correct:** `User action → rule update → recompute affected modules → diff report → persist correction_log → refresh dashboard`
**Reconcile:** `New statement → import → match snapshots to actuals → update track record`

### 9.5 Determinism & reproducibility
- Seeded PRNG (e.g., `mulberry32`/`sfc32`) with seed stored per snapshot.
- Engine version stamped on every snapshot.
- Money as integer paise; division/rounding rules centralized (bankers' rounding avoided; round-half-up to ₹ at display only).
- Time handled via explicit `asOfDate` parameter — never `Date.now()` inside the engine.

### 9.6 Performance
- 10k transactions parse+process < 5 s; forecast (5,000 sims × 90 days) < 1.5 s using typed arrays in a Web Worker; incremental recompute on corrections (only affected modules).

---

## 10. Technology Stack

| Layer | Choice | Rationale / alternatives |
|---|---|---|
| **Language** | TypeScript (strict) end-to-end | Shared types between UI, API, engine; deterministic engine usable in browser |
| **Frontend** | Next.js 14+ (App Router), React 18 | Fast to build, SSR optional, API routes included |
| **Styling/UI** | Tailwind CSS + shadcn/ui + Radix | Accessible components, quick polish |
| **Charts** | Recharts (main) + custom SVG for forecast band/timeline | Band charts (P10–P90) and coverage timeline need custom layers |
| **State/data fetching** | TanStack Query + Zustand | Cache + local UI state |
| **Forms/validation** | React Hook Form + **Zod** | Schemas shared with API & LLM structured-output validation |
| **CSV** | Papa Parse (+ custom header detection) | Mature, streaming |
| **PDF (primary)** | `pdfjs-dist` with coordinate-based table reconstruction | Runs in browser worker → file never leaves device |
| **PDF (fallback)** | Optional local Python microservice with `pdfplumber`/`camelot` | Better table extraction for tricky layouts; still local (Docker) |
| **OCR (stretch)** | Tesseract.js | Best-effort for scanned statements, flagged low-confidence |
| **Backend** | Next.js API routes / tRPC; Node 20 | Single deployable |
| **Database** | **SQLite** (better-sqlite3 / libSQL) via **Drizzle ORM** for local-first demo; schema portable to **PostgreSQL** | Zero-setup, local; Postgres path if hosted. *Avoid sending data to hosted BaaS by default (privacy)* |
| **Encryption** | SQLCipher (or app-level AES-GCM via WebCrypto/libsodium) | At-rest protection |
| **Auth** | Local passphrase unlock (single-user); or NextAuth if hosted | Minimal for scope |
| **Job processing** | In-process queue (p-queue) + Web Workers | No Redis needed |
| **Randomness** | Seeded PRNG (`seedrandom` / own `sfc32`) | Reproducible simulation |
| **Math/stats** | Own small stats lib (median, MAD, quantiles, bootstrap), `simple-statistics` | Auditable, no black boxes |
| **Fuzzy matching** | `fuse.js` / Jaro-Winkler implementation | Merchant matching |
| **Date handling** | `date-fns` + `date-fns-tz` (Asia/Kolkata), holiday list for India | Business-day adjustment |
| **LLM (hybrid mode)** | Anthropic Claude (or any provider) via structured outputs / tool-use JSON | Intent parsing & narration only |
| **LLM (local mode)** | Ollama (Llama 3.x / Qwen 2.5 7B) | Zero-egress option |
| **Light ML (optional)** | TF-IDF + logistic regression in TS (or ONNX runtime web) | Local categorization |
| **Testing** | Vitest (unit/golden), fast-check (property), Playwright (e2e), MSW (mocks) | Engine reliability |
| **Lint/format/CI** | ESLint, Prettier, Husky, GitHub Actions | Quality gates |
| **Packaging** | Docker Compose (app + optional Ollama + optional pdfplumber service) | One-command demo |
| **Observability (local)** | Pino logs (scrubbed), engine trace viewer in UI | Debuggability w/o leaking data |

### 10.1 Repository structure

```
financial-decision-lab/
├─ apps/
│  └─ web/                         # Next.js app (UI + API routes)
│     ├─ app/(dashboard)/…
│     ├─ app/lab/…
│     ├─ app/transactions/…
│     ├─ app/privacy/…
│     └─ workers/                  # ingest.worker.ts, forecast.worker.ts
├─ packages/
│  ├─ engine/                      # PURE deterministic engine (no I/O)
│  │  ├─ ingest/ normalize/ dedupe/ categorize/ recurring/ anomaly/
│  │  ├─ income/ sufficiency/ forecast/ buffer/ affordability/
│  │  ├─ whatif/ backtest/ ledger/ stats/
│  │  └─ __tests__/ (golden, property)
│  ├─ ai/                          # NLU, narration, number guard, adapters
│  ├─ privacy/                     # redactor, egress gateway, crypto
│  ├─ db/                          # drizzle schema, migrations, repos
│  └─ shared/                      # zod schemas, types, constants
├─ data/
│  ├─ synthetic/                   # generator + demo statements (CSV/PDF)
│  ├─ merchants.json  categories.json  bank-profiles/
├─ docs/                           # PRD, architecture, privacy note, test report
└─ docker-compose.yml
```

---

## 11. Data Model

### 11.1 Entity-relationship overview

```
User(1) ─ Account(n) ─ SourceFile(n) ─ Transaction(n)
Transaction(n) ─ Merchant(1)           Transaction(n) ─ Category(1)
Transaction ─ TransferPair             Transaction ─ DupGroup
Merchant ─ Rule(n)  (user rules)       RecurringItem(n) ─ Transaction(n) [occurrences]
Anomaly(n) ─ Transaction(1)            CorrectionLog(n)
ForecastSnapshot(n) ─ Ledger(1)        Scenario(n) ─ Adjustment(n) ─ ForecastSnapshot
Reconciliation(n) ─ ForecastSnapshot   EgressLog(n)
```

### 11.2 Tables (key columns)

```sql
accounts(id, nickname, bank, type, masked_last4, opening_balance_minor, currency, created_at)

source_files(id, account_id, filename, kind /*csv|pdf*/, sha256, period_start, period_end,
             opening_balance_minor, closing_balance_minor, reconciliation_status, parse_report_json, imported_at)

transactions(id, account_id, source_file_id, source_row, posted_date, value_date,
             amount_minor, raw_description, normalized_description, channel,
             merchant_id, category_id, category_source, category_confidence,
             balance_after_minor, fingerprint, occurrence_index,
             is_transfer, transfer_pair_id, dup_group_id, merged_from_json,
             status /*active|merged|excluded*/, user_override_json, created_at)
 INDEX (account_id, posted_date), INDEX (fingerprint), INDEX (merchant_id)

merchants(id, canonical_name, aliases_json, default_category_id, is_user_defined)

categories(id, name, parent_id, kind /*income|essential|committed|discretionary|system*/, color)

rules(id, type /*merchant|pattern|txn*/, match_json, category_id, scope_json, created_from_correction_id, active)

correction_log(id, ts, action, scope, affected_txn_ids_json, before_json, after_json, undone_at)

recurring_items(id, merchant_id, type, cadence, typical_amount_minor, amount_min, amount_max,
                last_paid_date, next_expected_date, confidence, occurrences_json,
                status, user_status, is_manual)

anomalies(id, txn_id, type, rule_id, inputs_json, threshold_json, reason_text, severity,
          user_feedback, created_at)

income_events(id, txn_id, class /*salary|variable|bonus|interest|refund|other*/, payer, confidence, user_override)

user_assumptions(id, kind /*expected_income|one_off|obligation|buffer|other*/, payload_json, created_at)

sufficiency_reports(id, ts, status, checks_json, asof_date)

forecast_snapshots(id, ts, asof_date, engine_version, seed, params_json, input_hash,
                   outputs_json, ledger_json, confidence_json, gate_status)

scenarios(id, name, base_snapshot_id, created_at, active)
scenario_adjustments(id, scenario_id, seq, type, params_json)
scenario_results(id, scenario_id, snapshot_id)

reconciliations(id, snapshot_id, period, predicted_json, actual_json, within_range, error_json, ts)

egress_log(id, ts, purpose, payload_json, mode, destination)
```

### 11.3 Invariants (enforced by tests)
- `Σ transactions(status=active, is_transfer=false)` reproduces dashboard totals.
- Transfer pair legs always sum to zero (±fee).
- `scenarios` and `scenario_adjustments` never write to `transactions`.
- Every `forecast_snapshot` is immutable.

---

## 12. API Specification

*(REST/tRPC; all JSON; Zod-validated. Money in paise integers; dates ISO-8601.)*

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/accounts` | Create account |
| POST | `/api/imports/preview` | Upload file → parsed preview, detected mapping, warnings |
| POST | `/api/imports/commit` | Commit confirmed mapping → run pipeline; returns import report |
| GET | `/api/transactions?filters` | List/search/filter |
| PATCH | `/api/transactions/:id/category` | Correct category with `{scope}`; returns **preview** if `dryRun=true`, else **change report** |
| POST | `/api/transactions/:id/unmerge` / `mark-duplicate` / `not-duplicate` | Duplicate feedback |
| POST | `/api/transfers/pair` · `/unpair` | Manual transfer control |
| GET | `/api/recurring` · PATCH `/api/recurring/:id` | List/confirm/reject/edit |
| GET | `/api/anomalies` · POST `/api/anomalies/:id/feedback` | List & feedback |
| GET | `/api/sufficiency` | Data Gate report |
| GET | `/api/dashboard` | Aggregates (category, trend, KPIs) |
| GET | `/api/forecast?horizon=90` | Forecast with bands |
| POST | `/api/ask` | `{question}` → intent, ledger, verdict, narration |
| POST | `/api/affordability` | Structured query → ledger + verdict |
| POST | `/api/scenarios` · GET/PUT/DELETE `/api/scenarios/:id` | Scenario CRUD |
| POST | `/api/scenarios/compare` | Compare baseline + scenarios |
| POST | `/api/sensitivity` | Tornado analysis |
| GET | `/api/backtest` | Backtest metrics |
| POST | `/api/reconcile` | Reconcile snapshots with actuals |
| GET | `/api/ledger/:snapshotId/evidence/:stepNo` | Evidence for a ledger step |
| GET | `/api/audit/:snapshotId/export` | JSON/PDF calculation audit |
| GET | `/api/privacy/egress-log` | Outbound call log |
| DELETE | `/api/data` | Delete all data |

### 12.1 Sample: `POST /api/affordability` response (abridged)

```json
{
  "snapshot_id": "fs_01HX…",
  "gate": {"status": "OK", "warnings": ["Uncategorized spend 12%"]},
  "verdict": {"code": "TIGHT", "breach_probability": 0.24, "confidence": {"score": 71, "label": "Medium"}},
  "ledger": [
    {"step": 1, "label": "Current balance", "value_minor": 11240000, "formula_id": "SUM_BAL",
     "inputs": [{"name":"HDFC","value_minor":7400000},{"name":"SBI","value_minor":3840000}],
     "source_refs": ["acct_1:2025-03-28","acct_2:2025-03-28"]},
    {"step": 2, "label": "Expected income", "range_minor": {"p10": 7400000, "p50": 7800000, "p90": 7800000},
     "formula_id": "INCOME_MEDIAN6", "source_refs": ["txn_a1","txn_b2","txn_c3","…"],
     "assumptions": ["Bonus of ₹1,20,000 (Apr 2024) excluded: not seen in last 12 months"]}
  ],
  "buffer": {"value_minor": 5800000, "rationale": {"binding_term":"k_x_essentials","k":1.5,"essentials_minor":3870000,"reason":"income_variable_cv_0.21"}},
  "headroom": {"p10_minor": -500000, "p50_minor": 330000, "p90_minor": 1100000},
  "lowest_balance": {"p50_minor": 6130000, "date": "2025-04-27"},
  "helpers": {"max_affordable_now_minor": 6830000, "min_delay_months": 1},
  "narration": {"text": "…", "guard": "passed"}
}
```

---

## 13. Algorithms & Formulas (Reference)

### 13.1 Dedupe matching (pseudocode)
```ts
for each account:
  groups = groupBy(txns, fingerprint)
  for each fingerprint group:
    bySource = groupBy(group, source_file_id)
    // within a single source: occurrences are genuine, keep all (assign occurrence_index)
    // across sources: align by occurrence_index; merge aligned pairs; keep extras
    maxCount = max(len(bySource[s]) for s in sources)
    for i in 1..maxCount:
      candidates = [bySource[s][i] for s in sources if exists]
      if len(candidates) > 1: merge(candidates)   // provenance retained
```

### 13.2 Robust anomaly score
```
modified_z = 0.6745 * (x - median) / MAD          // flag if |modified_z| >= 3.5
```
(with MAD floor to avoid division by zero for near-constant categories).

### 13.3 Recurrence confidence
```
conf = 0.4*interval_regularity + 0.3*amount_stability + 0.2*occurrence_score + 0.1*recency
interval_regularity = 1 - min(1, std(intervals)/mean(intervals) / 0.25)
amount_stability    = 1 - min(1, CV(amount)/0.30)
occurrence_score    = min(1, n/6)
recency             = 1 if last_paid within 1.5×cadence else 0.5
```

### 13.4 EMI
```
r = annual_rate/12/100
EMI = P * r * (1+r)^n / ((1+r)^n - 1)         // r=0 ⇒ P/n
total_interest = EMI*n - P
```
Optional: processing fee (flat or %), GST at 18% on interest/fee (assumption flag), prepayment/foreclosure charges.

### 13.5 Forecast
```
For day d: Δ[d] = I[d] − C[d] − V[d] − O[d]
V[d] = Σ_cat (monthly_est_cat × dayweight[d])
B[d] = B[d−1] + Δ[d]
min_balance = min_d B[d]
headroom = min_balance(after purchase) − buffer
```

### 13.6 Monte Carlo
```
for s in 1..N:
  income_s   ~ bootstrap(income_monthly) (+ kernel jitter)
  var_s[cat] ~ bootstrap(cat_monthly[cat])
  path_s     = daily path using income_s, committed, var_s, one-offs, scenario overlays
  record: end_balance_s, min_balance_s, below_buffer_s, below_zero_s
quantiles over s; probabilities = mean(indicators)
```

### 13.7 Backtest calibration widening
```
coverage = fraction(actual in [P10, P90]) over backtest months
if coverage < 0.70 and months ≥ 4: widen_factor = 1 + (0.80 − coverage) * 1.5   // capped at 1.5
```

### 13.8 Sensitivity
For each driver *x* ∈ {income, each variable category, buffer k, purchase date}: perturb ±10% (or ±1 step), recompute headroom (same seed) and report Δheadroom, ranked.

---

## 14. AI / LLM Usage & Guardrails

### 14.1 What the LLM does (and nothing else)
| Task | Input to LLM | Output | Validation |
|---|---|---|---|
| **Intent parsing** | User question (PII-scrubbed) | JSON conforming to Zod schema | Schema validation; fallback to rule parser; user confirms chips |
| **Narration** | Ledger JSON (rounded, no identifiers) + verdict | 2–4 sentence summary | **Number-Verification Guard** |
| **Unknown-merchant categorization (optional)** | Canonical merchant string only | `{category, confidence}` from closed list | Closed-set check; cached; user-correctable |
| **Scenario phrasing parse** | Question text | Adjustment list JSON | Schema + user confirmation |

### 14.2 What the LLM never does
Arithmetic, forecasting, verdict decisions, reading raw statements, setting thresholds, giving investment advice.

### 14.3 Number-Verification Guard
1. Extract every numeric token (including `₹80k`, `1.2 lakh`, percentages, dates) from LLM narration.
2. Normalize and check each against the **allowed set** (values in the ledger/result JSON, ± display rounding).
3. If any number is not in the allowed set → **reject** narration → fall back to deterministic **template narration**. Log event.
4. Also forbid directive language ("you should definitely buy") via lint rules; narration must use hedged verdict language derived from verdict code.

### 14.4 Prompting approach
- System prompt states role: *"You are a writing assistant. You may only restate numbers provided in the JSON. Never compute or invent numbers. If something is missing, say it is missing."*
- Structured outputs/tool-use for intents; temperature 0–0.2.
- Eval set: 50 questions for parsing; 30 narrations for guard (including adversarial prompts).

### 14.5 Failure modes & fallbacks
| Failure | Fallback |
|---|---|
| LLM unreachable | Rule-based parser + templates |
| Guard rejects | Template narration |
| Ambiguous intent | Clarifying question UI |
| Local model too slow | Template mode with notice |

---

## 15. UX & UI Specification

### 15.1 Information architecture
`Dashboard` · `Ask / Decision Lab` · `Transactions` · `Recurring` · `Anomalies` · `Forecast & Trust` · `Accounts & Imports` · `Privacy & Data` · `Settings`

### 15.2 Key components

| Component | Behavior |
|---|---|
| **Answer Card** | Verdict badge, headline sentence, range bar, "Show the steps" (open by default), trust panel |
| **Reasoning Ledger table** | Numbered rows, formula tooltip, evidence links, assumption flags; diff mode in scenarios |
| **Range bar** | P10—P50—P90 with buffer marker and zero line |
| **Forecast chart** | Median line, shaded bands, buffer line, event markers, min-point callout, hover tooltips |
| **Coverage timeline** | Account lanes, covered/gap segments, required window |
| **Scenario chips & builder** | One-click what-ifs; custom adjustments; toggles |
| **Compare table** | Baseline vs scenarios, color-coded deltas |
| **Change Report drawer** | After corrections: list of changed rows + aggregate deltas + Undo |
| **Privacy Panel** | Mode switch, data-flow diagram, egress log |
| **Data Health badge** | Click → checklist of issues with fix actions |

### 15.3 Interaction details
- **Progressive disclosure:** simple verdict first, ledger beneath, evidence on click. Never hides steps.
- **Color + icon + text** for status (accessible; not color-only).
- **Skeleton/progress** for imports with stage names ("Reading PDF → Merging duplicates → Detecting transfers…").
- **Empty & error states** designed: no data, insufficient data, parse failure (with "fix mapping").
- **Privacy mask:** toggle to blur amounts (screen-sharing/demo).
- **Localization:** ₹ with Indian grouping (₹1,23,456), DD-MMM-YYYY dates.
- **Accessibility:** WCAG 2.1 AA contrast, keyboard navigation, ARIA labels on charts with text alternatives (data table toggle).

### 15.4 Copy guidelines
- Plain language, no jargon; hedged verdicts; always show the *why*.
- Disclaimer line in answers: *"Planning aid based on your uploaded statements — not financial advice."*
- "Can't tell" copy is constructive: what's missing → how to fix → expected benefit.

### 15.5 Insufficient-data screen (example copy)
> **I can't answer this reliably yet.**
> • Only **2 months** of statements found (Feb–Mar). I need at least **3 full months**.
> • **No salary or income credits** found in the SBI account.
> • **Gap:** 1–19 Jan has no HDFC transactions.
> **To fix:** upload Dec–Jan statements for HDFC, or tell me your expected monthly income manually (this will lower my confidence).

---

## 16. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Correctness** | Engine arithmetic verified by golden tests to the paisa; money in integers |
| **Determinism** | Same input+seed ⇒ identical output (CI-enforced) |
| **Performance** | Import 5k rows < 5 s; dashboard < 2 s; forecast (5k sims) < 1.5 s |
| **Reliability** | Parser never crashes on malformed file; returns structured errors |
| **Security** | Per 8.17; OWASP Top 10 checklist; dependency audit |
| **Privacy** | Zero raw-data egress; egress allow-list tested |
| **Usability** | First answer within 3 minutes of first upload; mobile responsive |
| **Accessibility** | WCAG 2.1 AA |
| **Portability** | `docker compose up` demo; works offline |
| **Maintainability** | Pure engine, strict TS, ≥ 85% engine test coverage |
| **Explainability** | 100% of displayed financial numbers have ledger/evidence links |
| **Observability** | Engine trace (inputs/outputs per step) viewable in dev mode; no PII in logs |
| **Compliance posture** | Not a regulated advice product; clear disclaimer; DPDP-Act-aligned principles (consent, purpose limitation, minimization, deletion) documented |

---

## 17. Testing & Validation Strategy

### 17.1 Test pyramid

| Layer | Approach | Examples |
|---|---|---|
| **Unit (engine)** | Vitest; hand-computed expectations | EMI formula, median, MAD, buffer formula, verdict thresholds |
| **Golden tests** | Fixed dataset + seed → exact JSON | Forecast outputs, ledger, backtest metrics |
| **Property-based** | fast-check | *Re-import idempotence*; *merge never increases totals*; *transfer legs net to zero*; *scenario never mutates txns*; *sum(categories)=total* |
| **Parser fixtures** | Real-format (anonymized/synthetic) CSV/PDF per bank | Header detection, Indian number grouping, multi-line narrations |
| **Integration** | Import→forecast pipeline | End-to-end numbers |
| **E2E** | Playwright | Upload → ask → ledger → what-if → correct → track record |
| **LLM safety** | Guard tests, injection tests, egress fuzz | Narration with invented number is rejected; no PII in payload |
| **Accuracy evals** | Labeled synthetic set | Categorization accuracy; recurring precision/recall; anomaly recall; dedupe precision |
| **Usability** | 3–5 quick user tests | Can they verify an answer? Do they understand "range"? |

### 17.2 Edge-case catalogue (must have tests)

| # | Case | Expected |
|---|---|---|
| E1 | 2 months of data | `INSUFFICIENT`, no number |
| E2 | No income credits | `INSUFFICIENT` w/ "no income found" |
| E3 | Missing month in middle | `INSUFFICIENT` w/ gap dates |
| E4 | Small 5-day gap | `LOW_CONFIDENCE` |
| E5 | Overlapping uploads | No inflation |
| E6 | Two identical same-day genuine payments | Both kept; flagged as possible duplicate |
| E7 | Transfer between own accounts | Excluded from income/expense |
| E8 | Credit-card bill payment with card statement uploaded | Treated as transfer; no double count |
| E9 | Bonus last year, none this year | Excluded; stated in assumptions |
| E10 | Refund credit | Not income |
| E11 | Salary delayed (arrives on 5th vs 1st) | Reflected in intra-month dip; daily forecast |
| E12 | Month-end OK but dips below buffer mid-month | Reports lowest-point date |
| E13 | Purchase cost ≥ total balance | "Not affordable"; ledger still shown |
| E14 | EMI with 0% interest | Formula handles r=0 |
| E15 | Cancel subscription not in horizon | No change; explained |
| E16 | User changes category of merchant with mixed history | Preview shows N rows; change report matches |
| E17 | Corrupt PDF / password-protected | Clear error; password flow |
| E18 | Reconciliation failure | Warning; confidence reduced |
| E19 | Malicious merchant text "Ignore all instructions" | No effect; never in LLM prompt |
| E20 | LLM returns a fabricated number | Guard rejects; template used |
| E21 | Future-dated or negative-balance rows | Flagged/handled |
| E22 | Zero variable spend category | No divide-by-zero |

### 17.3 Definition of Done (per feature)
Code + unit tests + visible UI + demo path + documented assumptions + privacy review + a11y check.

---

## 18. Synthetic Data & Demo Plan

### 18.1 Synthetic dataset generator
Deterministic script generating realistic statements across personas, **with labeled ground truth** (true categories, true duplicates, true transfers, true recurring items, true future month) so accuracy and backtests are measurable.

| Dataset | Purpose |
|---|---|
| **Aarav** (stable salary, 2 banks, 8 months, CSV+PDF, overlapping periods, 1 credit card) | Main happy-path demo, transfers, dedupe, EMI laptop |
| **Priya** (freelance, volatile income, one bonus last year, none this year) | Uncertain income, range, bonus exclusion, low-confidence label |
| **Short** (2 months) | "Don't know" demo |
| **Gappy** (missing month, no salary account) | Gap + no-income messaging |
| **Messy** (many unknown merchants, wrong categories) | Mass-correction & improvement metric |
| **TimeTravel** (statement through month *m*, plus actuals for *m+1*) | Reconciliation / track record demo |

Seeded anomalies: ₹18,400 unusual purchase; duplicate ₹2,499 charge (one genuine, one real dup); new merchant ₹7,200; Netflix price hike.

### 18.2 Demo script (≈ 6–7 minutes)

| Min | Beat | What judges see | Requirement(s) |
|---|---|---|---|
| 0:00 | Hook: "Most apps show charts of the past. We answer *'Can I afford this?'* and prove it." | Landing | — |
| 0:30 | **Privacy promise** + Local mode | Privacy panel, egress log empty | R9 |
| 1:00 | Upload HDFC CSV + SBI PDF (overlapping) | Import report: duplicates merged, transfers excluded | R1 |
| 1:45 | Dashboard | Category, trend, forecast, health badge | R8 |
| 2:15 | Correct "Swiggy" category | Impact preview + change report + undo | R2, X3 |
| 2:45 | Recurring + anomalies | Next dates; explained flags; mark real duplicate → deltas | R3, R4, X3 |
| 3:30 | **Ask**: "Can I afford a ₹65,000 laptop next month?" | Verdict + range + full ledger + buffer rationale | R5, R6 |
| 4:15 | Click a ledger number → evidence | Traceability | R5 |
| 4:30 | **What-if**: EMI / wait 2 months / cancel subs / income −20% | Compare table | X4 |
| 5:15 | **Priya**: ₹80,000 phone, irregular income, bonus excluded | Range + trust label | R6, X1 |
| 5:45 | **Short dataset** → "I can't answer yet" with checklist | Refusal | R7 |
| 6:10 | **Track record** (backtest + time-travel reconciliation) | Coverage & MAE | X2 |
| 6:40 | Close: architecture slide — code computes, LLM communicates | Guard demo (fabricated number rejected) | R5, R9 |

### 18.3 Demo resilience
- Pre-loaded datasets + "Load demo" button; offline mode verified; recorded backup video; LLM-off fallback tested; seed pinned.

---

## 19. Success Metrics

### 19.1 Product-quality metrics (measurable in the demo)

| Metric | Target | How measured |
|---|---|---|
| Dedupe precision / recall on labeled set | ≥ 98% / ≥ 95% | Ground-truth comparison |
| Internal-transfer detection F1 | ≥ 0.95 | Ground truth |
| Category accuracy (pre-correction) | ≥ 85% (stretch 92%) | Labeled set |
| Category accuracy after 10 corrections (Messy set) | +10 pts or ≥ 90% | Before/after harness |
| Recurring detection precision / recall | ≥ 95% / ≥ 90% | Ground truth |
| Anomaly recall on seeded anomalies | 100% (4/4) | Seeded |
| Anomaly false-positive rate | < 5% of txns | Normal data |
| Backtest interval coverage (P10–P90) | 70–90% | Walk-forward |
| Backtest MAPE of month-end balance | < 12% (stable income), report honestly for irregular | Walk-forward |
| LLM-number guard catch rate | 100% on adversarial set | Test set |
| Egress leak tests | 0 violations | Fuzz |
| Time to first answer | < 3 min from first upload | Timed |

### 19.2 User-trust metrics (for user tests)
- % of testers who can **verify** one ledger number unaided (target ≥ 80%).
- % who correctly state **why** the buffer is what it is (≥ 80%).
- Self-reported trust (1–5) before vs after viewing ledger + track record.
- % who correctly understand "range" semantics.

### 19.3 How we'd know it *helped* (real-world)
- Reduction in "surprise" low-balance events post-use; user-reported avoided purchases; correction rate trending down (system learning); reduced recurring-payment waste (cancelled subscriptions).

---

## 20. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | PDF layouts vary; parsing fails on judge's file | High | High | Support 3 bank profiles + generic column-cluster parser; extraction preview with manual column mapping; CSV always works; ship sample PDFs |
| 2 | Dedupe mistakes (merge real duplicates) | Med | High | Occurrence-ordinal algorithm, flag-not-delete, unmerge, balance-chain check |
| 3 | Forecast overconfidence | Med | High | Ranges, gate, backtest-based widening, low-confidence banners |
| 4 | LLM hallucinated numbers | Med | High | Number guard, template fallback, no arithmetic in LLM |
| 5 | Time overrun (too many extras) | High | Med | Strict tiers; MUST→SHOULD→COULD; feature freeze before demo prep |
| 6 | Privacy claim not credible | Low | High | Egress allow-list, inspector UI, local mode, tests |
| 7 | Demo day network failure | Med | High | Offline mode, local LLM or templates, recorded fallback |
| 8 | Ambiguous merchant/categories → bad variable estimates | Med | Med | Hybrid categorization; review queue; uncategorized share reduces confidence |
| 9 | Monte Carlo seen as black box | Low | Med | Explain simply ("replayed your own past months 5,000 ways"); show inputs; reproducible seed |
| 10 | Over-claiming financial advice | Low | Med | Disclaimers; hedged verdicts; no prescriptive advice |
| 11 | Small data (3 months) makes bootstrap unstable | Med | Med | Kernel jitter + wider bands + confidence reduction + explicit statement |
| 12 | Stale balance (latest statement old) | Med | Med | Recency check; ask for current balance; roll-forward flagged |
| 13 | Prompt injection via descriptions | Low | Med | Descriptions never in prompts; schema validation |
| 14 | Team integration friction | Med | Med | Contract-first (Zod schemas), pure engine package, daily integration builds |

---

## 21. Delivery Plan & Team Split

> Assumes a **36–48 hour** hackathon and **4 members**. Adjust proportionally.

### 21.1 Roles

| Role | Owns |
|---|---|
| **A — Data/Ingestion** | CSV/PDF parsers, normalization, dedupe, transfers, synthetic data generator |
| **B — Financial Engine** | Income, recurring, anomaly, forecast, Monte Carlo, buffer, affordability, what-if, backtest, ledger |
| **C — Frontend/UX** | Dashboard, Answer Card, Ledger UI, Lab, charts, privacy panel, responsive polish |
| **D — AI/Privacy/QA** | NLU, narration + guard, redactor/egress, categorization pipeline, tests, demo script, docs |

### 21.2 Milestones

| Phase | Time | Deliverable | Gate |
|---|---|---|---|
| **0. Setup** | H0–2 | Monorepo, schemas (Zod), types, CI, seed data spec; contract between modules | Everyone can run `pnpm dev`/`test` |
| **1. Data foundation** | H2–10 | CSV+PDF import, normalization, dedupe, transfers; import report UI; synthetic datasets | Import demo works on Aarav |
| **2. Intelligence** | H10–18 | Categorization + corrections/propagation; recurring; anomalies; income classification; sufficiency gate | R2, R3, R4, R7 pass |
| **3. Forecast & decision** | H14–26 | Daily forecast, Monte Carlo, buffer, affordability, ledger; Answer Card UI | R5, R6 pass |
| **4. Lab & trust** | H26–34 | What-if lab, compare table; backtest + reconciliation; feedback loop & quality metrics | X1–X4 demo-ready |
| **5. AI & privacy** | H20–36 (parallel) | NLU, narration + guard, local LLM mode, egress inspector, redaction tests | R9 pass |
| **6. Polish & demo** | H36–44 | Dashboard polish, empty states, a11y, perf, docs, demo rehearsal, backup video | Rehearsed twice |
| **Buffer** | H44–48 | Bug fixes only; **feature freeze at H36** | — |

### 21.3 Prioritized backlog (cut order if time runs short — cut from the bottom)

1. **P0:** CSV import, dedupe, categorization+correction, recurring, anomalies, gate, forecast, affordability ledger, dashboard, privacy statement.
2. **P0:** PDF import (≥1 bank + generic), transfers, ranges (Monte Carlo).
3. **P1:** What-if lab (cancel/EMI/delay/income shock), compare table, evidence drawer, buffer rationale UI.
4. **P1:** NLU + guard, local mode, egress inspector.
5. **P2:** Backtest + track record; feedback quality dashboard.
6. **P2:** Sensitivity/tornado, helpers ("max affordable now").
7. **P3:** OCR, ML categorizer, export audit PDF, mobile polish, seasonality.

---

## 22. Judging-Criteria Mapping & Pitch Narrative

### 22.1 Likely criteria → our evidence

| Criterion | Evidence |
|---|---|
| **Baseline completeness** | Traceability matrix (§6) with a demo beat for each |
| **Correctness & reliability** | Golden/property tests, labeled-set metrics, reproducible seeds |
| **Explainability** | Reasoning Ledger, evidence drawer, buffer rationale, anomaly reasons, change reports |
| **Handling uncertainty** | P10/P50/P90, breach probability, confidence score, calibration (backtest) |
| **Honesty ("don't know")** | Sufficiency Gate with specific missing items |
| **Privacy decision** | Local-first, redaction, egress allow-list, inspector, local LLM mode |
| **Innovation / extras** | What-if Lab, forecast track record, correction→improvement loop, irregular-income handling |
| **UX / usability** | Single-screen dashboard, progressive disclosure, empty states |
| **Technical depth** | Pure deterministic engine, seeded Monte Carlo, number-guard, dedupe algorithm |
| **Demo quality** | Offline-safe, scripted, edge-case datasets |

### 22.2 One-line pitch
> **"An affordability assistant you can audit: every answer is computed by code, shown step by step, given as a range, and backed by a track record — with your bank data never leaving your device."**

### 22.3 Answers to the four "Extra Points" prompts (ready for Q&A)

1. **Irregular income, ₹80,000 phone?** → Bonus excluded (not seen this year) and stated; income distribution from observed months; answer is a range with breach probability; confidence label explains why trust is Medium/Low; conservative mode uses lower-quartile income; user can add expected income with certainty.
2. **Checking the forecast?** → Every answer stored as a snapshot; reconciled against next month's actuals; walk-forward backtest gives MAE, coverage, bias; track-record card; intervals auto-widen if under-covering.
3. **When the system is wrong?** → "Not a duplicate/real payment", category propagation with change report and undo; "What changed?" panel; quality dashboard shows verified %, repeat-error rate, backtest error before/after; offline harness demonstrates accuracy gain.
4. **Change of plan?** → What-If overlays (cancel subscription/new loan/EMI/delay) with their *own full ledger* and diff against baseline, side-by-side compare, sensitivity view; baseline data untouched.

---

## 23. Open Questions & Assumptions

| # | Question / Assumption | Default decision | Owner |
|---|---|---|---|
| 1 | Which banks' PDFs will judges likely use? | Support HDFC, SBI, ICICI layouts + generic; confirm with organizers | A |
| 2 | Is a hosted deployment required? | Local-first; optional Vercel/Render deployment *with no DB persistence of raw files* | D |
| 3 | Is a cloud LLM allowed in the judging environment? | Default to Local/Template mode for demo; hybrid optional | D |
| 4 | Current balance source when statements end earlier than today | Use latest statement closing balance; flag staleness; allow manual input | B |
| 5 | Treatment of credit-card dues if card statement missing | Treat bill payment as expense with warning | A/B |
| 6 | How "next month" is defined | Calendar next month relative to `asOfDate` (latest data date or today, user-selectable); purchase date default = 1st of next month unless stated | B |
| 7 | Default safety buffer floor (₹5,000) and k values | As in §8.9; tunable in Settings; documented as heuristic | B |
| 8 | Verdict thresholds (10% / 25%) | Heuristic constants documented in UI | B |
| 9 | Multi-currency | Out of scope; flag & exclude | A |
| 10 | Should user-entered assumptions affect confidence? | Yes — lowers data-quality component but stated transparently | B |

---

## 24. Appendices

### Appendix A — Glossary
- **Headroom:** Lowest projected balance after the purchase minus the safety buffer.
- **Safety buffer:** Minimum balance the user wants to preserve; default derived from essential spending and income stability.
- **P10/P50/P90:** 10th/50th/90th percentile outcomes across simulations (P50 = typical, P10 = bad-but-plausible, P90 = good).
- **CV (coefficient of variation):** std ÷ mean; measure of volatility.
- **MAD:** Median absolute deviation; robust measure of spread.
- **Walk-forward backtest:** Forecasting each past month using only data available before it.
- **Reasoning Ledger:** The ordered, evidence-linked list of calculation steps behind an answer.
- **Egress:** Any data leaving the local boundary.
- **Snapshot:** Immutable record of a forecast run's inputs, parameters, seed, and outputs.

### Appendix B — Default configuration constants

| Constant | Default |
|---|---|
| Minimum history | 90 days / 3 full months |
| Max tolerated gap | 7 days (else LOW_CONFIDENCE); missing full month ⇒ INSUFFICIENT |
| Staleness limit | 45 days |
| Uncategorized-spend warning | > 30% |
| Dedupe date window (cross-file fuzzy) | ±0 days, sim ≥ 0.8 |
| Transfer window | ±2 days, fee tolerance ≤ ₹25 |
| Duplicate-charge window | same merchant+amount within 3 days (24h for subscriptions) |
| Anomaly modified-z threshold | 3.5 |
| New-merchant minimum amount | max(₹1,500, category P75) |
| Recurring minimum occurrences | 3 (monthly), 2 (annual, low confidence) |
| Monte Carlo runs | 5,000 (seeded) |
| Income volatility bands | Stable < 0.10 ≤ Variable ≤ 0.30 < Irregular |
| Buffer k | 1.0 / 1.5 / 2.0 by volatility; floor ₹5,000 |
| Verdict thresholds | Affordable: P(breach) ≤ 10%; Not affordable: P(<0) > 25% |
| Forecast horizon | 90 days |
| Backtest min training months | 3 |
| Interval widening trigger | coverage < 70% over ≥ 4 months |

### Appendix C — Sample "Insufficient data" API response
```json
{
  "gate": {
    "status": "INSUFFICIENT",
    "checks": [
      {"id":"history_length","pass":false,"detail":"2 months found (Feb–Mar); need ≥ 3 full months"},
      {"id":"income_present","pass":false,"detail":"No income credits found in account SBI-4421"},
      {"id":"date_gaps","pass":false,"detail":"HDFC-1180: no transactions between 2025-01-01 and 2025-01-19"}
    ],
    "fix_actions": [
      {"action":"upload","account":"HDFC-1180","range":"2024-12-01..2025-01-31"},
      {"action":"enter_income_manually"}
    ]
  },
  "answer": null
}
```

### Appendix D — Sample correction "Change Report"
```
Rule created: merchant "Swiggy" → Food/Delivery (applies to future imports)
Updated 11 transactions:
  2025-01-04  ₹412   Swiggy            Shopping → Food/Delivery
  2025-01-09  ₹689   Swiggy            Other    → Food/Delivery
  …
Skipped 1 (more specific user rule): 2025-02-14 ₹1,199 "Swiggy One" (Subscriptions)
Effect: Food +₹6,140 / Shopping −₹4,020 / Other −₹2,120 (Jan–Mar)
Forecast effect: variable spend estimate +₹310/mo; headroom −₹310 (P50)
[Undo]
```

### Appendix E — Why Monte Carlo (plain-language explanation for users)
> "I replay your own past months in thousands of different combinations — a good-income month with a heavy-spending month, and so on — to see how your balance could plausibly end up. The range shows the middle 80% of those outcomes."

### Appendix F — Future roadmap (post-hackathon)
Account Aggregator (India) integration for consented live data; OCR hardening; seasonal/holiday-aware models; goal planning (save for X); household/multi-user; mobile app; open-source bank-profile library; formal calibration monitoring; on-device LLM bundles.

### Appendix G — Guiding rule (for the whole team)
> **Every financial statement the product makes must be traceable to transaction data, explicit assumptions, and a reproducible calculation. If it can't be traced, it doesn't ship.**

---
*End of PRD v1.0*

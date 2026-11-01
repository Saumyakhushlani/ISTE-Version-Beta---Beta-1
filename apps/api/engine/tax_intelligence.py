"""
Tax Intelligence Engine for Financial Decision Lab (FDL).
Specialized for Salaried Individuals filing ITR-1 (Sahaj) for AY 2026-27 (FY 2025-26).

Core Rules & Invariants:
1. Integer paise only for all monetary calculations.
2. Salaried ITR-1 preparation assistant, NOT a tax filing or calculation engine.
3. Does NOT calculate final tax liability or tax refunds.
4. Never treats every bank credit as taxable income (strictly excludes internal transfers, refunds, reversals).
5. Clearly distinguishes observed bank data from potential or unverified tax deductions.
"""
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

# Regex heuristics for detecting tax-relevant transactions in Indian bank statements
SALARY_PATTERNS = [
    r"\b(?:ach/salary|salary|payroll|wages|sal\s+cr|monthly\s+pay)\b"
]

INTEREST_SAVINGS_PATTERNS = [
    r"\b(?:sb\s*int|sb\s*interest|int\.?\s*pd|savings\s*interest|credit\s*interest|int\s*earned)\b"
]

INTEREST_FD_PATTERNS = [
    r"\b(?:fd\s*int|term\s*dep|fixed\s*dep|mod\s*int|interest\s*on\s*fd)\b"
]

DIVIDEND_PATTERNS = [
    r"\b(?:dividend|ach\s*d-.*div|ach/div|div\s*payment|equity\s*div)\b"
]

NON_TAXABLE_CREDIT_PATTERNS = [
    r"\b(?:refund|reversal|cashback|rfd|credit\s*adj|charge\s*rev)\b"
]

# Section 80C Deductions (ELSS, PPF, Life Insurance, Home Loan Principal)
SECTION_80C_PATTERNS = [
    (r"\b(?:ppf|public\s*provident\s*fund)\b", "PPF (Public Provident Fund)"),
    (r"\b(?:elss|tax\s*saver|mirae\s*asset\s*tax|axis\s*long\s*term|nippon\s*tax)\b", "ELSS (Equity Linked Savings Scheme)"),
    (r"\b(?:lic|life\s*insurance|hdfc\s*life|icici\s*pru\s*life|max\s*life|sbi\s*life|tata\s*aia)\b", "Life Insurance Premium"),
    (r"\b(?:zerodha.*broking|groww|kuvera|cams|kfintech)\b", "Investment Platform / Potential ELSS SIP"),
    (r"\b(?:home\s*loan|housing\s*loan|hdfc\s*ltd\s*home|sbi\s*home\s*loan)\b", "Home Loan Principal Component (Repayment)")
]

# Section 80D (Health Insurance)
SECTION_80D_PATTERNS = [
    r"\b(?:health\s*ins|star\s*health|care\s*health|niva\s*bupa|hdfc\s*ergo\s*health|icici\s*lombard|mediclaim|health\s*shield)\b"
]

# Section 80CCD(1B) (NPS)
SECTION_80CCD_PATTERNS = [
    r"\b(?:nps|cra-nsdl|pfrda|national\s*pension\s*system)\b"
]

# Rent Payment (HRA Exemption indicator under Section 10(13A))
RENT_PATTERNS = [
    r"\b(?:rent\s*payment|house\s*rent|rent\s*for|to\s*landlord|flat\s*rent)\b"
]

# Home Loan EMI (Section 24(b) Interest & 80C Principal)
HOME_LOAN_PATTERNS = [
    r"\b(?:home\s*loan|housing\s*loan|hdfc\s*home|sbi\s*home\s*loan|axis\s*home\s*loan)\b"
]


def analyze_tax_intelligence(
    transactions: List[Dict[str, Any]],
    accounts: List[Dict[str, Any]],
    user_name: Optional[str] = "Salaried Professional",
    assessment_year: str = "AY 2026-27 (FY 2025-26)"
) -> Dict[str, Any]:
    """
    Performs comprehensive, read-only tax intelligence analysis of existing bank transactions.
    Grounded strictly in integer paise.
    """
    total_credits_minor = 0
    total_debits_minor = 0

    salary_txns: List[Dict[str, Any]] = []
    savings_interest_txns: List[Dict[str, Any]] = []
    fd_interest_txns: List[Dict[str, Any]] = []
    dividend_txns: List[Dict[str, Any]] = []
    excluded_transfer_txns: List[Dict[str, Any]] = []
    excluded_refund_txns: List[Dict[str, Any]] = []
    other_credit_txns: List[Dict[str, Any]] = []

    sec_80c_txns: List[Dict[str, Any]] = []
    sec_80d_txns: List[Dict[str, Any]] = []
    sec_80ccd_txns: List[Dict[str, Any]] = []
    rent_txns: List[Dict[str, Any]] = []
    home_loan_txns: List[Dict[str, Any]] = []

    # Map account IDs to bank names for clear origin display
    acct_bank_map = {a.get("id"): a.get("bank", "Bank Account") for a in accounts}

    # 1. Classify Credits (Income Sources vs Exclusions)
    for t in transactions:
        amount = t.get("amount_minor", 0)
        desc = (t.get("raw_description", "") or "").strip()
        desc_lower = desc.lower()
        norm_desc = (t.get("normalized_description", "") or "").strip()
        cat = t.get("category_id", "")
        is_transfer = bool(t.get("is_transfer", False))
        bank_name = acct_bank_map.get(t.get("account_id"), "Bank")
        txn_date = t.get("posted_date", "")

        t_record = {
            "id": t.get("id"),
            "date": txn_date,
            "amount_minor": amount,
            "amount_rs": abs(amount) // 100,
            "description": desc,
            "normalized_description": norm_desc,
            "bank": bank_name,
            "category_id": cat
        }

        if amount > 0:
            total_credits_minor += amount

            # Case A: Internal Transfers between user's own accounts
            if is_transfer or cat == "cat_transfer" or "own a/c" in desc_lower or "self transfer" in desc_lower:
                excluded_transfer_txns.append({**t_record, "reason": "Internal transfer between own accounts (Non-taxable)"})
                continue

            # Case B: Refunds, chargebacks, reversals
            if cat == "cat_income_refund" or any(re.search(p, desc_lower) for p in NON_TAXABLE_CREDIT_PATTERNS):
                excluded_refund_txns.append({**t_record, "reason": "Refund / Cashback / Reversal (Non-taxable capital recovery)"})
                continue

            # Case C: Salary credits (Income from Salary - Sec 17)
            if cat == "cat_income_salary" or any(re.search(p, desc_lower) for p in SALARY_PATTERNS):
                salary_txns.append(t_record)
                continue

            # Case D: Savings bank interest (Income from Other Sources - Sec 56)
            if any(re.search(p, desc_lower) for p in INTEREST_SAVINGS_PATTERNS):
                savings_interest_txns.append(t_record)
                continue

            # Case E: Fixed Deposit / Term Deposit interest
            if any(re.search(p, desc_lower) for p in INTEREST_FD_PATTERNS):
                fd_interest_txns.append(t_record)
                continue

            # Case F: Dividend income
            if any(re.search(p, desc_lower) for p in DIVIDEND_PATTERNS):
                dividend_txns.append(t_record)
                continue

            # Case G: Other unexplained or peer credits
            other_credit_txns.append({**t_record, "reason": "General credit / P2P receipt (Verify taxability against AIS / 26AS)"})

        elif amount < 0:
            total_debits_minor += abs(amount)

            # Ignore internal transfers from deduction consideration
            if is_transfer or cat == "cat_transfer":
                continue

            # Section 80C candidates
            matched_80c = False
            for pat, subcategory in SECTION_80C_PATTERNS:
                if re.search(pat, desc_lower) or (cat == "cat_sip" and "zerodha" in desc_lower):
                    sec_80c_txns.append({**t_record, "sub_type": subcategory})
                    matched_80c = True
                    break

            # Section 80D candidates (Health Insurance)
            if not matched_80c and (cat == "cat_insurance" or any(re.search(p, desc_lower) for p in SECTION_80D_PATTERNS)):
                if any(re.search(p, desc_lower) for p in SECTION_80D_PATTERNS) or "health" in desc_lower or "mediclaim" in desc_lower:
                    sec_80d_txns.append(t_record)

            # Section 80CCD(1B) candidates (NPS)
            if any(re.search(p, desc_lower) for p in SECTION_80CCD_PATTERNS):
                sec_80ccd_txns.append(t_record)

            # Rent payments for HRA Exemption (Sec 10(13A))
            if cat == "cat_rent" or any(re.search(p, desc_lower) for p in RENT_PATTERNS):
                rent_txns.append(t_record)

            # Home Loan EMI (Sec 24(b) interest + 80C principal)
            if cat == "cat_emi" or any(re.search(p, desc_lower) for p in HOME_LOAN_PATTERNS):
                if any(re.search(p, desc_lower) for p in HOME_LOAN_PATTERNS):
                    home_loan_txns.append(t_record)

    # Calculate Totals
    salary_total_minor = sum(t["amount_minor"] for t in salary_txns)
    savings_interest_minor = sum(t["amount_minor"] for t in savings_interest_txns)
    fd_interest_minor = sum(t["amount_minor"] for t in fd_interest_txns)
    dividend_minor = sum(t["amount_minor"] for t in dividend_txns)
    total_taxable_inflow_observed_minor = salary_total_minor + savings_interest_minor + fd_interest_minor + dividend_minor

    excluded_transfers_minor = sum(t["amount_minor"] for t in excluded_transfer_txns)
    excluded_refunds_minor = sum(t["amount_minor"] for t in excluded_refund_txns)
    total_excluded_credits_minor = excluded_transfers_minor + excluded_refunds_minor

    sec_80c_total_minor = sum(abs(t["amount_minor"]) for t in sec_80c_txns)
    sec_80d_total_minor = sum(abs(t["amount_minor"]) for t in sec_80d_txns)
    sec_80ccd_total_minor = sum(abs(t["amount_minor"]) for t in sec_80ccd_txns)
    annual_rent_paid_minor = sum(abs(t["amount_minor"]) for t in rent_txns)
    home_loan_emis_minor = sum(abs(t["amount_minor"]) for t in home_loan_txns)

    # 80TTA eligible savings interest deduction: Min(savings_interest, Rs. 10,000) under Old Regime
    sec_80tta_eligible_minor = min(savings_interest_minor, 10000 * 100)

    # Potential employer names extracted from salary descriptions
    employers = set()
    for t in salary_txns:
        d = t["description"]
        m = re.search(r"(?:ach/salary/|salary/|salary\s+from\s+)([\w\s\.\-]+)", d, re.IGNORECASE)
        if m:
            clean_emp = m.group(1).split("-")[0].strip()
            if len(clean_emp) > 2:
                employers.add(clean_emp)
    if not employers and salary_txns:
        employers.add("Employer (Identified via ACH/Salary credit)")

    # 2. Section 1: Financial Analysis Structure
    income_sources = [
        {
            "category": "Income from Salary (Net Bank Inflow)",
            "section": "Section 17(1)",
            "observed_total_minor": salary_total_minor,
            "observed_total_rs": salary_total_minor // 100,
            "transaction_count": len(salary_txns),
            "sources": list(employers),
            "transactions": salary_txns,
            "nature": "Taxable Salary",
            "clarification": "Bank statement captures net take-home salary after PF and TDS deductions. Refer to Form 16 Part B for Gross Salary, CTC allowances, and exact tax deducted at source."
        },
        {
            "category": "Savings Bank Account Interest",
            "section": "Section 56(2)(id) - Other Sources",
            "observed_total_minor": savings_interest_minor,
            "observed_total_rs": savings_interest_minor // 100,
            "transaction_count": len(savings_interest_txns),
            "sources": list({t["bank"] for t in savings_interest_txns}) if savings_interest_txns else ["Bank Accounts"],
            "transactions": savings_interest_txns,
            "nature": "Taxable under Other Sources (Eligible for Sec 80TTA deduction up to Rs. 10,000 under Old Regime)",
            "clarification": "Savings interest is credited periodically (quarterly or half-yearly). Verify interest across all bank accounts using Interest Certificates."
        },
        {
            "category": "Fixed / Term Deposit Interest",
            "section": "Section 56(2)(id) - Other Sources",
            "observed_total_minor": fd_interest_minor,
            "observed_total_rs": fd_interest_minor // 100,
            "transaction_count": len(fd_interest_txns),
            "sources": list({t["bank"] for t in fd_interest_txns}) if fd_interest_txns else [],
            "transactions": fd_interest_txns,
            "nature": "Fully Taxable at slab rates (TDS deducted if annual interest > Rs. 40,000 for regular individuals / Rs. 50,000 for senior citizens)",
            "clarification": "Check Form 26AS / AIS for accrued FD interest and TDS under Section 194A."
        },
        {
            "category": "Dividend Income",
            "section": "Section 56(2)(i) - Other Sources",
            "observed_total_minor": dividend_minor,
            "observed_total_rs": dividend_minor // 100,
            "transaction_count": len(dividend_txns),
            "sources": list({t["description"][:30] for t in dividend_txns}) if dividend_txns else [],
            "transactions": dividend_txns,
            "nature": "Taxable at marginal slab rates",
            "clarification": "Dividends from Indian companies and equity mutual funds are taxable in the hands of investors."
        }
    ]

    excluded_inflows = [
        {
            "type": "Internal Account Transfers",
            "total_minor": excluded_transfers_minor,
            "total_rs": excluded_transfers_minor // 100,
            "count": len(excluded_transfer_txns),
            "transactions": excluded_transfer_txns,
            "reason": "Money moved between your own bank accounts (HDFC, SBI, etc.). This is purely capital reallocation and has ZERO tax liability."
        },
        {
            "type": "Refunds, Reversals & Cashbacks",
            "total_minor": excluded_refunds_minor,
            "total_rs": excluded_refunds_minor // 100,
            "count": len(excluded_refund_txns),
            "transactions": excluded_refund_txns,
            "reason": "Merchant refunds, failed payment credits, and promotional cashbacks. These represent return of own capital and are non-taxable."
        }
    ]

    # 3. Section 2: Tax Benefits & Deductions Breakdown
    deductions_guidance = [
        {
            "section": "Standard Deduction",
            "statute": "Section 16(ia)",
            "regime": "Both (Old & New Regime)",
            "max_eligible_rs": 75000,
            "observed_minor": 75000 * 100,
            "observed_rs": 75000,
            "eligible": True,
            "summary": "Flat Rs. 75,000 deduction automatically available for all salaried individuals in AY 2026-27 (enhanced from Rs. 50,000 in Budget 2024).",
            "proof_required": "None. Automatically deducted by employer in Form 16."
        },
        {
            "section": "Section 80C (Investments & Savings)",
            "statute": "Chapter VI-A Section 80C",
            "regime": "Old Tax Regime only",
            "max_eligible_rs": 150000,
            "observed_minor": sec_80c_total_minor,
            "observed_rs": sec_80c_total_minor // 100,
            "eligible": sec_80c_total_minor > 0,
            "summary": "Includes EPF (employer deducted), ELSS tax-saver mutual funds, PPF, Life Insurance premiums, and Home Loan Principal repayment.",
            "transactions": sec_80c_txns,
            "proof_required": "ELSS fund statement, PPF passbook / deposit receipt, Life insurance premium paid certificate, Home Loan Principal repayment certificate."
        },
        {
            "section": "Section 80D (Health Insurance Premiums)",
            "statute": "Chapter VI-A Section 80D",
            "regime": "Old Tax Regime only",
            "max_eligible_rs": 25000,
            "observed_minor": sec_80d_total_minor,
            "observed_rs": sec_80d_total_minor // 100,
            "eligible": sec_80d_total_minor > 0,
            "summary": "Covers health insurance premiums paid for self, spouse, and dependent children (up to Rs. 25,000). Additional Rs. 25,000 (or Rs. 50,000 for senior citizens) if covering parents.",
            "transactions": sec_80d_txns,
            "proof_required": "Health Insurance 80D Tax Certificate issued by insurer showing payment made via non-cash banking channel."
        },
        {
            "section": "Section 80CCD(1B) (National Pension System - NPS)",
            "statute": "Chapter VI-A Section 80CCD(1B)",
            "regime": "Old Tax Regime only",
            "max_eligible_rs": 50000,
            "observed_minor": sec_80ccd_total_minor,
            "observed_rs": sec_80ccd_total_minor // 100,
            "eligible": sec_80ccd_total_minor > 0,
            "summary": "Exclusive additional deduction up to Rs. 50,000 for voluntary contributions to NPS Tier-1 accounts, over and above the Rs. 1.5L 80C limit.",
            "transactions": sec_80ccd_txns,
            "proof_required": "NPS Transaction Statement / PRAN Contribution receipt downloaded from CRA-NSDL portal."
        },
        {
            "section": "House Rent Allowance (HRA Exemption)",
            "statute": "Section 10(13A) read with Rule 2A",
            "regime": "Old Tax Regime only",
            "max_eligible_rs": annual_rent_paid_minor // 100,
            "observed_minor": annual_rent_paid_minor,
            "observed_rs": annual_rent_paid_minor // 100,
            "eligible": annual_rent_paid_minor > 0,
            "summary": f"Observed annual rent payments of Rs. {annual_rent_paid_minor // 100:,} across {len(rent_txns)} transactions. HRA exemption is calculated as the lowest of: (a) Actual HRA received, (b) Rent paid minus 10% of Basic Salary, or (c) 50% of Basic Salary (metro).",
            "transactions": rent_txns,
            "proof_required": "Valid Rent Agreement, monthly rent payment receipts, and Landlord's PAN (mandatory if annual rent exceeds Rs. 1,00,000)."
        },
        {
            "section": "Section 80TTA (Savings Interest Deduction)",
            "statute": "Chapter VI-A Section 80TTA",
            "regime": "Old Tax Regime only",
            "max_eligible_rs": 10000,
            "observed_minor": sec_80tta_eligible_minor,
            "observed_rs": sec_80tta_eligible_minor // 100,
            "eligible": savings_interest_minor > 0,
            "summary": "Exempts savings bank interest up to Rs. 10,000 per financial year for individuals under 60 years.",
            "transactions": savings_interest_txns,
            "proof_required": "Bank Interest Certificates or Passbook showing interest credit entries."
        },
        {
            "section": "Section 24(b) (Home Loan Interest)",
            "statute": "Section 24(b)",
            "regime": "Old Tax Regime only (Loss from House Property)",
            "max_eligible_rs": 200000,
            "observed_minor": home_loan_emis_minor,
            "observed_rs": home_loan_emis_minor // 100,
            "eligible": home_loan_emis_minor > 0,
            "summary": f"Observed Rs. {home_loan_emis_minor // 100:,} in total home loan EMIs. Note: Bank statements aggregate principal and interest. Up to Rs. 2,00,000 of the INTEREST portion is deductible for self-occupied residential property.",
            "transactions": home_loan_txns,
            "proof_required": "Provisional/Final Home Loan Interest Certificate from lending institution showing principal vs interest breakup."
        }
    ]

    # 4. Section 2: Missing Information & Preparation Checklist
    missing_information = [
        {
            "document": "Form 16 (Part A & Part B)",
            "issuer": "Your Employer",
            "status": "MISSING FROM BANK DATA",
            "why_bank_cannot_establish": "Bank statements record only net credit in-hand. They cannot reveal your CTC salary breakup, employer PF contribution, professional tax, or TDS deducted under Section 192.",
            "action": "Collect Form 16 from your HR or employer payroll portal. Verify that PAN and TDS match your Form 26AS."
        },
        {
            "document": "Annual Information Statement (AIS) & Form 26AS",
            "issuer": "Income Tax Department (eportal.incometax.gov.in)",
            "status": "ESSENTIAL TO CROSS-CHECK",
            "why_bank_cannot_establish": "Banks report financial transactions directly to the tax department. AIS includes accrued interest, mutual fund purchases/sales, and dividend TDS.",
            "action": "Log in to the Income Tax e-Filing portal, navigate to 'Services' -> 'Annual Information Statement (AIS)', and download both AIS and Form 26AS."
        },
        {
            "document": "Bank Interest Certificates (Savings & Term Deposits)",
            "issuer": "Each Bank where you hold accounts",
            "status": "RECOMMENDED",
            "why_bank_cannot_establish": "FD interest might be accrued but not credited to savings account until maturity. Tax is payable on accrual basis.",
            "action": "Download the Annual Interest Certificate from NetBanking for all your active accounts (HDFC, SBI, etc.)."
        },
        {
            "document": "Landlord PAN & Rent Receipts",
            "issuer": "Landlord / House Owner",
            "status": "REQUIRED FOR HRA EXEMPTION",
            "why_bank_cannot_establish": "UPI transfers show recipient VPA but do not establish rental tenancy or landlord PAN required under income tax rules.",
            "action": "Collect signed rent receipts and landlord's 10-digit PAN card copy if total rent paid exceeds Rs. 1,00,000 annually."
        },
        {
            "document": "Investment & Insurance Proofs (80C / 80D / NPS)",
            "issuer": "AMCs, Insurers, Post Office / Bank",
            "status": "REQUIRED IF OPTING FOR OLD REGIME",
            "why_bank_cannot_establish": "Bank statement descriptions may say 'SIP' or 'Insurance' without specifying whether the fund is an ELSS tax-saver or if the policy is health vs life.",
            "action": "Download tax-saving mutual fund statement (80C), Health insurance 80D tax receipt, and NPS transaction statement."
        }
    ]

    # 5. Regime Comparison Insights (Guidance only, no tax calculation)
    old_regime_total_deductions_rs = (
        75000 +  # Standard deduction
        min(150000, sec_80c_total_minor // 100) +
        min(25000, sec_80d_total_minor // 100) +
        min(50000, sec_80ccd_total_minor // 100) +
        (sec_80tta_eligible_minor // 100) +
        min(200000, home_loan_emis_minor // 100)
    )

    regime_guidance = {
        "assessment_year": assessment_year,
        "default_regime": "New Tax Regime (Section 115BAC)",
        "new_regime_features": [
            "Default tax regime for all individual taxpayers in AY 2026-27.",
            "Enhanced Standard Deduction of Rs. 75,000 for salaried employees.",
            "No tax liability up to Rs. 7,75,000 taxable income (with Section 87A rebate).",
            "Lower slab rates with streamlined filing; most Chapter VI-A deductions (80C, 80D, HRA) are NOT available."
        ],
        "old_regime_features": [
            "Permits Chapter VI-A deductions: Section 80C (up to Rs. 1.5L), 80D (up to Rs. 25k/50k), NPS (Rs. 50k), HRA exemption, and Home loan interest (up to Rs. 2L).",
            f"Observed potential deductions in your statement: approximately Rs. {old_regime_total_deductions_rs:,}.",
            "Beneficial only if your total eligible deductions exceed the threshold where lower New Regime slab rates outperform."
        ],
        "recommendation_note": "Do not rush into filing. Compare both regimes using your Form 16 Gross Salary figures once received from your employer."
    }

    return {
        "user_name": user_name,
        "assessment_year": assessment_year,
        "financial_year": "FY 2025-26",
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_accounts_analyzed": len(accounts),
        "total_transactions_analyzed": len(transactions),
        "accounts": accounts,
        "salary_transactions": salary_txns,
        "summary_metrics": {
            "total_observed_salary_rs": salary_total_minor // 100,
            "total_observed_salary_minor": salary_total_minor,
            "total_observed_interest_rs": (savings_interest_minor + fd_interest_minor) // 100,
            "total_observed_interest_minor": savings_interest_minor + fd_interest_minor,
            "total_observed_dividends_rs": dividend_minor // 100,
            "total_observed_dividends_minor": dividend_minor,
            "total_taxable_inflow_observed_rs": total_taxable_inflow_observed_minor // 100,
            "total_excluded_credits_rs": total_excluded_credits_minor // 100,
            "total_potential_80c_rs": min(150000, sec_80c_total_minor // 100),
            "total_potential_80d_rs": min(25000, sec_80d_total_minor // 100),
            "annual_rent_paid_rs": annual_rent_paid_minor // 100
        },
        "income_sources": income_sources,
        "excluded_inflows": excluded_inflows,
        "deductions_guidance": deductions_guidance,
        "missing_information": missing_information,
        "regime_guidance": regime_guidance
    }

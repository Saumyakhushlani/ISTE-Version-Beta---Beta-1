"""
Reasoning Ledger Engine for Financial Decision Lab (FDL).
Constructs an 8-step auditable chain of evidence:
  1. Current combined balance
  2. Expected next month income
  3. Committed recurring obligations
  4. Estimated variable spend
  5. Dynamic safety buffer
  6. Proposed purchase cost
  7. Projected lowest balance date & amount
  8. Headroom vs safety buffer
"""
from typing import List, Dict, Any

def build_reasoning_ledger(
    starting_balance_paise: int,
    expected_income_paise: int,
    income_method_desc: str,
    committed_outflows_paise: int,
    recurring_items_count: int,
    variable_spend_estimate_paise: int,
    buffer_paise: int,
    buffer_formula_desc: str,
    purchase_amount_paise: int,
    lowest_balance_date: str,
    lowest_balance_p50_paise: int,
    headroom_p50_paise: int,
    verdict_code: str,
    account_breakdown_desc: str = ""
) -> List[Dict[str, Any]]:
    """
    Constructs the 8-step Reasoning Ledger array.
    """
    steps = [
        {
            "step_no": 1,
            "label": "Current balance (all accounts)",
            "value_minor": starting_balance_paise,
            "formula_text": account_breakdown_desc or f"Combined across accounts: ₹{starting_balance_paise // 100:,}",
            "status": "ok"
        },
        {
            "step_no": 2,
            "label": "Expected next month income",
            "value_minor": expected_income_paise,
            "formula_text": income_method_desc,
            "status": "ok"
        },
        {
            "step_no": 3,
            "label": "Committed payments (Rent, EMI, SIP, Subs)",
            "value_minor": -committed_outflows_paise,
            "formula_text": f"Sum of {recurring_items_count} active recurring obligations",
            "status": "ok"
        },
        {
            "step_no": 4,
            "label": "Variable spending estimate",
            "value_minor": -variable_spend_estimate_paise,
            "formula_text": "Median 30-day Food, Utilities & Discretionary spend",
            "status": "ok"
        },
        {
            "step_no": 5,
            "label": "Safety buffer",
            "value_minor": buffer_paise,
            "formula_text": buffer_formula_desc,
            "status": "ok"
        },
        {
            "step_no": 6,
            "label": "Purchase cost",
            "value_minor": -purchase_amount_paise,
            "formula_text": "One-off proposed purchase outflow",
            "status": "ok"
        },
        {
            "step_no": 7,
            "label": "Projected lowest balance date",
            "value_minor": lowest_balance_p50_paise,
            "formula_text": f"Projected lowest point reaches ₹{lowest_balance_p50_paise // 100:,} around {lowest_balance_date}",
            "status": "breach" if lowest_balance_p50_paise < buffer_paise else "ok"
        },
        {
            "step_no": 8,
            "label": "Headroom vs buffer",
            "value_minor": headroom_p50_paise,
            "formula_text": f"Lowest balance (₹{lowest_balance_p50_paise // 100:,}) − Buffer (₹{buffer_paise // 100:,})",
            "status": "ok" if verdict_code == "AFFORDABLE" else ("warn" if verdict_code == "TIGHT" else "breach")
        }
    ]
    return steps

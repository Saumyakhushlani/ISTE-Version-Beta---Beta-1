"""
Multi-Bank Liquidity and Investment Sourcing Engine
Calculates per-account inflow, outflow, and remaining balance,
and provides smart transfer recommendations for large investments (FD/SIP/Purchases).
"""

from typing import Dict, Any, List
from sqlalchemy.orm import Session
from db.models import Account, Transaction, RecurringItem

DEFAULT_ACCOUNT_FLOOR_BUFFER_PAISE = 500000  # ₹5,000.00 minimum reserve per account

def compute_multi_account_summary(db: Session) -> Dict[str, Any]:
    """
    Computes financial breakdown for each individual bank account and the combined total:
    - Money in (Credits)
    - Money out (Debits)
    - Net flow
    - Current remaining balance
    """
    accounts = db.query(Account).all()
    account_summaries = []

    combined_liquid_paise = 0
    combined_inflow_paise = 0
    combined_outflow_paise = 0
    combined_txns_count = 0

    for acct in accounts:
        txns = db.query(Transaction).filter_by(account_id=acct.id, status="active").all()
        
        # Calculate opening balance
        opening_bal = acct.opening_balance_minor or 0
        
        # Inflows & Outflows (excluding internal transfers)
        inflow = sum(t.amount_minor for t in txns if t.amount_minor > 0 and not t.is_transfer)
        outflow = sum(abs(t.amount_minor) for t in txns if t.amount_minor < 0 and not t.is_transfer)
        
        # Balance includes all movements (including transfers between accounts)
        all_movements = sum(t.amount_minor for t in txns)
        current_balance = opening_bal + all_movements

        combined_liquid_paise += current_balance
        combined_inflow_paise += inflow
        combined_outflow_paise += outflow
        combined_txns_count += len(txns)

        account_summaries.append({
            "account_id": acct.id,
            "nickname": acct.nickname,
            "bank": acct.bank,
            "masked_last4": acct.masked_last4,
            "type": acct.type,
            "opening_balance_paise": opening_bal,
            "current_balance_paise": current_balance,
            "total_inflow_paise": inflow,
            "total_outflow_paise": outflow,
            "net_flow_paise": inflow - outflow,
            "transaction_count": len(txns)
        })

    return {
        "combined_liquid_paise": combined_liquid_paise,
        "combined_inflow_paise": combined_inflow_paise,
        "combined_outflow_paise": combined_outflow_paise,
        "total_accounts_count": len(accounts),
        "total_transactions_count": combined_txns_count,
        "accounts": account_summaries
    }

def recommend_investment_sourcing(
    target_amount_paise: int,
    db: Session,
    investment_label: str = "Investment / FD"
) -> Dict[str, Any]:
    """
    Evaluates how to fund a large investment or purchase across multiple accounts:
    1. Checks each account's current balance
    2. Subtracts upcoming commitments tied to that specific account
    3. Subtracts minimum safety buffer (₹5,000)
    4. Generates optimal inter-account transfer recommendations
    """
    summary = compute_multi_account_summary(db)
    accounts = summary["accounts"]
    combined_liquid = summary["combined_liquid_paise"]

    # Gather upcoming 30-day recurring obligations per bank/merchant
    recurring_items = db.query(RecurringItem).filter_by(status="active").all()
    
    # Calculate committed obligations per account
    # If account_id is not set, allocate by bank name or description matching
    account_surpluses = []

    for acct in accounts:
        acct_id = acct["account_id"]
        bank_name = acct["bank"].lower()

        # Find obligations likely deducted from this account
        committed_30d = 0
        for r in recurring_items:
            # Check if recurring matches bank
            if "loan" in r.type.lower() or "emi" in r.type.lower():
                if "sbi" in bank_name:
                    committed_30d += r.typical_amount_minor
            elif "rent" in r.type.lower() or "subscription" in r.type.lower():
                if "hdfc" in bank_name or "phonepe" in bank_name:
                    committed_30d += r.typical_amount_minor

        floor_buffer = DEFAULT_ACCOUNT_FLOOR_BUFFER_PAISE
        available_surplus = acct["current_balance_paise"] - committed_30d - floor_buffer

        account_surpluses.append({
            "account_id": acct_id,
            "bank": acct["bank"],
            "masked_last4": acct["masked_last4"],
            "current_balance_paise": acct["current_balance_paise"],
            "upcoming_commitments_paise": committed_30d,
            "safety_buffer_paise": floor_buffer,
            "available_surplus_paise": available_surplus
        })

    # Sort accounts by available surplus (highest first)
    sorted_by_surplus = sorted(account_surpluses, key=lambda x: x["available_surplus_paise"], reverse=True)

    can_afford_total = combined_liquid >= target_amount_paise
    recommendations = []
    transfers_plan = []

    if not can_afford_total:
        shortfall = target_amount_paise - combined_liquid
        advice = (
            f"Insufficient total liquid balance across all accounts. "
            f"You need ₹{target_amount_paise / 100:,.0f} for this {investment_label}, "
            f"but your total balance is ₹{combined_liquid / 100:,.0f} (Shortfall: ₹{shortfall / 100:,.0f})."
        )
        feasible = False
    else:
        feasible = True
        best_acct = sorted_by_surplus[0]
        if best_acct["available_surplus_paise"] >= target_amount_paise:
            # Single account has enough surplus cash
            advice = (
                f"You can comfortably fund the entire ₹{target_amount_paise / 100:,.0f} from "
                f"{best_acct['bank']} (Ending in {best_acct['masked_last4']}). "
                f"It has ₹{best_acct['available_surplus_paise'] / 100:,.0f} in idle surplus cash "
                f"after reserving ₹{best_acct['upcoming_commitments_paise'] / 100:,.0f} for upcoming bills "
                f"and ₹{best_acct['safety_buffer_paise'] / 100:,.0f} safety buffer."
            )
        else:
            # Need to combine or transfer between accounts
            remaining_to_fund = target_amount_paise - best_acct["available_surplus_paise"]
            secondary_accts = sorted_by_surplus[1:]
            
            transfers_needed = []
            for sec in secondary_accts:
                if remaining_to_fund <= 0:
                    break
                transfer_amt = min(sec["available_surplus_paise"], remaining_to_fund)
                if transfer_amt > 0:
                    transfers_needed.append({
                        "from_bank": sec["bank"],
                        "from_masked": sec["masked_last4"],
                        "to_bank": best_acct["bank"],
                        "to_masked": best_acct["masked_last4"],
                        "transfer_amount_paise": transfer_amt
                    })
                    remaining_to_fund -= transfer_amt

            advice = (
                f"To fund ₹{target_amount_paise / 100:,.0f} without risking overdraft or missed bills: "
                f"Use {best_acct['bank']} as the primary account. "
            )
            for t in transfers_needed:
                advice += (
                    f"Transfer ₹{t['transfer_amount_paise'] / 100:,.0f} from {t['from_bank']} "
                    f"to {t['to_bank']}. "
                )
            transfers_plan = transfers_needed

    return {
        "feasible": feasible,
        "target_amount_paise": target_amount_paise,
        "combined_liquid_paise": combined_liquid,
        "accounts_surplus_breakdown": account_surpluses,
        "transfers_plan": transfers_plan,
        "advice_text": advice
    }

"""
Comprehensive Financial Data Validation and Balance Reconciliation Engine.
Verifies:
1. Opening + sum(Transactions) == Closing balance.
2. Row-by-row running balance consistency: B_t = B_{t-1} + delta_t.
3. Chronological sorting (ascending vs descending).
4. Date continuity & inactivity gaps (> 7 days).
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


def verify_balance_reconciliation(
    opening_balance_minor: Optional[int],
    closing_balance_minor: Optional[int],
    net_cash_flow_minor: int,
    transactions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Validates opening-to-closing balance reconciliation and row-by-row running balance consistency.
    """
    reconciliation_status = "UNVERIFIED"
    reconciliation_delta_minor = 0

    if opening_balance_minor is not None and closing_balance_minor is not None:
        expected_closing = opening_balance_minor + net_cash_flow_minor
        reconciliation_delta_minor = closing_balance_minor - expected_closing

        if reconciliation_delta_minor == 0:
            reconciliation_status = "PASSED"
        else:
            delta_rupees = reconciliation_delta_minor / 100.0
            reconciliation_status = f"DISCREPANCY (Delta: ₹{delta_rupees:,.2f})"

    # Running Balance Verification
    running_balance_status = "NOT_AVAILABLE"
    running_balance_breaks = []

    # Filter transactions that have balance_after_minor recorded
    txns_with_balance = [
        (idx, t) for idx, t in enumerate(transactions)
        if t.get("balance_after_minor") is not None
    ]

    if len(txns_with_balance) >= 2:
        running_balance_status = "PASSED"

        # Check order: check if dates are ascending or descending
        first_date = txns_with_balance[0][1]["posted_date"]
        last_date = txns_with_balance[-1][1]["posted_date"]
        is_descending = first_date > last_date

        if not is_descending:
            # Ascending chronological order (typical: row 1 is oldest, row N is newest)
            for i in range(1, len(txns_with_balance)):
                prev_idx, prev_t = txns_with_balance[i - 1]
                curr_idx, curr_t = txns_with_balance[i]

                prev_bal = prev_t["balance_after_minor"]
                curr_amt = curr_t["amount_minor"]
                curr_bal = curr_t["balance_after_minor"]

                expected_curr_bal = prev_bal + curr_amt
                if expected_curr_bal != curr_bal:
                    running_balance_status = "DISCREPANCY"
                    running_balance_breaks.append({
                        "row": curr_t.get("source_row", curr_idx + 1),
                        "date": curr_t["posted_date"],
                        "previous_balance_minor": prev_bal,
                        "amount_minor": curr_amt,
                        "actual_balance_minor": curr_bal,
                        "expected_balance_minor": expected_curr_bal,
                        "delta_minor": curr_bal - expected_curr_bal
                    })
        else:
            # Descending order (newest first, row N is oldest)
            for i in range(len(txns_with_balance) - 1):
                curr_idx, curr_t = txns_with_balance[i]
                next_idx, next_t = txns_with_balance[i + 1]  # next_t is older in time

                # In descending order, curr_bal = next_bal + curr_amt
                next_bal = next_t["balance_after_minor"]
                curr_amt = curr_t["amount_minor"]
                curr_bal = curr_t["balance_after_minor"]

                expected_curr_bal = next_bal + curr_amt
                if expected_curr_bal != curr_bal:
                    running_balance_status = "DISCREPANCY"
                    running_balance_breaks.append({
                        "row": curr_t.get("source_row", curr_idx + 1),
                        "date": curr_t["posted_date"],
                        "previous_balance_minor": next_bal,
                        "amount_minor": curr_amt,
                        "actual_balance_minor": curr_bal,
                        "expected_balance_minor": expected_curr_bal,
                        "delta_minor": curr_bal - expected_curr_bal
                    })

    # Check for date gaps > 7 days
    date_gaps = []
    if len(transactions) >= 2:
        sorted_txns = sorted(transactions, key=lambda x: x["posted_date"])
        for i in range(1, len(sorted_txns)):
            try:
                d1 = datetime.strptime(sorted_txns[i - 1]["posted_date"], "%Y-%m-%d")
                d2 = datetime.strptime(sorted_txns[i]["posted_date"], "%Y-%m-%d")
                gap_days = (d2 - d1).days
                if gap_days > 7:
                    date_gaps.append({
                        "from_date": sorted_txns[i - 1]["posted_date"],
                        "to_date": sorted_txns[i]["posted_date"],
                        "gap_days": gap_days
                    })
            except Exception:
                pass

    return {
        "reconciliation_status": reconciliation_status,
        "reconciliation_delta_minor": reconciliation_delta_minor,
        "running_balance_status": running_balance_status,
        "running_balance_breaks": running_balance_breaks,
        "date_gaps": date_gaps
    }


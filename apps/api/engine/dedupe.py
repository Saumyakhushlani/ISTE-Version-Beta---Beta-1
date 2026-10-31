"""
Deduplication and Internal Transfer Detection Engine
Implements the occurrence-ordinal deduplication algorithm (PRD §8.2)
and cross-account internal transfer matcher (spec §2.2).
"""

import hashlib
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple

# Domain constant: max date gap and fee tolerance for matching internal transfers
TRANSFER_DATE_TOLERANCE_DAYS = 2
TRANSFER_FEE_TOLERANCE_PAISE = 2500  # ₹25.00 for IMPS/NEFT fee tolerance

def compute_fingerprint(
    account_id: str,
    posted_date: str,
    amount_minor: int,
    normalized_description: str,
    occurrence_index: int = 1
) -> str:
    """
    Computes deterministic SHA-256 fingerprint for a transaction.
    """
    raw_key = f"{account_id}|{posted_date}|{amount_minor}|{normalized_description}|{occurrence_index}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def deduplicate_transactions(
    incoming_txns: List[Dict[str, Any]],
    existing_txns: List[Dict[str, Any]],
    account_id: str
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Deduplication using the occurrence-ordinal algorithm:
    1. In a single file, identical transactions on the same date with same amount are genuine
       payments (occurrence_index 1..k).
    2. Across overlapping statements, occurrences are aligned by (date, amount, occurrence_index).
       The overlapping count is max(k, m), preventing double-counting.
    """
    # Group existing transactions by (posted_date, amount_minor, normalized_description)
    existing_buckets: Dict[Tuple[str, int, str], List[Dict[str, Any]]] = {}
    for txn in existing_txns:
        txn_acct = txn.get("account_id", account_id)
        txn_status = txn.get("status", "active")
        if txn_acct == account_id and txn_status == "active":
            key = (txn["posted_date"], txn["amount_minor"], txn.get("normalized_description", ""))
            existing_buckets.setdefault(key, []).append(txn)

    # Group incoming transactions
    incoming_buckets: Dict[Tuple[str, int, str], List[Dict[str, Any]]] = {}
    for txn in incoming_txns:
        key = (txn["posted_date"], txn["amount_minor"], txn.get("normalized_description", ""))
        incoming_buckets.setdefault(key, []).append(txn)

    to_insert: List[Dict[str, Any]] = []
    duplicates_merged_count = 0

    for key, inc_list in incoming_buckets.items():
        ext_list = existing_buckets.get(key, [])
        m = len(inc_list)
        k = len(ext_list)

        # Assign occurrence_index
        for idx, inc_txn in enumerate(inc_list, start=1):
            inc_txn["occurrence_index"] = idx
            inc_txn["account_id"] = account_id
            inc_txn["fingerprint"] = compute_fingerprint(
                account_id=account_id,
                posted_date=inc_txn["posted_date"],
                amount_minor=inc_txn["amount_minor"],
                normalized_description=inc_txn.get("normalized_description", ""),
                occurrence_index=idx
            )

            if idx <= k:
                # Overlap duplicate: already exists in the database
                duplicates_merged_count += 1
                inc_txn["status"] = "merged"
                matching_ext = ext_list[idx - 1]
                inc_txn["dup_group_id"] = matching_ext.get("id")
            else:
                # New genuine occurrence beyond what was previously recorded
                inc_txn["status"] = "active"
                to_insert.append(inc_txn)

    return to_insert, duplicates_merged_count

def parse_iso_date(d_str: str) -> datetime:
    return datetime.strptime(d_str, "%Y-%m-%d")

def detect_internal_transfers(
    all_transactions: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Detects internal transfers between user's own accounts:
    - Different account_id
    - Opposite signs (one debit, one credit)
    - Date diff <= 2 days
    - Amount diff <= ₹25.00 (fee tolerance)
    Tags both as is_transfer = True and links via transfer_pair_id.
    Optimized with date-window bucketing O(N) instead of quadratic scan.
    """
    debits = [t for t in all_transactions if t.get("amount_minor", 0) < 0 and not t.get("is_transfer")]
    credits = [t for t in all_transactions if t.get("amount_minor", 0) > 0 and not t.get("is_transfer")]

    # Index credits by day ordinal
    credits_by_day: Dict[int, List[Dict[str, Any]]] = {}
    for c in credits:
        try:
            day_ordinal = parse_iso_date(c["posted_date"]).toordinal()
            credits_by_day.setdefault(day_ordinal, []).append(c)
        except Exception:
            continue

    paired_count = 0
    used_credit_ids = set()

    for debit in debits:
        try:
            debit_dt = parse_iso_date(debit["posted_date"])
            debit_day = debit_dt.toordinal()
        except Exception:
            continue

        debit_amt = abs(debit["amount_minor"])
        best_credit = None
        min_date_diff = 999

        # Search credits only within ±TRANSFER_DATE_TOLERANCE_DAYS
        for d in range(debit_day - TRANSFER_DATE_TOLERANCE_DAYS, debit_day + TRANSFER_DATE_TOLERANCE_DAYS + 1):
            day_credits = credits_by_day.get(d, [])
            for credit in day_credits:
                credit_id = credit.get("id") or str(id(credit))
                if credit_id in used_credit_ids:
                    continue
                if credit.get("account_id") == debit.get("account_id"):
                    continue  # Must be different accounts

                credit_amt = credit["amount_minor"]
                amt_diff = abs(debit_amt - credit_amt)
                if amt_diff <= TRANSFER_FEE_TOLERANCE_PAISE:
                    date_diff = abs(debit_day - d)
                    if date_diff < min_date_diff:
                        min_date_diff = date_diff
                        best_credit = credit

        if best_credit is not None:
            pair_id = str(uuid.uuid4())
            credit_id = best_credit.get("id") or str(id(best_credit))

            debit["is_transfer"] = True
            debit["transfer_pair_id"] = pair_id
            debit["category_id"] = "cat_transfer"

            best_credit["is_transfer"] = True
            best_credit["transfer_pair_id"] = pair_id
            best_credit["category_id"] = "cat_transfer"

            used_credit_ids.add(credit_id)
            paired_count += 1

    return all_transactions, paired_count

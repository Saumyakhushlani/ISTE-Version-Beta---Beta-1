"""
Extensible Column Mapping and Auto-Detection Engine for Financial Decision Lab (FDL).
Supports header-based detection, headerless type-inference, ambiguity detection,
and explicit user mapping overrides.
"""

import re
from typing import Dict, Any, List, Optional, Tuple, Union
from parsers.date_parser import parse_date_to_iso
from parsers.amount_parser import parse_indian_amount_to_paise


# Comprehensive synonym dictionary for bank CSV headers
CANONICAL_HEADER_SYNONYMS = {
    "date": [
        "date", "txn date", "transaction date", "tran date", "post date",
        "posting date", "booking date", "trans date", "txndate", "txn_date"
    ],
    "value_date": [
        "value date", "value dt", "val date", "valuedate"
    ],
    "description": [
        "narration", "description", "particulars", "remarks", "transaction details",
        "transaction remarks", "details", "remittance information", "payment details",
        "memo", "payee", "transaction description", "partner name"
    ],
    "withdrawal": [
        "withdrawal amt", "withdrawal amount", "withdrawal", "debit amount",
        "debit amt", "debit", "dr amount", "dr amt", "dr", "withdrawals",
        "paid out", "debits", "withdrawal (inr)", "debit (inr)", "withdrawal inr",
        "debit inr", "dr.", "withdrawal amount (inr )", "debit amount (inr )"
    ],
    "deposit": [
        "deposit amt", "deposit amount", "deposit", "credit amount",
        "credit amt", "credit", "cr amount", "cr amt", "cr", "deposits",
        "paid in", "credits", "deposit (inr)", "credit (inr)", "deposit inr",
        "credit inr", "cr.", "deposit amount (inr )", "credit amount (inr )"
    ],
    "amount": [
        "amount", "txn amount", "transaction amount", "net amount",
        "amt", "total amount", "amount (inr)", "amount inr"
    ],
    "txn_type": [
        "transaction type", "type", "dr/cr", "cr/dr", "dr / cr", "cr / dr",
        "indicator", "d/c", "direction", "type of txn", "txn type"
    ],
    "balance": [
        "closing balance", "balance", "running balance", "net balance",
        "book balance", "available balance", "bal", "balance (inr)", "balance inr",
        "closing bal", "balance (inr )"
    ],
    "ref_no": [
        "utr", "transaction id", "txn id", "chq/ref no", "ref no",
        "reference no", "cheque no", "chq no", "reference number", "ref. no.",
        "chq/ref. no.", "reference", "cheque number", "ref no./cheque no."
    ]
}

EXCLUDE_AMOUNT_KEYWORDS = [
    "instrument", "mode", "type", "channel", "status", "remarks",
    "details", "desc", "narration", "code", "sol", "name", "date"
]


class ColumnMappingResult:
    def __init__(
        self,
        mapping: Dict[str, int],
        confidence: float,
        is_ambiguous: bool,
        ambiguity_reasons: List[str],
        has_header: bool,
        header_row_index: int,
        headers: List[str]
    ):
        self.mapping = mapping
        self.confidence = confidence
        self.is_ambiguous = is_ambiguous
        self.ambiguity_reasons = ambiguity_reasons
        self.has_header = has_header
        self.header_row_index = header_row_index
        self.headers = headers

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mapping": self.mapping,
            "confidence": round(self.confidence, 2),
            "is_ambiguous": self.is_ambiguous,
            "ambiguity_reasons": self.ambiguity_reasons,
            "has_header": self.has_header,
            "header_row_index": self.header_row_index,
            "headers": self.headers
        }


def score_row_as_header(row: List[str]) -> Tuple[float, Dict[str, int], List[str]]:
    """
    Evaluates how well a row matches known bank statement column headers.
    Returns (score, mapping, matched_fields).
    """
    clean_row = [re.sub(r"\s+", " ", str(col).lower().strip()) for col in row]
    mapping = {}
    matched_fields = []
    score = 0.0

    for canonical, synonyms in CANONICAL_HEADER_SYNONYMS.items():
        best_col_idx = None
        best_match_quality = 0.0

        for idx, col_name in enumerate(clean_row):
            if not col_name:
                continue

            # Skip amount keywords for non-amount columns
            if canonical in ("withdrawal", "deposit", "amount"):
                if any(ex in col_name for ex in EXCLUDE_AMOUNT_KEYWORDS):
                    continue

            for syn in synonyms:
                if col_name == syn:
                    if 1.0 > best_match_quality:
                        best_col_idx = idx
                        best_match_quality = 1.0
                elif len(syn) >= 3 and syn in col_name:
                    if 0.8 > best_match_quality:
                        best_col_idx = idx
                        best_match_quality = 0.8

        if best_col_idx is not None:
            mapping[canonical] = best_col_idx
            matched_fields.append(canonical)
            score += best_match_quality

    # Disambiguation: if 'date' was not matched but 'value_date' was, use value_date as date
    if "date" not in mapping and "value_date" in mapping:
        mapping["date"] = mapping["value_date"]

    # If both withdrawal and deposit map to the exact same column, conflict
    if "withdrawal" in mapping and "deposit" in mapping and mapping["withdrawal"] == mapping["deposit"]:
        # If amount is not mapped, treat it as amount
        if "amount" not in mapping:
            mapping["amount"] = mapping["withdrawal"]
        del mapping["withdrawal"]
        del mapping["deposit"]

    return score, mapping, matched_fields


def infer_headerless_mapping(sample_rows: List[List[str]]) -> Tuple[Dict[str, int], float, List[str]]:
    """
    Infers column mapping from cell data types when no header row is present.
    Examines the first 10-20 data rows.
    """
    if not sample_rows:
        return {}, 0.0, ["Empty data rows; cannot infer column mapping."]

    num_cols = max(len(r) for r in sample_rows)
    date_candidates = {}
    numeric_candidates = {}
    text_candidates = {}

    for col_idx in range(num_cols):
        values = [r[col_idx] for r in sample_rows if col_idx < len(r) and r[col_idx].strip()]
        if not values:
            continue

        # Test date parsing
        date_matches = sum(1 for v in values if parse_date_to_iso(v) is not None)
        date_ratio = date_matches / len(values)
        if date_ratio >= 0.7:
            date_candidates[col_idx] = date_ratio

        # Test amount parsing
        amt_matches = sum(1 for v in values if parse_indian_amount_to_paise(v) is not None)
        amt_ratio = amt_matches / len(values)
        if amt_ratio >= 0.7:
            numeric_candidates[col_idx] = amt_ratio

        # Average length of non-numeric text
        non_num_vals = [v for v in values if parse_indian_amount_to_paise(v) is None and parse_date_to_iso(v) is None]
        if non_num_vals:
            avg_len = sum(len(v) for v in non_num_vals) / len(non_num_vals)
            if avg_len > 4:
                text_candidates[col_idx] = avg_len

    mapping = {}
    ambiguities = []

    # Assign Date
    if date_candidates:
        best_date_col = max(date_candidates.items(), key=lambda x: x[1])[0]
        mapping["date"] = best_date_col
    else:
        ambiguities.append("Could not identify Date column in headerless CSV.")

    # Assign Description
    if text_candidates:
        best_desc_col = max(text_candidates.items(), key=lambda x: x[1])[0]
        mapping["description"] = best_desc_col
    else:
        ambiguities.append("Could not identify Description column in headerless CSV.")

    # Assign Numeric columns (Withdrawal, Deposit, Balance, or Amount)
    num_cols_sorted = sorted(numeric_candidates.keys())
    # Exclude date and description from numeric candidates
    num_cols_sorted = [c for c in num_cols_sorted if c != mapping.get("date") and c != mapping.get("description")]

    if len(num_cols_sorted) == 1:
        mapping["amount"] = num_cols_sorted[0]
    elif len(num_cols_sorted) == 2:
        mapping["withdrawal"] = num_cols_sorted[0]
        mapping["deposit"] = num_cols_sorted[1]
    elif len(num_cols_sorted) >= 3:
        mapping["withdrawal"] = num_cols_sorted[0]
        mapping["deposit"] = num_cols_sorted[1]
        mapping["balance"] = num_cols_sorted[2]

    confidence = 0.6 if ("date" in mapping and "description" in mapping and ("amount" in mapping or "withdrawal" in mapping)) else 0.3
    return mapping, confidence, ambiguities


def detect_column_mapping(
    lines: List[List[str]],
    explicit_mapping: Optional[Dict[str, Union[int, str]]] = None,
    explicit_has_header: Optional[bool] = None
) -> ColumnMappingResult:
    """
    Finds the table header and builds the canonical column mapping.
    Handles explicit user overrides, ambiguous headers, and headerless files.
    """
    if not lines:
        raise ValueError("CSV statement file is empty.")

    # 1. Handle explicit user mapping override if supplied
    if explicit_mapping:
        resolved_mapping = {}
        header_row = lines[0] if (explicit_has_header is not False) else []
        header_lower_map = {str(col).strip().lower(): idx for idx, col in enumerate(header_row)}

        for canonical, col_ref in explicit_mapping.items():
            if isinstance(col_ref, int):
                resolved_mapping[canonical] = col_ref
            elif isinstance(col_ref, str):
                ref_clean = col_ref.strip().lower()
                if ref_clean in header_lower_map:
                    resolved_mapping[canonical] = header_lower_map[ref_clean]
                elif ref_clean.isdigit():
                    resolved_mapping[canonical] = int(ref_clean)

        return ColumnMappingResult(
            mapping=resolved_mapping,
            confidence=1.0,
            is_ambiguous=False,
            ambiguity_reasons=[],
            has_header=explicit_has_header if explicit_has_header is not None else True,
            header_row_index=0,
            headers=header_row
        )

    # 2. Header scan: inspect first 35 lines for a recognizable header row
    best_score = 0.0
    best_idx = 0
    best_mapping = {}
    best_headers = []

    for idx, row in enumerate(lines[:35]):
        if not any(cell.strip() for cell in row):
            continue
        score, mapping, matched = score_row_as_header(row)
        has_amt = "amount" in mapping or "withdrawal" in mapping or "deposit" in mapping
        if score > best_score and "date" in mapping and "description" in mapping and has_amt:
            best_score = score
            best_idx = idx
            best_mapping = mapping
            best_headers = [str(c).strip() for c in row]

    # If a good header row is found (score >= 2.5)
    if best_score >= 2.5:
        ambiguities = []
        is_ambiguous = False

        # Check for ambiguity: single amount column without indication of credit/debit
        has_dr_cr = "withdrawal" in best_mapping and "deposit" in best_mapping
        has_type_col = "txn_type" in best_mapping
        if "amount" in best_mapping and not has_dr_cr and not has_type_col:
            # Check sample rows to see if amounts contain signs or DR/CR
            sample_data = lines[best_idx + 1:best_idx + 15]
            amt_col = best_mapping["amount"]
            sample_vals = [r[amt_col] for r in sample_data if amt_col < len(r)]
            has_explicit_signs = any(
                "-" in str(v) or "(" in str(v) or "DR" in str(v).upper() or "CR" in str(v).upper()
                for v in sample_vals
            )
            if not has_explicit_signs:
                is_ambiguous = True
                ambiguities.append(
                    "Single 'Amount' column detected without explicit Dr/Cr column or signed values. "
                    "Debit/Credit direction may require user confirmation."
                )

        confidence = 0.95 if best_score >= 4.0 else (0.85 if best_score >= 3.0 else 0.70)
        return ColumnMappingResult(
            mapping=best_mapping,
            confidence=confidence,
            is_ambiguous=is_ambiguous,
            ambiguity_reasons=ambiguities,
            has_header=True,
            header_row_index=best_idx,
            headers=best_headers
        )

    # 3. Headerless fallback: try type-sniffing data rows
    sample_data = [r for r in lines[:25] if any(cell.strip() for cell in r)]
    hl_mapping, hl_conf, hl_ambiguities = infer_headerless_mapping(sample_data)

    if hl_conf >= 0.5:
        synthetic_headers = [f"Column {i+1}" for i in range(max(len(r) for r in sample_data))]
        return ColumnMappingResult(
            mapping=hl_mapping,
            confidence=hl_conf,
            is_ambiguous=True,
            ambiguity_reasons=["Headerless CSV detected; column mapping inferred from data types."] + hl_ambiguities,
            has_header=False,
            header_row_index=-1,
            headers=synthetic_headers
        )

    raise ValueError(
        "Could not detect bank statement table headers or columns. "
        "Missing recognized Date, Description, or Amount/Debit/Credit columns."
    )


"""
Delimiter Sniffer and CSV Dialect Detector for Financial Decision Lab (FDL).
Detects comma (,), semicolon (;), tab (\\t), and pipe (|) delimiters.
"""

import csv
import re
from typing import List, Optional


CANDIDATE_DELIMITERS = [",", ";", "\t", "|"]


def count_delimiters_outside_quotes(line: str, delimiter: str) -> int:
    """Counts occurrences of delimiter outside double-quoted substrings."""
    # Split by quotes: even-indexed chunks are outside quotes, odd-indexed are inside quotes
    parts = line.split('"')
    count = 0
    for idx in range(0, len(parts), 2):
        count += parts[idx].count(delimiter)
    return count


def detect_delimiter(text: str, explicit_delimiter: Optional[str] = None) -> str:
    """
    Detects the CSV delimiter from the given text.
    If explicit_delimiter is provided and valid, returns it immediately.
    """
    if explicit_delimiter and explicit_delimiter in CANDIDATE_DELIMITERS:
        return explicit_delimiter

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return ","

    # Try Python's standard csv.Sniffer on the first few lines
    sample = "\n".join(lines[:15])
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=CANDIDATE_DELIMITERS)
        if dialect.delimiter in CANDIDATE_DELIMITERS:
            return dialect.delimiter
    except Exception:
        pass

    # Heuristic frequency and consistency check across sample lines
    sample_lines = lines[:20]
    best_delim = ","
    best_score = -1

    for delim in CANDIDATE_DELIMITERS:
        counts = [count_delimiters_outside_quotes(l, delim) for l in sample_lines]
        non_zero_counts = [c for c in counts if c > 0]
        if not non_zero_counts:
            continue

        # Score based on:
        # 1. Proportion of lines containing this delimiter
        coverage = len(non_zero_counts) / len(sample_lines)
        if coverage < 0.5:
            continue

        # 2. Consistency: standard deviation of counts across lines
        avg_count = sum(non_zero_counts) / len(non_zero_counts)
        variance = sum((c - avg_count) ** 2 for c in non_zero_counts) / len(non_zero_counts)

        # Higher average count and lower variance gives better score
        score = (coverage * 100) + (avg_count * 2) - variance
        if score > best_score:
            best_score = score
            best_delim = delim

    return best_delim


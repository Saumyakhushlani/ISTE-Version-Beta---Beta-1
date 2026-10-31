"""
Robust Date Parser for Financial Decision Lab (FDL).
Supports Indian and international bank statement date formats:
DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-Mon-YYYY, YYYY-MM-DD, Month DD YYYY,
with timestamp stripping and locale-aware day/month disambiguation.
Returns ISO 8601 string 'YYYY-MM-DD'.
"""

import re
from datetime import datetime
from typing import Optional, List, Tuple


COMMON_DATE_FORMATS_DMY = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%d/%m/%y",
    "%d-%m-%y",
    "%d.%m.%y",
    "%d-%b-%Y",
    "%d-%b-%y",
    "%d-%B-%Y",
    "%d %b %Y",
    "%d %B %Y",
    "%d %b %y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%b %d %Y",
    "%B %d %Y",
    "%Y/%m/%d",
    "%Y.%m.%d",
]

COMMON_DATE_FORMATS_MDY = [
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%m-%d-%Y",
    "%m/%d/%y",
    "%m-%d-%y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%b %d %Y",
    "%d/%m/%Y",
    "%d-%m-%Y",
]


def strip_time_suffix(val: str) -> str:
    """Removes trailing time components, e.g. '14:30:00', '10:15 AM', 'T14:30:00Z'."""
    s = val.strip()
    # Strip ISO timestamp T component
    if "T" in s:
        s = s.split("T")[0].strip()
    # Strip 12-hour or 24-hour time e.g. ' 14:30:00', ' 02:30 PM'
    s = re.sub(r"\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?.*$", "", s)
    return s.strip()


def parse_date_to_iso(val: str, preferred_order: str = "DMY") -> Optional[str]:
    """
    Parses ambiguous date formats into ISO 8601 string 'YYYY-MM-DD'.
    Default priority is DMY (India standard), falling back to other formats.
    """
    if not val:
        return None
    s = str(val).strip()
    if not s or s == "-" or s.lower() in ("nan", "null", "none"):
        return None

    s_clean = strip_time_suffix(s)
    # Collapse multiple whitespace
    s_clean = re.sub(r"\s+", " ", s_clean)
    # Normalize common non-standard month abbreviations (e.g. 'Sept' -> 'Sep', 'Sept.' -> 'Sep')
    s_clean = re.sub(r"\bSept\b", "Sep", s_clean, flags=re.IGNORECASE)
    s_clean = re.sub(r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.", r"\1", s_clean, flags=re.IGNORECASE)

    # Choose format list based on preferred order
    format_list = COMMON_DATE_FORMATS_DMY if preferred_order == "DMY" else COMMON_DATE_FORMATS_MDY

    for fmt in format_list:
        try:
            dt = datetime.strptime(s_clean, fmt)
            # Basic sanity check on year
            if 1970 <= dt.year <= 2100:
                return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Secondary check: if DMY preferred but failed, try MDY
    if preferred_order == "DMY":
        for fmt in ["%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y"]:
            try:
                dt = datetime.strptime(s_clean, fmt)
                if 1970 <= dt.year <= 2100:
                    return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

    return None


def infer_date_format_from_samples(date_strings: List[str]) -> str:
    """
    Analyzes sample date strings to determine if the column follows DMY or MDY.
    If any value has the first component > 12 (e.g. 25/08/2024), it must be DMY.
    If any value has the second component > 12 (e.g. 08/25/2024), it must be MDY.
    Defaults to DMY (India standard).
    """
    has_first_gt_12 = False
    has_second_gt_12 = False

    for s in date_strings:
        clean = strip_time_suffix(str(s)).strip()
        # Look for slash or dash separated numbers: XX/YY/ZZZZ
        m = re.match(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})", clean)
        if m:
            first_num = int(m.group(1))
            second_num = int(m.group(2))
            if first_num > 12:
                has_first_gt_12 = True
            if second_num > 12:
                has_second_gt_12 = True

    if has_second_gt_12 and not has_first_gt_12:
        return "MDY"
    return "DMY"


"""
Encoding Sniffer and Text Decoder for Financial Decision Lab (FDL).
Supports UTF-8, UTF-8-SIG (BOM), UTF-16, Windows-1252 (CP1252), ISO-8859-1 (Latin-1), and ASCII.
"""

from typing import Tuple


def detect_and_decode_bytes(raw_bytes: bytes, explicit_encoding: str = None) -> Tuple[str, str]:
    """
    Decodes raw bytes into a string, identifying the encoding used.
    If explicit_encoding is given, attempts that first.
    Returns (decoded_text, detected_encoding).
    """
    if explicit_encoding:
        try:
            return raw_bytes.decode(explicit_encoding), explicit_encoding.lower()
        except UnicodeDecodeError:
            pass  # Fall back to automatic detection

    # Check for Byte Order Marks (BOM)
    if raw_bytes.startswith(b"\xef\xbb\xbf"):
        try:
            return raw_bytes.decode("utf-8-sig"), "utf-8-sig"
        except UnicodeDecodeError:
            pass
    elif raw_bytes.startswith(b"\xff\xfe"):
        try:
            return raw_bytes.decode("utf-16-le"), "utf-16-le"
        except UnicodeDecodeError:
            pass
    elif raw_bytes.startswith(b"\xfe\xff"):
        try:
            return raw_bytes.decode("utf-16-be"), "utf-16-be"
        except UnicodeDecodeError:
            pass

    # Try standard encodings in order of likelihood for financial statements
    candidates = ["utf-8", "cp1252", "iso-8859-1", "utf-16"]

    for enc in candidates:
        try:
            text = raw_bytes.decode(enc)
            # Basic sanity check: ensure no high ratio of null bytes (which happens if utf-16 is decoded as utf-8)
            if "\x00" in text[:100]:
                continue
            return text, enc
        except UnicodeDecodeError:
            continue

    # Final fallback: utf-8 with replace
    return raw_bytes.decode("utf-8", errors="replace"), "utf-8"


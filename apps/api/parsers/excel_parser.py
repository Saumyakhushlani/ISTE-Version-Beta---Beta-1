"""
Bank Statement Excel Parser (.xlsx and .xls)
Extracts tabular transactions from digital bank Excel exports (HDFC, SBI, ICICI, Axis, Kotak).
Includes password decryption via msoffcrypto-tool and ZIP extraction, automatic column mapping & reconciliation.
"""

import io
import re
import zipfile
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import openpyxl
import xlrd
import msoffcrypto
import msoffcrypto.exceptions

from parsers.csv_parser import (
    parse_indian_amount_to_paise,
    parse_date_to_iso,
    find_header_and_mapping,
    parse_csv_statement
)
from parsers.normalizer import normalize_transaction_description
from parsers.reconciliation import verify_balance_reconciliation
from parsers.bank_detector import detect_bank_and_account


def is_excel_encrypted(file_bytes: bytes) -> bool:
    """
    Checks whether the Excel file stream is password-encrypted.
    Supports:
    1. Microsoft Office OLE2 Agile/Standard/BIFF encryption (msoffcrypto)
    2. Password-protected ZIP archives containing Excel sheets
    3. Compound OLE documents starting with \xd0\xcf\x11\xe0
    """
    # 1. Check msoffcrypto Office encryption
    try:
        office_file = msoffcrypto.OfficeFile(io.BytesIO(file_bytes))
        if office_file.is_encrypted():
            return True
    except Exception:
        pass

    # 2. Check if it is a ZIP package with encrypted entries
    if file_bytes.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                for info in zf.infolist():
                    if (info.flag_bits & 0x1) != 0:
                        return True
        except Exception:
            pass

    # 3. Check OLE header signature
    if file_bytes.startswith(b"\xd0\xcf\x11\xe0"):
        try:
            office_file = msoffcrypto.OfficeFile(io.BytesIO(file_bytes))
            return office_file.is_encrypted()
        except Exception:
            pass

    return False


def decrypt_excel(file_bytes: bytes, password: str) -> io.BytesIO:
    """
    Decrypts an encrypted Office Excel workbook (.xlsx or .xls) using the provided password.
    Supports both msoffcrypto (Agile / Standard / BIFF8) and ZIP-encrypted packages.
    Raises ValueError with PASSWORD_INCORRECT if password fails.
    """
    clean_pwd = password.strip() if password else ""
    if not clean_pwd:
        raise ValueError("PASSWORD_REQUIRED: This Excel bank statement is password-protected. Please enter your password.")

    # 1. Try msoffcrypto for OLE2 Office encryption (OOXML / Agile / Standard / BIFF8)
    try:
        office_file = msoffcrypto.OfficeFile(io.BytesIO(file_bytes))
        if office_file.is_encrypted():
            try:
                office_file.load_key(password=clean_pwd, verify_password=True)
            except TypeError:
                office_file.load_key(password=clean_pwd)
            decrypted_stream = io.BytesIO()
            office_file.decrypt(decrypted_stream)
            decrypted_stream.seek(0)
            return decrypted_stream
    except (msoffcrypto.exceptions.InvalidKeyError, msoffcrypto.exceptions.DecryptionError):
        raise ValueError("PASSWORD_INCORRECT: The password provided for this Excel statement is incorrect.")
    except Exception as e:
        err_str = str(e).lower()
        if "password" in err_str or "key" in err_str:
            raise ValueError("PASSWORD_INCORRECT: The password provided for this Excel statement is incorrect.")
        # If msoffcrypto fails with unsupported file format, fall through to ZIP decryption

    # 2. Try standard ZIP decryption if the file is a password-protected zip
    if file_bytes.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                has_encrypted_entry = any((info.flag_bits & 0x1) != 0 for info in zf.infolist())
                if has_encrypted_entry:
                    enc_info = next(info for info in zf.infolist() if (info.flag_bits & 0x1) != 0)
                    try:
                        zf.read(enc_info.filename, pwd=clean_pwd.encode("utf-8"))
                    except (RuntimeError, zipfile.BadZipFile):
                        raise ValueError("PASSWORD_INCORRECT: The password provided for this Excel statement is incorrect.")

                    names = zf.namelist()
                    inner_excel = next((n for n in names if n.lower().endswith((".xlsx", ".xls")) and not n.startswith("__MACOSX")), None)
                    if inner_excel:
                        inner_bytes = zf.read(inner_excel, pwd=clean_pwd.encode("utf-8"))
                        if is_excel_encrypted(inner_bytes):
                            return decrypt_excel(inner_bytes, clean_pwd)
                        dec_stream = io.BytesIO(inner_bytes)
                        dec_stream.seek(0)
                        return dec_stream

                    # Otherwise decrypt all entries and recreate an unencrypted in-memory zip
                    decrypted_zip_stream = io.BytesIO()
                    with zipfile.ZipFile(decrypted_zip_stream, "w", compression=zipfile.ZIP_DEFLATED) as new_zf:
                        for info in zf.infolist():
                            if info.is_dir():
                                continue
                            if (info.flag_bits & 0x1) != 0:
                                data = zf.read(info.filename, pwd=clean_pwd.encode("utf-8"))
                            else:
                                data = zf.read(info.filename)
                            new_zf.writestr(info.filename, data)
                    decrypted_zip_stream.seek(0)
                    return decrypted_zip_stream
        except ValueError:
            raise
        except Exception as e:
            err_str = str(e).lower()
            if "password" in err_str or "bad password" in err_str or "crc" in err_str:
                raise ValueError("PASSWORD_INCORRECT: The password provided for this Excel statement is incorrect.")
            raise ValueError(f"Failed to decrypt compressed Excel statement: {e}")

    raise ValueError("Unable to decrypt this Excel file. Unsupported encryption format.")


def _extract_rows_from_xlsx(stream: io.BytesIO) -> List[List[str]]:
    """Extracts raw text grid from an OpenXML .xlsx workbook."""
    try:
        wb = openpyxl.load_workbook(stream, data_only=True, keep_links=False)
    except Exception:
        stream.seek(0)
        wb = openpyxl.load_workbook(stream, data_only=False, keep_links=False)

    best_sheet = wb.active
    max_rows = (best_sheet.max_row or 0) if best_sheet else 0
    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        cur_rows = sheet.max_row or 0
        if cur_rows > max_rows:
            best_sheet = sheet
            max_rows = cur_rows

    raw_rows: List[List[str]] = []
    if not best_sheet:
        return raw_rows

    for row in best_sheet.iter_rows(values_only=True):
        clean_row = []
        for cell in row:
            if cell is None:
                clean_row.append("")
            elif isinstance(cell, (datetime, date)):
                clean_row.append(cell.strftime("%Y-%m-%d"))
            elif isinstance(cell, float):
                if cell.is_integer():
                    clean_row.append(str(int(cell)))
                else:
                    clean_row.append(f"{cell:.2f}")
            else:
                clean_row.append(str(cell).strip())
        if any(clean_row):
            raw_rows.append(clean_row)

    return raw_rows


def _extract_rows_from_xls(file_bytes: bytes) -> List[List[str]]:
    """Extracts raw text grid from legacy BIFF8 .xls workbook."""
    wb = xlrd.open_workbook(file_contents=file_bytes)
    sheet = wb.sheet_by_index(0)
    raw_rows: List[List[str]] = []

    for row_idx in range(sheet.nrows):
        clean_row = []
        for col_idx in range(sheet.ncols):
            cell_type = sheet.cell_type(row_idx, col_idx)
            cell_value = sheet.cell_value(row_idx, col_idx)

            if cell_type == xlrd.XL_CELL_EMPTY:
                clean_row.append("")
            elif cell_type == xlrd.XL_CELL_DATE:
                try:
                    dt_tuple = xlrd.xldate_as_tuple(cell_value, wb.datemode)
                    clean_row.append(f"{dt_tuple[0]:04d}-{dt_tuple[1]:02d}-{dt_tuple[2]:02d}")
                except Exception:
                    clean_row.append(str(cell_value))
            elif cell_type == xlrd.XL_CELL_NUMBER:
                if float(cell_value).is_integer():
                    clean_row.append(str(int(cell_value)))
                else:
                    clean_row.append(f"{cell_value:.2f}")
            else:
                clean_row.append(str(cell_value).strip())
        if any(clean_row):
            raw_rows.append(clean_row)

    return raw_rows


def _extract_rows_from_html_or_csv(file_bytes: bytes) -> List[List[str]]:
    """
    Fallback extractor for banks (e.g. SBI, HDFC) that export HTML tables
    or plain CSV/TSV disguised with an .xls / .xlsx extension.
    """
    try:
        text = file_bytes.decode("utf-8", errors="replace")
        if "<table" in text.lower() or "<tr" in text.lower():
            rows: List[List[str]] = []
            for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", text, re.DOTALL | re.IGNORECASE):
                cells = [
                    re.sub(r"<[^>]+>", "", td).strip()
                    for td in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.DOTALL | re.IGNORECASE)
                ]
                if any(cells):
                    rows.append(cells)
            if rows:
                return rows
        # If plain delimited text
        lines = [line.strip().split(",") for line in text.splitlines() if line.strip()]
        if len(lines) > 2 and len(lines[0]) > 2:
            return lines
    except Exception:
        pass
    return []


def parse_excel_statement(
    excel_bytes: bytes,
    password: Optional[str] = None,
    column_mapping: Optional[Dict[str, int]] = None,
    account_id: str = "default_acct"
) -> Dict[str, Any]:
    """
    Parses an Excel bank statement (.xlsx or .xls), decrypting if password-protected.
    Returns preview structure matching CSV and PDF parsers.
    """
    # 1. Encryption check
    if is_excel_encrypted(excel_bytes):
        if not password or not password.strip():
            raise ValueError("PASSWORD_REQUIRED: This Excel bank statement is password-protected. Please enter your password.")
        decrypted_stream = decrypt_excel(excel_bytes, password.strip())
        processed_bytes = decrypted_stream.read()
    else:
        processed_bytes = excel_bytes

    # 2. Extract rows based on OpenXML, BIFF, or HTML-disguised format
    raw_rows: List[List[str]] = []
    try:
        if processed_bytes.startswith(b"PK\x03\x04"):
            raw_rows = _extract_rows_from_xlsx(io.BytesIO(processed_bytes))
        else:
            try:
                raw_rows = _extract_rows_from_xls(processed_bytes)
            except Exception:
                try:
                    raw_rows = _extract_rows_from_xlsx(io.BytesIO(processed_bytes))
                except Exception:
                    raw_rows = _extract_rows_from_html_or_csv(processed_bytes)
    except Exception as e:
        err_text = str(e).lower()
        if "password" in err_text or "encrypted" in err_text:
            if not password or not password.strip():
                raise ValueError("PASSWORD_REQUIRED: This Excel bank statement is password-protected. Please enter your password.")
            else:
                raise ValueError("PASSWORD_INCORRECT: The password provided for this Excel statement is incorrect.")
        raise ValueError(f"Failed to read Excel workbook: {e}")

    if not raw_rows:
        # One last try with HTML / CSV fallback
        raw_rows = _extract_rows_from_html_or_csv(processed_bytes)
        if not raw_rows:
            raise ValueError("Excel file is empty or contains no readable sheets.")

    # 3. Detect bank and account from header rows
    sample_text = "\n".join(["\t".join(r) for r in raw_rows[:25]])
    bank_name, masked_account = detect_bank_and_account(sample_text)

    # 4. Map columns
    if column_mapping:
        col_map = column_mapping
        header_idx = 0
        mapping_confidence = 1.0
        is_ambiguous = False
        ambiguity_reasons = []
        headers = raw_rows[0]
    else:
        header_idx, col_map = find_header_and_mapping(raw_rows)
        headers = raw_rows[header_idx] if header_idx < len(raw_rows) else []
        mapping_confidence = 0.95 if "date" in col_map and ("amount" in col_map or "withdrawal" in col_map) else 0.70
        is_ambiguous = False
        ambiguity_reasons = []

    # 5. Extract transactions
    data_rows = raw_rows[header_idx + 1:]
    transactions: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    warnings: List[str] = []

    running_sum = 0
    opening_balance_minor: Optional[int] = None
    closing_balance_minor: Optional[int] = None

    for row_idx, row in enumerate(data_rows, start=header_idx + 2):
        if not any(row):
            continue

        posted_date = None
        if "date" in col_map and col_map["date"] < len(row):
            raw_date_str = row[col_map["date"]].strip()
            if re.match(r"^\d{4}-\d{2}-\d{2}$", raw_date_str):
                posted_date = raw_date_str
            else:
                posted_date = parse_date_to_iso(raw_date_str)

        if not posted_date:
            continue

        # Extract Description
        raw_desc = ""
        if "description" in col_map and col_map["description"] < len(row):
            raw_desc = row[col_map["description"]].strip()

        cleaned_raw_desc = raw_desc
        if cleaned_raw_desc.lower().startswith("paid to "):
            cleaned_raw_desc = cleaned_raw_desc[8:].strip()
        elif cleaned_raw_desc.lower().startswith("received from "):
            cleaned_raw_desc = cleaned_raw_desc[14:].strip()

        norm_desc, channel, merchant = normalize_transaction_description(cleaned_raw_desc)

        # Extract Amount
        amount_minor = None
        has_amount = "amount" in col_map and col_map["amount"] < len(row)
        has_txn_type = "txn_type" in col_map and col_map["txn_type"] < len(row)
        has_withdrawal = "withdrawal" in col_map and col_map["withdrawal"] < len(row)
        has_deposit = "deposit" in col_map and col_map["deposit"] < len(row)

        if has_amount and has_txn_type:
            raw_amt_paise = parse_indian_amount_to_paise(row[col_map["amount"]])
            txn_type = row[col_map["txn_type"]].strip().upper()
            if raw_amt_paise is not None:
                clean_type = re.sub(r"[^A-Z]", "", txn_type)
                if clean_type in ("DEBIT", "DR", "D", "OUT", "WITHDRAWAL", "W"):
                    amount_minor = -abs(raw_amt_paise)
                elif clean_type in ("CREDIT", "CR", "C", "IN", "DEPOSIT", "DEP"):
                    amount_minor = abs(raw_amt_paise)
                else:
                    amount_minor = raw_amt_paise
        elif has_withdrawal and has_deposit:
            w_paise = parse_indian_amount_to_paise(row[col_map["withdrawal"]])
            d_paise = parse_indian_amount_to_paise(row[col_map["deposit"]])
            if w_paise is not None and w_paise != 0:
                amount_minor = -abs(w_paise)
            elif d_paise is not None and d_paise != 0:
                amount_minor = abs(d_paise)
        elif has_amount:
            amount_minor = parse_indian_amount_to_paise(row[col_map["amount"]])
        elif has_withdrawal:
            w_paise = parse_indian_amount_to_paise(row[col_map["withdrawal"]])
            if w_paise is not None and w_paise != 0:
                amount_minor = -abs(w_paise)
        elif has_deposit:
            d_paise = parse_indian_amount_to_paise(row[col_map["deposit"]])
            if d_paise is not None and d_paise != 0:
                amount_minor = abs(d_paise)

        if amount_minor is None or amount_minor == 0:
            continue

        # Extract Running Balance if available
        balance_after = None
        if "balance" in col_map and col_map["balance"] < len(row):
            balance_after = parse_indian_amount_to_paise(row[col_map["balance"]])

        if opening_balance_minor is None and balance_after is not None:
            opening_balance_minor = balance_after - amount_minor

        if balance_after is not None:
            closing_balance_minor = balance_after

        running_sum += amount_minor

        transactions.append({
            "source_row": row_idx,
            "posted_date": posted_date,
            "amount_minor": amount_minor,
            "raw_description": raw_desc,
            "normalized_description": norm_desc,
            "channel": channel,
            "merchant": merchant,
            "balance_after_minor": balance_after
        })

    # 6. Reconcile Balances
    recon_result = verify_balance_reconciliation(
        opening_balance_minor=opening_balance_minor,
        closing_balance_minor=closing_balance_minor,
        net_cash_flow_minor=running_sum,
        transactions=transactions
    )

    # 7. Coverage Period
    dates = [t["posted_date"] for t in transactions if t.get("posted_date")]
    if dates:
        p_start = min(dates)
        p_end = max(dates)
        try:
            d_start = datetime.strptime(p_start, "%Y-%m-%d").date()
            d_end = datetime.strptime(p_end, "%Y-%m-%d").date()
            coverage_days = (d_end - d_start).days + 1
        except Exception:
            coverage_days = len(dates)
    else:
        p_start, p_end, coverage_days = None, None, 0

    return {
        "bank_detected": bank_name,
        "masked_last4": masked_account,
        "account_number_detected": masked_account,
        "rows_detected": len(transactions),
        "headers": headers,
        "column_mapping": col_map,
        "mapping_confidence": mapping_confidence,
        "is_ambiguous": is_ambiguous,
        "ambiguity_reasons": ambiguity_reasons,
        "opening_balance_minor": opening_balance_minor,
        "closing_balance_minor": closing_balance_minor,
        "net_cash_flow_minor": running_sum,
        "reconciliation_status": recon_result.get("reconciliation_status", "NOT_CHECKED"),
        "reconciliation_discrepancy_minor": recon_result.get("reconciliation_delta_minor", 0),
        "running_balance_status": recon_result.get("running_balance_status", "NOT_CHECKED"),
        "running_balance_breaks": recon_result.get("running_balance_breaks", []),
        "coverage_days": coverage_days,
        "period_start": p_start,
        "period_end": p_end,
        "sample_rows": transactions[:10],
        "transactions": transactions,
        "warnings": warnings,
        "errors": errors
    }

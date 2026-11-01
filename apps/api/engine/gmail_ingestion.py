"""
Gmail 24-Hour Ingestion Engine for Financial Decision Lab (FDL).
Queries the Gmail REST API for bank transaction notifications received in the trailing 24 hours,
parses alert bodies with EmailAlertParser, links transactions to user accounts,
and feeds them through the deterministic FDL post-import pipeline.
"""

import os
import re
import math
import base64
import hashlib
import email.utils
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from concurrent.futures import ThreadPoolExecutor
import httpx
from sqlalchemy.orm import Session

from db.models import User, Account, SourceFile, OAuthAccount, EmailSyncAudit, EgressLog
from parsers.email_alert_parser import EmailAlertParser, IST
from engine.google_oauth import get_valid_access_token, _log_egress
from routers.imports import _run_post_import_pipeline

def _decode_b64url(data_str: str) -> str:
    """Decodes URL-safe base64 string from Gmail API payloads."""
    try:
        rem = len(data_str) % 4
        if rem > 0:
            data_str += "=" * (4 - rem)
        return base64.urlsafe_b64decode(data_str).decode("utf-8", errors="replace")
    except Exception:
        return ""

def _strip_html_tags(html: str) -> str:
    """Strips HTML tags to yield readable plain text."""
    clean = re.sub(r"<style.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r"<script.*?</script>", "", clean, flags=re.DOTALL | re.IGNORECASE)
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = re.sub(r"&nbsp;", " ", clean)
    clean = re.sub(r"&amp;", "&", clean)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()

def _extract_body_text_from_payload(payload: Dict[str, Any]) -> str:
    """Extracts plain text or converted HTML body from Gmail message payload."""
    body_text = ""
    mime_type = payload.get("mimeType", "")
    parts = payload.get("parts", [])

    if "body" in payload and "data" in payload["body"]:
        decoded = _decode_b64url(payload["body"]["data"])
        if "html" in mime_type.lower():
            return _strip_html_tags(decoded)
        return decoded

    # Recursively traverse parts
    for part in parts:
        p_mime = part.get("mimeType", "").lower()
        if "text/plain" in p_mime and "body" in part and "data" in part["body"]:
            return _decode_b64url(part["body"]["data"])
        elif "text/html" in p_mime and "body" in part and "data" in part["body"]:
            body_text = _strip_html_tags(_decode_b64url(part["body"]["data"]))
        elif "parts" in part:
            nested = _extract_body_text_from_payload(part)
            if nested:
                return nested

    return body_text

def run_gmail_24h_sync(
    user: User,
    db: Session,
    hours: int = 24,
    custom_query: Optional[str] = None
) -> Dict[str, Any]:
    """
    Scans Gmail for bank notification messages strictly within the trailing `hours` (default 24h),
    extracts transaction details with timestamps, and inserts them into the FDL engine.
    Optimized for high performance with batch audit lookups and concurrent parallel message fetching.
    """
    access_token = get_valid_access_token(user.id, db)
    if not access_token:
        raise ValueError("Google account not connected or authorization expired. Please connect via OAuth.")

    # 1. Compute strict timestamp cutoff (trailing 24 hours by default)
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    cutoff_epoch = int(cutoff_time.timestamp())
    days_span = max(1, math.ceil(hours / 24))

    # Strict 24-hour bounding filter for Gmail search index:
    # "newer_than:1d after:{cutoff_epoch} (from:... OR subject:...)"
    # Guarantees Google never scans or returns older messages outside the 24-hour window.
    base_filter = (
        f"newer_than:{days_span}d after:{cutoff_epoch} "
        "(from:(alerts@hdfcbank.bank.in OR alerts@hdfcbank.net OR sbi.co.in OR icicibank.com OR axisbank.com OR kotak.com OR paytm OR phonepe OR cred) "
        "OR subject:(debited OR credited OR spent OR 'UPI txn' OR transaction OR alert))"
    )
    query_str = custom_query or base_filter

    messages_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={query_str}&maxResults=100"
    headers = {"Authorization": f"Bearer {access_token}"}

    _log_egress(db, user.id, "Query Gmail 24h Messages", messages_url, {"hours": hours, "query": query_str})

    resp = httpx.get(messages_url, headers=headers, timeout=20.0)
    if resp.status_code != 200:
        raise RuntimeError(f"Gmail API query failed ({resp.status_code}): {resp.text}")

    data = resp.json()
    messages_list = data.get("messages", [])

    emails_scanned = len(messages_list)
    alerts_parsed = 0
    txns_added = 0
    duplicates_skipped = 0

    # 2. Batch Audit Lookup: O(1) in-memory check to eliminate N+1 DB queries
    all_msg_ids = [m["id"] for m in messages_list if "id" in m]
    existing_audits: Dict[str, str] = {}
    if all_msg_ids:
        rows = db.query(EmailSyncAudit.google_message_id, EmailSyncAudit.status).filter(
            EmailSyncAudit.user_id == user.id,
            EmailSyncAudit.google_message_id.in_(all_msg_ids)
        ).all()
        for r in rows:
            existing_audits[r[0]] = r[1]

    ids_to_fetch: List[str] = []
    for msg_meta in messages_list:
        msg_id = msg_meta.get("id")
        if not msg_id:
            continue
        if msg_id in existing_audits and existing_audits[msg_id] in ("parsed", "skipped_non_financial"):
            duplicates_skipped += 1
            continue
        ids_to_fetch.append(msg_id)

    # 3. Concurrent Parallel Fetching: Fetch message payloads using worker threads
    fetched_messages: Dict[str, Dict[str, Any]] = {}
    if ids_to_fetch:
        def _fetch_single_msg(m_id: str) -> Tuple[str, Optional[Dict[str, Any]]]:
            detail_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{m_id}?format=full"
            try:
                # Direct httpx.get ensures mock compatibility with unit test suites
                msg_resp = httpx.get(detail_url, headers=headers, timeout=15.0)
                if msg_resp.status_code == 200:
                    return m_id, msg_resp.json()
            except Exception:
                pass
            return m_id, None

        max_workers = min(8, len(ids_to_fetch))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for m_id, m_payload in executor.map(_fetch_single_msg, ids_to_fetch):
                if m_payload:
                    fetched_messages[m_id] = m_payload

        _log_egress(db, user.id, "Fetch Gmail Message Details (Concurrent)", f"Fetched {len(fetched_messages)} messages", {"count": len(fetched_messages)})

    # Group extracted transactions by account_last4
    txns_by_account: Dict[str, List[Dict[str, Any]]] = {}
    audits_to_add: List[EmailSyncAudit] = []

    for msg_id in ids_to_fetch:
        msg_json = fetched_messages.get(msg_id)
        if not msg_json:
            continue

        payload = msg_json.get("payload", {})
        headers_list = payload.get("headers", [])

        subject = ""
        sender = ""
        date_header = ""
        for h in headers_list:
            name = h.get("name", "").lower()
            if name == "subject":
                subject = h.get("value", "")
            elif name == "from":
                sender = h.get("value", "")
            elif name == "date":
                date_header = h.get("value", "")

        # 4. Strict 24-Hour Engine-Side Guard & Timestamp Extraction
        email_dt: Optional[datetime] = None
        if date_header:
            try:
                email_dt = email.utils.parsedate_to_datetime(date_header)
            except Exception:
                email_dt = None

        if not email_dt and msg_json.get("internalDate"):
            try:
                epoch_ms = int(msg_json["internalDate"])
                email_dt = datetime.fromtimestamp(epoch_ms / 1000.0, tz=timezone.utc)
            except Exception:
                pass

        # Validate that message falls strictly within the trailing 24 hours
        if email_dt:
            dt_utc = email_dt.astimezone(timezone.utc) if email_dt.tzinfo else email_dt.replace(tzinfo=timezone.utc)
            if dt_utc < cutoff_time:
                # Beyond the 24-hour cutoff, drop immediately
                continue

        body_text = _extract_body_text_from_payload(payload)

        # Parse alert with timestamp
        parsed_alert = EmailAlertParser.parse_alert(
            subject=subject,
            sender=sender,
            body=body_text,
            email_datetime=email_dt
        )

        if not parsed_alert:
            audits_to_add.append(EmailSyncAudit(
                user_id=user.id,
                google_message_id=msg_id,
                sender=sender[:255] if sender else None,
                subject=subject[:255] if subject else None,
                status="skipped_non_financial",
                transactions_extracted=0
            ))
            continue

        alerts_parsed += 1
        last4 = parsed_alert["account_last4"]
        if last4 not in txns_by_account:
            txns_by_account[last4] = []

        parsed_alert["_msg_id"] = msg_id
        parsed_alert["_subject"] = subject
        parsed_alert["_sender"] = sender
        txns_by_account[last4].append(parsed_alert)

    # 5. Ingest transactions per account through FDL pipeline
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for last4, alert_list in txns_by_account.items():
        sample_alert = alert_list[0]
        bank_name = sample_alert["bank"]

        # Find or create account
        account = db.query(Account).filter_by(user_id=user.id, masked_last4=last4).first()
        if not account:
            account = Account(
                user_id=user.id,
                nickname=f"{bank_name} ••{last4}",
                bank=bank_name,
                type="savings",
                masked_last4=last4,
                opening_balance_minor=0,
                currency="INR",
                is_primary=False,
                status="active"
            )
            db.add(account)
            db.commit()
            db.refresh(account)

        # Create or fetch SourceFile for tracking
        file_hash = hashlib.sha256(f"gmail_sync_{today_str}_{last4}".encode("utf-8")).hexdigest()
        source_file = db.query(SourceFile).filter_by(account_id=account.id, sha256=file_hash).first()
        if not source_file:
            source_file = SourceFile(
                account_id=account.id,
                filename=f"gmail_alerts_{today_str}_{last4}.json",
                kind="email_alert",
                sha256=file_hash,
                period_start=today_str,
                period_end=today_str,
                reconciliation_status="unverified"
            )
            db.add(source_file)
            db.commit()
            db.refresh(source_file)

        # Prepare normalized transactions for post-import pipeline
        formatted_txns = []
        for idx, alert in enumerate(alert_list):
            formatted_txns.append({
                "source_row": idx + 1,
                "posted_date": alert["posted_date"],
                "value_date": alert["posted_date"],
                "amount_minor": alert["amount_minor"],
                "raw_description": alert["raw_description"],
                "normalized_description": alert["normalized_description"],
                "channel": alert["channel"],
                "merchant": alert["merchant"],
                "balance_after_minor": None,
                "fingerprint": alert["fingerprint"],
                "occurrence_index": 0
            })

        parsed_bundle = {
            "bank": bank_name,
            "account_number_masked": last4,
            "transactions": formatted_txns,
            "opening_balance_minor": None,
            "closing_balance_minor": None
        }

        # Run FDL pipeline (dedupe, categorize, internal transfers, recurring, anomalies)
        pipeline_result = _run_post_import_pipeline(
            db=db,
            current_user=user,
            account_id=account.id,
            source_file=source_file,
            parsed=parsed_bundle
        )

        inserted_count = pipeline_result.get("inserted_count", len(formatted_txns))
        txns_added += inserted_count

        # Record audits for parsed messages
        for alert in alert_list:
            audits_to_add.append(EmailSyncAudit(
                user_id=user.id,
                google_message_id=alert["_msg_id"],
                sender=alert["_sender"][:255] if alert.get("_sender") else None,
                subject=alert["_subject"][:255] if alert.get("_subject") else None,
                status="parsed",
                transactions_extracted=1
            ))

    # Commit all accumulated audits in a single batch
    if audits_to_add:
        db.add_all(audits_to_add)
        db.commit()

    # Update OAuthAccount last_synced_at
    oauth_acc = db.query(OAuthAccount).filter_by(user_id=user.id, provider="google").first()
    if oauth_acc:
        oauth_acc.last_synced_at = datetime.now(timezone.utc)
        db.commit()

    return {
        "status": "success",
        "window_hours": hours,
        "emails_scanned": emails_scanned,
        "alerts_parsed": alerts_parsed,
        "transactions_added": txns_added,
        "duplicates_skipped": duplicates_skipped,
        "synced_at": datetime.now(timezone.utc).isoformat()
    }

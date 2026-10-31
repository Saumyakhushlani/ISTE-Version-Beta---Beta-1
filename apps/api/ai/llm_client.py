"""
Multi-Provider LLM Client for Financial Decision Lab (FDL).
Supports:
  1. Groq Cloud (ultra-fast inference via llama-3.3-70b-versatile or llama-3.1-8b-instant)
  2. Ollama Local-First (zero-egress, http://localhost:11434)
  3. Gemini API (if GEMINI_API_KEY is provided)
  4. Deterministic template fallback
Audited strictly by the Number-Verification Guard.
"""

import os
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

from ai.guard import verify_narrative_numbers, verify_liquidity_numbers
from middleware.egress import record_egress

# Attempt loading .env.local / .env
for candidate in [
    Path(".env.local"),
    Path(".env"),
    Path(__file__).resolve().parent.parent / ".env.local",
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent.parent / ".env.local",
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
]:
    if candidate.exists():
        load_dotenv(candidate, override=False)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def build_prompt_from_decision(decision: Dict[str, Any]) -> str:
    """
    Constructs a prompt containing the structured decision facts.
    """
    verdict = decision.get("verdict", {})
    headroom = decision.get("headroom", {})
    buffer = decision.get("buffer", {})
    lowest = decision.get("lowest_balance", {})

    prompt = (
        f"You are a personal financial decision assistant. Explain this affordability verdict to the user in 2-3 friendly, reassuring sentences.\n\n"
        f"Facts:\n"
        f"- Verdict: {verdict.get('code')}\n"
        f"- Median Headroom: ₹{headroom.get('p50_minor', 0) // 100:,}\n"
        f"- Conservative (P10) Headroom: ₹{headroom.get('p10_minor', 0) // 100:,}\n"
        f"- Required Safety Buffer: ₹{buffer.get('value_minor', 0) // 100:,} ({buffer.get('reason')})\n"
        f"- Lowest Projected Balance: ₹{lowest.get('p50_minor', 0) // 100:,} on {lowest.get('date')}\n"
        f"- Breach Probability: {int(round(verdict.get('breach_probability', 0) * 100))}%\n\n"
        f"CRITICAL RULE: Do NOT calculate or invent any new numbers. Cite ONLY the numbers listed above.\n"
    )
    return prompt


def build_prompt_from_liquidity_plan(plan: Dict[str, Any]) -> str:
    """
    Constructs a prompt for multi-bank fund sourcing and liquidity allocation.
    """
    feasible = plan.get("feasible", False)
    target_paise = plan.get("target_amount_paise", 0)
    target_rs = target_paise // 100
    combined_paise = plan.get("combined_liquid_paise", 0)
    combined_rs = combined_paise // 100
    safe_surplus_paise = plan.get("total_safe_surplus_paise", 0)
    safe_surplus_rs = safe_surplus_paise // 100
    allocation = plan.get("allocation", [])
    transfers = plan.get("transfers_plan", [])
    accounts = plan.get("accounts_surplus_breakdown", [])

    acct_lines = []
    for a in accounts:
        bal_rs = a.get("current_balance_paise", 0) // 100
        bills_rs = a.get("upcoming_commitments_paise", 0) // 100
        buf_rs = a.get("safety_buffer_paise", 0) // 100
        surplus_rs = a.get("available_surplus_paise", 0) // 100
        acct_lines.append(
            f"- {a.get('bank')} (ending in {a.get('masked_last4')}): Balance ₹{bal_rs:,}, "
            f"reserved bills ₹{bills_rs:,}, safety buffer ₹{buf_rs:,}, safe idle surplus ₹{surplus_rs:,}"
        )

    alloc_lines = [f"- {al.get('bank')}: ₹{al.get('amount_paise', 0) // 100:,}" for al in allocation]
    transfer_lines = [
        f"- Transfer ₹{t.get('transfer_amount_paise', 0) // 100:,} from {t.get('from_bank')} to {t.get('to_bank')}"
        for t in transfers
    ]

    prompt = (
        f"You are a friendly, expert personal finance advisor. Explain this multi-bank fund sourcing advice to the user in 2-3 clear, reassuring, and conversational sentences.\n\n"
        f"Facts:\n"
        f"- Feasible: {feasible}\n"
        f"- Target Deployment: ₹{target_rs:,}\n"
        f"- Total Combined Liquid Balance: ₹{combined_rs:,}\n"
        f"- Total Safe Idle Surplus (after bills and ₹5,000 floor reserve): ₹{safe_surplus_rs:,}\n"
        f"Account Reserves Breakdown:\n" + ("\n".join(acct_lines) if acct_lines else "- None") + "\n"
        f"Sourcing Allocation:\n" + ("\n".join(alloc_lines) if alloc_lines else "- None") + "\n"
        f"Required Cross-Account Transfers:\n" + ("\n".join(transfer_lines) if transfer_lines else "- No transfers needed") + "\n\n"
        f"CRITICAL RULE: Do NOT calculate or invent any new numbers or account details. Cite ONLY the figures and banks listed above.\n"
    )
    return prompt


def query_groq_api(prompt: str) -> Optional[str]:
    """
    Queries Groq endpoint with fast JSON/text completion.
    """
    key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
    if not key or not key.strip():
        return None

    model = os.getenv("GROQ_MODEL") or GROQ_MODEL
    url = "https://api.groq.com/openai/v1/chat/completions"
    req_body = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a personal finance assistant. Adhere strictly to the numbers provided. Do not invent any figures."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 300
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=req_body,
        headers={
            "Authorization": f"Bearer {key.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "FinancialDecisionLab/1.0"
        },
        method="POST"
    )

    try:
        try:
            record_egress(purpose="groq_cloud_narration", destination="api.groq.com", payload={"model": model}, mode="cloud")
        except Exception:
            pass

        with urllib.request.urlopen(req, timeout=6) as response:
            if response.status == 200:
                res_json = json.loads(response.read().decode("utf-8"))
                choices = res_json.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
    except Exception:
        return None

    return None


def query_ollama(prompt: str) -> Optional[str]:
    """
    Queries local Ollama endpoint (zero cloud egress).
    """
    url = f"{OLLAMA_HOST}/api/generate"
    req_body = json.dumps({
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2}
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=req_body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        record_egress(purpose="ollama_local_narration", destination="localhost", payload={"model": OLLAMA_MODEL}, mode="local")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                res_json = json.loads(response.read().decode("utf-8"))
                return res_json.get("response", "").strip()
    except Exception:
        return None

    return None


def query_gemini_api(prompt: str) -> Optional[str]:
    """
    Queries Gemini REST endpoint if GEMINI_API_KEY is configured.
    """
    key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not key:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
    req_body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 300}
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=req_body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        record_egress(purpose="gemini_cloud_narration", destination="generativelanguage.googleapis.com", payload={"model": "gemini-1.5-flash"}, mode="cloud")
        with urllib.request.urlopen(req, timeout=6) as response:
            if response.status == 200:
                res_json = json.loads(response.read().decode("utf-8"))
                candidates = res_json.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
    except Exception:
        return None

    return None


def generate_guarded_llm_narration(decision: Dict[str, Any]) -> Optional[str]:
    """
    Tries Groq first (if GROQ_API_KEY is present), then Ollama, then Gemini API.
    Audits the generated response through the Number-Verification Guard.
    Returns valid narrative, or None if rejected/unavailable.
    """
    prompt = build_prompt_from_decision(decision)
    ledger = decision.get("ledger", [])
    extra_meta = {
        "k": decision.get("buffer", {}).get("k"),
        "breach_probability": decision.get("verdict", {}).get("breach_probability"),
        "prob_negative_balance": decision.get("verdict", {}).get("prob_negative_balance"),
        "confidence_score": decision.get("verdict", {}).get("confidence", {}).get("score")
    }

    # 1. Try Groq first
    candidate = query_groq_api(prompt)
    if not candidate:
        # 2. Try local Ollama
        candidate = query_ollama(prompt)
    if not candidate:
        # 3. Try Gemini API
        candidate = query_gemini_api(prompt)

    if candidate:
        # Number-Verification Guard Audit
        if verify_narrative_numbers(candidate, ledger, extra_meta):
            return candidate
        else:
            return None

    return None


def generate_guarded_liquidity_llm_narration(plan: Dict[str, Any]) -> Optional[str]:
    """
    Tries Groq first to humanize the Multi-Bank Liquidity Advice,
    audited strictly through the Number-Verification Guard.
    """
    prompt = build_prompt_from_liquidity_plan(plan)

    candidate = query_groq_api(prompt)
    if not candidate:
        candidate = query_ollama(prompt)
    if not candidate:
        candidate = query_gemini_api(prompt)

    if candidate:
        if verify_liquidity_numbers(candidate, plan):
            return candidate
        else:
            return None

    return None

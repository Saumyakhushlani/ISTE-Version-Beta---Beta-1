"""
Multi-Provider LLM Client for Financial Decision Lab (FDL).
Supports:
  1. Ollama Local-First (zero-egress, http://localhost:11434)
  2. Gemini API (if GEMINI_API_KEY is provided)
  3. Deterministic template fallback
Audited strictly by the Number-Verification Guard.
"""

import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

from ai.guard import verify_narrative_numbers
from middleware.egress import record_egress

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
        # Record local audit event
        record_egress(purpose="ollama_local_narration", destination="localhost", payload={"model": OLLAMA_MODEL}, mode="local")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                res_json = json.loads(response.read().decode("utf-8"))
                return res_json.get("response", "").strip()
    except Exception:
        # Ollama not running or timeout; return None to trigger fallback
        return None

    return None

def query_gemini_api(prompt: str) -> Optional[str]:
    """
    Queries Gemini REST endpoint if GEMINI_API_KEY is configured.
    """
    if not GEMINI_API_KEY:
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
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
    Tries Ollama first, then Gemini API if configured.
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

    # 1. Try local Ollama first
    candidate = query_ollama(prompt)
    if not candidate:
        # 2. Try Gemini API
        candidate = query_gemini_api(prompt)

    if candidate:
        # 3. Number-Verification Guard Audit
        if verify_narrative_numbers(candidate, ledger, extra_meta):
            return candidate
        else:
            # Rejection due to unverified number
            return None

    return None

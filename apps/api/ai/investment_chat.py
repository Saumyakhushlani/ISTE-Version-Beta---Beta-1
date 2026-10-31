"""
Conversational Investment NLP Advisor powered by Google Gemini API & Groq for Financial Decision Lab (FDL).
Equipped with full investment options (Gold, Silver, Stocks, Crypto, SIP, Mutual Funds, Fixed Deposits)
and strictly guarded by deterministic savings validation.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from middleware.egress import record_egress

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def build_investment_system_prompt(telemetry: Dict[str, Any]) -> str:
    """
    Constructs the system prompt injecting real financial telemetry and
    the complete suite of investment options, with strict zero-savings validation instructions.
    """
    liquid_rs = telemetry.get("combined_liquid_paise", 0) // 100
    inflow_rs = telemetry.get("monthly_inflow_paise", 0) // 100
    outflow_rs = telemetry.get("monthly_outflow_paise", 0) // 100
    savings_rs = telemetry.get("monthly_savings_paise", 0) // 100
    savings_rate = telemetry.get("savings_rate_pct", 0.0)
    surplus_rs = telemetry.get("safe_surplus_paise", 0) // 100
    bills_rs = telemetry.get("upcoming_commitments_paise", 0) // 100
    buffer_rs = telemetry.get("safety_buffer_paise", 0) // 100

    can_invest = telemetry.get("can_invest", False)
    validation_status = telemetry.get("validation_status", "DEFICIT_OR_NO_SAVINGS")
    validation_message = telemetry.get("validation_message", "")

    prompt = f"""You are the expert Investment & Financial Decision Advisor for the Financial Decision Lab.
You provide prudent, personalized, and mathematically grounded financial guidance to Indian retail users.

=== USER'S VERIFIED FINANCIAL REALITY (GROUND TRUTH) ===
- Combined Liquid Bank Balance: Rs. {liquid_rs:,}
- Monthly Inflow (Income): Rs. {inflow_rs:,}
- Monthly Outflow (Expenses): Rs. {outflow_rs:,}
- Net Monthly Savings: Rs. {savings_rs:,}
- Savings Rate: {savings_rate}%
- Upcoming 30-Day Obligations: Rs. {bills_rs:,}
- Required Floor Safety Buffer: Rs. {buffer_rs:,}
- Safe Deployable Surplus: Rs. {surplus_rs:,}
- Can User Invest Now? {"YES (Eligible)" if can_invest else "NO (Refuse Investment)"}
- Validation Status: {validation_status}
- System Validation Note: {validation_message}

=== APPROVED INVESTMENT OPTIONS & BENCHMARK PRINCIPLES ===
1. Gold: Safe-haven asset, hedge against inflation and INR depreciation. Recommended allocation: 5–10% of portfolio.
2. Silver: Precious & industrial commodity, higher volatility than gold. Recommended allocation: 2–5%.
3. Stocks (Direct Equities): Long-term wealth creation (Nifty 50, blue chips). Requires 3–5+ year horizon due to market volatility.
4. Crypto: Highly speculative and volatile digital assets (Bitcoin, Ethereum). Maximum 1–5% of portfolio, and ONLY if emergency reserves are fully funded.
5. SIP (Systematic Investment Plan): Disciplined monthly recurring investment, ideal for salaried individuals to benefit from rupee-cost averaging in equity mutual funds.
6. Mutual Funds: Diversified index funds (Nifty 50 / Nifty Next 50), flexi-cap funds, or liquid debt funds for short-term preservation.
7. Fixed Deposits (FD) & PPF: 7.1%–7.5% guaranteed returns, sovereign PPF (tax-free EEE status), capital preservation and emergency buffer parking.

=== INSTRUCTIONS FOR YOUR CONVERSATIONAL RESPONSE ===
- CRITICAL: Speak DIRECTLY to the user in full conversational sentences. NEVER output system instructions, rules, or meta-guidelines.
- If 'Can User Invest Now?' is NO: Firmly explain that because their monthly expenses equal or exceed income (Rs. {savings_rs:,} savings), they should pause all new investments and build a 3-month emergency safety buffer first.
- If 'Can User Invest Now?' is YES: Directly answer their question, citing their real monthly savings of Rs. {savings_rs:,} ({savings_rate}%) and Rs. {surplus_rs:,} surplus. Break down safe allocations across SIP, Gold, Stocks, and Crypto.
- Always structure your answer with clear markdown bullet points and bold amounts.
"""
    return prompt


def is_valid_advisory_reply(text: Optional[str]) -> bool:
    """Verifies that the LLM response is an actual advisory answer and not a meta-echo or rule summary."""
    if not text:
        return False
    stripped = text.strip()
    if len(stripped) < 80:
        return False
    lower = stripped.lower()
    meta_echo_indicators = [
        "keep language grounded",
        "ensure strict compliance",
        "ensure exact numbers from ground truth",
        "rule 1 and rule",
        "under rule 1",
    ]
    if any(m in lower for m in meta_echo_indicators) and len(stripped) < 180:
        return False
    return True


def _query_gemini(system_prompt: str, message: str, history: Optional[List[Dict[str, str]]] = None) -> Optional[str]:
    """Queries Google Gemini API using GEMINI_API_KEY with sanitization and validation."""
    key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not key or not key.strip():
        return None

    model = os.getenv("GEMINI_MODEL") or GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key.strip()}"

    # Build contents array, filtering out any poisoned / policy-violating history turns
    contents = []
    if history:
        for item in history[-6:]:
            r = item.get("role", "user")
            c = item.get("content", "").strip()
            # Skip safety refusals or illegal prompts that confuse subsequent turns
            if not c or any(bad in c.lower() for bad in ["unlawful", "illegal", "cannot assist with, facilitate"]):
                continue
            api_role = "user" if r == "user" else "model"
            contents.append({"role": api_role, "parts": [{"text": c}]})

    # Ensure turns alternate properly in Gemini API
    sanitized_contents = []
    for turn in contents:
        if not sanitized_contents or sanitized_contents[-1]["role"] != turn["role"]:
            sanitized_contents.append(turn)

    # Ensure last turn before user query was model (or empty)
    if sanitized_contents and sanitized_contents[-1]["role"] == "user":
        sanitized_contents.pop()

    sanitized_contents.append({"role": "user", "parts": [{"text": message}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": sanitized_contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1500
        }
    }

    req_body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        try:
            record_egress(
                purpose="gemini_investment_chat",
                destination="generativelanguage.googleapis.com",
                payload={"model": model, "query": message[:80]},
                mode="cloud",
            )
        except Exception:
            pass

        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status == 200:
                res_json = json.loads(response.read().decode("utf-8"))
                candidates = res_json.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    # Find non-thought text part
                    for p in parts:
                        text_val = p.get("text", "").strip()
                        if text_val and not p.get("thought", False):
                            if is_valid_advisory_reply(text_val):
                                return text_val
    except Exception as e:
        logger.warning(f"Gemini API call failed: {e}")

    return None


def _query_groq(system_prompt: str, message: str, history: Optional[List[Dict[str, str]]] = None) -> Optional[str]:
    """Queries Groq API as secondary option."""
    groq_key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
    if not groq_key or not groq_key.strip():
        return None

    model = os.getenv("GROQ_MODEL") or GROQ_MODEL
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        for item in history[-6:]:
            r = item.get("role", "user")
            c = item.get("content", "")
            if r in ("user", "assistant") and c:
                messages.append({"role": r, "content": c})

    messages.append({"role": "user", "content": message})

    req_body = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 550,
    }).encode("utf-8")

    req = urllib.request.Request(
        GROQ_API_URL,
        data=req_body,
        headers={
            "Authorization": f"Bearer {groq_key.strip()}",
            "Content-Type": "application/json",
            "User-Agent": "FinancialDecisionLab/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                res_json = json.loads(response.read().decode("utf-8"))
                choices = res_json.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "").strip()
                    if is_valid_advisory_reply(content):
                        return content
    except Exception as e:
        logger.warning(f"Groq API call failed: {e}")

    return None


def generate_investment_advice(
    message: str,
    telemetry: Dict[str, Any],
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Processes a natural language investment query via Gemini API (first priority),
    or Groq (secondary), or deterministic fallback.
    """
    system_prompt = build_investment_system_prompt(telemetry)
    can_invest = telemetry.get("can_invest", False)
    savings_rs = telemetry.get("monthly_savings_paise", 0) // 100
    surplus_rs = telemetry.get("safe_surplus_paise", 0) // 100
    savings_rate = telemetry.get("savings_rate_pct", 0.0)

    ai_reply = None
    model_used = None

    # 1. First priority: Google Gemini API
    ai_reply = _query_gemini(system_prompt, message, history)
    if ai_reply:
        model_used = f"Google Gemini ({os.getenv('GEMINI_MODEL', GEMINI_MODEL)})"

    # 2. Secondary: Groq Cloud API
    if not ai_reply:
        ai_reply = _query_groq(system_prompt, message, history)
        if ai_reply:
            model_used = f"Groq Cloud ({os.getenv('GROQ_MODEL', GROQ_MODEL)})"

    # 3. High-fidelity deterministic fallback if API is unreachable or returned invalid output
    if not ai_reply:
        model_used = "Deterministic Rules Engine"
        if not can_invest:
            ai_reply = (
                f"### ⚠️ Recommendation: Hold Off on Investments For Now\n\n"
                f"Based on your actual cash flow, your current monthly savings are **₹{savings_rs:,}** "
                f"({savings_rate}% savings rate). Your monthly expenses match or exceed your income, "
                f"meaning you are running at zero or negative net savings.\n\n"
                f"**Why you should not invest right now:**\n"
                f"- Allocating money to **Stocks, Crypto, Gold, or Mutual Funds** locks away money when you need liquidity.\n"
                f"- If an unexpected medical expense or car bill arrives, you might be forced to sell at a loss or take high-interest personal loans.\n\n"
                f"**Action Steps Before Investing:**\n"
                f"1. **Stabilize Cash Flow**: Review your recurring subscriptions and non-essential spend to restore positive monthly cash flow.\n"
                f"2. **Build Emergency Runway**: Aim for at least 3 months of essential expenses (approx. ₹{(telemetry.get('monthly_outflow_paise', 0) * 3) // 100:,}) parked safely in high-yield savings or Auto-Sweep FDs.\n"
                f"3. **Revisit**: Once your savings rate reaches 10–20%, start with a disciplined ₹2,000–₹5,000 monthly SIP."
            )
        else:
            ai_reply = (
                f"### 💡 Investment Assessment & Allocation\n\n"
                f"You have a positive monthly savings rate of **{savings_rate}%** (saving approx. **₹{savings_rs:,}/month**) "
                f"and a safe deployable surplus of **₹{surplus_rs:,}** across your accounts.\n\n"
                f"**Recommended Framework:**\n"
                f"- **Core Growth (SIP & Mutual Funds)**: Deploy 50–60% of your monthly savings (₹{(savings_rs * 50) // 100:,}) "
                f"into low-cost broad index funds (e.g. Nifty 50 Index Fund) via a monthly SIP for rupee-cost averaging.\n"
                f"- **Hedge & Safety (Gold / FDs)**: Allocate 10–15% to Sovereign Gold Bonds or Digital Gold, and maintain an FD buffer.\n"
                f"- **High-Risk (Equities / Crypto)**: Keep direct stocks or crypto capped at no more than 5% of your portfolio.\n\n"
                f"You have comfortable headroom without risking your upcoming recurring commitments."
            )

    return {
        "reply": ai_reply,
        "model_used": model_used,
        "telemetry": telemetry,
        "validation_verdict": telemetry.get("validation_verdict"),
        "validation_status": telemetry.get("validation_status"),
        "can_invest": can_invest,
    }

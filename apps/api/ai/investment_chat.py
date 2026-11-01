"""
Conversational Investment NLP Advisor powered by Google Gemini API & Groq for Financial Decision Lab (FDL).
Equipped with full investment options (Gold, Silver, Stocks, Crypto, SIP, Mutual Funds, Fixed Deposits)
and strictly guarded by deterministic savings validation.
"""

import os
import re
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Tuple
from middleware.egress import record_egress

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def extract_investment_parameters(text: str) -> Tuple[Optional[int], str]:
    """
    Extracts the user's requested investment amount in minor paise and the target asset class.
    Handles Indian numerical formats (500k, 5 lakh, 5 lacs, 1.5 cr, ₹50,000, 50000).
    """
    lower = text.lower()

    # Detect asset class
    asset = "general"
    if any(w in lower for w in ["crypto", "bitcoin", "btc", "eth", "ethereum", "doge", "solana"]):
        asset = "crypto"
    elif any(w in lower for w in ["stock", "stocks", "share", "shares", "equity", "equities"]):
        asset = "stocks"
    elif any(w in lower for w in ["gold", "sgb", "digital gold"]):
        asset = "gold"
    elif "silver" in lower:
        asset = "silver"
    elif any(w in lower for w in ["sip", "systematic investment"]):
        asset = "sip"
    elif any(w in lower for w in ["mutual fund", "mutual funds", "mf", "index fund", "etf"]):
        asset = "mutual_funds"
    elif any(w in lower for w in ["fd", "fixed deposit", "ppf", "recurring deposit", "rd"]):
        asset = "fd"

    # 1. Crore
    m = re.search(r'(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b', lower)
    if m:
        return int(round(float(m.group(1)) * 10000000 * 100)), asset

    # 2. Lakh
    m = re.search(r'(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b', lower)
    if m:
        return int(round(float(m.group(1)) * 100000 * 100)), asset

    # 3. K / Thousand
    m = re.search(r'(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:k|thousand)\b', lower)
    if m:
        return int(round(float(m.group(1)) * 1000 * 100)), asset

    # 4. Standard numbers with ₹ or Rs or standalone comma-formatted (e.g. ₹50,000, 50,000, Rs 50000)
    m = re.search(r'(?:₹|rs\.?\s*)(\d+(?:,\d+)*(?:\.\d+)?)\b', lower)
    if m:
        clean_num = m.group(1).replace(',', '')
        return int(round(float(clean_num) * 100)), asset

    m = re.search(r'\b(\d{1,3}(?:,\d{2,3})+)\b', lower)
    if m:
        clean_num = m.group(1).replace(',', '')
        return int(clean_num) * 100, asset

    # 5. Standalone integer number >= 1000
    m = re.search(r'\b(\d{4,9})\b', lower)
    if m:
        return int(m.group(1)) * 100, asset

    return None, asset


def evaluate_investment_request(
    telemetry: Dict[str, Any],
    requested_amount_paise: Optional[int],
    asset_class: str
) -> Dict[str, Any]:
    """
    Deterministic rule engine that decides YES vs NO before the LLM generates anything.
    Prevents approving investments that exceed liquid funds, breach safety buffers,
    or violate concentration/speculative asset caps.
    """
    combined_liquid = telemetry.get("combined_liquid_paise", 0)
    monthly_inflow = telemetry.get("monthly_inflow_paise", 0)
    monthly_outflow = telemetry.get("monthly_outflow_paise", 0)
    monthly_savings = telemetry.get("monthly_savings_paise", 0)
    savings_rate_pct = telemetry.get("savings_rate_pct", 0.0)
    safe_surplus = telemetry.get("safe_surplus_paise", 0)
    safety_buffer = telemetry.get("safety_buffer_paise", 0)

    is_saving = monthly_savings > 0

    # Prudent asset-specific caps
    if asset_class == "crypto":
        max_asset_paise = max(500000, int(safe_surplus * 0.05))  # Max 5% in crypto or ₹5k
    elif asset_class == "stocks":
        max_asset_paise = int(safe_surplus * 0.30)  # Max 30% lump sum in direct stocks
    else:
        max_asset_paise = safe_surplus

    # Rule INV-R1: Zero / Negative Savings Gate
    if not is_saving or monthly_savings <= 0:
        return {
            "can_invest": False,
            "verdict_badge": "❌ NO — NOT RECOMMENDED",
            "verdict_code": "DEFICIT_OR_NO_SAVINGS",
            "requested_amount_paise": requested_amount_paise,
            "asset_class": asset_class,
            "deficit_paise": abs(monthly_savings),
            "max_safe_paise": 0,
            "reason": (
                f"Your monthly expenses (₹{monthly_outflow // 100:,}) equal or exceed your income "
                f"(₹{monthly_inflow // 100:,}), leaving a monthly deficit of ₹{abs(monthly_savings) // 100:,}. "
                f"You should NOT invest right now. Prioritize restoring positive cash flow and building a 3-month safety buffer."
            )
        }

    # If general inquiry (no specific amount requested)
    if requested_amount_paise is None or requested_amount_paise <= 0:
        if safe_surplus > 0:
            return {
                "can_invest": True,
                "verdict_badge": "✅ YES — ELIGIBLE TO INVEST",
                "verdict_code": "ELIGIBLE_GENERAL",
                "requested_amount_paise": None,
                "asset_class": asset_class,
                "deficit_paise": 0,
                "max_safe_paise": safe_surplus,
                "reason": (
                    f"You have a healthy savings rate of {savings_rate_pct}% (saving ₹{monthly_savings // 100:,}/month) "
                    f"and a safe deployable surplus of ₹{safe_surplus // 100:,} across your accounts."
                )
            }
        else:
            return {
                "can_invest": False,
                "verdict_badge": "❌ NO — SURPLUS FULLY COMMITTED",
                "verdict_code": "NO_SAFE_SURPLUS",
                "requested_amount_paise": None,
                "asset_class": asset_class,
                "deficit_paise": 0,
                "max_safe_paise": 0,
                "reason": (
                    f"Although you have positive monthly cash flow, your current liquid balance is fully committed "
                    f"to upcoming bills and your required safety buffer of ₹{safety_buffer // 100:,}."
                )
            }

    # Rule INV-R2: Amount exceeds absolute liquid funds (Deterministic Hard No)
    if requested_amount_paise > combined_liquid:
        shortfall = requested_amount_paise - combined_liquid
        return {
            "can_invest": False,
            "verdict_badge": "❌ NO — EXCEEDS LIQUID FUNDS",
            "verdict_code": "EXCEEDS_LIQUID_FUNDS",
            "requested_amount_paise": requested_amount_paise,
            "asset_class": asset_class,
            "deficit_paise": shortfall,
            "max_safe_paise": safe_surplus,
            "reason": (
                f"You asked to invest ₹{requested_amount_paise // 100:,}, but your total liquid balance across all "
                f"accounts is only ₹{combined_liquid // 100:,}, leaving a shortfall of ₹{shortfall // 100:,}. "
                f"You cannot invest money you do not have in the bank."
            )
        }

    # Rule INV-R3: Amount exceeds safe deployable surplus (breaches emergency buffer or bills)
    if requested_amount_paise > safe_surplus:
        buffer_breach = requested_amount_paise - safe_surplus
        return {
            "can_invest": False,
            "verdict_badge": "❌ NO — BREACHES SAFETY BUFFER",
            "verdict_code": "BREACHES_SAFETY_BUFFER",
            "requested_amount_paise": requested_amount_paise,
            "asset_class": asset_class,
            "deficit_paise": buffer_breach,
            "max_safe_paise": safe_surplus,
            "reason": (
                f"While you have ₹{combined_liquid // 100:,} in the bank, ₹{(combined_liquid - safe_surplus) // 100:,} is "
                f"strictly committed to upcoming bills and your mandatory safety buffer. Your maximum deployable "
                f"surplus is ₹{safe_surplus // 100:,}. Investing ₹{requested_amount_paise // 100:,} breaches your "
                f"emergency buffer by ₹{buffer_breach // 100:,} and exposes you to cash-flow risk."
            )
        }

    # Rule INV-R4: Speculative Crypto Cap (> 5% of surplus)
    if asset_class == "crypto" and requested_amount_paise > max_asset_paise:
        return {
            "can_invest": False,
            "verdict_badge": "⚠️ NO — SPECULATIVE RISK LIMIT EXCEEDED",
            "verdict_code": "CRYPTO_LIMIT_EXCEEDED",
            "requested_amount_paise": requested_amount_paise,
            "asset_class": asset_class,
            "deficit_paise": requested_amount_paise - max_asset_paise,
            "max_safe_paise": max_asset_paise,
            "reason": (
                f"Prudent financial rules cap highly speculative crypto assets at a strict maximum of 5% of your "
                f"deployable surplus (₹{max_asset_paise // 100:,}). Investing ₹{requested_amount_paise // 100:,} risks "
                f"unacceptable capital destruction."
            )
        }

    # Rule INV-R5: Lump-Sum Stock Risk (> 30% of surplus in direct equities)
    if asset_class == "stocks" and requested_amount_paise > max_asset_paise:
        recommended_sip = min(int(monthly_savings * 0.50), requested_amount_paise // 12)
        return {
            "can_invest": False,
            "verdict_badge": "⚠️ NO TO LUMP-SUM — RECOMMEND SIP INSTEAD",
            "verdict_code": "LUMP_SUM_STOCK_RISK",
            "requested_amount_paise": requested_amount_paise,
            "asset_class": asset_class,
            "deficit_paise": requested_amount_paise - max_asset_paise,
            "max_safe_paise": max_asset_paise,
            "reason": (
                f"Putting ₹{requested_amount_paise // 100:,} as a single lump sum into direct stocks exceeds 30% "
                f"of your safe surplus (₹{max_asset_paise // 100:,}). We advise against lump-sum timing risk. "
                f"Instead, spread this across a disciplined monthly SIP of ₹{recommended_sip // 100:,}/month in broad index funds."
            )
        }

    # Rule INV-R6: Approved Safe Investment (YES)
    remaining_surplus = safe_surplus - requested_amount_paise
    return {
        "can_invest": True,
        "verdict_badge": "✅ YES — SAFE TO INVEST",
        "verdict_code": "ELIGIBLE_AND_SAFE",
        "requested_amount_paise": requested_amount_paise,
        "asset_class": asset_class,
        "deficit_paise": 0,
        "max_safe_paise": safe_surplus,
        "reason": (
            f"You can comfortably invest ₹{requested_amount_paise // 100:,} in {asset_class.upper()}. "
            f"Your deployable surplus is ₹{safe_surplus // 100:,}, which leaves ₹{remaining_surplus // 100:,} "
            f"intact while fully protecting your emergency runway."
        )
    }


def build_investment_system_prompt(telemetry: Dict[str, Any], eval_res: Dict[str, Any]) -> str:
    """
    Constructs the system prompt injecting real financial telemetry,
    the deterministic verdict, and strict refusal rules.
    """
    liquid_rs = telemetry.get("combined_liquid_paise", 0) // 100
    inflow_rs = telemetry.get("monthly_inflow_paise", 0) // 100
    outflow_rs = telemetry.get("monthly_outflow_paise", 0) // 100
    savings_rs = telemetry.get("monthly_savings_paise", 0) // 100
    savings_rate = telemetry.get("savings_rate_pct", 0.0)
    surplus_rs = telemetry.get("safe_surplus_paise", 0) // 100
    bills_rs = telemetry.get("upcoming_commitments_paise", 0) // 100
    buffer_rs = telemetry.get("safety_buffer_paise", 0) // 100

    verdict_badge = eval_res["verdict_badge"]
    verdict_code = eval_res["verdict_code"]
    reason = eval_res["reason"]
    can_invest_now = eval_res["can_invest"]
    max_safe_rs = eval_res["max_safe_paise"] // 100
    req_amount_paise = eval_res.get("requested_amount_paise")
    req_amount_str = f"Rs. {req_amount_paise // 100:,}" if req_amount_paise else "General inquiry"
    asset_str = eval_res.get("asset_class", "general").upper()

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

=== DETERMINISTIC SYSTEM VERDICT (NON-NEGOTIABLE GROUND TRUTH) ===
- Requested Amount: {req_amount_str}
- Asset Class: {asset_str}
- Non-Negotiable Verdict: {verdict_badge} ({verdict_code})
- Can User Proceed With This Request? {'YES' if can_invest_now else 'NO - REFUSE'}
- Ground-Truth Rule Explanation: {reason}
- Maximum Safe Deployable Amount: Rs. {max_safe_rs:,}

=== APPROVED INVESTMENT OPTIONS & BENCHMARK PRINCIPLES ===
1. Gold: Safe-haven asset, hedge against inflation. Recommended allocation: 5–10% of portfolio.
2. Silver: Precious & industrial commodity, higher volatility. Recommended allocation: 2–5%.
3. Stocks: Long-term wealth creation (Nifty 50, blue chips). Requires 3–5+ year horizon.
4. Crypto: Speculative asset (Bitcoin, Ethereum). Maximum 1–5% of portfolio, ONLY if emergency buffer is funded.
5. SIP (Systematic Investment Plan): Disciplined monthly recurring investment, ideal for salaried individuals.
6. Mutual Funds: Diversified index funds (Nifty 50 / Nifty Next 50), flexi-cap funds, or liquid debt funds.
7. Fixed Deposits (FD) & PPF: 7.1%–7.5% guaranteed returns, capital preservation.

=== MANDATORY INSTRUCTIONS FOR YOUR CONVERSATIONAL RESPONSE ===
- CRITICAL 1: You MUST start your response immediately with the exact Verdict Badge: "{verdict_badge}".
- CRITICAL 2: If Verdict is ❌ NO or ⚠️ NO: You are STRICTLY FORBIDDEN from saying yes, approving this request, or encouraging the user to proceed. You MUST clearly state the exact mathematical reason: "{reason}". Then offer a constructive alternative (e.g. tell them the maximum safe amount they can deploy is Rs. {max_safe_rs:,}, or advise a monthly SIP).
- CRITICAL 3: If Verdict is ✅ YES: Clearly explain why they are safe to invest, referencing their Rs. {surplus_rs:,} surplus and Rs. {savings_rs:,} monthly savings, and recommend safe allocation.
- Speak DIRECTLY to the user in full conversational sentences. NEVER output meta-rules or system instructions.
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
    Processes a natural language investment query via deterministic rule evaluation,
    strictly grounded with Gemini API and deterministic fallback.
    Prevents false approvals where requested investments exceed liquid balances or surplus.
    """
    # 1. Deterministically parse query parameters (amount & asset class)
    requested_amount_paise, asset_class = extract_investment_parameters(message)

    # 2. Run deterministic YES / NO evaluation rules
    eval_res = evaluate_investment_request(
        telemetry=telemetry,
        requested_amount_paise=requested_amount_paise,
        asset_class=asset_class
    )

    system_prompt = build_investment_system_prompt(telemetry, eval_res)
    can_invest_this_request = eval_res["can_invest"]
    verdict_badge = eval_res["verdict_badge"]
    verdict_code = eval_res["verdict_code"]
    reason = eval_res["reason"]
    max_safe_rs = eval_res["max_safe_paise"] // 100

    ai_reply = None
    model_used = None

    # 3. Query Google Gemini API
    ai_reply = _query_gemini(system_prompt, message, history)
    if ai_reply:
        # Enforce that if the deterministic rule engine said NO, the output MUST NOT claim YES
        if not can_invest_this_request and "✅" in ai_reply and "❌" not in ai_reply:
            ai_reply = None
        else:
            model_used = f"Google Gemini ({os.getenv('GEMINI_MODEL', GEMINI_MODEL)})"

    # 4. Secondary: Groq Cloud API
    if not ai_reply:
        ai_reply = _query_groq(system_prompt, message, history)
        if ai_reply:
            if not can_invest_this_request and "✅" in ai_reply and "❌" not in ai_reply:
                ai_reply = None
            else:
                model_used = f"Groq Cloud ({os.getenv('GROQ_MODEL', GROQ_MODEL)})"

    # 5. Deterministic fallback if API is unreachable or returned invalid output
    if not ai_reply:
        model_used = "Deterministic Rules Engine"
        if not can_invest_this_request:
            ai_reply = (
                f"### {verdict_badge}\n\n"
                f"{reason}\n\n"
                f"**Key Financial Reality:**\n"
                f"- **Verified Liquid Funds**: ₹{telemetry.get('combined_liquid_paise', 0) // 100:,}\n"
                f"- **Safe Deployable Surplus**: ₹{telemetry.get('safe_surplus_paise', 0) // 100:,}\n"
                f"- **Monthly Net Savings**: ₹{telemetry.get('monthly_savings_paise', 0) // 100:,}/month ({telemetry.get('savings_rate_pct', 0.0)}%)\n\n"
                f"**Prudent Action Steps:**\n"
                f"1. **Never Deplete Emergency Runway**: Keep mandatory floor buffers intact across your savings accounts before deploying capital.\n"
                f"2. **Safe Investment Ceiling**: Your maximum safe one-time deployable capacity right now is **₹{max_safe_rs:,}**.\n"
                f"3. **Disciplined Compounding**: For long-term equity growth, consider setting up a monthly SIP of ₹2,000–₹5,000 instead of high-risk lump-sum buys."
            )
        else:
            ai_reply = (
                f"### {verdict_badge}\n\n"
                f"{reason}\n\n"
                f"**Allocation & Execution Guidance:**\n"
                f"- **Asset Class**: {asset_class.upper()}\n"
                f"- **Remaining Surplus After Allocation**: ₹{(eval_res['max_safe_paise'] - (requested_amount_paise or 0)) // 100:,}\n"
                f"- **Safety Buffer Preservation**: Fully protected across your savings accounts.\n\n"
                f"**Recommended Split:**\n"
                f"- Deploy into broad index funds (Nifty 50) or flexi-cap mutual funds for a 3–5+ year horizon.\n"
                f"- Keep 5–10% in Gold as a liquid inflation hedge."
            )

    return {
        "reply": ai_reply,
        "model_used": model_used,
        "telemetry": telemetry,
        "validation_verdict": verdict_code,
        "validation_status": verdict_code,
        "can_invest": can_invest_this_request,
        "evaluation": eval_res,
    }

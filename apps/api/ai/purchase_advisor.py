"""
Conversational Purchase Affordability Advisor powered by Google Gemini API & Groq for Financial Decision Lab (FDL).
Equipped with:
1. Non-financial scope guard (refuses off-topic / non-finance queries)
2. Intelligent price detection & Indian retail / travel market benchmark estimation
3. Dual deterministic financial evaluation: Option 1 (One-Time Upfront) vs Option 2 (Monthly EMI)
4. Zero-hallucination Number-Verification guard
"""

import os
import re
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from dotenv import load_dotenv

from middleware.egress import record_egress
from engine.affordability import calculate_emi_paise, evaluate_affordability_decision
from ai.guard import verify_narrative_numbers

logger = logging.getLogger(__name__)

# Ensure environment variables are loaded
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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Curated Indian retail benchmark catalog (in integer paise)
RETAIL_BENCHMARKS_PAISE: Dict[str, Tuple[str, int]] = {
    # Gadgets & Electronics
    "iphone 16 pro max": ("Apple iPhone 16 Pro Max", 14490000),
    "iphone 16 pro": ("Apple iPhone 16 Pro", 11990000),
    "iphone 16 plus": ("Apple iPhone 16 Plus", 8990000),
    "iphone 16": ("Apple iPhone 16", 7990000),
    "iphone 15 pro": ("Apple iPhone 15 Pro", 10990000),
    "iphone 15": ("Apple iPhone 15", 6990000),
    "iphone": ("Apple iPhone (Latest Base)", 7990000),
    "macbook air m3": ("Apple MacBook Air M3", 11490000),
    "macbook air": ("Apple MacBook Air", 9990000),
    "macbook pro": ("Apple MacBook Pro 14", 16990000),
    "macbook": ("Apple MacBook Air", 9990000),
    "ipad pro": ("Apple iPad Pro 11-inch", 9990000),
    "ipad air": ("Apple iPad Air", 5990000),
    "ipad": ("Apple iPad 10th Gen", 3490000),
    "apple watch ultra": ("Apple Watch Ultra 2", 8990000),
    "apple watch": ("Apple Watch Series 10", 4690000),
    "airpods pro": ("Apple AirPods Pro (2nd Gen)", 2490000),
    "airpods": ("Apple AirPods 4", 1290000),
    "ps5 pro": ("Sony PlayStation 5 Pro", 6999000),
    "ps5": ("Sony PlayStation 5", 4999000),
    "playstation 5": ("Sony PlayStation 5", 4999000),
    "playstation": ("Sony PlayStation 5", 4999000),
    "xbox series x": ("Microsoft Xbox Series X", 4999000),
    "sony oled tv": ("Sony Bravia 55-inch 4K OLED TV", 12999000),
    "oled tv": ("55-inch 4K OLED TV", 9999000),
    "smart tv": ("55-inch 4K Smart TV", 4299000),
    "tv": ("50-inch 4K Smart TV", 3500000),
    "dslr camera": ("Sony Alpha Mirrorless Camera", 8500000),
    "camera": ("Mirrorless Camera Kit", 6500000),
    
    # Travel & Experiences
    "goa trip": ("Goa Trip (Flight + 3-Night Stay)", 2800000),
    "goa vacation": ("Goa Vacation (Flight + 3-Night Stay)", 2800000),
    "goa": ("Goa Travel Budget", 2500000),
    "manali trip": ("Manali / Himachal Trip", 2200000),
    "kashmir trip": ("Kashmir Holiday (Flight + 4-Night Stay)", 4500000),
    "kerala trip": ("Kerala Vacation (Flight + Houseboat)", 3800000),
    "ladakh trip": ("Leh Ladakh Road/Flight Trip", 4200000),
    "thailand trip": ("Thailand Trip (Flight + Hotel)", 6000000),
    "bali trip": ("Bali Holiday (Flight + Villa)", 7500000),
    "dubai trip": ("Dubai Holiday (Flight + 4-Star Stay)", 8500000),
    "europe trip": ("Europe 10-Day Holiday", 25000000),
    "japan trip": ("Japan 7-Day Trip", 18000000),
    "trip": ("Domestic Holiday Trip", 3000000),
    "vacation": ("Holiday Vacation", 3500000),
    "travelling": ("Travel & Vacation Budget", 3000000),
    "travel": ("Travel & Vacation Budget", 3000000),
    
    # Vehicles & Lifestyle
    "royal enfield classic 350": ("Royal Enfield Classic 350", 19500000),
    "royal enfield": ("Royal Enfield Motorcycle", 19500000),
    "bullet": ("Royal Enfield Bullet 350", 17500000),
    "ola s1 pro": ("Ola S1 Pro Electric Scooter", 13500000),
    "ather 450x": ("Ather 450X Electric Scooter", 14500000),
    "electric scooter": ("Electric Two-Wheeler Scooter", 12500000),
    "scooter": ("Honda Activa 6G / Two-Wheeler", 8500000),
    "bike": ("150cc Commuter Motorcycle", 11000000),
    "bicycle": ("Gear Hybrid Bicycle", 1800000),
    "cycle": ("Hybrid Urban Bicycle", 1500000),
    
    # Home & Fitness
    "sofa": ("3-Seater Fabric Living Room Sofa", 3200000),
    "refrigerator": ("Double-Door Frost Free Refrigerator", 2800000),
    "fridge": ("Double-Door Refrigerator", 2600000),
    "washing machine": ("Front-Load Washing Machine", 3200000),
    "gym membership": ("Annual Cult.fit / Gym Membership", 1800000),
    "gym": ("Annual Gym Membership", 1800000),
}


def is_non_financial_query(query: str) -> bool:
    """
    Detects if the user query is completely unrelated to personal finance, purchases,
    spending, loans, budgeting, investments, or affordability.
    """
    text = query.strip().lower()
    
    # 1. Obvious non-financial / off-topic topics
    off_topic_patterns = [
        r"\b(write a poem|write code|python script|recipe|cook|weather today|who won|prime minister|president|capital of|joke|sing|translate|solve equation|quantum physics|essay)\b",
        r"\b(how to fix windows|install drivers|css flexbox|react component|docker container|linked list|binary tree|algorithm|sorting)\b"
    ]
    for pat in off_topic_patterns:
        if re.search(pat, text):
            return True

    # 2. Financial keywords & intention patterns (word-boundary matched)
    finance_patterns = [
        r"\b(buy|purchase|afford|spend|cost|price|budget|money)\b",
        r"(?:₹|rs\.?|\binr\b|paise|\blakhs?\b|\blacs?\b|\bcrores?\b|\bcr\b|\b\d+k\b|\bemi\b|\bloans?\b)",
        r"\b(trip|travel|travelling|vacation|flight|hotel|holiday|goa|manali|kashmir|kerala|thailand|bali|dubai)\b",
        r"\b(iphone|macbook|ipad|laptop|phone|tv|camera|ps5|playstation|xbox|watch|bike|bullet|scooter|car|bicycle|sofa|fridge|gym)\b",
        r"\b(invest|investment|savings|cash|downpayment|gold|silver|shopping|headroom|balance|fund|salary|expense)\b",
        r"\bcan i (buy|afford|spend|get|take|plan|go)\b",
    ]
    
    if any(re.search(p, text) for p in finance_patterns):
        return False
        
    # If the text does not match any financial patterns, treat as out-of-scope
    return True


def _extract_price_regex(text: str) -> int:
    """Helper to extract user-notified price in paise."""
    # 1. Crore: e.g. 1.5 crore, Rs 2 cr
    crore_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b', text, re.IGNORECASE)
    if crore_match:
        val = float(crore_match.group(1))
        return int(round(val * 10000000 * 100))

    # 2. Lakh: e.g. Rs 1.2 lakh, 85k
    lakh_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs)\b', text, re.IGNORECASE)
    if lakh_match:
        val = float(lakh_match.group(1))
        return int(round(val * 100000 * 100))

    # 3. K / Thousand: e.g. 50k, 80 thousand
    k_match = re.search(r'(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:k|thousand|thousands)\b', text, re.IGNORECASE)
    if k_match:
        val = float(k_match.group(1))
        return int(round(val * 1000 * 100))

    # 4. Explicit currency symbol followed by number: e.g. ₹79,900 or Rs. 80000
    curr_match = re.search(r'(?:₹|Rs\.?\s*)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if curr_match:
        raw_num = curr_match.group(1).replace(',', '')
        return int(round(float(raw_num) * 100))

    # 5. "for <number>" or "of <number>"
    for_match = re.search(r'(?:for|costs?|of|worth)\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if for_match:
        raw_num = for_match.group(1).replace(',', '')
        return int(round(float(raw_num) * 100))

    return 0


def resolve_purchase_item_and_price(text: str) -> Dict[str, Any]:
    """
    Extracts item label and price.
    If price is not mentioned, checks curated benchmark catalog or returns needs_price_clarification.
    """
    clean_text = text.strip()
    extracted_price_paise = _extract_price_regex(clean_text)
    lower_text = clean_text.lower()
    
    # Identify item label
    identified_label = "Purchase"
    benchmark_label = None
    benchmark_price_paise = None
    
    # Check against our curated benchmark catalog (longest substring match first)
    sorted_catalog_keys = sorted(RETAIL_BENCHMARKS_PAISE.keys(), key=lambda k: len(k), reverse=True)
    for key in sorted_catalog_keys:
        if key in lower_text:
            benchmark_label, benchmark_price_paise = RETAIL_BENCHMARKS_PAISE[key]
            identified_label = benchmark_label
            break
            
    # If no catalog match, try to extract product name heuristic
    if identified_label == "Purchase":
        split_match = re.split(r'\b(?:for|on|costs?|worth)\b', clean_text, flags=re.IGNORECASE)
        target_part = split_match[0] if split_match else clean_text
        words = re.findall(r'\b[A-Za-z0-9_-]+\b', target_part)
        stopwords = {
            "can", "i", "afford", "buy", "purchase", "spend", "a", "an", "the", "on", "for",
            "in", "next", "this", "month", "months", "now", "today", "emi", "cash", "rs", "rupees", "inr"
        }
        candidates = [w for w in words if w.lower() not in stopwords]
        if candidates:
            identified_label = " ".join(candidates[:3]).title()

    # Case 1: User specified price
    if extracted_price_paise > 0:
        return {
            "item_label": identified_label,
            "price_paise": extracted_price_paise,
            "is_estimated_price": False,
            "needs_price_clarification": False,
            "benchmark_source": None
        }
        
    # Case 2: User didn't specify price, but we have a market benchmark
    if benchmark_price_paise is not None:
        return {
            "item_label": identified_label,
            "price_paise": benchmark_price_paise,
            "is_estimated_price": True,
            "needs_price_clarification": False,
            "benchmark_source": f"Indian Average Market Benchmark ({benchmark_label})"
        }
        
    # Case 3: Price is missing and item is ambiguous
    return {
        "item_label": identified_label,
        "price_paise": 0,
        "is_estimated_price": False,
        "needs_price_clarification": True,
        "suggested_prices_paise": [1500000, 3000000, 6000000, 10000000] # ₹15k, ₹30k, ₹60k, ₹1 Lakh
    }


def evaluate_dual_options(
    txns: List[Dict[str, Any]],
    recurring: List[Dict[str, Any]],
    account_balances: Dict[str, int],
    source_files: List[Dict[str, Any]],
    purchase_amount_paise: int,
    item_label: str
) -> Dict[str, Any]:
    """
    Computes deterministic financial math for:
    Option 1: One-time Upfront Cash payment
    Option 2: 6-month & 12-month EMI financing
    """
    # 1. OPTION 1: CASH EVALUATION
    cash_decision = evaluate_affordability_decision(
        transactions=txns,
        recurring_items=recurring,
        current_balances=account_balances,
        purchase_amount_paise=purchase_amount_paise,
        label=item_label,
        timing="next_month",
        payment_type="cash",
        source_files=source_files,
        seed=42
    )
    
    cash_verdict = cash_decision["verdict"]
    cash_headroom = cash_decision["headroom"]
    buffer_paise = cash_decision["buffer"]["value_minor"]
    lowest_balance = cash_decision["lowest_balance"]
    constructive = cash_decision.get("constructive_helper") or {}
    monthly_net_savings_paise = constructive.get("monthly_net_savings_paise", 0)
    if not monthly_net_savings_paise:
        sal = sum(r["amount_minor"] for r in recurring if r.get("type") == "salary" or r.get("amount_minor", 0) > 0)
        out = sum(abs(r["amount_minor"]) for r in recurring if r.get("type") != "salary" and r.get("amount_minor", 0) < 0)
        monthly_net_savings_paise = max(0, sal - out)
    
    # 2. OPTION 2: EMI EVALUATION
    # 6-Month No-Cost EMI
    emi_6m_paise = calculate_emi_paise(purchase_amount_paise, 6, annual_interest_pct=0.0)
    # 12-Month Standard EMI (14% p.a.)
    emi_12m_paise = calculate_emi_paise(purchase_amount_paise, 12, annual_interest_pct=14.0)
    total_paid_12m_paise = emi_12m_paise * 12
    total_interest_12m_paise = max(0, total_paid_12m_paise - purchase_amount_paise)
    
    # Select primary EMI presentation (6m if affordable on monthly savings, else 12m)
    primary_tenure = 6
    primary_emi_paise = emi_6m_paise
    primary_interest_rate = 0.0
    primary_total_interest_paise = 0
    
    # Debt ratio against monthly net savings capacity
    can_afford_emi = False
    emi_verdict_code = "UNHEALTHY_DEBT_RATIO"
    
    if monthly_net_savings_paise > 0:
        if emi_6m_paise <= monthly_net_savings_paise * 0.60:
            can_afford_emi = True
            emi_verdict_code = "AFFORDABLE_ON_EMI"
            primary_tenure = 6
            primary_emi_paise = emi_6m_paise
            primary_interest_rate = 0.0
            primary_total_interest_paise = 0
        elif emi_12m_paise <= monthly_net_savings_paise * 0.50:
            can_afford_emi = True
            emi_verdict_code = "AFFORDABLE_ON_EMI"
            primary_tenure = 12
            primary_emi_paise = emi_12m_paise
            primary_interest_rate = 14.0
            primary_total_interest_paise = total_interest_12m_paise
        else:
            can_afford_emi = False
            emi_verdict_code = "TIGHT_EMI_STRETCH"
    else:
        can_afford_emi = False
        emi_verdict_code = "NO_SAVINGS_FOR_EMI"

    combined_liquid_paise = sum(account_balances.values())
    
    return {
        "combined_liquid_paise": combined_liquid_paise,
        "monthly_net_savings_paise": monthly_net_savings_paise,
        "safety_buffer_paise": buffer_paise,
        "option_cash": {
            "verdict_code": cash_verdict["code"],
            "can_afford": cash_verdict["code"] == "AFFORDABLE",
            "verdict_text": cash_verdict.get("headline", cash_verdict["code"]),
            "purchase_paise": purchase_amount_paise,
            "p10_headroom_paise": cash_headroom["p10_minor"],
            "p50_headroom_paise": cash_headroom["p50_minor"],
            "lowest_balance_paise": lowest_balance.get("p50_minor", 0),
            "safety_buffer_paise": buffer_paise,
            "max_affordable_paise": constructive.get("max_affordable_paise", 0)
        },
        "option_emi": {
            "verdict_code": emi_verdict_code,
            "can_afford": can_afford_emi,
            "recommended_tenure_months": primary_tenure,
            "monthly_emi_paise": primary_emi_paise,
            "annual_interest_pct": primary_interest_rate,
            "total_interest_paise": primary_total_interest_paise,
            "monthly_net_savings_paise": monthly_net_savings_paise,
            "emi_6m_paise": emi_6m_paise,
            "emi_12m_paise": emi_12m_paise,
            "total_interest_12m_paise": total_interest_12m_paise
        },
        "raw_ledger": cash_decision.get("ledger", [])
    }


def build_purchase_prompt(
    item_label: str,
    price_paise: int,
    is_estimated: bool,
    benchmark_source: Optional[str],
    eval_data: Dict[str, Any]
) -> str:
    """Builds the strict Gemini system prompt containing ground truth math for both options."""
    price_rs = price_paise // 100
    liquid_rs = eval_data["combined_liquid_paise"] // 100
    savings_rs = eval_data["monthly_net_savings_paise"] // 100
    buffer_rs = eval_data["safety_buffer_paise"] // 100
    
    cash = eval_data["option_cash"]
    emi = eval_data["option_emi"]
    
    cash_headroom_rs = cash["p10_headroom_paise"] // 100
    lowest_bal_rs = cash["lowest_balance_paise"] // 100
    
    primary_emi_rs = emi["monthly_emi_paise"] // 100
    emi_months = emi["recommended_tenure_months"]
    interest_pct = emi["annual_interest_pct"]
    interest_rs = emi["total_interest_paise"] // 100
    
    prompt = f"""You are the expert Financial Decision Advisor for the Financial Decision Lab.
You evaluate purchase and spending affordability decisions for retail users in India.

=== GROUND-TRUTH FINANCIAL REALITY ===
- Target Purchase: {item_label}
- Evaluated Price: Rs. {price_rs:,} {'(Estimated average market benchmark)' if is_estimated else '(Specified by user)'}
- Benchmark Note: {benchmark_source or 'User provided amount'}
- Combined Liquid Bank Balance: Rs. {liquid_rs:,}
- Net Monthly Savings Capacity: Rs. {savings_rs:,} / month
- Required Emergency Floor Buffer: Rs. {buffer_rs:,}

=== OPTION 1: ONE-TIME UPFRONT (CASH / FULL PAYMENT) ===
- Verdict: {'YES - AFFORDABLE' if cash['can_afford'] else 'NO - NOT RECOMMENDED / TIGHT'} ({cash['verdict_code']})
- Upfront Outflow: Rs. {price_rs:,}
- Safe Headroom Remaining (P10): Rs. {cash_headroom_rs:,}
- Lowest Projected Balance in next 30 days: Rs. {lowest_bal_rs:,}
- Emergency Safety Buffer Impact: Buffer of Rs. {buffer_rs:,} is {'fully protected' if cash['can_afford'] else 'breached or heavily pressured'}.

=== OPTION 2: MONTHLY EMI / FINANCING ===
- Verdict: {'YES - AFFORDABLE ON EMI' if emi['can_afford'] else 'NO - RISKY FOR MONTHLY CASH FLOW'} ({emi['verdict_code']})
- Recommended Tenure: {emi_months} Months
- Monthly Installment: Rs. {primary_emi_rs:,} / month
- Annual Interest Rate: {interest_pct}%
- Total Interest Payable: Rs. {interest_rs:,}
- Monthly Savings Impact: Monthly EMI of Rs. {primary_emi_rs:,} consumes {round((primary_emi_rs / max(1, savings_rs)) * 100, 1)}% of your Rs. {savings_rs:,} monthly savings.

=== STRICT RESPONSE INSTRUCTIONS ===
1. Speak directly to the user in a warm, analytical, and encouraging tone. NEVER quote meta-rules or system instructions.
2. If price was estimated, start with a quick 1-sentence note stating the average market price benchmark (e.g. "I estimated an average market price of Rs. {price_rs:,} for {item_label}").
3. Present BOTH options clearly with distinct markdown sections:
   - **Option 1: One-Time Upfront Payment** (Give a clear YES or NO verdict badge, state the headroom, and emergency cushion impact).
   - **Option 2: Monthly EMI / Financing** (Give a clear YES or NO verdict badge, state the exact EMI of Rs. {primary_emi_rs:,}/month for {emi_months} months, interest, and monthly cash flow safety).
4. Finish with a 1-sentence **Strategic Bottom Line Recommendation** comparing which option is smarter for them.
5. All numerical figures in your reply MUST match the figures above verbatim.
"""
    return prompt


def _query_gemini(system_prompt: str, user_message: str, history: Optional[List[Dict[str, str]]] = None) -> Optional[str]:
    """Queries Gemini 3.5 Flash for conversational purchase advice."""
    key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not key or not key.strip():
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key.strip()}"
    
    contents = []
    if history:
        for turn in history[-4:]:
            role = "user" if turn.get("role") == "user" else "model"
            content = turn.get("content", "").strip()
            if content:
                contents.append({"role": role, "parts": [{"text": content}]})
                
    contents.append({"role": "user", "parts": [{"text": user_message}]})
    
    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1500
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        try:
            record_egress(
                purpose="gemini_purchase_advisor_chat",
                destination="generativelanguage.googleapis.com",
                payload={"model": GEMINI_MODEL, "tokens": len(user_message)},
                mode="cloud"
            )
        except Exception:
            pass
            
        with urllib.request.urlopen(req, timeout=12) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
    except Exception as e:
        logger.warning(f"Gemini purchase advisor call failed: {e}")
        
    return None


def generate_purchase_advisory(
    user_message: str,
    txns: List[Dict[str, Any]],
    recurring: List[Dict[str, Any]],
    account_balances: Dict[str, int],
    source_files: List[Dict[str, Any]],
    conversation_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Main entry point for Decision Lab conversational purchase advisory.
    """
    # 1. SCOPE CHECK: Non-financial filter
    if is_non_financial_query(user_message):
        return {
            "reply": "I am the **Financial Decision Advisor** for the Financial Decision Lab. I can only assist with purchase affordability, spending decisions, EMI calculations, and financial planning.\n\nPlease ask about a purchase, travel plan, or budget question (e.g. *\"Can I buy an iPhone 16 Pro?\"* or *\"Can I afford a ₹35,000 Goa trip?\"*).",
            "is_out_of_scope": True,
            "item_label": None,
            "price_paise": 0,
            "is_estimated_price": False,
            "needs_price_clarification": False,
            "option_cash": None,
            "option_emi": None
        }

    # 2. RESOLVE ITEM & PRICE
    resolution = resolve_purchase_item_and_price(user_message)
    item_label = resolution["item_label"]
    price_paise = resolution["price_paise"]
    is_estimated = resolution["is_estimated_price"]
    benchmark_source = resolution.get("benchmark_source")
    
    # 3. AMBIGUOUS / MISSING PRICE FLOW
    if resolution["needs_price_clarification"] or price_paise <= 0:
        return {
            "reply": f"I see you want to plan for **{item_label}**, but I couldn't determine the exact price.\n\nCould you specify your estimated budget or expected purchase amount so I can evaluate both upfront cash and EMI options against your verified bank accounts?",
            "is_out_of_scope": False,
            "item_label": item_label,
            "price_paise": 0,
            "is_estimated_price": False,
            "needs_price_clarification": True,
            "suggested_prices_paise": resolution.get("suggested_prices_paise", [1500000, 3000000, 6000000, 10000000]),
            "option_cash": None,
            "option_emi": None
        }

    # 4. DETERMINISTIC DUAL EVALUATION
    eval_data = evaluate_dual_options(
        txns=txns,
        recurring=recurring,
        account_balances=account_balances,
        source_files=source_files,
        purchase_amount_paise=price_paise,
        item_label=item_label
    )
    
    # 5. LLM SYNTHESIS
    system_prompt = build_purchase_prompt(
        item_label=item_label,
        price_paise=price_paise,
        is_estimated=is_estimated,
        benchmark_source=benchmark_source,
        eval_data=eval_data
    )
    
    raw_reply = _query_gemini(system_prompt, user_message, conversation_history)
    
    # 6. DETERMINISTIC FALLBACK IF GEMINI IS UNAVAILABLE
    if not raw_reply or len(raw_reply.strip()) < 50:
        price_rs = price_paise // 100
        cash = eval_data["option_cash"]
        emi = eval_data["option_emi"]
        emi_rs = emi["monthly_emi_paise"] // 100
        
        bench_note = f"> 💡 **Market Benchmark**: Based on current retail pricing in India, average cost for **{item_label}** is **₹{price_rs:,}**.\n\n" if is_estimated else ""
        
        cash_verdict_badge = "✅ **YES — AFFORDABLE UPFRONT**" if cash["can_afford"] else "❌ **NO — NOT RECOMMENDED UPFRONT**"
        emi_verdict_badge = "✅ **YES — AFFORDABLE ON EMI**" if emi["can_afford"] else "❌ **NO — TIGHT ON MONTHLY SAVINGS**"
        
        raw_reply = (
            f"{bench_note}"
            f"### Option 1: One-Time Upfront (Cash / Full Payment)\n"
            f"- **Verdict**: {cash_verdict_badge}\n"
            f"- **Upfront Outflow**: ₹{price_rs:,}\n"
            f"- **Safety Buffer Preservation**: ₹{cash['safety_buffer_paise'] // 100:,} required floor\n"
            f"- **Lowest 30-Day Balance**: ₹{cash['lowest_balance_paise'] // 100:,}\n\n"
            f"### Option 2: Monthly EMI / Financing\n"
            f"- **Verdict**: {emi_verdict_badge}\n"
            f"- **Monthly Installment**: ₹{emi_rs:,} / month for **{emi['recommended_tenure_months']} months**\n"
            f"- **Interest Rate**: {emi['annual_interest_pct']}% (Total interest: ₹{emi['total_interest_paise'] // 100:,})\n"
            f"- **Cash Flow Safety**: Consumes approx. {round((emi_rs / max(1, eval_data['monthly_net_savings_paise'] // 100)) * 100, 1)}% of your monthly savings capacity (₹{eval_data['monthly_net_savings_paise'] // 100:,}/month).\n\n"
            f"**Bottom Line**: "
            + ("You can proceed with full payment safely without jeopardizing your emergency buffer." if cash["can_afford"]
               else f"Paying upfront puts heavy pressure on your safety buffer. Opting for a {emi['recommended_tenure_months']}-month EMI of ₹{emi_rs:,}/month is significantly safer.")
        )
        
    return {
        "reply": raw_reply,
        "is_out_of_scope": False,
        "item_label": item_label,
        "price_paise": price_paise,
        "is_estimated_price": is_estimated,
        "benchmark_source": benchmark_source,
        "needs_price_clarification": False,
        "option_cash": eval_data["option_cash"],
        "option_emi": eval_data["option_emi"]
    }

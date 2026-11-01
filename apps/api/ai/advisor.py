"""
Comprehensive AI Financial Advisor, Query Classifier, and Price Estimator for FDL.
Handles:
  1. Intent classification: AFFORDABILITY | INVESTMENT | GENERAL_ADVISOR | UNLAWFUL_REFUSAL
  2. Safety guardrails against illegal/unlawful activities
  3. Realistic Indian market price & budget estimation (when user does not specify amount)
  4. Prudent investment advisory (FDs, PPF, Index funds, Emergency Buffer check)
  5. General financial advice grounded in Indian personal finance principles (clean conversational chat format)
  6. Multi-provider LLM integration (Groq Cloud -> Rule-based knowledge fallback)
"""
import os
import re
import json
import logging
import urllib.request
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
from dotenv import load_dotenv

from middleware.egress import record_egress

logger = logging.getLogger(__name__)

# Curated Indian market price benchmarks for common items, experiences, trips, and gadgets
# Amounts in integer Rupees (converted to paise * 100)
INDIAN_PRICE_BENCHMARKS = [
    # Phones & Gadgets
    (r"\biphone\s*16\s*pro\s*max\b", 144900, "Apple iPhone 16 Pro Max (256GB)", "Official Apple India retail pricing"),
    (r"\biphone\s*16\s*pro\b", 119900, "Apple iPhone 16 Pro (128GB)", "Official Apple India retail pricing"),
    (r"\biphone\s*16\s*plus\b", 89900, "Apple iPhone 16 Plus (128GB)", "Official Apple India retail pricing"),
    (r"\biphone\s*16\b", 79900, "Apple iPhone 16 (128GB)", "Official Apple India retail pricing"),
    (r"\biphone\s*15\s*pro\b", 109900, "Apple iPhone 15 Pro", "Indian market average"),
    (r"\biphone\s*15\b", 69900, "Apple iPhone 15", "Indian market average"),
    (r"\bmacbook\s*pro\b", 169900, "Apple MacBook Pro 14-inch (M3/M4)", "Apple India Store base model"),
    (r"\bmacbook\s*air\b", 99900, "Apple MacBook Air (M2/M3)", "Apple India Store base model"),
    (r"\bmacbook\b", 99900, "Apple MacBook Air", "Apple India Store base model"),
    (r"\bipad\s*pro\b", 99900, "Apple iPad Pro", "Apple India Store"),
    (r"\bipad\s*air\b", 59900, "Apple iPad Air", "Apple India Store"),
    (r"\bipad\b", 34900, "Apple iPad (10th Gen)", "Apple India Store"),
    (r"\bapple\s*watch\s*ultra\b", 89900, "Apple Watch Ultra 2", "Apple India Store"),
    (r"\bapple\s*watch\b", 29900, "Apple Watch SE / Series 9", "Indian retail average"),
    (r"\bplaystation\s*5|\bps5\b", 54990, "Sony PlayStation 5 Disc Edition", "Sony India official MRP"),
    (r"\bxbox\s*series\s*x\b", 55990, "Xbox Series X Console", "Official retail price"),
    (r"\bnintendo\s*switch\b", 28000, "Nintendo Switch OLED", "Indian importer average"),
    (r"\bgaming\s*(?:laptop|pc)\b", 85000, "Mid-tier Gaming Laptop / PC", "Average RTX 4050/4060 laptop in India"),
    (r"\blaptop\b", 65000, "Core i5 / Ryzen 5 Laptop", "Average professional laptop in India"),
    (r"\bairpods\s*pro\b", 24900, "Apple AirPods Pro (2nd Gen)", "Apple India Store"),
    (r"\bairpods\b", 12900, "Apple AirPods (3rd Gen)", "Apple India Store"),

    # Appliances & Home
    (r"\b(?:sony|samsung|lg)?\s*(?:oled|qled|4k)?\s*tv\b", 45000, "55-inch 4K Smart TV (Sony/Samsung/LG)", "Indian consumer electronics average"),
    (r"\btelevision\b", 40000, "50-inch 4K Smart TV", "Indian consumer electronics average"),
    (r"\bsofa\b|\bcouch\b|\bliving\s*room\s*sofa\b", 45000, "3-Seater Premium Fabric Sofa", "Pepperfry / Urban Ladder average"),
    (r"\bdining\s*table\b", 35000, "6-Seater Solid Wood Dining Set", "Furniture retail average"),
    (r"\brefrigerator\b|\bfridge\b", 35000, "Double Door Frost-Free Refrigerator", "Samsung / LG / Whirlpool average"),
    (r"\bwashing\s*machine\b", 28000, "Front Load Automatic Washing Machine", "IFB / Bosch / Samsung average"),
    (r"\bair\s*conditioner\b|\bac\b", 42000, "1.5 Ton 5-Star Inverter Split AC", "Voltas / Daikin / LG average"),

    # Trips & Travel (flights + hotels + dining)
    (r"\b(?:trip\s*to\s*goa|goa\s*trip|goa\s*vacation)\b", 35000, "4-Day Goa Vacation (Flights + 4-Star Stay + Food)", "Domestic travel estimate for 1 person"),
    (r"\b(?:trip\s*to\s*manali|manali\s*trip)\b", 28000, "4-Day Manali Trip (Travel + Stay + Activities)", "Domestic travel estimate"),
    (r"\b(?:trip\s*to\s*ladakh|ladakh\s*trip)\b", 45000, "6-Day Ladakh Bike/Cab Tour & Flights", "Domestic travel estimate"),
    (r"\b(?:trip\s*to\s*kerala|kerala\s*trip)\b", 32000, "5-Day Kerala Backwaters & Munnar Holiday", "Domestic travel estimate"),
    (r"\b(?:trip\s*to\s*dubai|dubai\s*trip|dubai\s*vacation)\b", 85000, "5-Day Dubai International Trip (Flights, Visa, Hotel)", "International budget estimate"),
    (r"\b(?:trip\s*to\s*thailand|thailand\s*trip|bangkok\s*trip|phuket\s*trip)\b", 70000, "5-Day Thailand Vacation (Flights, Hotel, Island Tours)", "Southeast Asia travel estimate"),
    (r"\b(?:trip\s*to\s*bali|bali\s*trip)\b", 80000, "6-Day Bali Vacation (Flights + Villa + Activities)", "Southeast Asia travel estimate"),
    (r"\b(?:trip\s*to\s*singapore|singapore\s*trip)\b", 95000, "4-Day Singapore Trip (Flights + Hotel + Attractions)", "International budget estimate"),
    (r"\b(?:vacation|trip|holiday)\b", 35000, "Domestic Holiday Trip (4-5 Days)", "Standard domestic holiday budget estimate"),

    # Social, Parties & Events
    (r"\b(?:dinner\s*party|cafe\s*party|throw\s*a\s*party|party\s*at|host\s*a\s*party)\b", 18000, "Dinner / Cafe Party for 10-15 Friends", "Average restaurant dining & drinks in Tier 1 Indian city"),
    (r"\bbirthday\s*party\b", 20000, "Birthday Celebration & Drinks (10-15 people)", "Tier 1 lounge / cafe reservation estimate"),
    (r"\bhouse\s*party\b", 12000, "House Party (Food, Beverages, Snacks for 10 people)", "Catering & drinks estimate"),
    (r"\bwedding\s*gift\b", 10000, "Premium Wedding Gift / Cash Envelope", "Indian social gifting benchmark"),
    (r"\bwedding\s*shopping\b|\blehenga\b|\bsherwani\b", 60000, "Designer Wedding Apparel / Festive Shopping", "Ethnic retail benchmark"),

    # Vehicles & Fitness
    (r"\b(?:scooter|activa|ather|ola\s*s1|two\s*wheeler)\b", 115000, "Electric / Petrol Scooter (On-Road)", "Honda Activa / Ather 450X average on-road"),
    (r"\b(?:royal\s*enfield|bullet|hunter\s*350|classic\s*350)\b", 210000, "Royal Enfield 350cc Motorcycle (On-Road)", "Official ex-showroom + RTO + insurance"),
    (r"\bgym\s*(?:membership|annual)\b", 22000, "Annual Premium Gym Membership (Cult.fit / Gold's Gym)", "Tier-1 annual gym membership average"),
    (r"\bbicycle\b|\bcycle\b", 15000, "Geared Hybrid / Mountain Bicycle", "Firefox / Decathlon Triban average"),
]

def check_unlawful_or_harmful(query_text: str) -> Optional[str]:
    """
    Checks for illegal, illicit, or harmful financial queries and returns an ethical refusal.
    """
    t = query_text.lower()
    unlawful_patterns = [
        r"\b(?:unlawful|illegal|illicit|crime|drugs|contraband|hack(?:ing)?|dark\s*web|money\s*laundering|fraud|scam|bribe|evade\s*tax|tax\s*evasion|black\s*money)\b"
    ]
    for p in unlawful_patterns:
        if re.search(p, t):
            return (
                "I cannot assist, advise, or provide recommendations for illegal or unlawful activities.\n\n"
                "If you have surplus money, I can help you evaluate safe and legal personal finance options — "
                "such as building an emergency buffer, setting up a high-interest Bank FD (7.1%–7.5%), "
                "investing in index funds, or budgeting for personal goals."
            )
    return None

def classify_intent(query_text: str) -> str:
    """
    Classifies user message into:
      - "UNLAWFUL_REFUSAL": user asks about illegal/unlawful activities
      - "INVESTMENT": where to invest money, FDs, mutual funds, SIPs, parking surplus, gold, PPF
      - "AFFORDABILITY": specifically asking whether they can afford/buy an item, trip, or experience
      - "GENERAL_ADVISOR": advice, how to spend, budgeting rules, credit cards, emergency funds, taxes, etc.
    """
    t = query_text.lower().strip()

    # 0. Safety & Harm check
    if check_unlawful_or_harmful(t):
        return "UNLAWFUL_REFUSAL"

    # 1. Investment queries
    investment_patterns = [
        r"\b(?:where|how)\s+(?:can|should|to)\s+i\s+invest\b",
        r"\bwhere\s+to\s+invest\b",
        r"\binvest(?:ment|ing|ments)?\b",
        r"\b(?:put|park)\s+(?:my\s+)?(?:money|cash|savings|rupees|funds)\b",
        r"\b(?:fixed\s+deposit|\bfd\b|\brd\b|recurring\s+deposit)\b",
        r"\bmutual\s+funds?\b|\bsip\b|\bppf\b|\bnps\b|\bindex\s+funds?\b",
        r"\bi\s+have\s+(?:some\s+)?(?:rs\.?|₹|\d+|extra|surplus)?\s*(?:lakh|k|thousand|rupees|money)?\s*(?:where|how)?\s*(?:to|can\s+i)?\s*invest\b"
    ]
    for p in investment_patterns:
        if re.search(p, t):
            return "INVESTMENT"

    # 2. General Advisory / Open-ended spending advice (NOT a specific purchase affordability check)
    open_advice_patterns = [
        r"\bhow\s+(?:can|should|to)\s+i\s+spend\b",
        r"\bwhat\s+(?:should|can)\s+i\s+do\s+with\b",
        r"\bhow\s+to\s+(?:budget|save|manage)\b",
        r"\btips\s+on\b",
        r"\bwhat\s+is\b",
        r"\bexplain\b"
    ]
    for p in open_advice_patterns:
        if re.search(p, t):
            return "GENERAL_ADVISOR"

    # 3. Specific Affordability queries: "Can I afford / buy / get / plan / throw X?"
    affordability_patterns = [
        r"\b(?:can\s+i|can\s+we)\s+(?:afford|buy|purchase|get|take|book|plan|throw|go\s+on)\b",
        r"\b(?:should\s+i)\s+(?:buy|purchase|get|book|take)\b",
        r"\b(?:afford(?:able|ability)?)\b",
        r"\b(?:trip\s+to|party\s+at|throw\s+a\s+party|go\s+on\s+a\s+trip)\b",
        r"\b(?:buying\s+an?|purchasing\s+an?)\b"
    ]
    for p in affordability_patterns:
        if re.search(p, t):
            return "AFFORDABILITY"

    if re.search(r"\b(?:is\s+it\s+safe\s+to\s+buy|will\s+it\s+hurt\s+my\s+budget)\b", t):
        return "AFFORDABILITY"

    return "GENERAL_ADVISOR"


def estimate_price_from_benchmarks(query_text: str) -> Optional[Tuple[int, str, str]]:
    text = query_text.lower()
    for pattern, rs, label, note in INDIAN_PRICE_BENCHMARKS:
        if re.search(pattern, text):
            return rs, label, note
    return None


def estimate_price_with_groq(query_text: str) -> Optional[Tuple[int, str, str]]:
    key = os.getenv("GROQ_API_KEY", "")
    if not key or not key.strip():
        return None

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    prompt = f"""You are an Indian retail pricing estimator.
User question: "{query_text}"
They did not specify an exact price.
Estimate the typical realistic Indian retail price in INR.
Return ONLY valid JSON with keys: "estimated_amount_rs" (integer), "label" (string), "pricing_source" (short string)."""

    req_body = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a pricing engine. Return strictly valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
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
            record_egress(purpose="groq_price_estimation", destination="api.groq.com", payload={"query": query_text[:80]}, mode="cloud")
        except Exception:
            pass

        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                body = json.loads(resp.read().decode("utf-8"))
                choices = body.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    res = json.loads(content)
                    amt = int(res.get("estimated_amount_rs", 0))
                    lbl = str(res.get("label", "Purchase"))
                    src = str(res.get("pricing_source", "Estimated Indian market pricing"))
                    if amt > 0:
                        return amt, lbl, src
    except Exception as e:
        logger.warning(f"Groq price estimation failed: {e}")

    return None


def resolve_purchase_pricing(query_text: str, explicit_amount_minor: int, parsed_label: str) -> Tuple[int, str, bool, Optional[str]]:
    if explicit_amount_minor > 0:
        return explicit_amount_minor, parsed_label, False, None

    groq_est = estimate_price_with_groq(query_text)
    if groq_est:
        amt_rs, lbl, note = groq_est
        return amt_rs * 100, lbl, True, note

    bench_est = estimate_price_from_benchmarks(query_text)
    if bench_est:
        amt_rs, lbl, note = bench_est
        return amt_rs * 100, lbl, True, note

    t = query_text.lower()
    if "trip" in t or "vacation" in t or "holiday" in t:
        return 35000 * 100, "Holiday Trip", True, "Estimated average Indian domestic 4-day travel budget"
    elif "party" in t or "dinner" in t or "celebration" in t:
        return 18000 * 100, "Party & Dining Out", True, "Estimated restaurant gathering for 10-15 people"
    elif "phone" in t or "mobile" in t:
        return 40000 * 100, "Smartphone", True, "Mid-to-high tier Indian smartphone retail average"

    return 30000 * 100, parsed_label or "Purchase", True, "Estimated typical purchase budget"


def generate_investment_guidance(
    query_text: str,
    target_amount_rs: Optional[int],
    current_balances: Dict[str, int],
    buffer_paise: int
) -> Dict[str, Any]:
    """
    Generates disciplined, prudent Indian financial advice in a clean, natural chat format.
    """
    total_liquid_rs = sum(current_balances.values()) // 100 if current_balances else 0
    buffer_rs = buffer_paise // 100
    target_str = f"₹{target_amount_rs:,}" if target_amount_rs else "your extra savings"

    chat_message = (
        f"Investing {target_str} is a great step toward financial security! Here is a safe and disciplined way to allocate it:\n\n"
        f"1. Emergency Buffer Check: Always protect your dynamic safety buffer of ₹{buffer_rs:,} across your bank accounts. This ensures you never have to break investments prematurely during unforeseen emergencies.\n\n"
        f"2. Safe & Guaranteed Fixed Returns: For money needed in the next 1 to 3 years, Bank Fixed Deposits (FDs) currently earn 7.10% to 7.50% p.a. with top banks (SBI, HDFC). Public Provident Fund (PPF) is also an excellent option offering 7.10% completely tax-free under Section 80C.\n\n"
        f"3. Long-Term Compounding: For funds you won't touch for 5+ years, diversified Nifty 50 Index Mutual Funds via monthly SIPs are the most reliable passive vehicle to beat inflation."
    )

    return {
        "reply": chat_message,
        "target_amount_rs": target_amount_rs,
        "buffer_rs": buffer_rs,
        "total_liquid_rs": total_liquid_rs
    }


def generate_general_financial_advice(query_text: str) -> str:
    """
    Answers general personal finance questions in clean conversational chat language (no markdown clutter).
    """
    key = os.getenv("GROQ_API_KEY", "")
    if key and key.strip():
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        system_instruction = (
            "You are a friendly, expert personal financial advisor for Indian working professionals. "
            "Write your response in clean, conversational chat format like a helpful message. "
            "Do NOT use markdown headers (no ###) or excessive bold asterisks. Use simple bullet points and friendly, reassuring sentences."
        )
        req_body = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": query_text}
            ],
            "temperature": 0.3,
            "max_tokens": 350
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=req_body,
            headers={
                "Authorization": f"Bearer {key.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "FinancialDecisionLab/1.0"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode("utf-8"))
                    choices = body.get("choices", [])
                    if choices:
                        raw = choices[0].get("message", {}).get("content", "").strip()
                        return re.sub(r'#{1,6}\s*', '', raw)
        except Exception as e:
            logger.warning(f"Groq financial advisor call failed: {e}")

    # Clean conversational fallback responses
    t = query_text.lower()
    if "50/30/20" in t or "50-30-20" in t or "rule" in t:
        return (
            "The 50/30/20 rule is a simple, effective guideline for your monthly take-home salary:\n\n"
            "• 50% for Needs: Rent, EMIs, groceries, utilities, and essential bills.\n"
            "• 30% for Wants: Dining out, weekend trips, OTT subscriptions, and shopping.\n"
            "• 20% for Savings & Debt: Building your emergency buffer, FDs, and index mutual funds.\n\n"
            "If you live in a Tier-1 metro like Bengaluru or Mumbai where rent is higher, a 60/20/20 split is also very common and healthy."
        )
    elif "emergency" in t or "buffer" in t or "cushion" in t:
        return (
            "An emergency fund ensures that an unexpected event (job transition, medical expense, or sudden repair) does not push you into expensive credit card debt:\n\n"
            "• Ideal Size: 3 to 6 months of mandatory living expenses (rent, EMIs, utilities, basic groceries).\n"
            "• Where to Keep It: High-interest savings accounts or flexible auto-sweep Bank Fixed Deposits (FDs) with instant liquidity.\n"
            "• Golden Rule: Never invest your emergency cash in volatile stocks or long lock-in schemes."
        )
    elif "credit card" in t or "cibil" in t or "credit score" in t:
        return (
            "Here are smart principles to keep your CIBIL score strong and avoid debt traps:\n\n"
            "• Pay Full Statement Due: Always pay the full amount due before the due date. Never pay just the minimum amount due, which charges 36%–42% annual interest.\n"
            "• Keep Utilization Under 30%: If your total limit is ₹1,00,000, keep monthly statement spend under ₹30,000 to maximize your CIBIL score.\n"
            "• Never Withdraw ATM Cash: Cash advances on credit cards attract immediate finance charges with zero interest-free period."
        )
    elif "tax" in t or "80c" in t or "regime" in t:
        return (
            "Here is how Indian tax planning works in simple terms:\n\n"
            "• New vs Old Tax Regime: Under the New Regime, income up to ₹7.75 Lakhs is effectively tax-free with standard deduction. If you have substantial HRA and 80C deductions, the Old Regime may save more.\n"
            "• Section 80C: Up to ₹1.5 Lakh deduction via PPF, EPF, and ELSS mutual funds.\n"
            "• Section 80D: Up to ₹25,000 for health insurance premiums for yourself and family."
        )
    elif "spend" in t or "have" in t:
        return (
            "If you have extra surplus money, here is a balanced and disciplined way to use it:\n\n"
            "• Emergency Runway First: If you don't have 3 to 6 months of essential living expenses saved, allocate at least 50% toward an emergency liquid buffer.\n"
            "• Eliminate High-Cost Debt: Clear any outstanding credit card debt or personal loans with high interest.\n"
            "• Guilt-Free Enjoyment: It's completely healthy to set aside 20% to 30% for dining, personal leisure, or hobbies you enjoy.\n"
            "• Long-Term Compounding: Put the remaining portion into low-cost index funds or short-term bank FDs."
        )

    return (
        "Here are three core rules for financial stability:\n\n"
        "1. Maintain visibility: Always keep an eye on committed payments (rent, EMIs, subscriptions) versus variable discretionary spending.\n"
        "2. Protect before you grow: Keep 3 to 6 months in liquid Bank FDs or auto-sweep savings before pursuing riskier investments.\n"
        "3. Avoid high-interest debt: Treat credit cards as payment tools that are always cleared in full every billing cycle."
    )

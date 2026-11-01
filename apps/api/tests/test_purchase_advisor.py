import pytest
from ai.purchase_advisor import (
    is_non_financial_query,
    resolve_purchase_item_and_price,
    evaluate_dual_options,
    generate_purchase_advisory
)

def test_non_financial_query_filter():
    # Should be flagged as non-financial
    assert is_non_financial_query("write a python script to reverse a linked list") is True
    assert is_non_financial_query("tell me a funny joke about cats") is True
    assert is_non_financial_query("what is the weather today in New Delhi?") is True
    assert is_non_financial_query("how to cook butter chicken at home") is True
    assert is_non_financial_query("who is the current prime minister of UK?") is True
    
    # Should NOT be flagged as non-financial
    assert is_non_financial_query("Can I buy an iPhone 16 Pro?") is False
    assert is_non_financial_query("Can I spend this money on travelling to Goa?") is False
    assert is_non_financial_query("Can I afford a PS5?") is False
    assert is_non_financial_query("Can I buy a laptop for 80,000?") is False
    assert is_non_financial_query("Can I spend 50k on a camera?") is False
    assert is_non_financial_query("What is my current savings headroom?") is False
    assert is_non_financial_query("Can I buy gold or mutual funds?") is False

def test_resolve_purchase_item_and_price_explicit():
    # Explicit price in rupees
    res1 = resolve_purchase_item_and_price("Can I buy a laptop for ₹85,000?")
    assert res1["price_paise"] == 8500000
    assert res1["is_estimated_price"] is False
    assert res1["needs_price_clarification"] is False

    # Explicit price in 'k' notation
    res2 = resolve_purchase_item_and_price("Can I spend 45k on camera gear?")
    assert res2["price_paise"] == 4500000
    assert res2["is_estimated_price"] is False

    # Explicit price in lakh notation
    res3 = resolve_purchase_item_and_price("Can I buy a used car for 2.5 lakh?")
    assert res3["price_paise"] == 25000000
    assert res3["is_estimated_price"] is False

def test_resolve_purchase_item_and_price_benchmark():
    # Benchmark lookup without user price
    res_iphone = resolve_purchase_item_and_price("Can I buy an iPhone 16 Pro?")
    assert res_iphone["price_paise"] == 11990000
    assert res_iphone["is_estimated_price"] is True
    assert "iPhone 16 Pro" in res_iphone["item_label"]

    res_ps5 = resolve_purchase_item_and_price("Can I buy a PS5 next month?")
    assert res_ps5["price_paise"] == 4999000
    assert res_ps5["is_estimated_price"] is True

    res_goa = resolve_purchase_item_and_price("Can I go on a Goa trip?")
    assert res_goa["price_paise"] == 2800000
    assert res_goa["is_estimated_price"] is True

def test_resolve_purchase_item_and_price_ambiguous():
    # Ambiguous query with no price and unknown item
    res_vague = resolve_purchase_item_and_price("Can I buy that gift?")
    assert res_vague["needs_price_clarification"] is True
    assert res_vague["price_paise"] == 0
    assert len(res_vague["suggested_prices_paise"]) > 0

def test_evaluate_dual_options_math():
    sample_txns = [
        {
            "id": "t1",
            "account_id": "acc_1",
            "posted_date": "2026-01-01",
            "amount_minor": 15000000,
            "raw_description": "Salary Credit",
            "normalized_description": "Salary",
            "category_id": "INCOME",
            "is_transfer": False,
            "channel": "NEFT",
            "balance_after_minor": 30000000
        },
        {
            "id": "t2",
            "account_id": "acc_1",
            "posted_date": "2026-01-05",
            "amount_minor": -3000000,
            "raw_description": "Rent Transfer",
            "normalized_description": "Rent",
            "category_id": "HOUSING",
            "is_transfer": False,
            "channel": "UPI",
            "balance_after_minor": 27000000
        }
    ]
    sample_recurring = [
        {
            "id": "r1",
            "merchant": "Employer Corp",
            "type": "salary",
            "cadence": "monthly",
            "typical_amount_minor": 15000000,
            "amount_minor": 15000000,
            "next_expected_date": "2026-02-01",
            "confidence": 0.95
        },
        {
            "id": "r2",
            "merchant": "Landlord",
            "type": "rent",
            "cadence": "monthly",
            "typical_amount_minor": 3000000,
            "amount_minor": -3000000,
            "next_expected_date": "2026-02-05",
            "confidence": 0.9
        }
    ]
    account_balances = {"HDFC Bank": 27000000}
    source_files = [{"id": "sf_1", "reconciliation_status": "PASSED"}]

    dual = evaluate_dual_options(
        txns=sample_txns,
        recurring=sample_recurring,
        account_balances=account_balances,
        source_files=source_files,
        purchase_amount_paise=8000000,  # ₹80,000
        item_label="iPhone 16"
    )

    assert "option_cash" in dual
    assert "option_emi" in dual
    assert dual["option_cash"]["purchase_paise"] == 8000000
    assert dual["option_emi"]["monthly_emi_paise"] > 0
    assert dual["option_emi"]["recommended_tenure_months"] in [6, 12]

"""
Deterministic Synthetic Bank Statement Generator for Financial Decision Lab (FDL)
Generates mathematically reconciled statements for:
- Aarav (Salaried engineer, HDFC + SBI, 8 months, overlapping transactions, transfers, recurring obligations)
- Priya (Freelance designer with volatile income and historical bonus)
- Short (60-day statement to test Sufficiency Gate refusal)
- Gappy (Statement with missing month to test gap detection)
"""

import os
import csv
from datetime import datetime, timedelta

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def write_csv_statement(filepath: str, headers: list[str], rows: list[list]):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for r in rows:
            writer.writerow(r)
    print(f"Generated: {filepath} ({len(rows)} rows)")

def generate_aarav_hdfc():
    """
    Aarav's HDFC Salary Account:
    8 months (2024-08-01 to 2025-03-31)
    Opening Balance: ₹45,000.00 (4,500,000 paise)
    Salary: ₹78,000.00 on 1st of every month
    Rent: ₹20,000.00 on 5th
    Transfer to SBI: ₹15,000.00 on 3rd
    Netflix: ₹649.00 on 15th
    Airtel: ₹799.00 on 18th
    Outlier: ₹18,400.00 on 2025-02-14 (Reliance Digital)
    Duplicate charge: 2 charges of ₹2,499.00 on 2025-03-12 (Gadget Accessories)
    """
    headers = ["Date", "Narration", "Chq/Ref No", "Value Dt", "Withdrawal Amt", "Deposit Amt", "Closing Balance"]
    rows = []
    
    current_balance = 45000.00 # In rupees for CSV formatting
    months = [
        ("2024-08", 31), ("2024-09", 30), ("2024-10", 31), ("2024-11", 30),
        ("2024-12", 31), ("2025-01", 31), ("2025-02", 28), ("2025-03", 31)
    ]
    
    ref_counter = 100000

    for ym, max_day in months:
        # 1st of month: Salary Credit
        ref_counter += 1
        current_balance += 78000.00
        rows.append([f"{ym}-01", "ACH/SALARY/TECH SOLUTIONS PVT LTD", f"ACH{ref_counter}", f"{ym}-01", "", "78000.00", f"{current_balance:.2f}"])

        # 3rd of month: Transfer to SBI account (Internal Transfer)
        ref_counter += 1
        current_balance -= 15000.00
        rows.append([f"{ym}-03", "NEFT-OWN A/C FUND TRF TO SBI 4421", f"NEFT{ref_counter}", f"{ym}-03", "15000.00", "", f"{current_balance:.2f}"])

        # 5th of month: Rent Payment
        ref_counter += 1
        current_balance -= 20000.00
        rows.append([f"{ym}-05", "UPI-RENT PAYMENT-MR SHARMA-sharma@icici", f"UPI{ref_counter}", f"{ym}-05", "20000.00", "", f"{current_balance:.2f}"])

        # 8th: Blinkit Groceries
        ref_counter += 1
        current_balance -= 1420.00
        rows.append([f"{ym}-08", "UPI-BLINKIT-blinkit@icici-ORDER1928", f"UPI{ref_counter}", f"{ym}-08", "1420.00", "", f"{current_balance:.2f}"])

        # 12th: Swiggy Dining
        ref_counter += 1
        current_balance -= 680.00
        rows.append([f"{ym}-12", "UPI-SWIGGY-swiggy@hdfcbank-FOOD482", f"UPI{ref_counter}", f"{ym}-12", "680.00", "", f"{current_balance:.2f}"])

        # 15th: Netflix Subscription
        ref_counter += 1
        current_balance -= 649.00
        rows.append([f"{ym}-15", "POS 412938 NETFLIX ENTERTAINMENT MUMBAI", f"POS{ref_counter}", f"{ym}-15", "649.00", "", f"{current_balance:.2f}"])

        # 18th: Airtel Postpaid
        ref_counter += 1
        current_balance -= 799.00
        rows.append([f"{ym}-18", "ACH D-BHARTI AIRTEL LIMITED", f"ACH{ref_counter}", f"{ym}-18", "799.00", "", f"{current_balance:.2f}"])

        # 22nd: Zomato Order
        ref_counter += 1
        current_balance -= 520.00
        rows.append([f"{ym}-22", "UPI-ZOMATO-zomato@hdfcbank-MEAL910", f"UPI{ref_counter}", f"{ym}-22", "520.00", "", f"{current_balance:.2f}"])

        # 25th: Zepto Groceries
        ref_counter += 1
        current_balance -= 1850.00
        rows.append([f"{ym}-25", "UPI-ZEPTO-zepto@axisbank-GROC391", f"UPI{ref_counter}", f"{ym}-25", "1850.00", "", f"{current_balance:.2f}"])

        # Special Seeded Anomaly in Feb 2025: Sudden Large Shopping Outlier
        if ym == "2025-02":
            ref_counter += 1
            current_balance -= 18400.00
            rows.append(["2025-02-14", "POS 981249 RELIANCE DIGITAL BANGALORE", f"POS{ref_counter}", "2025-02-14", "18400.00", "", f"{current_balance:.2f}"])

        # Special Seeded Duplicate in Mar 2025: Two charges on same day
        if ym == "2025-03":
            ref_counter += 1
            current_balance -= 2499.00
            rows.append(["2025-03-12", "POS 882103 GADGET ACCESSORIES BANGALORE", f"POS{ref_counter}", "2025-03-12", "2499.00", "", f"{current_balance:.2f}"])
            ref_counter += 1
            current_balance -= 2499.00
            rows.append(["2025-03-12", "POS 882103 GADGET ACCESSORIES BANGALORE", f"POS{ref_counter}", "2025-03-12", "2499.00", "", f"{current_balance:.2f}"])

    out_file = os.path.join(DATA_DIR, "aarav", "hdfc_statement.csv")
    write_csv_statement(out_file, headers, rows)
    return current_balance

def generate_aarav_sbi():
    """
    Aarav's SBI Savings Account (Rent & SIP & EMI):
    8 months (2024-08-01 to 2025-03-31)
    Opening Balance: ₹20,000.00
    Receives ₹15,000 on 3rd from HDFC
    HDFC Home Loan EMI: ₹7,500 on 10th
    Zerodha SIP: ₹5,000 on 12th
    """
    headers = ["Txn Date", "Description", "Ref No", "Debit", "Credit", "Balance"]
    rows = []
    
    current_balance = 20000.00
    months = ["2024-08", "2024-09", "2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03"]
    ref_counter = 500000

    for ym in months:
        # Inflow: Transfer from HDFC on 3rd
        ref_counter += 1
        current_balance += 15000.00
        rows.append([f"{ym}-03", "NEFT CR-HDFC BANK-AARAV KHUSH-OWN A/C", f"SBIN{ref_counter}", "", "15000.00", f"{current_balance:.2f}"])

        # Outflow: EMI on 10th
        ref_counter += 1
        current_balance -= 7500.00
        rows.append([f"{ym}-10", "ACH D-HDFC BANK LTD HOME LOAN EMI", f"ACH{ref_counter}", "7500.00", "", f"{current_balance:.2f}"])

        # Outflow: Mutual Fund SIP on 12th
        ref_counter += 1
        current_balance -= 5000.00
        rows.append([f"{ym}-12", "NACH-ZERODHA BROKING LTD SIP", f"NACH{ref_counter}", "5000.00", "", f"{current_balance:.2f}"])

    out_file = os.path.join(DATA_DIR, "aarav", "sbi_statement.csv")
    write_csv_statement(out_file, headers, rows)
    return current_balance

def generate_priya_freelance():
    """
    Priya's Freelance Account:
    Volatile income (CV > 0.30): swings between ₹35,000 and ₹1,25,000
    One historic bonus/incentive of ₹1,20,000 in April 2024 (excluded from future baseline)
    """
    headers = ["Date", "Narration", "Reference No", "Withdrawal", "Deposit", "Balance"]
    rows = []
    current_balance = 30000.00
    
    # 2024-04: Historic Bonus (older than 6 months)
    current_balance += 120000.00
    rows.append(["2024-04-10", "NEFT-CLIENT RETENTION BONUS-GLOBAL DESIGNS", "REF4001", "", "120000.00", f"{current_balance:.2f}"])
    current_balance -= 25000.00
    rows.append(["2024-04-15", "UPI-RENT PAYMENT-LANDLORD", "REF4002", "25000.00", "", f"{current_balance:.2f}"])

    # Recent 6 months with volatile income
    monthly_incomes = [
        ("2024-10", 45000.00),
        ("2024-11", 110000.00),
        ("2024-12", 35000.00),
        ("2025-01", 90000.00),
        ("2025-02", 40000.00),
        ("2025-03", 125000.00)
    ]

    for ym, income in monthly_incomes:
        # Variable freelance credit
        current_balance += income
        rows.append([f"{ym}-07", f"IMPS-INVOICE PAYMENT-STUDIO-{ym}", f"IMPS{ym.replace('-','')}", "", f"{income:.2f}", f"{current_balance:.2f}"])

        # Rent
        current_balance -= 25000.00
        rows.append([f"{ym}-10", "UPI-RENT-LANDLORD", f"UPI{ym.replace('-','')}1", "25000.00", "", f"{current_balance:.2f}"])

        # Adobe Creative Cloud
        current_balance -= 4230.00
        rows.append([f"{ym}-15", "POS ADOBE SYSTEMS INDIA SUBSCRIPTION", f"POS{ym.replace('-','')}2", "4230.00", "", f"{current_balance:.2f}"])

        # Variable living expenses
        current_balance -= 12000.00
        rows.append([f"{ym}-20", "UPI-SWIGGY-BLINKIT-LIVING EXPENSES", f"UPI{ym.replace('-','')}3", "12000.00", "", f"{current_balance:.2f}"])

    out_file = os.path.join(DATA_DIR, "priya", "icici_freelance.csv")
    write_csv_statement(out_file, headers, rows)
    return current_balance

def generate_short_statement():
    """
    Short Statement:
    Only 60 days of history (2025-01-01 to 2025-02-28).
    Triggers the Data Sufficiency Gate refusal: History < 90 days.
    """
    headers = ["Date", "Narration", "Ref", "Debit", "Credit", "Balance"]
    rows = []
    current_balance = 10000.00

    for ym in ["2025-01", "2025-02"]:
        current_balance += 50000.00
        rows.append([f"{ym}-01", "ACH SALARY CREDIT", "ACH11", "", "50000.00", f"{current_balance:.2f}"])
        current_balance -= 15000.00
        rows.append([f"{ym}-05", "UPI RENT", "UPI22", "15000.00", "", f"{current_balance:.2f}"])
        current_balance -= 12000.00
        rows.append([f"{ym}-20", "UPI EXPENSES", "UPI33", "12000.00", "", f"{current_balance:.2f}"])

    out_file = os.path.join(DATA_DIR, "short", "short_statement.csv")
    write_csv_statement(out_file, headers, rows)

def generate_gappy_statement():
    """
    Gappy Statement:
    Has a missing month (2024-11 present, 2025-01 present, but December missing!)
    Triggers the Data Sufficiency Gate: Date continuity gap > 7 days.
    """
    headers = ["Date", "Narration", "Ref", "Debit", "Credit", "Balance"]
    rows = []
    current_balance = 25000.00

    # November
    current_balance += 60000.00
    rows.append(["2024-11-01", "ACH SALARY CREDIT", "ACH1", "", "60000.00", f"{current_balance:.2f}"])
    current_balance -= 20000.00
    rows.append(["2024-11-15", "UPI EXPENSES", "UPI1", "20000.00", "", f"{current_balance:.2f}"])

    # GAP: 0 transactions in December!

    # January
    current_balance += 60000.00
    rows.append(["2025-01-05", "ACH SALARY CREDIT", "ACH2", "", "60000.00", f"{current_balance:.2f}"])
    current_balance -= 22000.00
    rows.append(["2025-01-20", "UPI EXPENSES", "UPI2", "22000.00", "", f"{current_balance:.2f}"])

    out_file = os.path.join(DATA_DIR, "gappy", "gappy_statement.csv")
    write_csv_statement(out_file, headers, rows)

if __name__ == "__main__":
    generate_aarav_hdfc()
    generate_aarav_sbi()
    generate_priya_freelance()
    generate_short_statement()
    generate_gappy_statement()
    print("All synthetic statements generated successfully!")

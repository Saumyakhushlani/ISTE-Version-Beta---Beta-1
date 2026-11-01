"""
Repeatable Synthetic Statement Generator for Diverse Real-World Banking Formats.
Generates test datasets for Financial Decision Lab (FDL) verifying dynamic CSV support:
- HDFC Bank standard
- State Bank of India (SBI) with preamble metadata
- ICICI Bank with currency suffix headers
- Axis Bank with abbreviated column headers
- Kotak Mahindra Bank with single Amount and Dr/Cr indicator column
- Semicolon-delimited (European/Enterprise) with signed single amount
- Tab-delimited (TSV)
- Pipe-delimited (|)
- Headerless CSV
- Quoted descriptions with embedded commas
- Indian number formats (lakhs grouping, currency symbols, DR/CR suffixes)
- Malformed rows and footer totals
- Running balance discrepancy statement
- UTF-8 with BOM
- Latin-1 / Windows-1252 encoded statement
"""

import os
import csv
from typing import List, Dict, Any

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_all_test_formats():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. HDFC Standard
    # Date,Narration,Chq/Ref No,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
    hdfc_rows = [
        ["Date", "Narration", "Chq/Ref No", "Value Dt", "Withdrawal Amt", "Deposit Amt", "Closing Balance"],
        ["2024-05-01", "ACH/SALARY/TECH LABS", "ACH101", "2024-05-01", "", "75000.00", "125000.00"],
        ["2024-05-05", "UPI-RENT PAYMENT-LANDLORD", "UPI102", "2024-05-05", "20000.00", "", "105000.00"],
        ["2024-05-10", "UPI-SWIGGY-BANGALORE", "UPI103", "2024-05-10", "650.00", "", "104350.00"],
        ["2024-05-15", "POS NETFLIX MUMBAI", "POS104", "2024-05-15", "649.00", "", "103701.00"],
        ["2024-05-20", "ACH D-BHARTI AIRTEL", "ACH105", "2024-05-20", "799.00", "", "102902.00"],
    ]
    with open(os.path.join(OUTPUT_DIR, "hdfc_standard.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(hdfc_rows)

    # 2. SBI with 7 lines of Preamble Metadata
    sbi_content = """STATE BANK OF INDIA
Account Name: Aarav Kumar
Account Number: XXXXXXXX4421
IFS Code: SBIN0001180
Branch: Indiranagar Bangalore
Statement Period: 01-May-2024 to 25-May-2024
----------------------------------------------------------------------------------------------------
Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
01-05-2024,01-05-2024,NEFT-FUNDS TRF FROM HDFC 1180,NEFT501,,15000.00,45000.00
08-05-2024,08-05-2024,ACH D-SBI CAR LOAN EMI,ACH502,12000.00,,33000.00
14-05-2024,14-05-2024,UPI-BESCOM ELECTRICITY BILL,UPI503,1850.00,,31150.00
20-05-2024,20-05-2024,UPI-ZERODHA BROKING SIP,UPI504,5000.00,,26150.00
"""
    with open(os.path.join(OUTPUT_DIR, "sbi_preamble.csv"), "w", encoding="utf-8") as f:
        f.write(sbi_content)

    # 3. ICICI with Currency Suffix Headers
    icici_rows = [
        ["Transaction Date", "Value Date", "Cheque Number", "Transaction Remarks", "Withdrawal Amount (INR )", "Deposit Amount (INR )", "Balance (INR )"],
        ["10/05/2024", "10/05/2024", "CHQ201", "INF*INVOICE 102*DESIGN CONSULT", "", "60,000.00", "95,000.00"],
        ["14/05/2024", "14/05/2024", "CHQ202", "UPI/ZOMATO/ORDER_981/ICICI", "450.00", "", "94,550.00"],
        ["18/05/2024", "18/05/2024", "CHQ203", "POS ADOBE SYSTEMS INDIA", "4,230.00", "", "90,320.00"],
        ["22/05/2024", "22/05/2024", "CHQ204", "UPI/BLINKIT/GROCERIES", "1,250.00", "", "89,070.00"],
    ]
    with open(os.path.join(OUTPUT_DIR, "icici_inr.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(icici_rows)

    # 4. Axis Bank Abbreviated Headers
    axis_rows = [
        ["Tran Date", "CHQNO", "PARTICULARS", "DR", "CR", "BAL", "SOL"],
        ["02-05-2024", "0", "SALARY CREDIT - ACME CORP", "", "85000.00", "110000.00", "104"],
        ["06-05-2024", "0", "RENT PAYMENT HDFC ACC 5521", "22000.00", "", "88000.00", "104"],
        ["11-05-2024", "0", "SWIGGY FOOD ORDER 4821", "540.00", "", "87460.00", "104"],
        ["16-05-2024", "0", "NETFLIX RECURRING BILLING", "649.00", "", "86811.00", "104"],
    ]
    with open(os.path.join(OUTPUT_DIR, "axis_abbrev.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(axis_rows)

    # 5. Kotak Single Amount with Dr / Cr Column
    kotak_rows = [
        ["Sl. No.", "Date", "Description", "Chq / Ref No.", "Dr / Cr", "Amount", "Balance"],
        ["1", "04/05/2024", "CLIENT RETAINER FEE", "REF801", "CR", "50000.00", "80000.00"],
        ["2", "07/05/2024", "OFFICE RENT", "REF802", "DR", "18000.00", "62000.00"],
        ["3", "12/05/2024", "AMAZON CLOUD HOSTING", "REF803", "DR", "3500.00", "58500.00"],
        ["4", "19/05/2024", "STARBUCKS COFFEE", "REF804", "DR", "720.00", "57780.00"],
    ]
    with open(os.path.join(OUTPUT_DIR, "kotak_drcr.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(kotak_rows)

    # 6. Semicolon-Delimited (Single Signed Amount)
    semicolon_content = """Booking Date;Partner Name;Remittance Information;Amount;Currency;Closing Balance
2024-05-01;Tech Labs;Monthly Payroll;75000.00;INR;100000.00
2024-05-04;Sharma Landlord;Apartment Rent;-20000.00;INR;80000.00
2024-05-09;Swiggy Delivery;Dinner Order;-750.50;INR;79249.50
2024-05-15;Netflix India;Entertainment Subscription;-649.00;INR;78600.50
"""
    with open(os.path.join(OUTPUT_DIR, "semicolon_delim.csv"), "w", encoding="utf-8") as f:
        f.write(semicolon_content)

    # 7. Tab-Delimited (TSV)
    tsv_content = """Date\tDescription\tReference\tDebit\tCredit\tBalance
2024-05-02\tACH/SALARY\tTSV01\t\t80000.00\t115000.00
2024-05-06\tUPI/RENT\tTSV02\t22000.00\t\t93000.00
2024-05-11\tUPI/GROCERY\tTSV03\t2450.00\t\t90550.00
2024-05-16\tACH/BROADBAND\tTSV04\t1199.00\t\t89351.00
"""
    with open(os.path.join(OUTPUT_DIR, "tab_delim.tsv"), "w", encoding="utf-8") as f:
        f.write(tsv_content)

    # 8. Pipe-Delimited (|)
    pipe_content = """Date|Narration|Chq_Ref|Withdrawal|Deposit|Balance
2024-05-03|FREELANCE PAYMENT|PIPE10||45000.00|70000.00
2024-05-07|HOUSE RENT|PIPE11|15000.00||55000.00
2024-05-12|SUPERMARKET SPEND|PIPE12|3200.00||51800.00
2024-05-17|SPOTIFY PREMIUM|PIPE13|119.00||51681.00
"""
    with open(os.path.join(OUTPUT_DIR, "pipe_delim.csv"), "w", encoding="utf-8") as f:
        f.write(pipe_content)

    # 9. Headerless Statement (No header line)
    headerless_content = """2024-05-01,ACH SALARY TECH CORP,REF01,,78000.00,105000.00
2024-05-05,UPI RENT MR SHARMA,REF02,20000.00,,85000.00
2024-05-10,UPI SWIGGY MEAL,REF03,620.00,,84380.00
2024-05-15,POS NETFLIX MUMBAI,REF04,649.00,,83731.00
2024-05-20,ACH BHARTI AIRTEL,REF05,799.00,,82932.00
"""
    with open(os.path.join(OUTPUT_DIR, "headerless.csv"), "w", encoding="utf-8") as f:
        f.write(headerless_content)

    # 10. Quoted Descriptions with Embedded Commas
    quoted_content = '''Date,Description,Reference,Debit,Credit,Balance
2024-05-01,"Salary from Tech Solutions, Inc., Bangalore",REF901,,85000.00,120000.00
2024-05-04,"Rent payment for Flat 402, Green Glen Layout",REF902,24000.00,,96000.00
2024-05-09,"Swiggy Order, Koramangala, Bangalore",REF903,840.00,,95160.00
2024-05-15,"Netflix Entertainment, Mumbai, MH",REF904,649.00,,94511.00
'''
    with open(os.path.join(OUTPUT_DIR, "quoted_commas.csv"), "w", encoding="utf-8") as f:
        f.write(quoted_content)

    # 11. Indian Number Formats (Lakh grouping, ₹ symbols, (parentheses), trailing DR/CR)
    indian_num_content = '''Date,Description,Reference,Withdrawal,Deposit,Balance
2024-05-01,CONSULTING FEE RETAINER,IN01,,"₹ 1,50,000.00","₹ 2,25,000.00"
2024-05-05,OFFICE LEASE ADVANCE,IN02,"(45,000.00)",,"₹ 1,80,000.00"
2024-05-10,COMPUTER EQUIPMENT VENDOR,IN03,"35,000.00 DR",,"1,45,000.00 CR"
2024-05-15,REFUND FOR RETURNED MONITORS,IN04,,"5,000.00 CR","1,50,000.00 CR"
'''
    with open(os.path.join(OUTPUT_DIR, "indian_numbering.csv"), "w", encoding="utf-8") as f:
        f.write(indian_num_content)

    # 12. Malformed Rows and Footer Totals
    malformed_content = """Date,Narration,Ref No,Withdrawal,Deposit,Balance

2024-05-01,ACH SALARY,REF1,,75000.00,110000.00
CORRUPTED_LINE_WITHOUT_DATE_AND_TOO_FEW_COLS
2024-05-05,UPI RENT,REF2,20000.00,,90000.00
2024-05-10,UPI SWIGGY,REF3,INVALID_AMOUNT,,90000.00
2024-05-15,POS NETFLIX,REF4,649.00,,89351.00

Total Debits: 20649.00 Total Credits: 75000.00
Closing Balance as on 31-05-2024: 89351.00
*** End of Statement ***
"""
    with open(os.path.join(OUTPUT_DIR, "malformed_and_footers.csv"), "w", encoding="utf-8") as f:
        f.write(malformed_content)

    # 13. Running Balance Discrepancy Statement (Row 3 balance has deliberate 500 INR mismatch)
    break_content = """Date,Narration,Ref No,Withdrawal,Deposit,Balance
2024-05-01,ACH SALARY,B01,,70000.00,100000.00
2024-05-05,UPI RENT,B02,20000.00,,80000.00
2024-05-10,UPI SWIGGY,B03,1000.00,,78500.00
2024-05-15,POS NETFLIX,B04,649.00,,77851.00
"""
    # Note on row 3: 80,000 - 1,000 = 79,000, but statement says 78,500! A 500 discrepancy.
    with open(os.path.join(OUTPUT_DIR, "running_balance_break.csv"), "w", encoding="utf-8") as f:
        f.write(break_content)

    # 14. UTF-8 with BOM (\xef\xbb\xbf)
    bom_content = "\ufeffDate,Description,Reference,Debit,Credit,Balance\n2024-05-01,ACH SALARY,BOM01,,65000.00,90000.00\n2024-05-05,UPI RENT,BOM02,18000.00,,72000.00\n"
    with open(os.path.join(OUTPUT_DIR, "bom_utf8.csv"), "w", encoding="utf-8-sig") as f:
        f.write(bom_content)

    # 15. Latin-1 / Windows-1252 Encoded Statement
    latin1_content = """Date,Narration,Ref No,Debit,Credit,Balance
2024-05-01,ACH SALARY CREDIT,L1,,70000.00,100000.00
2024-05-05,Café Coffee Day Indiranagar,L2,380.00,,99620.00
2024-05-10,Le Méridien Dining,L3,2400.00,,97220.00
"""
    with open(os.path.join(OUTPUT_DIR, "latin1_statement.csv"), "w", encoding="latin-1") as f:
        f.write(latin1_content)

    print(f"Successfully generated 15 test banking CSV formats in: {OUTPUT_DIR}")


if __name__ == "__main__":
    generate_all_test_formats()

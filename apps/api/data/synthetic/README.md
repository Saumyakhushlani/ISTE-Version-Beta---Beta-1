# Synthetic Bank Statement Datasets

This directory holds reproducible, deterministic bank statement datasets designed for hackathon testing and demoing key edge cases:

1. **Aarav**: Salaried engineer, 8 months of data, 2 accounts (HDFC CSV + SBI PDF), overlapping dates, rent, EMI, internal transfers, and credit card payments.
2. **Priya**: Freelance designer with irregular/volatile income, historical bonus, testing range and conservative P25 verdict.
3. **Short (2 Months)**: Statements covering only 60 days, triggering the Data Sufficiency Gate refusal with fix checklist.
4. **Gappy**: Account with missing calendar months, triggering gap warnings.
5. **Messy**: Multiple miscategorized merchants for demonstrating bulk user corrections and accuracy improvement.
6. **TimeTravel**: Statements through month $m$ plus month $m+1$ actuals for live forecast reconciliation.

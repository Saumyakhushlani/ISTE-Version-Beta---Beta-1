"""
CA-Ready ITR-1 Tax Preparation Report Generator for Financial Decision Lab (FDL).
Specialized for Salaried Individuals filing ITR-1 (Sahaj) for AY 2026-27 (FY 2025-26).

Generates a standards-compliant, high-fidelity PDF using ReportLab.
Guarantees 100% clean Latin-1 / ASCII text encoding to prevent corrupted PDF streams.
Includes two-pass Page X of Y numbering and structured tables aligned to ITR-1 schedules.
"""
import io
import re
from typing import Dict, Any, List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def clean_pdf_text(val: Any) -> str:
    """
    Sanitizes text strings to prevent Type-1 Helvetica Unicode encoding corruption.
    Converts rupee symbols, bullet dots, dashes, and smart quotes to clean equivalents.
    """
    if val is None:
        return ""
    s = str(val)
    s = s.replace("\u20b9", "Rs. ").replace("₹", "Rs. ")
    s = s.replace("\u00b7", "|").replace("·", "|").replace("•", "*")
    s = s.replace("\u2013", "-").replace("–", "-")
    s = s.replace("\u2014", "--").replace("—", "--")
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2026", "...")
    # Strip any remaining characters outside ASCII
    return s.encode("ascii", "replace").decode("ascii")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and print 'Page X of Y' in running footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor('#64748b'))

        # Running Top Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 815, "Financial Decision Lab  |  ITR-1 (Sahaj) Tax Preparation Assistant  |  AY 2026-27")
            self.setStrokeColor(colors.HexColor('#e2e8f0'))
            self.setLineWidth(0.5)
            self.line(36, 810, 559, 810)

        # Running Bottom Footer (All Pages)
        self.setStrokeColor(colors.HexColor('#e2e8f0'))
        self.setLineWidth(0.5)
        self.line(36, 32, 559, 32)

        footer_text = f"Page {self._pageNumber} of {page_count}   |   Exploratory ITR-1 Preparation Aid. Must be verified against official Form 16, AIS, and Form 26AS."
        self.drawString(36, 22, footer_text)
        self.drawRightString(559, 22, "CONFIDENTIAL  |  TAXPAYER COPY")
        self.restoreState()


def generate_tax_intelligence_pdf(data: Dict[str, Any]) -> bytes:
    """
    Generates a structured, multi-page, CA-Ready ITR-1 Tax Preparation PDF.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Define clean typography styles
    brand_style = ParagraphStyle(
        'Brand',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#059669'),
        spaceAfter=2
    )
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=19,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#475569'),
        spaceAfter=8
    )
    section_heading = ParagraphStyle(
        'SecHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13.5,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=10,
        spaceAfter=4
    )
    sub_heading = ParagraphStyle(
        'SubHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceBefore=6,
        spaceAfter=2
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white
    )
    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor('#854d0e')
    )
    note_box_style = ParagraphStyle(
        'NoteBoxText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor('#1e293b')
    )

    elements = []

    # 1. HEADER BANNER
    elements.append(Paragraph(clean_pdf_text("FINANCIAL DECISION LAB  |  TAX INTELLIGENCE SUITE"), brand_style))
    elements.append(Paragraph(clean_pdf_text("ITR-1 (Sahaj) Tax Preparation Assistant"), title_style))
    elements.append(Paragraph(clean_pdf_text(
        f"Assessment Year: {data.get('assessment_year', 'AY 2026-27')}   |   "
        f"Financial Year: {data.get('financial_year', 'FY 2025-26')}   |   "
        f"Taxpayer: {data.get('user_name', 'Salaried Individual')}   |   "
        f"Generated: {data.get('generated_at', 'Today')}"
    ), subtitle_style))

    # 2. LEGAL & SCOPE BOUNDARY NOTICE
    notice_text = (
        "<b>IMPORTANT NOTICE FOR TAXPAYER & CHARTERED ACCOUNTANT:</b> This document is an automated "
        "<b>ITR-1 preparation assistant</b> synthesised strictly from your uploaded bank transactions. "
        "It is <b>NOT</b> an official tax filing platform and does not calculate final tax liability or compute tax refunds. "
        "Bank credits represent net cash receipts and must be reconciled against your official <b>Form 16 Part B, "
        "Annual Information Statement (AIS), and Form 26AS</b> before submitting your income tax return."
    )
    notice_table = Table([[Paragraph(clean_pdf_text(notice_text), disclaimer_style)]], colWidths=[523])
    notice_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#f59e0b')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(notice_table)
    elements.append(Spacer(1, 8))

    # 3. SECTION A: PERSONAL & BANK INFORMATION
    elements.append(Paragraph("A. Personal & Bank Information", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    user_info_rows = [
        [
            Paragraph("<b>Taxpayer Name:</b>", table_cell),
            Paragraph(clean_pdf_text(data.get("user_name", "Salaried Individual")), table_cell_bold),
            Paragraph("<b>Status / Form:</b>", table_cell),
            Paragraph("Individual Resident / ITR-1 (Sahaj)", table_cell_bold)
        ],
        [
            Paragraph("<b>Assessment Year:</b>", table_cell),
            Paragraph(clean_pdf_text(data.get("assessment_year", "AY 2026-27")), table_cell_bold),
            Paragraph("<b>Financial Year:</b>", table_cell),
            Paragraph(clean_pdf_text(data.get("financial_year", "FY 2025-26")), table_cell_bold)
        ],
        [
            Paragraph("<b>Total Accounts Analyzed:</b>", table_cell),
            Paragraph(clean_pdf_text(str(data.get("total_accounts_analyzed", 1))), table_cell),
            Paragraph("<b>Total Transactions Analyzed:</b>", table_cell),
            Paragraph(clean_pdf_text(str(data.get("total_transactions_analyzed", 0))), table_cell)
        ]
    ]
    user_info_table = Table(user_info_rows, colWidths=[120, 140, 120, 143])
    user_info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(user_info_table)
    elements.append(Spacer(1, 4))

    # Bank Accounts Table
    bank_rows = [
        [
            Paragraph("Bank Name", table_header),
            Paragraph("Account Nickname", table_header),
            Paragraph("Type", table_header),
            Paragraph("Masked A/C No.", table_header),
            Paragraph("Refund Priority", table_header)
        ]
    ]
    for acct in data.get("accounts", []):
        bank_rows.append([
            Paragraph(clean_pdf_text(acct.get("bank", "Bank")), table_cell_bold),
            Paragraph(clean_pdf_text(acct.get("nickname", "A/C")), table_cell),
            Paragraph(clean_pdf_text(acct.get("type", "savings").capitalize()), table_cell),
            Paragraph(clean_pdf_text(f"xxxx{acct.get('masked_last4', '----')}"), table_cell),
            Paragraph("Primary (Refund A/C)" if acct.get("is_primary") else "Active Secondary", table_cell)
        ])
    if len(bank_rows) == 1:
        bank_rows.append([
            Paragraph("HDFC Bank", table_cell_bold),
            Paragraph("Salary Account", table_cell),
            Paragraph("Savings", table_cell),
            Paragraph("xxxx1180", table_cell),
            Paragraph("Primary (Refund A/C)", table_cell)
        ])

    bank_table = Table(bank_rows, colWidths=[130, 120, 75, 98, 100])
    bank_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(bank_table)
    elements.append(Spacer(1, 8))

    # 4. SECTION B: SALARY INCOME (ITR-1 PART B - B1)
    elements.append(Paragraph("B. Salary Income (ITR-1 Part B - Schedule B1)", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    salary_summary_text = (
        "Bank statements record <b>net salary in-hand</b> after employer deductions for Employee PF (EPF), "
        "Professional Tax (PT), and TDS under Section 192. For ITR-1 filing, <b>Gross Salary (Sec 17(1))</b>, "
        "Allowances exempt under Section 10 (HRA, LTA), and Perquisites (Sec 17(2)) must be copied from <b>Form 16 Part B</b>."
    )
    elements.append(Paragraph(clean_pdf_text(salary_summary_text), subtitle_style))

    # Month-wise salary credit summary table
    salary_txns = data.get("salary_transactions", [])
    if not salary_txns:
        # Fallback to income sources salary transactions
        for inc in data.get("income_sources", []):
            if "Salary" in inc.get("category", ""):
                salary_txns = inc.get("transactions", [])
                break

    sal_rows = [
        [
            Paragraph("Credit Date", table_header),
            Paragraph("Employer / Payer Narration", table_header),
            Paragraph("Bank Account", table_header),
            Paragraph("Status in ITR-1", table_header),
            Paragraph("Observed Net Credit", table_header)
        ]
    ]

    total_sal_minor = 0
    for st in salary_txns:
        amt = st.get("amount_minor", 0)
        total_sal_minor += amt
        sal_rows.append([
            Paragraph(clean_pdf_text(st.get("date", "")), table_cell),
            Paragraph(clean_pdf_text(st.get("description", "")), table_cell),
            Paragraph(clean_pdf_text(st.get("bank", "")), table_cell),
            Paragraph("Net Inflow [Verify Form 16]", table_cell),
            Paragraph(clean_pdf_text(f"Rs. {amt // 100:,}"), table_cell_bold)
        ])

    sal_rows.append([
        Paragraph("<b>Total Observed Salary Credits</b>", table_cell_bold),
        Paragraph(f"<b>{len(salary_txns)} Monthly Credits Observed</b>", table_cell_bold),
        Paragraph("", table_cell),
        Paragraph("<b>Total Net In-Hand:</b>", table_cell_bold),
        Paragraph(clean_pdf_text(f"<b>Rs. {total_sal_minor // 100:,}</b>"), table_cell_bold)
    ])

    sal_table = Table(sal_rows, colWidths=[70, 180, 85, 100, 88])
    sal_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(sal_table)
    elements.append(Spacer(1, 8))

    # 5. SECTION C: INCOME FROM OTHER SOURCES (ITR-1 PART B - B3)
    elements.append(Paragraph("C. Income from Other Sources (ITR-1 Part B - Schedule B3)", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    other_rows = [
        [
            Paragraph("Income Head", table_header),
            Paragraph("Statute", table_header),
            Paragraph("Observed Amount", table_header),
            Paragraph("Source Account(s)", table_header),
            Paragraph("CA Verification & Taxability Guidance", table_header)
        ]
    ]

    for inc in data.get("income_sources", []):
        if "Salary" in inc.get("category", ""):
            continue
        amt_str = f"Rs. {inc.get('observed_total_rs', 0):,}"
        sources = ", ".join(inc.get("sources", [])) or "Bank Accounts"
        other_rows.append([
            Paragraph(clean_pdf_text(f"<b>{inc.get('category')}</b>"), table_cell_bold),
            Paragraph(clean_pdf_text(inc.get("section", "")), table_cell),
            Paragraph(clean_pdf_text(f"<b>{amt_str}</b>"), table_cell_bold),
            Paragraph(clean_pdf_text(f"{sources}<br/>({inc.get('transaction_count', 0)} credits)"), table_cell),
            Paragraph(clean_pdf_text(inc.get("clarification", "")), table_cell)
        ])

    if len(other_rows) == 1:
        other_rows.append([
            Paragraph("Savings Bank Interest", table_cell_bold),
            Paragraph("Sec 56(2)(id)", table_cell),
            Paragraph("Rs. 0 [Check AIS]", table_cell_bold),
            Paragraph("All Accounts", table_cell),
            Paragraph("Quarterly interest credits. Cross-verify against Bank Interest Certificates and AIS.", table_cell)
        ])

    other_table = Table(other_rows, colWidths=[110, 65, 75, 105, 168])
    other_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(other_table)
    elements.append(Spacer(1, 8))

    # 6. SECTION D: HOUSE PROPERTY (ITR-1 PART B - B2)
    elements.append(Paragraph("D. House Property (ITR-1 Part B - Schedule B2)", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    hp_rows = [
        [
            Paragraph("Parameter", table_header),
            Paragraph("Bank Observed Data", table_header),
            Paragraph("Status in ITR-1", table_header),
            Paragraph("Required Computation / Missing Documents", table_header)
        ],
        [
            Paragraph("<b>Rental Income Received</b>", table_cell_bold),
            Paragraph("Rs. 0 (No tenant credits found)", table_cell),
            Paragraph("Deemed Let Out / Let Out", table_cell),
            Paragraph("Gross rent received minus Municipal Taxes paid minus 30% Standard Deduction (Sec 24(a)).", table_cell)
        ],
        [
            Paragraph("<b>Rent Paid Outlays (HRA)</b>", table_cell_bold),
            Paragraph(clean_pdf_text(f"Rs. {data.get('summary_metrics', {}).get('annual_rent_paid_rs', 0):,}"), table_cell_bold),
            Paragraph("Exemption Sec 10(13A)", table_cell),
            Paragraph("Collect valid Rent Agreement, monthly rent receipts, and Landlord PAN if rent > Rs. 1,00,000.", table_cell)
        ],
        [
            Paragraph("<b>Home Loan Interest</b>", table_cell_bold),
            Paragraph(clean_pdf_text("EMIs detected in statements"), table_cell),
            Paragraph("Loss under Sec 24(b)", table_cell),
            Paragraph("Bank statement combines principal and interest. Provisional Interest Certificate required from lender (Cap: Rs. 2,00,000).", table_cell)
        ]
    ]
    hp_table = Table(hp_rows, colWidths=[120, 110, 100, 193])
    hp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(hp_table)
    elements.append(Spacer(1, 8))

    # 7. SECTION E: POTENTIAL DEDUCTIONS & CHAPTER VI-A CLAIMS
    elements.append(Paragraph("E. Potential Deductions & Chapter VI-A Claims (ITR-1 Part C)", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    ded_rows = [
        [
            Paragraph("Deduction Section", table_header),
            Paragraph("Statutory Cap", table_header),
            Paragraph("Observed Outflow", table_header),
            Paragraph("Tax Regime", table_header),
            Paragraph("Eligibility & Verification Proof Needed", table_header)
        ]
    ]

    for d in data.get("deductions_guidance", []):
        obs_val = f"Rs. {d.get('observed_rs', 0):,}" if d.get('eligible') else "None detected"
        cap_val = f"Rs. {d.get('max_eligible_rs', 0):,}" if d.get('max_eligible_rs') else "As per rules"
        ded_rows.append([
            Paragraph(clean_pdf_text(f"<b>{d.get('section')}</b><br/><font color='#64748b'>{d.get('statute')}</font>"), table_cell_bold),
            Paragraph(clean_pdf_text(cap_val), table_cell),
            Paragraph(clean_pdf_text(f"<b>{obs_val}</b>"), table_cell_bold),
            Paragraph(clean_pdf_text(d.get("regime", "")), table_cell),
            Paragraph(clean_pdf_text(f"{d.get('summary')}<br/><b>Proof:</b> {d.get('proof_required')}"), table_cell)
        ])

    ded_table = Table(ded_rows, colWidths=[105, 65, 75, 88, 190])
    ded_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(ded_table)
    elements.append(Spacer(1, 8))

    # 8. SECTION F: TAXES PAID & TDS RECONCILIATION
    elements.append(Paragraph("F. Taxes Paid & TDS Reconciliation (ITR-1 Schedule TDS & IT)", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    tds_rows = [
        [
            Paragraph("TDS Head / Schedule", table_header),
            Paragraph("Deductor Category", table_header),
            Paragraph("TDS Rate / Threshold", table_header),
            Paragraph("Reconciliation Requirement", table_header)
        ],
        [
            Paragraph("<b>TDS on Salary (Sec 192)</b>", table_cell_bold),
            Paragraph("Employer", table_cell),
            Paragraph("Slab Rates as per regime", table_cell),
            Paragraph("Must reconcile Form 16 Part A TDS figure with Form 26AS Part A.", table_cell)
        ],
        [
            Paragraph("<b>TDS on Interest (Sec 194A)</b>", table_cell_bold),
            Paragraph("Banks (FD/RD interest)", table_cell),
            Paragraph("10% if interest > Rs. 40k", table_cell),
            Paragraph("Match interest income and TDS across all bank accounts in AIS / 26AS.", table_cell)
        ],
        [
            Paragraph("<b>TDS on Dividends (Sec 194)</b>", table_cell_bold),
            Paragraph("Companies / Mutual Funds", table_cell),
            Paragraph("10% if dividend > Rs. 5k", table_cell),
            Paragraph("Verify dividend credits against Form 26AS Part B.", table_cell)
        ],
        [
            Paragraph("<b>Advance Tax / Self-Assessment</b>", table_cell_bold),
            Paragraph("Taxpayer (Challan 280)", table_cell),
            Paragraph("Section 208 / 140A", table_cell),
            Paragraph("Verify BSR code, Challan Date, and Challan Serial Number on NSDL/TIN portal.", table_cell)
        ]
    ]
    tds_table = Table(tds_rows, colWidths=[120, 100, 100, 203])
    tds_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(tds_table)
    elements.append(Spacer(1, 8))

    # 9. SECTION G: MISSING INFORMATION & CA CHECKLIST
    elements.append(Paragraph("G. Missing Information & CA Verification Checklist", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    miss_rows = [
        [
            Paragraph("[ ]", table_header),
            Paragraph("Required Document / Field", table_header),
            Paragraph("Issuing Authority", table_header),
            Paragraph("Why Bank Data Cannot Establish", table_header),
            Paragraph("Action Checklist for Taxpayer & CA", table_header)
        ]
    ]

    for m in data.get("missing_information", []):
        miss_rows.append([
            Paragraph("[  ]", table_cell_bold),
            Paragraph(clean_pdf_text(f"<b>{m.get('document')}</b>"), table_cell_bold),
            Paragraph(clean_pdf_text(m.get("issuer", "")), table_cell),
            Paragraph(clean_pdf_text(m.get("why_bank_cannot_establish", "")), table_cell),
            Paragraph(clean_pdf_text(m.get("action", "")), table_cell)
        ])

    miss_table = Table(miss_rows, colWidths=[18, 105, 95, 140, 165])
    miss_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    elements.append(miss_table)
    elements.append(Spacer(1, 8))

    # 10. SECTION H: AUDITED NON-TAXABLE INFLOWS
    elements.append(Paragraph("H. Non-Taxable Inflows Audit Trail (Exclusion Proof)", section_heading))
    elements.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor('#0f172a'), spaceBefore=1, spaceAfter=4))

    excl_rows = [
        [
            Paragraph("Excluded Category", table_header),
            Paragraph("Observed Amount", table_header),
            Paragraph("Count", table_header),
            Paragraph("Statutory / Accounting Reason for Non-Taxability", table_header)
        ]
    ]
    for ex in data.get("excluded_inflows", []):
        amt_str = f"Rs. {ex.get('total_rs', 0):,}"
        excl_rows.append([
            Paragraph(clean_pdf_text(f"<b>{ex.get('type')}</b>"), table_cell_bold),
            Paragraph(clean_pdf_text(f"<b>{amt_str}</b>"), table_cell_bold),
            Paragraph(clean_pdf_text(str(ex.get("count", 0))), table_cell),
            Paragraph(clean_pdf_text(ex.get("reason", "")), table_cell)
        ])
    excl_table = Table(excl_rows, colWidths=[130, 75, 45, 273])
    excl_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#065f46')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(excl_table)
    elements.append(Spacer(1, 8))

    # Build the document using NumberedCanvas for exact Page X of Y
    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()

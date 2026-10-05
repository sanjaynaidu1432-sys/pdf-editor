import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
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
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 36, "Confidential - Acme Global Corporation")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_text)
        self.restoreState()

def generate_offer_letter(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_LEFT,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#3b82f6"),
        alignment=TA_LEFT,
        spaceAfter=15
    )
    normal_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=10
    )
    bold_style = ParagraphStyle(
        'BodyBold',
        parent=normal_style,
        fontName='Helvetica-Bold'
    )
    italic_style = ParagraphStyle(
        'BodyItalic',
        parent=normal_style,
        fontName='Helvetica-Oblique',
        textColor=colors.HexColor("#475569")
    )
    section_h2 = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=12,
        spaceAfter=6
    )

    story = []

    story.append(Paragraph("ACME GLOBAL TECHNOLOGIES INC.", title_style))
    story.append(Paragraph("100 Innovation Way, Suite 400, San Francisco, CA 94105", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=15))

    story.append(Paragraph("<b>Date:</b> October 15, 2026", normal_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Candidate:</b> John Smith", normal_style))
    story.append(Paragraph("<b>Age:</b> 21", normal_style))
    story.append(Paragraph("<b>Address:</b> 742 Evergreen Terrace, Springfield, OR 97477", normal_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Dear John Smith,", bold_style))
    story.append(Paragraph(
        "On behalf of Acme Global Technologies Inc., we are thrilled to extend an offer of employment "
        "for the position of <b>Senior Software Engineer</b> reporting to the Vice President of Engineering. "
        "We were exceedingly impressed by your background, technical expertise, and vision.",
        normal_style
    ))

    story.append(Paragraph("Compensation & Benefits Summary", section_h2))

    data = [
        ["Component", "Details", "Annual Value"],
        ["Base Salary", "Semi-monthly payments of $6,041.67", "$145,000"],
        ["Performance Bonus", "Target 15% based on individual & company goals", "$21,750"],
        ["Equity Grant", "4,000 Restricted Stock Units (RSUs), 4-year vesting", "$80,000"],
        ["Retirement 401(k)", "5% company dollar-for-dollar match", "$7,250"],
        ["Total Target", "First year annualized compensation", "$254,000"]
    ]

    t = Table(data, colWidths=[130, 250, 120])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e40af")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0, 2), (-1, 2), colors.white),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#f8fafc")),
        ('BACKGROUND', (0, 4), (-1, 4), colors.white),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor("#e0e7ff")),
        ('FONTNAME', (0, 5), (-1, 5), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Terms and Conditions", section_h2))
    story.append(Paragraph(
        "Your official start date will be <b>November 1, 2026</b>. This offer is contingent upon "
        "successful completion of standard pre-employment verification and references.",
        normal_style
    ))
    story.append(Paragraph(
        "<i>Please sign and return this agreement by October 22, 2026 to indicate your formal acceptance.</i>",
        italic_style
    ))
    story.append(Spacer(1, 16))

    sig_data = [
        ["Accepted and Agreed:", "For Acme Global Technologies:"],
        ["____________________________", "____________________________"],
        ["John Smith (Candidate)", "Sarah Jenkins (Chief People Officer)"],
        ["Date: ______________________", "Date: October 15, 2026"]
    ]
    st = Table(sig_data, colWidths=[250, 250])
    st.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#334155")),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
        ('TOPPADDING', (0, 2), (-1, 2), 2),
    ]))
    story.append(st)

    doc.build(story, canvasmaker=NumberedCanvas)

def generate_invoice(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'InvHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#047857")
    )
    meta_style = ParagraphStyle(
        'InvMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155")
    )
    meta_bold = ParagraphStyle(
        'InvMetaB',
        parent=meta_style,
        fontName='Helvetica-Bold'
    )

    story = []

    header_table_data = [
        [
            Paragraph("APEX CONSULTING GROUP", header_style),
            Paragraph("<b>INVOICE</b><br/><b>Invoice #:</b> INV-2026-904<br/><b>Date:</b> October 10, 2026<br/><b>Due Date:</b> November 10, 2026", meta_style)
        ]
    ]
    ht = Table(header_table_data, colWidths=[300, 204])
    ht.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    story.append(ht)
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#10b981"), spaceAfter=15))

    bill_to_data = [
        [
            Paragraph("<b>Billed From:</b><br/>Apex Consulting Group LLC<br/>500 Market St, Floor 12<br/>San Francisco, CA 94105<br/>billing@apexconsulting.io", meta_style),
            Paragraph("<b>Billed To:</b><br/>Nexus Dynamics Corporation<br/>Attn: David Miller<br/>1200 Tech Boulevard<br/>Austin, TX 78701", meta_style)
        ]
    ]
    bt = Table(bill_to_data, colWidths=[250, 254])
    bt.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(bt)
    story.append(Spacer(1, 20))

    items = [
        ["Item Description", "Hours", "Hourly Rate", "Amount"],
        ["Full-Stack System Architecture Design", "40", "$185.00", "$7,400.00"],
        ["Database Schema & Migration Optimization", "25", "$185.00", "$4,625.00"],
        ["React Frontend UI/UX Redesign", "50", "$160.00", "$8,000.00"],
        ["Automated End-to-End Test Suite Setup", "15", "$150.00", "$2,250.00"],
        ["DevOps CI/CD Deployment Pipeline Configuration", "20", "$175.00", "$3,500.00"],
        ["Subtotal", "", "", "$25,775.00"],
        ["Sales Tax (0.00%)", "", "", "$0.00"],
        ["Total Amount Due", "", "", "$25,775.00"]
    ]
    it = Table(items, colWidths=[250, 70, 90, 94])
    it.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#065f46")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, 5), 0.5, colors.HexColor("#d1d5db")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#f0fdf4")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#f0fdf4")),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor("#f0fdf4")),
        ('FONTNAME', (0, 6), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 8), (-1, 8), colors.HexColor("#dcfce7")),
        ('TEXTCOLOR', (0, 8), (-1, 8), colors.HexColor("#065f46")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(it)
    story.append(Spacer(1, 20))

    story.append(Paragraph("<b>Payment Terms:</b> Net 30 Days. Wire transfer instructions provided upon request.", meta_style))
    story.append(Paragraph("Thank you for choosing Apex Consulting Group!", ParagraphStyle('Thanks', parent=meta_style, fontName='Helvetica-Oblique', textColor=colors.HexColor("#047857"))))

    doc.build(story, canvasmaker=NumberedCanvas)

def generate_multi_page_report(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    styles = getSampleStyleSheet()

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=8
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#4338ca"),
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceAfter=10
    )

    story = []

    # Page 1
    story.append(Paragraph("Q3 Operational Excellence & Growth Report", h1_style))
    story.append(Paragraph("Prepared by: Strategic Insights & Planning Group | Date: October 2026", ParagraphStyle('Sub', parent=body_style, fontName='Helvetica-Oblique', textColor=colors.HexColor("#6366f1"))))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4f46e5"), spaceAfter=15))

    story.append(Paragraph("1. Executive Summary", h2_style))
    story.append(Paragraph(
        "During the third quarter of 2026, our enterprise recorded strong performance across all core metrics. "
        "Product velocity increased by 28% following the implementation of streamlined automation pipelines. "
        "Customer satisfaction reached an all-time high of 94.6%, reflecting our deep commitment to reliability.",
        body_style
    ))

    story.append(Paragraph("2. Financial Performance & Key Metrics", h2_style))
    metrics_data = [
        ["Metric Category", "Q2 Actual", "Q3 Target", "Q3 Actual", "YoY Growth"],
        ["Recurring Revenue (ARR)", "$14.2M", "$15.0M", "$15.8M", "+32.1%"],
        ["Net Retention Rate", "116%", "118%", "121%", "+4.5%"],
        ["Operating Margin", "22.4%", "24.0%", "25.2%", "+2.8%"],
        ["Active Enterprise Accounts", "412", "450", "468", "+26.8%"],
        ["System Uptime (SLA)", "99.95%", "99.99%", "99.995%", "+0.04%"]
    ]
    mt = Table(metrics_data, colWidths=[150, 85, 85, 85, 99])
    mt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#312e81")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#f5f3ff")),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor("#f5f3ff")),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor("#f5f3ff")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(mt)
    story.append(Spacer(1, 15))

    story.append(Paragraph("3. Departmental Highlights", h2_style))
    story.append(Paragraph(
        "<b>Engineering & Product:</b> Successfully launched the v3 cloud infrastructure with zero downtime. "
        "Migrated 100% of legacy database clusters to modern high-availability instances.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Sales & Customer Success:</b> Closed 18 new Fortune 500 contracts with an average contract length of 2.8 years.",
        body_style
    ))

    # Page Break to Page 2
    story.append(PageBreak())

    # Page 2
    story.append(Paragraph("4. Strategic Initiatives for Q4 2026", h2_style))
    story.append(Paragraph(
        "Looking forward to the fourth quarter, the primary strategic focus will center on expanding international market "
        "coverage across the EMEA and APAC regions. We project total annual recurring revenue to surpass $68M by year-end.",
        body_style
    ))

    story.append(Paragraph("5. Risk Mitigation & Compliance", h2_style))
    story.append(Paragraph(
        "Our cybersecurity audits achieved SOC2 Type II recertification with zero non-conformities. "
        "Data protection procedures adhere strictly to global regulatory requirements.",
        body_style
    ))

    story.append(Spacer(1, 15))
    sign_data = [
        ["Report Prepared By:", "Approved By:"],
        ["Marcus Vance", "Elena Rostova"],
        ["Head of Business Intelligence", "Chief Operating Officer"],
        ["Acme Global Technologies Inc.", "Acme Global Technologies Inc."]
    ]
    st = Table(sign_data, colWidths=[250, 254])
    st.setStyle(TableStyle([
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#334155")),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(st)

    doc.build(story, canvasmaker=NumberedCanvas)

if __name__ == "__main__":
    os.makedirs("samples", exist_ok=True)
    generate_offer_letter("samples/offer_letter.pdf")
    generate_invoice("samples/invoice.pdf")
    generate_multi_page_report("samples/multi_page_report.pdf")
    print("Generated sample PDFs successfully in samples/")

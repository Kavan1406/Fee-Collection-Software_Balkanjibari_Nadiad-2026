"""
registration_receipt.py — PDF receipt generator for student registration payments.
A5 Landscape format (210mm x 148.5mm) with rounded border.
"""

from io import BytesIO
from datetime import date
from django.utils import timezone
from reportlab.lib.pagesizes import A5, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas as pdfcanvas
import os


class ReceiptCanvasWithBorder(pdfcanvas.Canvas):
    """Custom canvas that draws a rounded border and logo watermark on every page."""

    def __init__(self, *args, **kwargs):
        pdfcanvas.Canvas.__init__(self, *args, **kwargs)

    def showPage(self):
        self._draw_page_decoration()
        pdfcanvas.Canvas.showPage(self)

    def save(self):
        pdfcanvas.Canvas.save(self)

    def _draw_page_decoration(self):
        from django.conf import settings
        from reportlab.lib.colors import HexColor, black

        page_w, page_h = landscape(A5)
        margin = 6 * mm

        # Rounded border
        self.saveState()
        self.setStrokeColor(HexColor('#4F46E5'))
        self.setLineWidth(1.2)
        self.roundRect(margin, margin, page_w - 2 * margin, page_h - 2 * margin, radius=5 * mm, stroke=1, fill=0)
        self.restoreState()

        # Watermark logo in centre
        logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
        if os.path.exists(logo_path):
            self.saveState()
            self.setFillAlpha(0.04)
            wm_size = 70 * mm
            self.drawImage(logo_path,
                           (page_w - wm_size) / 2,
                           (page_h - wm_size) / 2,
                           width=wm_size, height=wm_size,
                           mask='auto', preserveAspectRatio=True)
            self.restoreState()


def generate_receipt_pdf(student, razorpay_order_id: str = None) -> bytes:
    """Generate a high-quality A5 landscape fee receipt with rounded border."""
    from apps.students.models import Student
    try:
        # If student_id was passed instead of object
        if isinstance(student, (int, str)):
            student = Student.objects.get(id=student)

        enrollments = student.enrollments.filter(is_deleted=False).select_related('subject')

        buffer = BytesIO()
        pagesize = landscape(A5)  # 210mm x 148mm
        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            rightMargin=1.0 * cm,
            leftMargin=1.0 * cm,
            topMargin=0.7 * cm,
            bottomMargin=0.6 * cm,
            title=f"Receipt_{student.student_id}"
        )

        styles = getSampleStyleSheet()
        story = []

        # ---- Color palette ----
        indigo = colors.HexColor('#4F46E5')
        dark = colors.HexColor('#0F172A')
        slate = colors.HexColor('#475569')
        light_slate = colors.HexColor('#F8FAFC')
        green = colors.HexColor('#16A34A')

        # Logo
        logo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                 'apps', 'payments', 'static', 'images', 'logo.png')
        logo_img = None
        logo_img_r = None
        if os.path.exists(logo_path):
            logo_img = Image(logo_path, width=2.0 * cm, height=2.0 * cm)
            logo_img_r = Image(logo_path, width=2.0 * cm, height=2.0 * cm)

        # ---- Header --- 3 column: Logo | Title | Logo
        # Title moved up with tighter spacing
        h_title_style = ParagraphStyle('HTitle', fontSize=20, fontName='Helvetica-Bold',
                                       textColor=indigo, alignment=TA_CENTER, leading=22)
        h_sub_style = ParagraphStyle('HSub', fontSize=8.5, fontName='Helvetica-Bold',
                                     textColor=dark, alignment=TA_CENTER, leading=10)
        h_addr_style = ParagraphStyle('HAddr', fontSize=7, fontName='Helvetica',
                                      textColor=slate, alignment=TA_CENTER, leading=9)

        header_text = [
            Paragraph("BALKANJI NI BARI", h_title_style),
            Paragraph("SUMMER CAMP 2026  ·  NADIAD", h_sub_style),
            Paragraph("Mill Road, Nadiad - 387 001. Gujarat, India.", h_addr_style),
        ]

        header_table = Table([[logo_img or "", header_text, logo_img_r or ""]],
                             colWidths=[2.4 * cm, 14.2 * cm, 2.4 * cm])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.15 * cm))

        # ---- NO horizontal line ----

        # ---- Receipt Title Bar ----
        title_style = ParagraphStyle('Title', fontSize=11, fontName='Helvetica-Bold',
                                     textColor=dark, alignment=TA_CENTER)
        title_table = Table([[Paragraph("FEE RECEIPT", title_style)]],
                            colWidths=[19 * cm])
        title_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), light_slate),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.grey),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(title_table)
        story.append(Spacer(1, 0.2 * cm))

        # ---- Student Details ----
        lbl_s = ParagraphStyle('Label', fontSize=8, fontName='Helvetica-Bold', textColor=slate)
        val_s = ParagraphStyle('Value', fontSize=8.5, fontName='Helvetica-Bold', textColor=dark)

        receipt_date = timezone.now().strftime('%d %B %Y, %I:%M %p')
        receipt_no = f"REC-2026-{student.id:04d}"

        col1 = [
            [Paragraph('<b>Student Name:</b>', lbl_s), Paragraph(student.name.upper(), val_s)],
            [Paragraph('<b>Student ID:</b>', lbl_s), Paragraph(student.student_id, val_s)],
            [Paragraph('<b>Mobile:</b>', lbl_s), Paragraph(student.phone or '—', val_s)],
        ]
        col2 = [
            [Paragraph('<b>Receipt No:</b>', lbl_s), Paragraph(receipt_no, val_s)],
            [Paragraph('<b>Date:</b>', lbl_s), Paragraph(receipt_date, val_s)],
            [Paragraph('<b>Payment Ref:</b>', lbl_s), Paragraph(razorpay_order_id or '—', val_s)],
        ]

        t1 = Table(col1, colWidths=[2.6 * cm, 6.9 * cm])
        t1.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                 ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                                 ('TOPPADDING', (0, 0), (-1, -1), 1)]))
        t2 = Table(col2, colWidths=[2.6 * cm, 6.9 * cm])
        t2.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                 ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                                 ('TOPPADDING', (0, 0), (-1, -1), 1)]))

        story.append(Table([[t1, t2]], colWidths=[9.5 * cm, 9.5 * cm]))
        story.append(Spacer(1, 0.15 * cm))

        # ---- Subject Fee Table (NO "Enrolled Subjects" heading, directly table) ----
        fee_data = [['#', 'Subject', 'Batch Time', 'SubFee', 'LibFee', 'Total']]
        grand_total = 0

        for i, enr in enumerate(enrollments, 1):
            sub_fee = float(enr.total_fee) - (10.0 if enr.include_library_fee else 0)
            lib_fee = 10.0 if enr.include_library_fee else 0
            total = float(enr.total_fee)
            grand_total += total
            fee_data.append([
                str(i),
                enr.subject.name,
                enr.batch_time,
                f"Rs.{sub_fee:,.0f}",
                f"Rs.{lib_fee:,.0f}",
                f"Rs.{total:,.0f}",
            ])




        fee_data.append(['', '', '', '', Paragraph('<b>TOTAL PAID</b>', lbl_s),
                          Paragraph(f'<b>Rs.{grand_total:,.0f}</b>', val_s)])

        fee_table = Table(fee_data, colWidths=[0.7 * cm, 6.5 * cm, 4.0 * cm, 2.3 * cm, 2.3 * cm, 2.7 * cm])
        fee_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), indigo),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (2, -1), 'LEFT'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F0FDF4')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ]))
        story.append(fee_table)
        story.append(Spacer(1, 0.15 * cm))

        # ---- Payment Status ----
        status_s = ParagraphStyle('PS', fontSize=9, fontName='Helvetica-Bold', textColor=green)
        story.append(Paragraph("✅  PAYMENT STATUS: PAID", status_s))
        story.append(Spacer(1, 0.1 * cm))
        
        # ---- Computer-generated notice ----
        notice_style = ParagraphStyle('Notice', fontSize=7, fontName='Helvetica-Oblique',
                                      textColor=slate, alignment=TA_CENTER)
        story.append(Paragraph(
            "This is a computer-generated receipt and does not require a physical signature.",
            notice_style
        ))
        story.append(Spacer(1, 0.1 * cm))

        # ---- Footer ----
        footer_style = ParagraphStyle('Footer', fontSize=6.5, fontName='Helvetica',
                                      textColor=slate, alignment=TA_CENTER)
        story.append(Paragraph(
            "Balkanji Ni Bari | Nadiad, Gujarat | Summer Camp Activities 2026",
            footer_style
        ))

        doc.build(story, canvasmaker=ReceiptCanvasWithBorder)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        return _simple_text_receipt(student, razorpay_order_id)


def _simple_text_receipt(student, order_id: str) -> bytes:
    """Fallback plain-text receipt if reportlab rendering fails."""
    lines = [
        "BALKANJI NI BARI - NADIAD",
        "Summer Camp Activities 2026",
        "=" * 40,
        "FEE RECEIPT",
        "=" * 40,
        f"Student Name : {student.name}",
        f"Student ID   : {student.student_id}",
        f"Username     : {student.login_username}",
        f"Mobile       : {student.phone}",
        f"Email        : {student.email}",
        f"Date         : {timezone.now().strftime('%d %B %Y')}",
        f"Payment Ref  : {order_id}",
        "-" * 40,
        "ENROLLED SUBJECTS",
        "-" * 40,
    ]
    grand_total = 0
    for enr in student.enrollments.filter(is_deleted=False).select_related('subject'):
        lines.append(f"  {enr.subject.name} ({enr.batch_time}) — Rs.{enr.total_fee:.0f}")
        grand_total += float(enr.total_fee)
    lines += ["-" * 40, f"TOTAL PAID: Rs.{grand_total:.0f}", "=" * 40, "PAYMENT STATUS: PAID"]
    return "\n".join(lines).encode('utf-8')

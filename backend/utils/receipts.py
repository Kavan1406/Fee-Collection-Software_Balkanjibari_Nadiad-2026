"""
Utility for generating itemized fee receipts as PDFs.
Standard A5 Landscape format (210mm x 148.5mm) with blue rounded border.
Unified design used across Registration and Dashboard.
"""

import os
from io import BytesIO
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from reportlab.lib.pagesizes import A5, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black, grey
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def _draw_page_decoration(canv, doc):
    """Draw rounded border and watermark on each page without creating blank trailing pages."""
    page_w, page_h = landscape(A5)
    margin = 6 * mm

    # Rounded border
    canv.saveState()
    canv.setStrokeColor(HexColor('#4F46E5'))
    canv.setLineWidth(1.2)
    canv.roundRect(margin, margin, page_w - 2 * margin, page_h - 2 * margin,
                   radius=5 * mm, stroke=1, fill=0)
    canv.restoreState()

    # Watermark logo in centre
    logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
    if os.path.exists(logo_path):
        canv.saveState()
        canv.setFillAlpha(0.04)
        wm_size = 70 * mm
        canv.drawImage(
            logo_path,
            (page_w - wm_size) / 2,
            (page_h - wm_size) / 2,
            width=wm_size,
            height=wm_size,
            mask='auto',
            preserveAspectRatio=True,
        )
        canv.restoreState()

def generate_receipt_pdf(payment=None, student=None, order_id=None):
    """
    Standardized design for the entire Balkanjibari system.
    Can generate for a single payment OR a consolidated student registration (order_id).
    """
    if payment:
        # When a single payment is passed, show ALL successful payments for that student
        enrollment = getattr(payment, 'enrollment', None)
        student = student or (getattr(enrollment, 'student', None) if enrollment else None)
        
        # Get all successful payments for this student
        if student:
            from apps.payments.models import Payment as PaymentModel
            # Get latest successful payment per enrollment to show all subjects
            latest_successful_by_enrollment = {}
            successful_payments = PaymentModel.objects.filter(
                enrollment__student=student,
                enrollment__is_deleted=False,
                is_deleted=False,
                status='SUCCESS',
            ).select_related('enrollment__subject').order_by('enrollment_id', '-created_at')

            for p in successful_payments:
                if p.enrollment_id not in latest_successful_by_enrollment:
                    latest_successful_by_enrollment[p.enrollment_id] = p

            payments = list(latest_successful_by_enrollment.values())
            enrollments = [p.enrollment for p in payments]
        else:
            payments = [payment]
            enrollments = [enrollment] if enrollment else []
    elif student and order_id:
        from apps.payments.models import Payment
        payments = list(Payment.objects.filter(enrollment__student=student, razorpay_order_id=order_id, status='SUCCESS'))
        enrollments = [p.enrollment for p in payments]
    elif student:
        # Student-level consolidated receipt: include latest successful payment per enrollment.
        from apps.payments.models import Payment
        latest_successful_by_enrollment = {}
        successful_payments = Payment.objects.filter(
            enrollment__student=student,
            enrollment__is_deleted=False,
            is_deleted=False,
            status='SUCCESS',
        ).select_related('enrollment__subject').order_by('enrollment_id', '-created_at')

        for paid in successful_payments:
            if paid.enrollment_id not in latest_successful_by_enrollment:
                latest_successful_by_enrollment[paid.enrollment_id] = paid

        payments = list(latest_successful_by_enrollment.values())
        enrollments = [p.enrollment for p in payments]
    else:
        return _generate_minimal_receipt_pdf()

    buffer = BytesIO()
    pagesize = landscape(A5)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        rightMargin=0.5 * cm,
        leftMargin=0.5 * cm,
        topMargin=0.4 * cm,
        bottomMargin=0.4 * cm,
        title=f"Receipt_{student.student_id if student else 'Fee'}"
    )

    styles = getSampleStyleSheet()
    story = []

    # ---- Color palette ----
    indigo = HexColor('#4F46E5')
    dark = HexColor('#0F172A')
    slate = HexColor('#475569')
    light_slate = HexColor('#F8FAFC')
    green = HexColor('#16A34A')

    # Header section
    logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
    logo_img = None
    logo_img_right = None
    if os.path.exists(logo_path):
        logo_img = Image(logo_path, width=1.6 * cm, height=1.6 * cm)
        logo_img_right = Image(logo_path, width=1.6 * cm, height=1.6 * cm)

    h_title_style = ParagraphStyle('HTitle', fontSize=22, fontName='Helvetica-Bold',
                                   textColor=indigo, alignment=TA_CENTER, leading=24)
    h_sub_style = ParagraphStyle('HSub', fontSize=9, fontName='Helvetica-Bold',
                                 textColor=dark, alignment=TA_CENTER, leading=11)
    h_addr_style = ParagraphStyle('HAddr', fontSize=7.5, fontName='Helvetica',
                                  textColor=slate, alignment=TA_CENTER, leading=10)

    header_text = [
        Paragraph("BALKANJI NI BARI", h_title_style),
        Paragraph("SUMMER CAMP 2026  ·  NADIAD", h_sub_style),
        Paragraph("Mill Road, Nadiad - 387 001. Gujarat, India.", h_addr_style),
    ]

    header_table = Table([[logo_img or "", header_text, logo_img_right or ""]],
                         colWidths=[2.0 * cm, 15.0 * cm, 2.0 * cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.2 * cm))

    # Fee Receipt Title Bar (Matching Image 1 EXACTLY)
    title_style = ParagraphStyle('Title', fontSize=12, fontName='Helvetica-Bold',
                                 textColor=dark, alignment=TA_CENTER)
    title_table = Table([[Paragraph("FEE RECEIPT", title_style)]],
                        colWidths=[19.0 * cm])
    title_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 0.8, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(title_table)
    story.append(Spacer(1, 0.15 * cm))

    # Student Details
    lbl_s = ParagraphStyle('Label', fontSize=8, fontName='Helvetica-Bold', textColor=slate)
    val_s = ParagraphStyle('Value', fontSize=8.5, fontName='Helvetica-Bold', textColor=dark)

    receipt_date = timezone.now().strftime('%d %B %Y')
    if payments and len(payments) > 0:
        # Use the first (earliest) payment's receipt number for the student
        first_payment = payments[0]
        receipt_no = first_payment.receipt_number or f"REC-{first_payment.id:04d}"
        pay_mode = first_payment.payment_mode if len(payments) == 1 else "MULTIPLE"
    elif order_id:
        receipt_no = f"REG-2026-{student.id:04d}"
        pay_mode = "ONLINE"
    else:
        receipt_no = "N/A"
        pay_mode = "N/A"

    col1 = [
        [Paragraph('<b>Student Name:</b>', lbl_s), Paragraph(student.name.upper() if student else 'N/A', val_s)],
        [Paragraph('<b>Student ID:</b>', lbl_s), Paragraph(student.student_id if student else 'N/A', val_s)],
        [Paragraph('<b>Mobile:</b>', lbl_s), Paragraph(student.phone if student else '—', val_s)],
    ]
    col2 = [
        [Paragraph('<b>Receipt No:</b>', lbl_s), Paragraph(receipt_no, val_s)],
        [Paragraph('<b>Date:</b>', lbl_s), Paragraph(receipt_date, val_s)],
        [Paragraph('<b>Payment Mode:</b>', lbl_s), Paragraph(pay_mode, val_s)],
    ]

    t1 = Table(col1, colWidths=[2.6 * cm, 6.9 * cm])
    t1.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))
    t2 = Table(col2, colWidths=[2.6 * cm, 6.9 * cm])
    t2.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))

    story.append(Table([[t1, t2]], colWidths=[9.5 * cm, 9.5 * cm]))
    story.append(Spacer(1, 0.1 * cm))

    # Enrollments Table
    fee_data = [['Sr no.', 'Subject', 'Batch Time', 'SubFee', 'LibFee', 'Total']]
    grand_total = 0
    
    # Always use all collected payments to show all student's enrollments
    items = []
    for p in payments:
        items.append((p.enrollment, p.amount))

    for i, (enr, amount) in enumerate(items, 1):
        # Correctly calculate sub_fee and lib_fee based on include_library_fee
        lib_fee = 10.0 if enr.include_library_fee else 0.0
        sub_fee = float(enr.total_fee) - lib_fee
        total = float(amount)
        grand_total += total
        
        fee_data.append([
            str(i),
            enr.subject.name if enr.subject else "Activity",
            enr.batch_time or "N/A",
            f"Rs.{sub_fee:,.0f}",
            f"Rs.{lib_fee:,.0f}",
            f"Rs.{total:,.0f}",
        ])

    fee_data.append([
        '', '', '', '', 'TOTAL PAID', f"Rs.{grand_total:,.0f}"
    ])

    fee_table = Table(fee_data, colWidths=[1.0 * cm, 6.2 * cm, 3.8 * cm, 2.5 * cm, 2.7 * cm, 2.8 * cm])
    fee_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), indigo),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (2, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -2), 0.5, HexColor('#CBD5E1')),
        # Total row styling
        ('FONTNAME', (-2, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (-2, -1), (-1, -1), HexColor('#F1F5F9')),
        ('ALIGN', (-2, -1), (-2, -1), 'RIGHT'),
        ('BOX', (-2, -1), (-1, -1), 0.5, HexColor('#CBD5E1')),
        ('SPAN', (0, -1), (3, -1)), # Empty space for total row
    ]))
    story.append(fee_table)
    story.append(Spacer(1, 0.2 * cm))

    # Payment Status
    status_s = ParagraphStyle('PS', fontSize=9, fontName='Helvetica-Bold', textColor=green)
    display_status = (payments[0].get_status_display() if payments else "PAID") if payments else "PAID"
    story.append(Paragraph(f"✅  PAYMENT STATUS: {display_status}", status_s))
    story.append(Spacer(1, 0.1 * cm))

    notice_style = ParagraphStyle('Notice', fontSize=7, fontName='Helvetica-Oblique',
                                  textColor=slate, alignment=TA_CENTER)
    story.append(Paragraph("This is a computer-generated receipt and does not require a physical signature.", notice_style))
    story.append(Spacer(1, 0.1 * cm))

    footer_style = ParagraphStyle('Footer', fontSize=6.5, fontName='Helvetica',
                                  textColor=slate, alignment=TA_CENTER)
    story.append(Paragraph("Balkanji Ni Bari | Nadiad, Gujarat | Summer Camp Activities 2026", footer_style))

    doc.build(story, onFirstPage=_draw_page_decoration, onLaterPages=_draw_page_decoration)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

def _generate_minimal_receipt_pdf():
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A5))
    c.drawString(20, 100, "Fee Receipt")
    c.save()
    return buffer.getvalue()

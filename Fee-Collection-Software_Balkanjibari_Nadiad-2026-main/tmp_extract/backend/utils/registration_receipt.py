"""
registration_receipt.py — PDF receipt generator for student registration payments.
Landscape A5 format (210mm x 148.5mm).
"""

from io import BytesIO
from datetime import date
from django.utils import timezone
from reportlab.lib.pagesizes import A5, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def generate_receipt_pdf(student, razorpay_order_id: str) -> bytes:
    """Generate a PDF fee receipt and return as bytes."""
    try:
        buffer = BytesIO()
        pagesize = landscape(A5) # 210mm x 148mm
        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            rightMargin=1.5*cm,
            leftMargin=1.5*cm,
            topMargin=1.5*cm,
            bottomMargin=1.5*cm,
            title=f"Receipt_{student.student_id}"
        )

        styles = getSampleStyleSheet()
        story = []

        # ---- Color palette ----
        indigo = colors.HexColor('#4F46E5')
        light_indigo = colors.HexColor('#EEF2FF')
        dark = colors.HexColor('#1E293B')
        gray = colors.HexColor('#64748B')
        green = colors.HexColor('#16A34A')
        light_green = colors.HexColor('#F0FDF4')

        # ---- Header (A5 Landscape Layout - Redesigned to match sample) ----
        header_style = ParagraphStyle('Header', fontSize=22, fontName='Helvetica-Bold',
                                      textColor=indigo, alignment=TA_CENTER, spaceAfter=2)
        sub_header_style = ParagraphStyle('SubHeader', fontSize=9, fontName='Helvetica',
                                          textColor=gray, alignment=TA_CENTER, spaceAfter=2)
        
        story.append(Paragraph("BALKANJI NI BARI", header_style))
        story.append(Paragraph("Nadiad, Gujarat — Summer Camp Activities 2026", sub_header_style))
        story.append(Spacer(1, 0.2*cm))
        story.append(HRFlowable(width="100%", thickness=1.5, color=indigo, spaceAfter=4))
        
        # Centered Boxed Title
        rect_style = ParagraphStyle('RectTitle', fontSize=14, fontName='Helvetica-Bold',
                                    textColor=dark, alignment=TA_CENTER, leading=16)
        
        title_table_data = [[Paragraph("REGISTRATION FEE RECEIPT", rect_style)]]
        title_table = Table(title_table_data, colWidths=[18*cm])
        title_table.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        story.append(title_table)
        story.append(Spacer(1, 0.5*cm))

        # ---- Info Section (Parallel Columns - Redesigned) ----
        lbl_s = ParagraphStyle('Label', fontSize=9, fontName='Helvetica-Bold', textColor=dark)
        val_s = ParagraphStyle('Value', fontSize=9, fontName='Helvetica', textColor=dark)

        receipt_date = timezone.now().strftime('%d %B %Y, %I:%M %p')
        enroll_date = student.enrollment_date.strftime('%d-%m-%Y') if student.enrollment_date else receipt_date[:10]
        enroll_time = receipt_date.split(',')[1].strip()

        col1_data = [
            [Paragraph('Student Name:', lbl_s), Paragraph(student.name.upper(), lbl_s)],
            [Paragraph('Student ID:', lbl_s), Paragraph(student.student_id, val_s)],
            [Paragraph('Username:', lbl_s), Paragraph(student.login_username or '—', val_s)],
            [Paragraph('Mobile:', lbl_s), Paragraph(student.phone or '—', val_s)],
        ]
        
        col2_data = [
            [Paragraph('Email:', lbl_s), Paragraph(student.email or '—', val_s)],
            [Paragraph('Enrollment:', lbl_s), Paragraph(f"{enroll_date} at {enroll_time}", val_s)],
            [Paragraph('Receipt Date:', lbl_s), Paragraph(receipt_date, val_s)],
            [Paragraph('Payment Ref:', lbl_s), Paragraph(razorpay_order_id or '—', val_s)],
        ]
        
        t1 = Table(col1_data, colWidths=[3.2*cm, 5.8*cm])
        t1.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOTTOMPADDING', (0,0), (-1,-1), 4)]))
        
        t2 = Table(col2_data, colWidths=[2.8*cm, 6.2*cm])
        t2.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOTTOMPADDING', (0,0), (-1,-1), 4)]))
        
        main_info = Table([[t1, t2]], colWidths=[9*cm, 9*cm])
        main_info.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(main_info)
        story.append(Spacer(1, 0.4*cm))

        # ---- Subject Fee Table ----
        story.append(Paragraph("Enrolled Subjects & Fee Details", ParagraphStyle(
            'SectionTitle', fontSize=10, fontName='Helvetica-Bold', textColor=dark, spaceAfter=4)))

        enrollments = student.enrollments.filter(is_deleted=False).select_related('subject')
        fee_data = [['#', 'Subject', 'Batch Time', 'Subject Fee', 'Library Fee', 'Total']]

        grand_total = 0
        for i, enr in enumerate(enrollments, 1):
            subj_fee = float(enr.total_fee) - (10 if enr.include_library_fee else 0)
            lib_fee = 10 if enr.include_library_fee else 0
            total = float(enr.total_fee)
            grand_total += total
            fee_data.append([
                str(i),
                enr.subject.name,
                enr.batch_time,
                f'Rs.{subj_fee:.0f}',
                f'Rs.{lib_fee:.0f}' if lib_fee else 'Rs.0',
                f'Rs.{total:.0f}',
            ])

        # Bottom row for TOTAL
        fee_data.append(['', '', '', '', Paragraph('<b>TOTAL PAID</b>', lbl_s), Paragraph(f'<b>Rs.{grand_total:.0f}</b>', lbl_s)])

        # Table widths
        fee_table = Table(fee_data, colWidths=[1*cm, 7*cm, 4*cm, 2*cm, 2*cm, 2*cm])
        fee_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), indigo),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (2, -1), 'LEFT'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F0FDF4')), # Light green
            ('TEXTCOLOR', (-1, -1), (-1, -1), dark),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ]))
        story.append(fee_table)
        story.append(Spacer(1, 0.4*cm))

        # ---- Footer ----
        status_s = ParagraphStyle('PS', fontSize=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#16A34A'))
        story.append(Paragraph("PAYMENT STATUS: PAID", status_s))

        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(
            "This is a computer-generated receipt and does not require a physical signature.<br/>Balkanji Ni Bari | Nadiad, Gujarat | Summer Camp Activities 2026",
            ParagraphStyle('Footer', fontSize=7, fontName='Helvetica', textColor=gray, alignment=TA_CENTER)
        ))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    except Exception as e:
        # Better fallback error logging
        print(f"Error generating PDF: {str(e)}")
        return _simple_text_receipt(student, razorpay_order_id)


def _simple_text_receipt(student, order_id: str) -> bytes:
    """Fallback plain-text receipt if reportlab is not available."""
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

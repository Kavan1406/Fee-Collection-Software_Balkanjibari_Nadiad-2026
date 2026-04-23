"""
Utility for generating itemized fee receipts as PDFs.
New A4 Portrait format as per 2026 design.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black, grey
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime
from django.conf import settings

class ReceiptCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)

    def draw_background(self):
        self.saveState()
        
        # 1. Logo (Top Left)
        logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
        if os.path.exists(logo_path):
            logo_size = 30 * mm
            self.drawImage(logo_path, 15 * mm, 297 * mm - 15 * mm - logo_size, 
                           width=logo_size, height=logo_size, mask='auto', preserveAspectRatio=True)
        
        # 2. Header Text (Top Center-Right)
        self.setFillColor(black)
        
        # BALKAN-JI-BARI
        self.setFont("Helvetica-Bold", 24)
        self.drawString(50 * mm, 297 * mm - 25 * mm, "BALKAN-JI-BARI")
        
        # Address
        self.setFont("Helvetica", 12)
        self.drawString(50 * mm, 297 * mm - 32 * mm, "Mill Road, Nadiad - 387 001.")
        
        # Summer Camp 2026
        self.setFont("Helvetica-Bold", 16)
        self.drawRightString(210 * mm - 15 * mm, 297 * mm - 20 * mm, "Summer Camp 2026")
        
        # Title: Official Fee Receipt
        self.setFont("Helvetica-Bold", 20)
        self.drawRightString(210 * mm - 15 * mm, 297 * mm - 40 * mm, "Official Fee Receipt")
        
        # 3. Logo Watermark (Large Center)
        if os.path.exists(logo_path):
            self.saveState()
            self.setFillAlpha(0.04)
            watermark_size = 120 * mm
            self.drawImage(logo_path, (210 * mm - watermark_size)/2, (297 * mm - watermark_size)/2, 
                           width=watermark_size, height=watermark_size, mask='auto')
            self.restoreState()
            
        self.restoreState()

def generate_itemized_receipt_pdf(payment, enrollments_with_fees=None):
    """
    Generate an itemized fee receipt PDF in A4 Portrait format.
    """
    student = payment.enrollment.student
    buffer = BytesIO()
    
    def on_page(canvas, doc):
        canvas.draw_background()

    # Document margins
    pagesize = A4 # 210 x 297 mm
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=pagesize, 
        rightMargin=15*mm, 
        leftMargin=15*mm, 
        topMargin=55*mm, 
        bottomMargin=20*mm,
        title='Fee Receipt'
    )
    
    styles = getSampleStyleSheet()
    
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold')
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=11, fontName='Helvetica')

    elements = []
    
    # --- Info Section ---
    receipt_no = payment.receipt_number or "PENDING"
    payment_date = getattr(payment, 'payment_date', None) or datetime.now().date()
    date_str = payment_date.strftime('%d-%m-%Y')
    
    student_name = getattr(student, 'name', 'N/A').upper()
    student_id = getattr(student, 'student_id', 'N/A')
    
    # Boxed Info Section
    info_data = [
        [Paragraph(f"<b>Student Name :</b> {student_name}", normal_style), 
         Paragraph(f"<b>Receipt No :</b> {receipt_no}", normal_style)],
        [Paragraph(f"<b>Student ID :</b> {student_id}", normal_style), 
         Paragraph(f"<b>Date :</b> {date_str}", normal_style)]
    ]
    
    info_table = Table(info_data, colWidths=[100*mm, 80*mm])
    info_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, black),
        ('GRID', (0,0), (-1,-1), 0.1, grey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 4*mm))
    
    # --- Fee Table ---
    # Header: Sr., Description, Batch Time, Amount
    table_header = [
        [Paragraph("Sr.", bold_style), Paragraph("Description", bold_style), Paragraph("Batch Time", bold_style), Paragraph("Amount", bold_style)]
    ]
    
    table_data = []
    total_amount = 0
    
    if not enrollments_with_fees:
        enrollments_with_fees = [{
            'enrollment': payment.enrollment,
            'subject_fee': payment.amount,
            'library_fee': 0
        }]

    for i, item in enumerate(enrollments_with_fees, 1):
        enr = item['enrollment']
        subj_fee = float(item.get('subject_fee', 0) or 0)
        lib_fee = float(item.get('library_fee', 0) or 0)
        
        subj_name = enr.subject.name if enr.subject else "Activity Fee"
        batch = enr.batch_time or "N/A"
        
        table_data.append([i, Paragraph(subj_name, normal_style), batch, f"₹ {subj_fee:,.0f}"])
        total_amount += subj_fee
        
        if lib_fee > 0:
            table_data.append(["", Paragraph("Library Fee", normal_style), "", f"₹ {lib_fee:,.0f}"])
            total_amount += lib_fee

    # Fill empty space
    while len(table_data) < 10:
        table_data.append(["", "", "", ""])

    # Total Row
    total_row = ["Status :", f"PAID via {payment.payment_mode}", Paragraph("Total Paid", bold_style), Paragraph(f"₹ {total_amount:,.0f}", bold_style)]
    
    full_table_data = table_header + table_data + [total_row]

    fee_table = Table(full_table_data, colWidths=[15*mm, 85*mm, 45*mm, 35*mm], repeatRows=1)
    fee_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), HexColor("#F9FAFB")),
        ('GRID', (0, 0), (-1, -1), 0.5, black),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        # Body
        ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        # Total Row
        ('SPAN', (2, -1), (2, -1)), # Total label
        ('BACKGROUND', (0, -1), (-1, -1), HexColor("#F3F4F6")),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(fee_table)
    
    # --- Footer ---
    elements.append(Spacer(1, 15*mm))
    
    footer_cols = [
        [
            Paragraph("Authorized Signatory", bold_style),
            Spacer(1, 15*mm),
            Paragraph("_______________________", normal_style),
            Spacer(1, 2*mm),
            Paragraph("Balkanji Ni Bari, Nadiad", ParagraphStyle('Sub', fontSize=9, textColor=grey))
        ],
        [
            Paragraph("President :", bold_style),
            Spacer(1, 2*mm),
            # In a real system, we'd add the sig image here
        ]
    ]
    
    # Foot table for signatures
    foot_table = Table(footer_cols, colWidths=[100*mm, 80*mm])
    foot_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(foot_table)
    
    # Add signature image overlay if exists
    sig_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'pres_sig_final.png')
    if os.path.exists(sig_path):
        # We use canvas directly for precise positioning of signature
        pass # Will handly nicely in doc.build if needed, or just let users sign manually

    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph("This is a computer-generated receipt and does not require a physical signature.", 
                             ParagraphStyle('Note', fontSize=8, alignment=1, textColor=grey)))

    # Build PDF
    doc.build(
        elements, 
        onFirstPage=on_page, 
        onLaterPages=on_page, 
        canvasmaker=ReceiptCanvas
    )
    
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content

def generate_receipt_pdf(payment):
    """
    Generate a full-itemized receipt for a student based on a specific payment.
    """
    enrollment = getattr(payment, 'enrollment', None)
    student = getattr(enrollment, 'student', None) if enrollment else None
    
    if not student:
        return generate_itemized_receipt_pdf(payment, [])

    try:
        active_enrollments = list(student.enrollments.filter(is_deleted=False, status='ACTIVE'))
    except Exception:
        active_enrollments = [enrollment] if enrollment else []
    
    payment_enrollment = enrollment
    if payment_enrollment not in active_enrollments:
        active_enrollments.append(payment_enrollment)
    
    enrollments_with_fees = []
    for enr in active_enrollments:
        if enr.id == payment_enrollment.id:
            fee = getattr(payment, 'amount', 0)
        else:
            continue
            
        include_library_fee = getattr(enr, 'include_library_fee', False)
        lib_fee = 10 if include_library_fee and enr.id == payment_enrollment.id else 0
        
        enrollments_with_fees.append({
            'enrollment': enr,
            'subject_fee': fee,
            'library_fee': lib_fee
        })
    
    return generate_itemized_receipt_pdf(payment, enrollments_with_fees)

"""
Utility for generating student ID cards as PDFs.
New A5 Landscape format containing up to 4 subjects per student setup.
"""

import os
from io import BytesIO
from django.conf import settings
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black, grey
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A5, landscape

# ID Card size: ATM Card (85.6mm x 53.98mm)
CARD_W = 85.6 * mm
CARD_H = 53.98 * mm

def get_font_size(text, max_width, base_size=7):
    """Calculates font size to fit text within a maximum width."""
    from reportlab.pdfbase.pdfmetrics import stringWidth
    size = base_size
    while size > 4 and stringWidth(text, "Helvetica", size) > max_width:
        size -= 0.2
    return size

def generate_id_card_pdf(enrollment, is_provisional=False):
    """
    Generate the 2026 Summer Camp ID Card in A5 Landscape format.
    Holds up to 4 subjects. First subject is top right.
    """
    buffer = BytesIO()
    
    # Create canvas with A5 landscape dimensions
    page_w, page_h = landscape(A5) # 210 x 148 mm
    c = canvas.Canvas(buffer, pagesize=(page_w, page_h))
    c.setTitle('Student ID Card')
    
    student = enrollment.student
    
    # Try fetching all active enrollments for this student to print them all
    # Fallback to just the current enrollment if query fails
    enrollments_to_print = [enrollment]
    try:
        from apps.enrollments.models import Enrollment
        all_active = list(Enrollment.objects.filter(student=student, is_deleted=False, status='ACTIVE').order_by('created_at'))
        if all_active:
            # Reorder so that if there's only 1, it's the requested one. 
            # Or just use the sequence of their creation.
            enrollments_to_print = all_active[:4]
    except Exception:
        pass
        
    # Positions: 1: Top Right, 2: Top Left, 3: Bottom Right, 4: Bottom Left
    margin = 15 * mm
    positions = [
        (page_w - margin - CARD_W, page_h - margin - CARD_H), # Top Right
        (margin, page_h - margin - CARD_H),                   # Top Left
        (page_w - margin - CARD_W, margin),                   # Bottom Right
        (margin, margin)                                      # Bottom Left
    ]

    logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
    sig_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'pres_sig_final.png')

    for idx, enr in enumerate(enrollments_to_print):
        if idx >= 4:
            break
            
        cx, cy = positions[idx]
        
        # === CARD BORDER (Rounded Edge) ===
        c.setStrokeColor(black)
        c.setLineWidth(0.5)
        c.roundRect(cx, cy, CARD_W, CARD_H, radius=3*mm, stroke=1, fill=0)
        
        # === WATERMARK LOGO IN CENTER (FADED) ===
        if os.path.exists(logo_path):
            c.saveState()
            c.setFillAlpha(0.06)
            watermark_size = 38 * mm
            watermark_x = cx + (CARD_W - watermark_size) / 2
            watermark_y = cy + (CARD_H - watermark_size) / 2 - 2*mm
            c.drawImage(logo_path, watermark_x, watermark_y, 
                       width=watermark_size, height=watermark_size, 
                       mask='auto', preserveAspectRatio=True)
            c.restoreState()
        
        # === LOGO (TOP LEFT OF CARD) ===
        logo_margin = 3 * mm
        logo_size = 12 * mm
        if os.path.exists(logo_path):
            c.drawImage(logo_path, cx + logo_margin, cy + CARD_H - logo_size - logo_margin, 
                       width=logo_size, height=logo_size, 
                       mask='auto', preserveAspectRatio=True)
        
        # === HEADER TEXT ===
        text_x = cx + logo_margin + logo_size + 3 * mm
        c.setFillColor(black)
        
        # BALKAN-JI-BARI
        c.setFont("Helvetica-Bold", 11)
        c.drawString(text_x, cy + CARD_H - 6.5*mm, "BALKAN-JI-BARI")
        
        # Address
        c.setFont("Helvetica", 6)
        c.drawString(text_x, cy + CARD_H - 10*mm, "Mill Road, Nadiad - 387 001.")
        
        # Summer Camp 2026
        c.setFont("Helvetica-Bold", 10)
        c.drawString(text_x, cy + CARD_H - 15*mm, "Summer Camp 2026")
        
        # === STUDENT LOGIN ID BOX (TOP RIGHT OF CARD) ===
        id_w = 14 * mm
        id_h = 16 * mm
        id_margin = 3 * mm
        id_x = cx + CARD_W - id_w - id_margin
        id_y = cy + CARD_H - id_h - id_margin
        
        c.setStrokeColor(black)
        c.setLineWidth(0.3)
        c.roundRect(id_x, id_y, id_w, id_h, radius=2*mm, stroke=1, fill=0)
        
        c.setFont("Helvetica-Bold", 4.5)
        c.drawCentredString(id_x + id_w/2, id_y + id_h - 2.5*mm, "Student ID")
        
        # Print Student ID dynamically instead of photo
        student_login_id = getattr(student, 'login_username', None) or getattr(student, 'student_id', 'N/A')
        student_login_id = str(student_login_id)
        id_fsize = get_font_size(student_login_id, id_w - 1*mm, base_size=6)
        c.setFillColor(grey)
        c.setFont("Helvetica-Bold", id_fsize)
        c.drawCentredString(id_x + id_w/2, id_y + 5*mm, student_login_id.upper())

        # === DATA FIELDS ===
        fields_y = cy + CARD_H - 22 * mm
        label_x = cx + 6 * mm
        value_x = cx + 24 * mm
        line_spacing = 5 * mm
        
        fields = [
            ("Student Name :", student.name.upper() if student.name else "N/A"),
            ("Subject :", enr.subject.name if enr.subject else "N/A"),
            ("Batch :", enr.batch_time if enr.batch_time else "N/A"),
            ("Mobile :", student.phone if student.phone else "N/A"),
        ]
        
        c.setFont("Helvetica", 7)
        for i, (label, value) in enumerate(fields):
            y = fields_y - (i * line_spacing)
            c.setFillColor(black)
            c.drawString(label_x, y, label)
            
            # Draw underline for value
            c.setLineWidth(0.2)
            c.line(value_x - 1*mm, y - 0.5*mm, cx + CARD_W - 6*mm, y - 0.5*mm)
            
            # Draw value
            val_str = str(value)
            f_size = get_font_size(val_str, CARD_W - 30*mm, base_size=7)
            c.setFont("Helvetica", f_size)
            c.drawString(value_x, y, val_str)
            c.setFont("Helvetica", 7) 
            
        # === LIBRARY ACCESS ===
        # Placed securely below mobile number with one line space
        lib_y = fields_y - (5 * line_spacing)
        c.setFont("Helvetica-Bold", 7.5)
        c.setFillColor(black)
        c.drawString(label_x, lib_y, "LIBRARY ACCESS: 2026-27 Valid")

        # === FOOTER / AUTHORITY SIGNATURE ===
        c.setFont("Helvetica", 6)
        c.drawString(cx + CARD_W - 35*mm, cy + 4*mm, "Authority Sign:")
        
        c.setLineWidth(0.5)
        c.line(cx + CARD_W - 22*mm, cy + 3.5*mm, cx + CARD_W - 6*mm, cy + 3.5*mm)

    c.showPage()
    c.save()
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content

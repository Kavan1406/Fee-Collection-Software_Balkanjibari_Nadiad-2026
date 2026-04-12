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
        
        # === CARD BORDER (Rounded Edge - Premium) ===
        c.setStrokeColor(black)
        c.setLineWidth(1.0)
        c.roundRect(cx, cy, CARD_W, CARD_H, radius=4*mm, stroke=1, fill=0)
        
        # === WATERMARK LOGO IN CENTER (FADED) ===
        if os.path.exists(logo_path):
            c.saveState()
            c.setFillAlpha(0.04)
            watermark_size = 40 * mm
            c.drawImage(logo_path, cx + (CARD_W - watermark_size)/2, cy + (CARD_H - watermark_size)/2 - 1*mm, 
                       width=watermark_size, height=watermark_size, mask='auto', preserveAspectRatio=True)
            c.restoreState()
        
        # === LOGO (LEFT SIDE) ===
        logo_margin = 4 * mm
        logo_size = 14 * mm
        if os.path.exists(logo_path):
            c.drawImage(logo_path, cx + logo_margin, cy + CARD_H - logo_size - logo_margin, 
                       width=logo_size, height=logo_size, mask='auto', preserveAspectRatio=True)
        
        # === INSTITUTION NAME & CAMP YEAR ===
        header_x = cx + logo_margin + logo_size + 4 * mm
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(header_x, cy + CARD_H - 8 * mm, "BALKAN-JI-BARI")
        
        c.setFont("Helvetica", 6.5)
        c.drawString(header_x, cy + CARD_H - 12 * mm, "Mill Road, Nadiad - 387 001.")
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(header_x, cy + CARD_H - 18 * mm, "Summer Camp 2026")
        
        # === ADMISSION ID BOX (TOP RIGHT) ===
        id_box_w = 16 * mm
        id_box_h = 20 * mm
        id_box_x = cx + CARD_W - id_box_w - logo_margin
        id_box_y = cy + CARD_H - id_box_h - logo_margin
        
        c.setLineWidth(0.3)
        c.roundRect(id_box_x, id_box_y, id_box_w, id_box_h, radius=2*mm, stroke=1, fill=0)
        
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(id_box_x + id_box_w/2, id_box_y + id_box_h - 4*mm, "Student ID")
        
        # Draw ID Value
        login_id = str(getattr(student, 'login_username', None) or getattr(student, 'student_id', 'N/A'))
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(grey)
        c.drawCentredString(id_box_x + id_box_w/2, id_box_y + 8*mm, login_id.upper())
        c.setFillColor(black)

        # === DATA FIELDS (MATCHING IMAGE 3) ===
        fields_start_y = cy + CARD_H - 28 * mm
        label_x = cx + 8 * mm
        value_x = cx + 30 * mm
        line_v_spacing = 6 * mm
        
        fields = [
            ("Student Name :", student.name.upper() if student.name else "N/A"),
            ("Subject :", enr.subject.name if enr.subject else "N/A"),
            ("Batch :", enr.batch_time if enr.batch_time else "N/A"),
            ("Mobile :", student.phone if student.phone else "N/A"),
        ]
        
        for i, (label, value) in enumerate(fields):
            curr_y = fields_start_y - (i * line_v_spacing)
            c.setFont("Helvetica", 8)
            c.drawString(label_x, curr_y, label)
            
            # Draw baseline/underline for field
            c.setLineWidth(0.2)
            c.line(value_x - 1*mm, curr_y - 1*mm, cx + CARD_W - 8*mm, curr_y - 1*mm)
            
            # Value text
            val_text = str(value)
            f_size = get_font_size(val_text, CARD_W - 38*mm, base_size=8)
            c.setFont("Helvetica", f_size)
            c.drawString(value_x, curr_y, val_text)
            
        # === LIBRARY ACCESS BANNER ===
        c.setFont("Helvetica-Bold", 9)
        c.drawString(label_x, cy + 8 * mm, "LIBRARY ACCESS: 2026-27 Valid")
        
        # === SIGNATURE SECTION ===
        c.setFont("Helvetica", 7)
        c.drawString(cx + CARD_W - 40*mm, cy + 5 * mm, "Authority Sign: _______________")

    c.showPage()
    c.save()
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content

def generate_bulk_id_cards_pdf(enrollments):
    """
    Generate a bulk PDF containing multiple students' ID cards.
    Organized 4 cards per A5 landscape page.
    """
    buffer = BytesIO()
    page_w, page_h = landscape(A5)
    c = canvas.Canvas(buffer, pagesize=(page_w, page_h))
    
    # 2x2 Grid Positions
    margin = 10 * mm
    positions = [
        (margin, page_h - margin - CARD_H),                   # Top Left
        (page_w - margin - CARD_W, page_h - margin - CARD_H), # Top Right
        (margin, margin),                                     # Bottom Left
        (page_w - margin - CARD_W, margin)                    # Bottom Right
    ]
    
    logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
    sig_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'pres_sig_final.png')

    for i in range(0, len(enrollments), 4):
        chunk = enrollments[i:i+4]
        
        for idx, enr in enumerate(chunk):
            student = enr.student
            cx, cy = positions[idx]
            
            # --- CARD RENDERING (MATCHING SINGULAR DESIGN) ---
            
            # Border
            c.setStrokeColor(black)
            c.setLineWidth(1.0)
            c.roundRect(cx, cy, CARD_W, CARD_H, radius=4*mm, stroke=1, fill=0)
            
            # Watermark
            if os.path.exists(logo_path):
                c.saveState()
                c.setFillAlpha(0.04)
                w_size = 40 * mm
                c.drawImage(logo_path, cx + (CARD_W - w_size)/2, cy + (CARD_H - w_size)/2 - 1*mm, width=w_size, height=w_size, mask='auto', preserveAspectRatio=True)
                c.restoreState()
            
            # Logo & Header
            l_marg = 4*mm; l_size = 14*mm
            if os.path.exists(logo_path):
                c.drawImage(logo_path, cx + l_marg, cy + CARD_H - l_size - l_marg, width=l_size, height=l_size, mask='auto', preserveAspectRatio=True)
            
            h_x = cx + l_marg + l_size + 4*mm
            c.setFillColor(black); c.setFont("Helvetica-Bold", 13)
            c.drawString(h_x, cy + CARD_H - 8*mm, "BALKAN-JI-BARI")
            c.setFont("Helvetica", 6.5); c.drawString(h_x, cy + CARD_H - 12*mm, "Mill Road, Nadiad - 387 001.")
            c.setFont("Helvetica-Bold", 12); c.drawString(h_x, cy + CARD_H - 18*mm, "Summer Camp 2026")
            
            # ID Box
            ib_w=16*mm; ib_h=20*mm; ib_x=cx+CARD_W-ib_w-l_marg; ib_y=cy+CARD_H-ib_h-l_marg
            c.setLineWidth(0.3); c.roundRect(ib_x, ib_y, ib_w, ib_h, radius=2*mm)
            c.setFont("Helvetica-Bold", 5); c.drawCentredString(ib_x + ib_w/2, ib_y + ib_h - 4*mm, "Student ID")
            
            login_id = str(getattr(student, 'login_username', None) or getattr(student, 'student_id', 'N/A'))
            c.setFont("Helvetica-Bold", 7); c.setFillColor(grey)
            c.drawCentredString(ib_x + ib_w/2, ib_y + 8*mm, login_id.upper())
            c.setFillColor(black)
            
            # Fields
            f_y = cy + CARD_H - 28*mm; lab_x = cx + 8*mm; val_x = cx + 30*mm; sp = 6*mm
            field_items = [
                ("Student Name :", student.name.upper() if student.name else "N/A"),
                ("Subject :", enr.subject.name if enr.subject else "N/A"),
                ("Batch :", enr.batch_time if enr.batch_time else "N/A"),
                ("Mobile :", student.phone if student.phone else "N/A"),
            ]
            for j, (lbl, val) in enumerate(field_items):
                cyy = f_y - (j * sp)
                c.setFont("Helvetica", 8); c.drawString(lab_x, cyy, lbl)
                c.setLineWidth(0.2); c.line(val_x - 1*mm, cyy - 1*mm, cx + CARD_W - 8*mm, cyy - 1*mm)
                c.setFont("Helvetica", get_font_size(str(val), CARD_W - 38*mm, 8))
                c.drawString(val_x, cyy, str(val))
            
            # Footer
            c.setFont("Helvetica-Bold", 9); c.drawString(lab_x, cy + 8*mm, "LIBRARY ACCESS: 2026-27 Valid")
            c.setFont("Helvetica", 7); c.drawString(cx+CARD_W-40*mm, cy+5*mm, "Authority Sign: _______________")
            
        c.showPage()
        
    c.save()
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content

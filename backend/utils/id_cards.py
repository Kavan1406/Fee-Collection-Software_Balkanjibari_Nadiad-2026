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
    enrollments_to_print = [enrollment]
    try:
        from apps.enrollments.models import Enrollment
        all_active = list(Enrollment.objects.filter(student=student, is_deleted=False, status='ACTIVE').order_by('created_at'))
        if all_active:
            # We filter out duplicates of the same subject if needed, but usually we just limit to 4
            enrollments_to_print = all_active[:4]
    except Exception:
        pass
        
    # Positions: 1: Top Right, 2: Top Left, 3: Bottom Right, 4: Bottom Left
    # Centered 2x2 grid calculation
    horiz_gap = (page_w - (2 * CARD_W)) / 3
    vert_gap = (page_h - (2 * CARD_H)) / 3
    
    positions = [
        (page_w - horiz_gap - CARD_W, page_h - vert_gap - CARD_H), # Top Right
        (horiz_gap, page_h - vert_gap - CARD_H),                   # Top Left
        (page_w - horiz_gap - CARD_W, vert_gap),                   # Bottom Right
        (horiz_gap, vert_gap)                                      # Bottom Left
    ]

    logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')

    for idx, enr in enumerate(enrollments_to_print):
        if idx >= 4:
            break
            
        cx, cy = positions[idx]
        
        # === CARD BORDER (Rounded Edge) ===
        c.setStrokeColor(black)
        c.setLineWidth(0.8)
        c.roundRect(cx, cy, CARD_W, CARD_H, radius=3*mm, stroke=1, fill=0)
        
        # === WATERMARK LOGO ===
        if os.path.exists(logo_path):
            c.saveState()
            c.setFillAlpha(0.03)
            wm_size = 40 * mm
            c.drawImage(logo_path, cx + (CARD_W - wm_size)/2, cy + (CARD_H - wm_size)/2, 
                       width=wm_size, height=wm_size, mask='auto', preserveAspectRatio=True)
            c.restoreState()
        
        # === LOGO & HEADER ===
        l_marg = 3 * mm
        l_size = 13 * mm
        if os.path.exists(logo_path):
            c.drawImage(logo_path, cx + l_marg, cy + CARD_H - l_size - l_marg, 
                       width=l_size, height=l_size, mask='auto', preserveAspectRatio=True)
        
        h_x = cx + l_marg + l_size + 3 * mm
        c.setFillColor(black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(h_x, cy + CARD_H - 7 * mm, "BALKAN-JI-BARI")
        
        c.setFont("Helvetica", 6)
        c.drawString(h_x, cy + CARD_H - 10 * mm, "Mill Road, Nadiad - 387 001.")
        
        c.setFont("Helvetica-Bold", 10)
        c.drawString(h_x, cy + CARD_H - 15 * mm, "Summer Camp 2026")
        
        # === ID BOX ===
        ib_w = 16 * mm; ib_h = 18 * mm
        ib_x = cx + CARD_W - ib_w - l_marg; ib_y = cy + CARD_H - ib_h - l_marg
        c.setLineWidth(0.3)
        c.roundRect(ib_x, ib_y, ib_w, ib_h, radius=1*mm, stroke=1, fill=0)
        c.setFont("Helvetica-Bold", 4.5)
        c.drawCentredString(ib_x + ib_w/2, ib_y + ib_h - 3*mm, "ID")
        
        login_id = str(getattr(student, 'login_username', None) or getattr(student, 'student_id', 'N/A'))
        c.setFont("Helvetica-Bold", 7); c.setFillColor(grey)
        c.drawCentredString(ib_x + ib_w/2, ib_y + 6*mm, login_id.upper())
        c.setFillColor(black)

        # === FIELDS ===
        f_y = cy + CARD_H - 25 * mm; lab_x = cx + 6 * mm; val_x = cx + 28 * mm
        line_s = 5.5 * mm
        
        fields = [
            ("Student Name:", student.name.upper()[:25] if student.name else "N/A"),
            ("Subject:", enr.subject.name if enr.subject else "N/A"),
            ("Batch:", enr.batch_time if enr.batch_time else "N/A"),
            ("Mobile:", student.phone if student.phone else "N/A"),
        ]
        
        for i, (label, value) in enumerate(fields):
            curr_y = f_y - (i * line_s)
            c.setFont("Helvetica", 7.5); c.drawString(lab_x, curr_y, label)
            c.setLineWidth(0.1); c.line(val_x - 1*mm, curr_y - 1*mm, cx + CARD_W - 6*mm, curr_y - 1*mm)
            val_text = str(value)
            f_size = get_font_size(val_text, CARD_W - 35*mm, 7.5)
            c.setFont("Helvetica", f_size); c.drawString(val_x, curr_y, val_text)
            
        # === FOOTER ===
        c.setFont("Helvetica-Bold", 8)
        c.drawString(lab_x, cy + 8 * mm, "LIBRARY ACCESS: 2026 Valid")
        c.setFont("Helvetica", 6); c.drawString(cx + CARD_W - 38*mm, cy + 4 * mm, "Authority Sign: ____________")

    c.showPage()
    c.save()
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content

def generate_bulk_id_cards_pdf(enrollments):
    """4 cards per A5 landscape page grid."""
    buffer = BytesIO()
    page_w, page_h = landscape(A5)
    c = canvas.Canvas(buffer, pagesize=(page_w, page_h))
    
    horiz_gap = (page_w - (2 * CARD_W)) / 3
    vert_gap = (page_h - (2 * CARD_H)) / 3
    positions = [
        (horiz_gap, page_h - vert_gap - CARD_H),                   # Top Left
        (page_w - horiz_gap - CARD_W, page_h - vert_gap - CARD_H), # Top Right
        (horiz_gap, vert_gap),                                     # Bottom Left
        (page_w - horiz_gap - CARD_W, vert_gap)                    # Bottom Right
    ]
    
    logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')

    for i in range(0, len(enrollments), 4):
        chunk = enrollments[i:i+4]
        for idx, enr in enumerate(chunk):
            student = enr.student
            cx, cy = positions[idx]
            
            # Rendering logic (Compact)
            c.setStrokeColor(black); c.setLineWidth(0.8); c.roundRect(cx, cy, CARD_W, CARD_H, radius=3*mm)
            if os.path.exists(logo_path):
                c.saveState(); c.setFillAlpha(0.03); wm = 40*mm
                c.drawImage(logo_path, cx + (CARD_W - wm)/2, cy + (CARD_H - wm)/2, width=wm, height=wm, mask='auto', preserveAspectRatio=True)
                c.restoreState()
            
            l_marg=3*mm; l_size=13*mm
            if os.path.exists(logo_path):
                c.drawImage(logo_path, cx+l_marg, cy+CARD_H-l_size-l_marg, width=l_size, height=l_size, mask='auto', preserveAspectRatio=True)
            
            hx = cx+l_marg+l_size+3*mm
            c.setFont("Helvetica-Bold", 11); c.drawString(hx, cy+CARD_H-7*mm, "BALKAN-JI-BARI")
            c.setFont("Helvetica", 6); c.drawString(hx, cy+CARD_H-10*mm, "Mill Road, Nadiad - 387 001.")
            c.setFont("Helvetica-Bold", 10); c.drawString(hx, cy+CARD_H-15*mm, "Summer Camp 2026")
            
            ibw=16*mm; ibh=18*mm; ibx=cx+CARD_W-ibw-l_marg; iby=cy+CARD_H-ibh-l_marg
            c.setLineWidth(0.3); c.roundRect(ibx, iby, ibw, ibh, radius=1*mm)
            c.setFont("Helvetica-Bold", 4.5); c.drawCentredString(ibx+ibw/2, iby+ibh-3*mm, "ID")
            login_id = str(getattr(student, 'login_username', None) or getattr(student, 'student_id', 'N/A'))
            c.setFont("Helvetica-Bold", 7); c.setFillColor(grey); c.drawCentredString(ibx+ibw/2, iby+6*mm, login_id.upper()); c.setFillColor(black)

            fy = cy+CARD_H-25*mm; labx=cx+6*mm; valx=cx+28*mm; sp=5.5*mm
            items = [("Student Name:", student.name.upper()[:25] if student.name else "N/A"),
                     ("Subject:", enr.subject.name if enr.subject else "N/A"),
                     ("Batch:", enr.batch_time if enr.batch_time else "N/A"),
                     ("Mobile:", student.phone if student.phone else "N/A")]
            for j, (lbl, val) in enumerate(items):
                cyy = fy-(j*sp); c.setFont("Helvetica", 7.5); c.drawString(labx, cyy, lbl)
                c.setLineWidth(0.1); c.line(valx-1*mm, cyy-1*mm, cx+CARD_W-6*mm, cyy-1*mm)
                fs = get_font_size(str(val), CARD_W-35*mm, 7.5); c.setFont("Helvetica", fs); c.drawString(valx, cyy, str(val))
            
            c.setFont("Helvetica-Bold", 8); c.drawString(labx, cy+8*mm, "LIBRARY ACCESS: 2026 Valid")
            c.setFont("Helvetica", 6); c.drawString(cx+CARD_W-38*mm, cy+4*mm, "Authority Sign: ____________")
            
        c.showPage()
    c.save()
    return buffer.getvalue()

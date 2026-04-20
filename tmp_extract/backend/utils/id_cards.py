"""
Utility for generating student ID cards as PDFs.
New Landscape format (85.6mm x 53.98mm) as per 2026 design.
"""

import os
import tempfile
from io import BytesIO
from django.conf import settings
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black, grey
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from datetime import datetime
from PIL import Image

# ID Card size: ATM Card (85.6mm x 53.98mm) Landscape
ID_CARD_WIDTH = 85.6 * mm
ID_CARD_HEIGHT = 53.98 * mm

def get_font_size(text, max_width, base_size=7):
    """Calculates font size to fit text within a maximum width."""
    from reportlab.pdfbase.pdfmetrics import stringWidth
    size = base_size
    while size > 4 and stringWidth(text, "Helvetica", size) > max_width:
        size -= 0.2
    return size

def generate_id_card_pdf(enrollment, is_provisional=False):
    """
    Generate the new 2026 Summer Camp ID Card.
    Landscape format with logo, watermark, and signature.
    """
    buffer = BytesIO()
    
    # Create canvas with ATM landscape dimensions
    c = canvas.Canvas(buffer, pagesize=(ID_CARD_WIDTH, ID_CARD_HEIGHT))
    c.setTitle('Student ID Card')
    
    student = enrollment.student
    
    # === BACKGROUND ===
    c.setFillColor(white)
    c.rect(0, 0, ID_CARD_WIDTH, ID_CARD_HEIGHT, fill=1, stroke=0)
    
    # === WATERMARK LOGO IN CENTER (FADED) ===
    logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
    if os.path.exists(logo_path):
        c.saveState()
        c.setFillAlpha(0.06)
        watermark_size = 38 * mm
        watermark_x = (ID_CARD_WIDTH - watermark_size) / 2
        watermark_y = (ID_CARD_HEIGHT - watermark_size) / 2 - 2*mm
        c.drawImage(logo_path, watermark_x, watermark_y, 
                   width=watermark_size, height=watermark_size, 
                   mask='auto', preserveAspectRatio=True)
        c.restoreState()
    
    # === LOGO (TOP LEFT) ===
    logo_margin = 3 * mm
    logo_size = 12 * mm
    if os.path.exists(logo_path):
        c.drawImage(logo_path, logo_margin, ID_CARD_HEIGHT - logo_size - logo_margin, 
                   width=logo_size, height=logo_size, 
                   mask='auto', preserveAspectRatio=True)
    
    # === HEADER TEXT ===
    text_x = logo_margin + logo_size + 3 * mm
    c.setFillColor(black)
    
    # BALKAN-JI-BARI
    c.setFont("Helvetica-Bold", 11)
    c.drawString(text_x, ID_CARD_HEIGHT - 6.5*mm, "BALKAN-JI-BARI")
    
    # Address
    c.setFont("Helvetica", 6)
    c.drawString(text_x, ID_CARD_HEIGHT - 10*mm, "Mill Road, Nadiad - 387 001.")
    
    # Summer Camp 2026
    c.setFont("Helvetica-Bold", 10)
    c.drawString(text_x, ID_CARD_HEIGHT - 15*mm, "Summer Camp 2026")
    
    # === STUDENT PHOTO BOX (TOP RIGHT) ===
    photo_w = 14 * mm
    photo_h = 16 * mm
    photo_margin = 3 * mm
    photo_x = ID_CARD_WIDTH - photo_w - photo_margin
    photo_y = ID_CARD_HEIGHT - photo_h - photo_margin
    
    # Card Border for photo
    c.setStrokeColor(black)
    c.setLineWidth(0.3)
    c.roundRect(photo_x, photo_y, photo_w, photo_h, radius=2*mm, stroke=1, fill=0)
    
    c.setFont("Helvetica-Bold", 4.5)
    c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h - 2.5*mm, "Student ID")

    photo_drawn = False
    if student.photo:
        try:
            photo_url = None
            if hasattr(student.photo, 'url'):
                photo_url = student.photo.url
            else:
                photo_str = str(student.photo)
                if photo_str.startswith('http'):
                    photo_url = photo_str
                elif photo_str:
                    photo_url = f"https://res.cloudinary.com/dvkfuevyw/image/upload/{photo_str}"
            
            if photo_url:
                import urllib.request
                with urllib.request.urlopen(photo_url) as response:
                    img_data = response.read()
                    img_buffer = BytesIO(img_data)
                    # Clip photo to the rounded rect
                    c.saveState()
                    p = c.beginPath()
                    p.roundRect(photo_x + 0.5*mm, photo_y + 0.5*mm, photo_w - 1*mm, photo_h - 1*mm, 1.5*mm)
                    c.clipPath(p, stroke=0)
                    c.drawImage(img_buffer, photo_x, photo_y, width=photo_w, height=photo_h, preserveAspectRatio=True)
                    c.restoreState()
                    photo_drawn = True
        except Exception: pass

    if not photo_drawn:
        c.setFillColor(grey)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(photo_x + photo_w/2, photo_y + 5*mm, "NO PHOTO")

    # === DATA FIELDS ===
    fields_y = ID_CARD_HEIGHT - 22 * mm
    label_x = 6 * mm
    value_x = 24 * mm
    line_spacing = 5 * mm
    
    fields = [
        ("Student Name :", student.name.upper() if student.name else "N/A"),
        ("Subject :", enrollment.subject.name if enrollment.subject else "N/A"),
        ("Batch :", enrollment.batch_time if enrollment.batch_time else "N/A"),
        ("Mobile :", student.phone if student.phone else "N/A"),
    ]
    
    c.setFont("Helvetica", 7)
    for i, (label, value) in enumerate(fields):
        y = fields_y - (i * line_spacing)
        c.setFillColor(black)
        c.drawString(label_x, y, label)
        
        # Draw underline for value
        c.setLineWidth(0.2)
        c.line(value_x - 1*mm, y - 0.5*mm, ID_CARD_WIDTH - 6*mm, y - 0.5*mm)
        
        # Draw value
        val_str = str(value)
        f_size = get_font_size(val_str, ID_CARD_WIDTH - value_x - 8*mm, base_size=7)
        c.setFont("Helvetica", f_size)
        c.drawString(value_x, y, val_str)
        c.setFont("Helvetica", 7) # Reset for next label
        
    # === FOOTER / PRESIDENT SIGNATURE ===
    c.setFont("Helvetica", 6)
    c.drawString(ID_CARD_WIDTH - 35*mm, 4*mm, "President :")
    
    # Signature image
    sig_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'pres_sig_final.png')
    if os.path.exists(sig_path):
        c.drawImage(sig_path, ID_CARD_WIDTH - 22*mm, 3*mm, width=15*mm, height=5*mm, mask='auto', preserveAspectRatio=True)
    
    # Signature line
    c.setLineWidth(0.5)
    c.line(ID_CARD_WIDTH - 22*mm, 3.5*mm, ID_CARD_WIDTH - 6*mm, 3.5*mm)
    
    c.showPage()
    c.save()
    pdf_content = buffer.getvalue()
    buffer.close()
    return pdf_content

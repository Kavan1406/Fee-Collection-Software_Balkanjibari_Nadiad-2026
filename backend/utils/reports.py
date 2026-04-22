"""
Utility for generating watermarked PDF reports with compression.
"""

import os
import zlib
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from io import BytesIO
from django.conf import settings

try:
    from PyPDF2 import PdfWriter, PdfReader
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

# Style constants
NAVY_BLUE = HexColor("#1A237E")
LAVENDER = HexColor("#9575CD")

class ReportCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)

    def draw_watermark(self):
        self.saveState()
        logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
        if os.path.exists(logo_path):
            self.setFillAlpha(0.05)
            watermark_size = 120 * mm
            # Center on A4 (210x297mm)
            self.drawImage(logo_path, (A4[0] - watermark_size)/2, (A4[1] - watermark_size)/2, 
                           width=watermark_size, height=watermark_size, mask='auto')
        self.restoreState()

    def draw_header(self, title):
        self.saveState()
        self.setFillColor(NAVY_BLUE)
        self.rect(0, A4[1] - 30*mm, A4[0], 30*mm, fill=1, stroke=0)
        
        self.setFillColor(white)
        self.setFont("Helvetica-Bold", 18)
        self.drawCentredString(A4[0]/2, A4[1] - 12*mm, "Balkan-Ji-Bari, NADIAD")
        
        self.setFont("Helvetica", 10)
        self.drawCentredString(A4[0]/2, A4[1] - 18*mm, "Mill Road, Nadiad - 387001")
        
        self.setFont("Helvetica-Bold", 14)
        self.drawCentredString(A4[0]/2, A4[1] - 26*mm, title.upper())
        self.restoreState()

def compress_pdf(pdf_content):
    """
    Compress PDF content to reduce file size.
    Uses PyPDF2 if available, otherwise returns original content.
    """
    if not HAS_PYPDF2:
        return pdf_content
    
    try:
        # Read the PDF
        reader = PdfReader(BytesIO(pdf_content))
        writer = PdfWriter()
        
        # Add compressed pages
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            page.compress_content_streams()
            writer.add_page(page)
        
        # Write compressed PDF
        output_buffer = BytesIO()
        writer.write(output_buffer)
        compressed_content = output_buffer.getvalue()
        output_buffer.close()
        
        # Only return if compression actually reduced size
        if len(compressed_content) < len(pdf_content):
            return compressed_content
        return pdf_content
        
    except Exception as e:
        print(f"PDF compression error: {e}")
        return pdf_content


def generate_pdf_report(title, headers, data):
    """Generic PDF report generator with watermark, brand header, and compression."""
    buffer = BytesIO()
    
    def on_page(canvas, doc):
        canvas.draw_watermark()
        canvas.draw_header(title)

    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=40*mm,
        bottomMargin=20*mm,
        compression=True  # Enable ReportLab compression
    )
    
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=white,
        fontName='Helvetica-Bold',
        alignment=1,
        leading=14,
        wordWrap='LTR',
    )

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica',
        alignment=1,
        leading=13,
        wordWrap='LTR',
    )

    cell_style_left = ParagraphStyle(
        'TableCellLeft',
        parent=cell_style,
        alignment=0,
    )

    elements = []

    wrapped_headers = [Paragraph(str(h), header_style) for h in headers]

    wrapped_data = []
    for row in data:
        wrapped_row = []
        for i, cell in enumerate(row):
            style = cell_style_left if i == 1 or (isinstance(cell, str) and len(str(cell)) > 20) else cell_style
            wrapped_row.append(Paragraph(str(cell) if cell is not None else "", style))
        wrapped_data.append(wrapped_row)

    table_data = [wrapped_headers] + wrapped_data

    col_count = len(headers)
    available_width = A4[0] - 30*mm

    if col_count == 3:
        col_widths = [18*mm, available_width - 58*mm, 40*mm]
    else:
        col_widths = [available_width / col_count] * col_count

    t = Table(table_data, colWidths=col_widths, repeatRows=1, splitByRow=1)

    row_count = len(table_data)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, row_count):
        bg = colors.white if i % 2 == 1 else colors.HexColor('#F0F0F8')
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

    t.setStyle(TableStyle(style_cmds))
    
    elements.append(t)
    
    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page, canvasmaker=ReportCanvas)
    
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Compress PDF to reduce size
    pdf_content = compress_pdf(pdf_content)
    
    return pdf_content

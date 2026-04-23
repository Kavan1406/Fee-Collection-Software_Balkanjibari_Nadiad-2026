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

    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Bold',
        alignment=0,
        textColor=NAVY_BLUE,
        leading=12,
        wordWrap='LTR',
    )

    col_count = len(headers)
    elements = []

    wrapped_headers = [Paragraph(str(h), header_style) for h in headers]

    section_row_indices = []
    wrapped_data = []
    for row in data:
        table_row_idx = len(wrapped_data) + 1  # +1 because header is row 0
        if len(row) == 1:
            # Single-element row â†’ full-width section/batch header
            section_row_indices.append(table_row_idx)
            wrapped_data.append(
                [Paragraph(str(row[0]) if row[0] is not None else '', section_style)]
                + [Paragraph('', cell_style)] * (col_count - 1)
            )
        else:
            wrapped_row = []
            for i, cell in enumerate(row):
                style = cell_style_left if i == 1 or (isinstance(cell, str) and len(str(cell)) > 20) else cell_style
                wrapped_row.append(Paragraph(str(cell) if cell is not None else '', style))
            wrapped_data.append(wrapped_row)

    table_data = [wrapped_headers] + wrapped_data

    available_width = A4[0] - 30*mm

    if col_count == 3:
        col_widths = [18*mm, available_width - 58*mm, 40*mm]
    else:
        col_widths = [available_width / col_count] * col_count

    t = Table(table_data, colWidths=col_widths, repeatRows=1, splitByRow=1)

    row_count = len(table_data)
    section_row_set = set(section_row_indices)

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

    # Alternating colors only for normal data rows
    for i in range(1, row_count):
        if i not in section_row_set:
            bg = colors.white if i % 2 == 1 else colors.HexColor('#F0F0F8')
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))

    # Section header rows: span all columns + distinct lavender background
    for idx in section_row_indices:
        style_cmds.extend([
            ('SPAN', (0, idx), (-1, idx)),
            ('BACKGROUND', (0, idx), (-1, idx), HexColor('#E8EAF6')),
            ('ALIGN', (0, idx), (-1, idx), 'LEFT'),
            ('TEXTCOLOR', (0, idx), (-1, idx), NAVY_BLUE),
            ('TOPPADDING', (0, idx), (-1, idx), 6),
            ('BOTTOMPADDING', (0, idx), (-1, idx), 6),
        ])

    t.setStyle(TableStyle(style_cmds))
    
    elements.append(t)
    
    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page, canvasmaker=ReportCanvas)
    
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Compress PDF to reduce size
    pdf_content = compress_pdf(pdf_content)
    
    return pdf_content


def generate_landscape_pdf_report(title, headers, data):
    pass

def generate_landscape_pdf_report(title, headers, data):
    """Like generate_pdf_report but uses landscape(A4) for wide tables."""
    PAGE = landscape(A4)
    PAGE_W, PAGE_H = PAGE
    buffer = BytesIO()

    class LandscapeCanvas(canvas.Canvas):
        def draw_watermark(self):
            self.saveState()
            logo_path = os.path.join(settings.BASE_DIR, 'apps', 'payments', 'static', 'images', 'logo.png')
            if os.path.exists(logo_path):
                self.setFillAlpha(0.05)
                wm = 120 * mm
                self.drawImage(logo_path, (PAGE_W - wm) / 2, (PAGE_H - wm) / 2,
                               width=wm, height=wm, mask='auto')
            self.restoreState()

        def draw_header(self, t):
            self.saveState()
            self.setFillColor(NAVY_BLUE)
            self.rect(0, PAGE_H - 28 * mm, PAGE_W, 28 * mm, fill=1, stroke=0)
            self.setFillColor(white)
            self.setFont("Helvetica-Bold", 18)
            self.drawCentredString(PAGE_W / 2, PAGE_H - 11 * mm, "Balkan-Ji-Bari, NADIAD")
            self.setFont("Helvetica", 9)
            self.drawCentredString(PAGE_W / 2, PAGE_H - 17 * mm, "Mill Road, Nadiad - 387001")
            self.setFont("Helvetica-Bold", 12)
            self.drawCentredString(PAGE_W / 2, PAGE_H - 24 * mm, t.upper())
            self.restoreState()

    def on_page(canv, doc):
        canv.draw_watermark()
        canv.draw_header(title)

    doc = SimpleDocTemplate(
        buffer, pagesize=PAGE,
        rightMargin=8 * mm, leftMargin=8 * mm,
        topMargin=35 * mm, bottomMargin=12 * mm,
        compression=True,
    )
    styles = getSampleStyleSheet()
    hdr_s = ParagraphStyle('LsHdr', parent=styles['Normal'],
        fontSize=6.5, textColor=white, fontName='Helvetica-Bold',
        alignment=1, leading=9, wordWrap='LTR')
    cell_s = ParagraphStyle('LsCell', parent=styles['Normal'],
        fontSize=6.5, fontName='Helvetica', alignment=1, leading=9, wordWrap='LTR')
    cell_l = ParagraphStyle('LsCellL', parent=cell_s, alignment=0)
    sec_s = ParagraphStyle('LsSec', parent=styles['Normal'],
        fontSize=8, fontName='Helvetica-Bold', alignment=0,
        textColor=NAVY_BLUE, leading=11, wordWrap='LTR')

    col_count = len(headers)
    avail = PAGE_W - 16 * mm
    sr_w = 9 * mm
    col_widths = ([sr_w] + [(avail - sr_w) / (col_count - 1)] * (col_count - 1)
                  if col_count > 1 else [avail])

    wrapped_headers = [Paragraph(str(h), hdr_s) for h in headers]
    section_row_indices = []
    wrapped_data = []
    for row in data:
        ri = len(wrapped_data) + 1
        if len(row) == 1:
            section_row_indices.append(ri)
            wrapped_data.append(
                [Paragraph(str(row[0]) if row[0] else '', sec_s)]
                + [Paragraph('', cell_s)] * (col_count - 1))
        else:
            wr = []
            for i, cell in enumerate(row):
                s = cell_l if i in (1, 2) else cell_s
                wr.append(Paragraph(str(cell) if cell is not None else '', s))
            while len(wr) < col_count:
                wr.append(Paragraph('', cell_s))
            wrapped_data.append(wr)

    table_data = [wrapped_headers] + wrapped_data
    t = Table(table_data, colWidths=col_widths, repeatRows=1, splitByRow=1)
    rc = len(table_data)
    sr_set = set(section_row_indices)
    cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]
    for i in range(1, rc):
        if i not in sr_set:
            cmds.append(('BACKGROUND', (0, i), (-1, i),
                         colors.white if i % 2 == 1 else colors.HexColor('#F0F0F8')))
    for i in section_row_indices:
        cmds.extend([
            ('SPAN', (0, i), (-1, i)),
            ('BACKGROUND', (0, i), (-1, i), HexColor('#E8EAF6')),
            ('ALIGN', (0, i), (-1, i), 'LEFT'),
            ('TEXTCOLOR', (0, i), (-1, i), NAVY_BLUE),
        ])
    t.setStyle(TableStyle(cmds))
    doc.build([t], onFirstPage=on_page, onLaterPages=on_page, canvasmaker=LandscapeCanvas)
    pdf_content = buffer.getvalue()
    buffer.close()
    return compress_pdf(pdf_content)

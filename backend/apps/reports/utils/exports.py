import csv
import io
from datetime import datetime
from decimal import Decimal
import os

try:
    from reportlab.lib.pagesizes import letter, A4, LEGAL, landscape
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def generate_payment_report_csv(payments_data):
    """Generate CSV for Payment Report"""
    output = io.StringIO()
    
    if not payments_data:
        return output
    
    # Get field names from first record
    fieldnames = [
        'Receipt ID',
        'Payment Reference',
        'Student Name',
        'Subject',
        'Phone Number',
        'Amount',
        'Payment Mode',
        'Payment Status',
        'Date',
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for payment in payments_data:
        writer.writerow({
            'Receipt ID': payment.get('receipt_id', ''),
            'Payment Reference': payment.get('payment_ref', ''),
            'Student Name': payment.get('student_name', ''),
            'Subject': payment.get('subject_name', ''),
            'Phone Number': payment.get('phone', ''),
            'Amount': payment.get('amount', 0),
            'Payment Mode': payment.get('payment_mode', ''),
            'Payment Status': payment.get('payment_status', ''),
            'Date': payment.get('created_at', ''),
        })
    
    return output.getvalue()


def generate_enrollment_report_csv(enrollments_data):
    """Generate CSV for Enrollment Report - same format as Payment Report"""
    output = io.StringIO()
    
    if not enrollments_data:
        return output
    
    # Same columns as payment report
    fieldnames = [
        'Receipt ID',
        'Payment Reference',
        'Student Name',
        'Subject',
        'Phone Number',
        'Amount',
        'Payment Mode',
        'Payment Status',
        'Date',
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for enrollment in enrollments_data:
        writer.writerow({
            'Receipt ID': enrollment.get('receipt_id', ''),
            'Payment Reference': enrollment.get('payment_ref', ''),
            'Student Name': enrollment.get('student_name', ''),
            'Subject': enrollment.get('subject_name', ''),
            'Phone Number': enrollment.get('phone', ''),
            'Amount': enrollment.get('amount', 0),
            'Payment Mode': enrollment.get('payment_mode', ''),
            'Payment Status': enrollment.get('payment_status', ''),
            'Date': enrollment.get('created_at', ''),
        })
    
    return output.getvalue()


def generate_payment_report_pdf(payments_data):
    """Generate PDF for Payment Report using ReportLab"""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is not installed. Install it with: pip install reportlab")
    
    output = io.BytesIO()
    
    # Create PDF
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=10,
        leftMargin=10,
        topMargin=15,
        bottomMargin=15,
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=10,
        alignment=TA_CENTER,
    )
    elements.append(Paragraph('Payment Report', title_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Report metadata
    report_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    metadata_style = ParagraphStyle(
        'Metadata',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        spaceAfter=5,
    )
    elements.append(Paragraph(f'Generated on: {report_date}', metadata_style))
    elements.append(Paragraph(f'Total Records: {len(payments_data)}', metadata_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Prepare table data
    table_data = [[
        'Receipt ID',
        'Payment Ref',
        'Student Name',
        'Subject',
        'Phone',
        'Amount',
        'Mode',
        'Status',
        'Date',
    ]]
    
    for payment in payments_data:
        table_data.append([
            str(payment.get('receipt_id', '')),
            str(payment.get('payment_ref', '')),
            str(payment.get('student_name', '')),
            str(payment.get('subject_name', '')),
            str(payment.get('phone', '')),
            f"₹ {payment.get('amount', 0)}",
            str(payment.get('payment_mode', '')),
            str(payment.get('payment_status', '')),
            str(payment.get('created_at', '')),
        ])
    
    # Create table
    table = Table(table_data, colWidths=[
        0.8 * inch,  # Receipt ID
        0.8 * inch,  # Payment Ref
        1.2 * inch,  # Student Name
        1.0 * inch,  # Subject
        0.9 * inch,  # Phone
        0.7 * inch,  # Amount
        0.7 * inch,  # Mode
        0.8 * inch,  # Status
        1.2 * inch,  # Date
    ])
    
    table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Row styling
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        
        # Number alignment
        ('ALIGN', (5, 1), (5, -1), 'RIGHT'),  # Amount column
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    output.seek(0)
    return output


def generate_enrollment_report_pdf(enrollments_data):
    """Generate PDF for Enrollment Report - same format as Payment Report"""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is not installed. Install it with: pip install reportlab")
    
    output = io.BytesIO()
    
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=10,
        leftMargin=10,
        topMargin=15,
        bottomMargin=15,
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=10,
        alignment=TA_CENTER,
    )
    elements.append(Paragraph('Enrollment Report', title_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Report metadata
    report_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    metadata_style = ParagraphStyle(
        'Metadata',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        spaceAfter=5,
    )
    elements.append(Paragraph(f'Generated on: {report_date}', metadata_style))
    elements.append(Paragraph(f'Total Records: {len(enrollments_data)}', metadata_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Prepare table data - only Sr No, Student Name, Student ID
    table_data = [[
        'Sr No',
        'Student Name',
        'Student ID',
    ]]
    
    # Define styles for table cells
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.whitesmoke,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
    )
    
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica',
        alignment=TA_LEFT,
        leading=10,  # Space between lines
    )
    
    # Center style for Sr No and Student ID if needed, but keeping it flexible
    center_cell_style = ParagraphStyle(
        'CenterCellStyle',
        parent=cell_style,
        alignment=TA_CENTER,
    )

    # Use first row for header with Paragraphs to support wrapping if header is long (though it's not here)
    table_data = [
        [
            Paragraph('Sr No', header_style),
            Paragraph('Student Name', header_style),
            Paragraph('Student ID', header_style),
        ]
    ]

    for i, enrollment in enumerate(enrollments_data, 1):
        table_data.append([
            Paragraph(str(i), center_cell_style),
            Paragraph(str(enrollment.get('student_name', '')), cell_style),
            Paragraph(str(enrollment.get('student_id', '')), center_cell_style),
        ])
    
    # Create table with 3 columns
    # A4 is ~8.27 inches. Subtracting 20 units (10 each side) margins. 
    # 72 points = 1 inch.
    # Total width available approx 550 points.
    table = Table(table_data, colWidths=[
        0.7 * inch,  # Sr No
        4.8 * inch,  # Student Name
        1.8 * inch,  # Student ID
    ])
    
    table.setStyle(TableStyle([
        # Header styling
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Row styling
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    output.seek(0)
    return output


def generate_subject_student_report_csv(data):
    """Generate CSV for Subject-wise Total Students Report"""
    output = io.StringIO()
    
    if not data:
        return output
    
    fieldnames = ['Sr No', 'Subject Name', 'Total Students']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for i, item in enumerate(data, 1):
        writer.writerow({
            'Sr No': i,
            'Subject Name': item.get('subject_name', ''),
            'Total Students': item.get('student_count', 0),
        })
    
    # Grand Total row
    total = sum(item.get('student_count', 0) for item in data)
    writer.writerow({
        'Sr No': '',
        'Subject Name': 'GRAND TOTAL',
        'Total Students': total,
    })
    
    return output.getvalue()


def generate_subject_student_report_pdf(data):
    """Generate PDF for Subject-wise Total Students Report"""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is not installed. Install it with: pip install reportlab")
    
    output = io.BytesIO()
    
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=30,
        bottomMargin=30,
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=15,
        alignment=TA_CENTER,
    )
    elements.append(Paragraph('Subject-wise Total Students Report', title_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Metadata
    report_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    metadata_style = ParagraphStyle(
        'Metadata',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=10,
    )
    elements.append(Paragraph(f'Generated on: {report_date}', metadata_style))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Header styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.whitesmoke,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
    )
    
    # Cell styles
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        alignment=TA_LEFT,
        leading=12,
    )
    
    center_style = ParagraphStyle(
        'CenterStyle',
        parent=cell_style,
        alignment=TA_CENTER,
    )

    # Table Header
    table_data = [
        [
            Paragraph('Sr No', header_style),
            Paragraph('Subject Name', header_style),
            Paragraph('Total Students', header_style),
        ]
    ]

    # Data Rows
    for i, item in enumerate(data, 1):
        table_data.append([
            Paragraph(str(i), center_style),
            Paragraph(str(item.get('subject_name', '')), cell_style),
            Paragraph(str(item.get('student_count', 0)), center_style),
        ])
    
    # Grand Total Row
    total = sum(item.get('student_count', 0) for item in data)
    table_data.append([
        '',
        Paragraph('<b>GRAND TOTAL</b>', ParagraphStyle('TotalLabel', parent=cell_style, alignment=TA_RIGHT)),
        Paragraph(f'<b>{total}</b>', center_style),
    ])
    
    # Create Table
    available_width = A4[0] - 80  # Account for 40 units margin on each side
    table = Table(table_data, colWidths=[
        0.8 * inch,
        available_width - 2.0 * inch,
        1.2 * inch
    ])
    
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f8fafc')]),
        
        # Grand Total styling
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f1f5f9')),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    elements.append(table)
    
    # Footer
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph('<i>End of Report</i>', ParagraphStyle('Footer', parent=styles['Normal'], alignment=TA_CENTER, fontSize=8, textColor=colors.grey)))
    
    # Build
    doc.build(elements)
    output.seek(0)
    return output


def generate_attendance_sheet_csv(data, subject_name, batch_time):
    """Generate CSV for Attendance Sheet"""
    output = io.StringIO()
    
    # Headers
    header_info = [
        ['NADIAD BALKAN-JI-BARI'],
        ['ATTENDANCE REPORT'],
        [f'Subject: {subject_name}', f'Batch: {batch_time}'],
        [] # Empty row
    ]
    
    writer = csv.writer(output)
    for row in header_info:
        writer.writerow(row)
    
    # Table Header
    cols = ['Sr No', 'Student Name', 'Student ID']
    for i in range(1, 30):
        cols.append(str(i))
    cols.extend(['M', 'I'])
    
    writer.writerow(cols)
    
    for i, item in enumerate(data, 1):
        row = [i, item.get('student_name', ''), item.get('student_id', '')]
        # Empty cells for attendance and M/I
        row.extend([''] * 31)
        writer.writerow(row)
        
    return output.getvalue()


def generate_attendance_sheet_pdf(data, subject_name, batch_time):
    """Generate PDF for Attendance Sheet (Legal Landscape)"""
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is not installed.")
    
    output = io.BytesIO()
    
    # Legal Landscape
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(LEGAL),
        rightMargin=30,
        leftMargin=30,
        topMargin=20,
        bottomMargin=20,
    )
    
    def draw_watermark(canvas, doc):
        canvas.saveState()
        try:
            # Try to find logo in common locations
            current_dir = os.path.dirname(os.path.abspath(__file__)) # .../backend/apps/reports/utils/
            root_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..', '..'))
            
            possible_paths = [
                os.path.join(root_dir, 'public', 'logo.jpeg'),
                os.path.join(os.getcwd(), 'public', 'logo.jpeg'),
                os.path.join(os.getcwd(), '..', 'public', 'logo.jpeg'),
                '/opt/render/project/src/public/logo.jpeg'
            ]
            
            logo_path = None
            for p in possible_paths:
                if os.path.exists(p):
                    logo_path = p
                    break
            
            if logo_path:
                canvas.setFillAlpha(0.08) # Subtle watermark
                # Legal Landscape is 1008 x 612 points
                w, h = 1008, 612
                img_size = 4 * 72 # 4 inches
                canvas.drawImage(logo_path, w/2 - img_size/2, h/2 - img_size/2, width=img_size, height=img_size, mask='auto')
        except:
            pass
        canvas.restoreState()

    elements = []
    styles = getSampleStyleSheet()
    
    # Header Section
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=14,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=5
    )
    
    elements.append(Paragraph('NADIAD BALKAN-JI-BARI', header_style))
    elements.append(Paragraph('BALKANJI BARI SUMMER CAMP 2026', ParagraphStyle('SubHeader', parent=header_style, fontSize=12)))
    elements.append(Paragraph('ATTENDANCE REPORT 2026', ParagraphStyle('SubHeader', parent=header_style, fontSize=11)))
    elements.append(Spacer(1, 0.1 * inch))
    
    # Info line (Subject and Batch)
    info_style = ParagraphStyle('InfoStyle', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold')
    info_table_data = [[
        Paragraph(f'Name of Subject : {subject_name}', info_style),
        Paragraph(f'Batch Time : {batch_time}', info_style)
    ]]
    info_table = Table(info_table_data, colWidths=[5 * inch, 4 * inch])
    info_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'LEFT')]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.1 * inch))
    
    # Table Header
    header_font_size = 7
    table_header_style = ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=header_font_size, fontName='Helvetica-Bold', alignment=TA_CENTER)
    
    header_row = [
        Paragraph('Sr No', table_header_style),
        Paragraph('Student Name', table_header_style),
        Paragraph('Student ID', table_header_style)
    ]
    for i in range(1, 30):
        header_row.append(Paragraph(str(i), table_header_style))
    header_row.append(Paragraph('M', table_header_style))
    header_row.append(Paragraph('I', table_header_style))
    
    table_data = [header_row]
    
    # Data Rows
    cell_style = ParagraphStyle('CellStyle', parent=styles['Normal'], fontSize=8, fontName='Helvetica')
    for i, item in enumerate(data, 1):
        row = [
            Paragraph(str(i), ParagraphStyle('CenterCell', parent=cell_style, alignment=TA_CENTER)),
            Paragraph(item.get('student_name', ''), cell_style),
            Paragraph(item.get('student_id', ''), ParagraphStyle('CenterCell', parent=cell_style, alignment=TA_CENTER))
        ]
        # Add 31 empty columns (29 days + M + I)
        row.extend([''] * 31)
        table_data.append(row)
        
    # Column Widths
    # Total width of Landscape Legal is 14 inches = 1008 pts
    # Margins 30+30 = 60 pts. Available 948 pts.
    sr_w = 35
    name_w = 160
    id_w = 80
    date_w = 21 # (948 - 35 - 160 - 80) / 31 = 673 / 31 = 21.7
    
    col_widths = [sr_w, name_w, id_w] + [date_w] * 31
    
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
    ]))
    
    elements.append(table)
    
    # Build
    doc.build(elements, onFirstPage=draw_watermark, onLaterPages=draw_watermark)
    output.seek(0)
    return output

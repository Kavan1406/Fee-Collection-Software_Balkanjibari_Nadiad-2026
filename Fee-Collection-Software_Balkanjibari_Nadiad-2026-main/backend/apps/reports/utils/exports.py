import csv
import io
from datetime import datetime
from decimal import Decimal

try:
    from reportlab.lib.pagesizes import letter, A4
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
        topMargin=20,
        bottomMargin=20,
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER,
    )
    elements.append(Paragraph('Payment Report', title_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Report metadata
    report_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    metadata_style = ParagraphStyle(
        'Metadata',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        spaceAfter=10,
    )
    elements.append(Paragraph(f'Generated on: {report_date}', metadata_style))
    elements.append(Paragraph(f'Total Records: {len(payments_data)}', metadata_style))
    elements.append(Spacer(1, 0.2 * inch))
    
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
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        # Row styling
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        
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
        topMargin=20,
        bottomMargin=20,
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER,
    )
    elements.append(Paragraph('Enrollment Report', title_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Report metadata
    report_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    metadata_style = ParagraphStyle(
        'Metadata',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        spaceAfter=10,
    )
    elements.append(Paragraph(f'Generated on: {report_date}', metadata_style))
    elements.append(Paragraph(f'Total Records: {len(enrollments_data)}', metadata_style))
    elements.append(Spacer(1, 0.2 * inch))
    
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
        leading=12,  # Space between lines
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
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        
        # Row styling
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    output.seek(0)
    return output

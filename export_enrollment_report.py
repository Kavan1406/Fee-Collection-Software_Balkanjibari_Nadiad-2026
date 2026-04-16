#!/usr/bin/env python
"""
Script to export all Enrollment data to CSV file
Run from project root: python export_enrollment_report.py
"""

import os
import sys
import django
import csv
from datetime import datetime

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.enrollments.models import Enrollment
from apps.payments.models import Payment

def export_enrollment_report():
    """Export all enrollment records to CSV"""
    
    # Get all enrollments ordered by date
    enrollments = Enrollment.objects.filter(
        is_deleted=False
    ).select_related(
        'student',
        'subject'
    ).order_by('-created_at')
    
    print(f"Found {enrollments.count()} enrollment records")
    
    # Create CSV file
    filename = f"enrollment_report_all_students_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.csv"
    filepath = os.path.join(os.path.dirname(__file__), filename)
    
    with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
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
        
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for enrollment in enrollments:
            try:
                # Get related payment
                payment = Payment.objects.filter(
                    enrollment=enrollment,
                    is_deleted=False
                ).first()
                
                receipt_id = 'N/A'
                payment_ref = 'N/A'
                payment_mode = 'NOT_PAID'
                payment_status = 'PENDING'
                
                if payment:
                    receipt_id = payment.receipt_number or 'N/A'
                    payment_ref = payment.payment_id or 'N/A'
                    payment_mode = payment.payment_mode
                    payment_status = payment.status
                
                writer.writerow({
                    'Receipt ID': receipt_id,
                    'Payment Reference': payment_ref,
                    'Student Name': enrollment.student.name,
                    'Subject': enrollment.subject.name,
                    'Phone Number': enrollment.student.phone or 'N/A',
                    'Amount': enrollment.total_fee,
                    'Payment Mode': payment_mode,
                    'Payment Status': payment_status,
                    'Date': enrollment.created_at.strftime('%Y-%m-%d'),
                })
            except Exception as e:
                print(f"Error processing enrollment {enrollment.id}: {str(e)}")
                continue
    
    print(f"\n✅ Enrollment Report exported successfully!")
    print(f"📄 File: {filepath}")
    print(f"📊 Total records: {enrollments.count()}")
    
    return filepath

if __name__ == '__main__':
    export_enrollment_report()

#!/usr/bin/env python
"""
Script to export all Payments data to CSV file
Run from project root: python export_payments_report.py
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

from apps.payments.models import Payment
from apps.enrollments.models import Enrollment

def export_payments_report():
    """Export all payment records to CSV"""
    
    # Get all payments ordered by date
    payments = Payment.objects.filter(
        is_deleted=False
    ).select_related(
        'enrollment__student',
        'enrollment__subject'
    ).order_by('-payment_date', '-created_at')
    
    print(f"Found {payments.count()} payment records")
    
    # Create CSV file
    filename = f"payments_report_all_students_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.csv"
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
        
        for payment in payments:
            try:
                writer.writerow({
                    'Receipt ID': payment.receipt_number or 'N/A',
                    'Payment Reference': payment.payment_id or 'N/A',
                    'Student Name': payment.enrollment.student.name,
                    'Subject': payment.enrollment.subject.name,
                    'Phone Number': payment.enrollment.student.phone or 'N/A',
                    'Amount': payment.amount,
                    'Payment Mode': payment.payment_mode,
                    'Payment Status': payment.status,
                    'Date': payment.payment_date.strftime('%Y-%m-%d') if payment.payment_date else payment.created_at.strftime('%Y-%m-%d'),
                })
            except Exception as e:
                print(f"Error processing payment {payment.payment_id}: {str(e)}")
                continue
    
    print(f"\n✅ Payments Report exported successfully!")
    print(f"📄 File: {filepath}")
    print(f"📊 Total records: {payments.count()}")
    
    return filepath

if __name__ == '__main__':
    export_payments_report()

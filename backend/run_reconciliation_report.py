#!/usr/bin/env python
"""
Payment Reconciliation Report Generator.
Generates detailed reconciliation report comparing Razorpay vs Database.
"""

import os
import sys
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.db.models import Sum, Count, Q
from django.utils import timezone
from apps.payments.models import Payment
from apps.enrollments.models import Enrollment
from decimal import Decimal

class ReconciliationReport:
    """Generate payment reconciliation reports."""
    
    def __init__(self, start_date=None, end_date=None):
        self.start_date = start_date or (timezone.now() - timedelta(days=90)).date()
        self.end_date = end_date or timezone.now().date()
        self.report_data = {}
    
    def generate_full_report(self):
        """Generate complete reconciliation report."""
        print('\n' + '='*80)
        print('PAYMENT RECONCILIATION REPORT')
        print('='*80)
        print(f'\nReport Period: {self.start_date} to {self.end_date}')
        
        # Database Summary
        print('\n[DATABASE SUMMARY]')
        self._generate_database_summary()
        
        # Razorpay Comparison
        print('\n[RAZORPAY COMPARISON]')
        self._compare_with_razorpay()
        
        # Discrepancies
        print('\n[DISCREPANCY ANALYSIS]')
        self._analyze_discrepancies()
        
        # Outstanding Analysis
        print('\n[OUTSTANDING FEES ANALYSIS]')
        self._analyze_outstanding()
        
        print('\n' + '='*80)
        print('END OF RECONCILIATION REPORT')
        print('='*80 + '\n')
        
        return self.report_data
    
    def _generate_database_summary(self):
        """Generate database payment summary."""
        payments = Payment.objects.filter(
            is_deleted=False,
            payment_date__gte=self.start_date,
            payment_date__lte=self.end_date
        )
        
        # By status
        success_data = payments.filter(status='SUCCESS').aggregate(
            count=Count('id'),
            total=Sum('amount')
        )
        pending_data = payments.filter(
            status__in=['PENDING_CONFIRMATION', 'CREATED']
        ).aggregate(count=Count('id'), total=Sum('amount'))
        
        # By mode
        online_data = payments.filter(payment_mode='ONLINE').aggregate(
            count=Count('id'),
            total=Sum('amount')
        )
        cash_data = payments.filter(payment_mode='CASH').aggregate(
            count=Count('id'),
            total=Sum('amount')
        )
        
        print(f'\n  Successful Payments: {success_data["count"] or 0} (Rs {float(success_data["total"] or 0):,.2f})')
        print(f'  Pending Payments: {pending_data["count"] or 0} (Rs {float(pending_data["total"] or 0):,.2f})')
        print(f'  Online Payments: {online_data["count"] or 0} (Rs {float(online_data["total"] or 0):,.2f})')
        print(f'  Cash Payments: {cash_data["count"] or 0} (Rs {float(cash_data["total"] or 0):,.2f})')
        
        self.report_data['database'] = {
            'successful_count': success_data["count"] or 0,
            'successful_total': float(success_data["total"] or 0),
            'pending_count': pending_data["count"] or 0,
            'pending_total': float(pending_data["total"] or 0),
            'online_count': online_data["count"] or 0,
            'online_total': float(online_data["total"] or 0),
            'cash_count': cash_data["count"] or 0,
            'cash_total': float(cash_data["total"] or 0),
        }
    
    def _compare_with_razorpay(self):
        """Compare with Razorpay data."""
        try:
            import razorpay
            from django.conf import settings
            
            RAZORPAY_KEY_ID = getattr(settings, 'RAZORPAY_KEY_ID', '')
            RAZORPAY_KEY_SECRET = getattr(settings, 'RAZORPAY_KEY_SECRET', '')
            
            if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
                print('\n  * Razorpay credentials not configured')
                print('  * Skipping Razorpay comparison')
                return
            
            razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
            razorpay_payments = razorpay_client.payment.all({'skip': 0, 'count': 500})
            razorpay_items = razorpay_payments.get('items', [])
            
            captured = [p for p in razorpay_items if p.get('status') in ['captured', 'authorized']]
            captured_total = Decimal(str(sum(p.get('amount', 0) for p in captured) / 100))
            
            print(f'\n  Razorpay Captured Payments: {len(captured)} (Rs {float(captured_total):,.2f})')
            print(f'  Total Razorpay Payments: {len(razorpay_items)}')
            
            self.report_data['razorpay'] = {
                'captured_count': len(captured),
                'captured_total': float(captured_total),
                'total_count': len(razorpay_items),
            }
        
        except ImportError:
            print('\n  * razorpay package not installed')
        except Exception as e:
            print(f'\n  * Error connecting to Razorpay: {str(e)}')
    
    def _analyze_discrepancies(self):
        """Analyze discrepancies between database and Razorpay."""
        print('\n  Analyzing discrepancies...')
        
        # Find pending payments without Razorpay confirmation
        pending_no_rzp = Payment.objects.filter(
            status__in=['PENDING_CONFIRMATION', 'CREATED'],
            razorpay_payment_id__exact='',
            is_deleted=False
        ).count()
        
        # Find payments with multiple entries
        duplicate_payments = Payment.objects.filter(
            is_deleted=False
        ).values('razorpay_order_id').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        print(f'  * Pending payments without Razorpay ID: {pending_no_rzp}')
        print(f'  * Potential duplicate entries: {duplicate_payments.count()}')
        
        if duplicate_payments.count() > 0:
            print('    WARNING: Found potential duplicate payment entries')
        
        self.report_data['discrepancies'] = {
            'pending_no_rzp': pending_no_rzp,
            'potential_duplicates': duplicate_payments.count(),
        }
    
    def _analyze_outstanding(self):
        """Analyze outstanding fees."""
        outstanding_enrollments = Enrollment.objects.filter(
            is_deleted=False,
            status='ACTIVE',
            pending_amount__gt=0
        ).count()
        
        total_outstanding = Enrollment.objects.filter(
            is_deleted=False,
            status='ACTIVE'
        ).aggregate(total=Sum('pending_amount'))['total'] or 0
        
        print(f'\n  * Students with pending fees: {outstanding_enrollments}')
        print(f'  * Total outstanding amount: Rs {float(total_outstanding):,.2f}')
        
        # High outstanding
        high_outstanding = Enrollment.objects.filter(
            is_deleted=False,
            status='ACTIVE',
            pending_amount__gte=50000
        ).count()
        
        if high_outstanding > 0:
            print(f'  * Students with Rs 50,000+ pending: {high_outstanding}')
        
        self.report_data['outstanding'] = {
            'students_with_pending': outstanding_enrollments,
            'total_outstanding': float(total_outstanding),
            'high_outstanding_count': high_outstanding,
        }


def main():
    """Run reconciliation report."""
    try:
        report = ReconciliationReport()
        report.generate_full_report()
        return report.report_data
    except Exception as e:
        print(f'\nERROR: {str(e)}')
        import traceback
        traceback.print_exc()
        return None


if __name__ == '__main__':
    main()

#!/usr/bin/env python
"""
Payment sync script for updating system statistics.
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.db import transaction
from django.db.models import Sum, Count
from apps.payments.models import Payment
from apps.enrollments.models import Enrollment
from decimal import Decimal

print('\n' + '='*80)
print('PAYMENT SYSTEM SYNC AND RECONCILIATION')
print('='*80)

# Step 1: Recalculate enrollment finances
print('\nStep 1: Recalculating enrollment finances...')
enrollments = Enrollment.objects.filter(is_deleted=False, status='ACTIVE')
updated = 0

with transaction.atomic():
    for enrollment in enrollments:
        total_paid = Payment.objects.filter(
            enrollment=enrollment,
            status='SUCCESS',
            is_deleted=False
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        total_pending = max(
            Decimal('0'),
            Decimal(str(enrollment.total_fee)) - Decimal(str(total_paid))
        )
        
        if enrollment.paid_amount != total_paid or enrollment.pending_amount != total_pending:
            enrollment.paid_amount = Decimal(str(total_paid))
            enrollment.pending_amount = total_pending
            enrollment.save()
            updated += 1

print(f'   * Recalculated {updated} enrollments')

# Step 2: Calculate statistics
print('\nStep 2: Calculating dashboard statistics...')

total_collections = Payment.objects.filter(
    status='SUCCESS',
    is_deleted=False
).aggregate(Sum('amount'))['amount__sum'] or 0

total_outstanding = Enrollment.objects.filter(
    is_deleted=False,
    status='ACTIVE'
).aggregate(Sum('pending_amount'))['pending_amount__sum'] or 0

total_transactions = Payment.objects.filter(is_deleted=False).count()

online_data = Payment.objects.filter(
    payment_mode='ONLINE',
    is_deleted=False
).aggregate(count=Count('id'), total=Sum('amount'))

cash_data = Payment.objects.filter(
    payment_mode='CASH',
    is_deleted=False
).aggregate(count=Count('id'), total=Sum('amount'))

pending_confirmation = Payment.objects.filter(
    status__in=['PENDING_CONFIRMATION', 'CREATED'],
    is_deleted=False
).count()

success_count = Payment.objects.filter(status='SUCCESS', is_deleted=False).count()
failed_count = Payment.objects.filter(status='FAILED', is_deleted=False).count()
success_rate = (success_count / total_transactions * 100) if total_transactions > 0 else 0

# Print summary
print('\n' + '='*80)
print('PAYMENT SYSTEM SUMMARY')
print('='*80)

print('\nCOLLECTIONS & OUTSTANDING:')
print(f'   * Total Collections (Confirmed): Rs {float(total_collections):,.2f}')
print(f'   * Outstanding Amount: Rs {float(total_outstanding):,.2f}')
print(f'   * Total Transactions: {total_transactions}')

print('\nPAYMENT MODES:')
online_count = online_data['count'] or 0
online_total = float(online_data['total'] or 0)
cash_count = cash_data['count'] or 0
cash_total = float(cash_data['total'] or 0)
print(f'   * Online Payments: {online_count} (Rs {online_total:,.2f})')
print(f'   * Cash Payments: {cash_count} (Rs {cash_total:,.2f})')

print('\nPENDING:')
print(f'   * Pending Confirmation: {pending_confirmation}')

print('\nSUCCESS METRICS:')
print(f'   * Success Rate: {success_rate:.2f}%')
print(f'   * Successful Payments: {success_count}')
print(f'   * Failed Payments: {failed_count}')

print('\n' + '='*80)
print('SYNC COMPLETE - System is now synchronized')
print('='*80 + '\n')


import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.payments.models import Payment, FeeLedgerEntry
from django.db import transaction

def backfill_ledger():
    print("Starting Fee Ledger backfill...")
    
    # Get all successful payments that don't have a ledger entry
    payments = Payment.objects.filter(
        status='SUCCESS', 
        is_deleted=False
    ).exclude(
        id__in=FeeLedgerEntry.objects.values_list('reference_payment_id', flat=True)
    )
    
    count = payments.count()
    print(f"Found {count} successful payments to backfill.")
    
    created_count = 0
    with transaction.atomic():
        for payment in payments:
            FeeLedgerEntry.objects.create(
                student=payment.enrollment.student,
                transaction_type='PAYMENT',
                amount=payment.amount,
                reference_payment=payment,
                created_by=payment.recorded_by,
                notes=f"Backfilled: Payment {payment.payment_id}",
                created_at=payment.created_at # Keep original timing as much as possible
            )
            created_count += 1
            if created_count % 10 == 0:
                print(f"Processed {created_count}/{count}...")
    
    print(f"Successfully backfilled {created_count} ledger entries.")

if __name__ == "__main__":
    backfill_ledger()

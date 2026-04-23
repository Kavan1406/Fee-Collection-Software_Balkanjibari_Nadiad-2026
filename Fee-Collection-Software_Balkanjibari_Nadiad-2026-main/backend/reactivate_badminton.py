import os
import django
import sys
from decimal import Decimal
from datetime import date

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.subjects.models import Subject, FeeStructure, SubjectBatch

def reactivate_badminton():
    print("--- Reactivating Badminton Batch ---")
    
    # 1. Get or create Badminton subject
    subject, created = Subject.objects.get_or_create(
        name="Badminton",
        defaults={
            "category": "SPORTS",
            "activity_type": "SUMMER_CAMP",
            "default_batch_timing": "6:00 PM – 7:00 PM",
            "age_limit": "10 onwards",
            "description": "Training on primary rules and techniques of Badminton.",
            "is_active": True,
            "is_deleted": False,
            "max_seats": 50
        }
    )
    
    if not created:
        subject.is_active = True
        subject.is_deleted = False
        subject.save()
        print(f"Badminton subject reactivated.")
    else:
        print(f"Badminton subject created.")

    # 2. Ensure FeeStructure exists
    FeeStructure.objects.get_or_create(
        subject=subject,
        duration='1_MONTH',
        is_active=True,
        defaults={
            "fee_amount": Decimal("1000"),
            "effective_from": date(2026, 1, 1)
        }
    )
    print("Fee structure verified.")

    # 3. Create or Update the Batch
    # The user mentioned "time and batch capacity"
    # Let's set a default one if none exists
    batch, b_created = SubjectBatch.objects.update_or_create(
        subject=subject,
        batch_time="6:00 PM – 7:00 PM",
        defaults={
            "capacity_limit": 50,
            "is_active": True
        }
    )
    
    status = "Created" if b_created else "Updated/Reactivated"
    print(f"Batch {batch.batch_time} {status} with capacity {batch.capacity_limit}.")

if __name__ == "__main__":
    reactivate_badminton()

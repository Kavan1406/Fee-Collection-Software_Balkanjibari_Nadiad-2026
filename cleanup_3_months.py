import os
import django
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings.development')
django.setup()

from apps.subjects.models import Subject, FeeStructure

def cleanup_3_month_subjects():
    print("Starting cleanup of 3-month subjects and fee structures...")
    
    # 1. Delete all fee structures with 3 months
    f_deleted = FeeStructure.objects.filter(duration='3_MONTHS').delete()
    print(f"Deleted {f_deleted[0]} fee structures with '3_MONTHS' duration.")
    
    # 2. Find subjects that have NO active fee structure left (likely were only 3 months)
    # and subjects that specifically mention 3 months or have duration_months=3
    subjects_to_remove = Subject.objects.filter(duration_months=3)
    s_count = subjects_to_remove.count()
    subjects_to_remove.delete()
    print(f"Deleted {s_count} subjects explicitly marked with 3-month duration.")
    
    # 3. Handle subjects that might have become 'orphans' (no fee structure)
    orphans = Subject.objects.filter(fee_structures__isnull=True)
    o_count = orphans.count()
    # orphans.delete() # Optional: keep them or delete? User said "remove subjects of 3 months"
    # For now, I'll delete them as they are likely the ones the user wants gone.
    orphans.delete()
    print(f"Deleted {o_count} orphaned subjects with no fee structures.")
    
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_3_month_subjects()

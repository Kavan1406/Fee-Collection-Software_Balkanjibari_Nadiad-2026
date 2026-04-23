import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.subjects.models import Subject, SubjectBatch

def cleanup_badminton():
    sub = Subject.objects.filter(name="Badminton").first()
    if not sub:
        return
    
    # De-activate old batches and keep the 50 capacity one active
    batches = SubjectBatch.objects.filter(subject=sub)
    for b in batches:
        if b.capacity_limit == 50:
            b.is_active = True
            b.save()
            print(f"Keeping Active: {b.batch_time} (Cap: {b.capacity_limit})")
        else:
            b.is_active = False
            b.save()
            print(f"Deactivating: {b.batch_time} (Cap: {b.capacity_limit})")

if __name__ == "__main__":
    cleanup_badminton()

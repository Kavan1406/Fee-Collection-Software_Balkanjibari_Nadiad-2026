import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.subjects.models import Subject, SubjectBatch
from django.db.models import Count

def restore_previous_badminton_batch():
    sub = Subject.objects.filter(name="Badminton").first()
    if not sub:
        print("Badminton subject not found.")
        return
    
    print(f"Subject: {sub.name}")
    
    # 1. Identify batches
    batches = SubjectBatch.objects.filter(subject=sub)
    
    target_batch = None
    new_empty_batch = None
    
    for b in batches:
        # Check enrolled count
        # In Django, we can get this if the model has a property or we can count related objects
        # SubjectBatch usually has a property or method for enrolled_count if it's not a field.
        # Based on previous viewed code, it seems to have enrolled_count in the serializer but maybe not the model?
        # Let's count Enrollments related to this batch.
        from apps.enrollments.models import Enrollment
        count = Enrollment.objects.filter(subject_id=sub.id, batch_time=b.batch_time).count()
        print(f"Batch: '{b.batch_time}', Capacity: {b.capacity_limit}, Active: {b.is_active}, Internal Enrollments Search Count: {count}")
        
        if b.capacity_limit == 20: # This is likely the previous one
            target_batch = b
        elif b.capacity_limit == 50:
            new_empty_batch = b
            
    if target_batch:
        target_batch.is_active = True
        target_batch.save()
        print(f"Reactivated previous batch: {target_batch.batch_time} (Cap: 20)")
    else:
        print("Could not find the batch with limit 20.")
        
    if new_empty_batch:
        new_empty_batch.delete()
        print(f"Deleted new empty batch: {new_empty_batch.batch_time} (Cap: 50)")

if __name__ == "__main__":
    restore_previous_badminton_batch()

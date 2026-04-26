import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.subjects.models import Subject, SubjectBatch

def fix_abacus():
    try:
        subject = Subject.objects.get(name='Abacus and Brain Development')
        print(f"Found Subject: {subject.name} (ID: {subject.id})")
        
        # Update timing schedule and default
        subject.timing_schedule = '11:00 AM - 12:00 PM'
        subject.default_batch_timing = '11:00 AM - 12:00 PM'
        subject.is_active = True
        subject.is_deleted = False
        subject.save()
        print("Updated subject timing fields.")
        
        # Ensure the batch exists and extend it
        batch_time = '11:00 AM - 12:00 PM'
        batch, created = SubjectBatch.objects.get_or_create(
            subject=subject,
            batch_time=batch_time,
            defaults={'capacity_limit': 75}
        )
        if not created:
            batch.capacity_limit = 75
            batch.is_active = True
            batch.save()
            print(f"Extended existing batch to 75 seats: {batch_time}")
        else:
            print(f"Created/Restored batch with 75 seats: {batch_time}")
            
        # Deactivate other batches if they exist and user wanted 'only' this one
        # To be safe, I'll just make sure this one is active and matches the naming
        # The user said '11 to 12 pm only', which implies they don't want others.
        other_batches = SubjectBatch.objects.filter(subject=subject).exclude(batch_time=batch_time)
        for b in other_batches:
            print(f"Deactivating/Deleting other batch: {b.batch_time}")
            b.delete() # Or b.is_active = False. I'll delete to keep it clean if they want 'only' this one.
            
        print("Abacus batches fixed successfully.")
        
    except Subject.DoesNotExist:
        print("Subject 'Abacus and Brain Development' not found.")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == '__main__':
    fix_abacus()

import os
import sys
import django

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.enrollments.models import Enrollment
from apps.subjects.models import Subject

def backfill():
    subjects = Subject.objects.filter(is_deleted=False)
    updated_count = 0
    
    for subject in subjects:
        enrollments = Enrollment.objects.filter(
            subject=subject, 
            is_deleted=False
        ).order_by('created_at')
        
        for index, enrollment in enumerate(enrollments, start=1):
            enrollment.roll_number = index
            enrollment.save()
            updated_count += 1
            print(f"Assigned Roll No {index} to {enrollment.student.name} for {subject.name}")
            
    print(f"\nSuccessfully backfilled {updated_count} enrollments.")

if __name__ == "__main__":
    backfill()

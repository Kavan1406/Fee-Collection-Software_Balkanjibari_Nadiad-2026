import os
import sys
import django

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.subjects.models import Subject, SubjectBatch
from apps.enrollments.models import Enrollment

def check_badminton():
    try:
        badminton = Subject.objects.get(name='Badminton')
        batches = SubjectBatch.objects.filter(subject=badminton)
        print(f"Badminton Batches: {batches.count()}")
        for b in batches:
            enrollments = Enrollment.objects.filter(
                subject=badminton, 
                batch_time=b.batch_time, 
                is_deleted=False
            ).count()
            print(f"Batch: {b.batch_time}, Capacity: {b.capacity_limit}, Active: {b.is_active}, Enrollments: {enrollments}")
            
            students = Enrollment.objects.filter(
                subject=badminton, 
                batch_time=b.batch_time, 
                is_deleted=False
            ).values_list('student__name', flat=True)[:5]
            if students:
                print(f"Sample Students: {', '.join(students)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_badminton()
鼓

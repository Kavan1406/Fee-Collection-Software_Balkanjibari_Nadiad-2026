import os
import django
import sys
from decimal import Decimal

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.subjects.models import Subject

def verify_subjects():
    print("--- Verifying Subjects ---")
    all_subjects = Subject.objects.filter(is_deleted=False)
    summer_camp = all_subjects.filter(activity_type='SUMMER_CAMP')
    
    print(f"Total Active Subjects: {all_subjects.count()}")
    print(f"Summer Camp Subjects: {summer_camp.count()}")
    
    if summer_camp.count() > 0:
        print("\nSummer Camp Sample:")
        for s in summer_camp[:5]:
            print(f"- {s.name} (Active: {s.is_active}, Type: {s.activity_type})")
    else:
        print("\nWARNING: No Summer Camp subjects found!")

if __name__ == "__main__":
    verify_subjects()

"""
Script to clear blood_group for all Student and RegistrationRequest records.
Run from backend directory:  python clear_blood_group.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from apps.students.models import Student, StudentRegistrationRequest

# Clear Student blood_group
updated_students = Student.objects.exclude(blood_group__isnull=True).exclude(blood_group='').count()
Student.objects.all().update(blood_group='')
print(f"[OK] Cleared blood_group for {updated_students} Student record(s).")

# Clear RegistrationRequest blood_group
updated_reqs = StudentRegistrationRequest.objects.exclude(blood_group__isnull=True).exclude(blood_group='').count()
StudentRegistrationRequest.objects.all().update(blood_group='')
print(f"[OK] Cleared blood_group for {updated_reqs} RegistrationRequest record(s).")

print("\nDone. All blood group data has been cleared.")

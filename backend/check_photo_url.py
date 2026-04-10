import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.students.models import Student

# Get STU001
student = Student.objects.filter(student_id='STU001').first()
if not student:
    student = Student.objects.first()

if student:
    print(f"Student: {student.name} ({student.student_id})")
    photo_field = student.photo
    print(f"Photo field type: {type(photo_field)}")
    if photo_field:
        try:
            print(f"Photo URL: {photo_field.url}")
        except Exception as e:
            print(f"Error getting URL: {e}")
        
        try:
            # For CloudinaryField, it might be a CloudinaryResource
            if hasattr(photo_field, 'public_id'):
                print(f"Public ID: {photo_field.public_id}")
            else:
                print(f"Raw value: {photo_field}")
        except Exception as e:
            print(f"Error getting metadata: {e}")
    else:
        print("Student has no photo (None or empty)")
else:
    print("No students found in database")

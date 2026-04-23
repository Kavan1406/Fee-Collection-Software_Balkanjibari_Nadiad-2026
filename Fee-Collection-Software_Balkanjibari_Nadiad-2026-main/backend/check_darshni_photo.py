import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.students.models import Student
from apps.students.serializers import StudentSerializer

s = Student.objects.filter(name__icontains='Darshni').first()
if s:
    print(f"--- Student: {s.name} ---")
    print(f"Photo Field: {s.photo}")
    print(f"Photo Type: {type(s.photo)}")
    print(f"Photo String: {str(s.photo)}")
    
    # Check serialization
    serializer = StudentSerializer(s)
    print(f"Serialized Photo: {serializer.data.get('photo')}")
else:
    print("Student not found.")

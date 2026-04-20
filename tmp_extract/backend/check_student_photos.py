
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from apps.students.models import Student

students = Student.objects.all()[:5]
for s in students:
    print(f"Student: {s.name}")
    print(f"  Photo: {s.photo}")
    if s.photo:
        print(f"  Photo URL: {s.photo.url if hasattr(s.photo, 'url') else 'No URL'}")
    else:
        print(f"  Photo is EMPTY")

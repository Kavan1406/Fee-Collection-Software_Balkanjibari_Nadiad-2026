import os
import django
import json
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = r'C:\Users\darsh\Downloads\admin-student-dashboard-ui\backend'
if backend_path not in sys.path:
    sys.path.append(backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from django.core import serializers
from apps.students.models import Student
from apps.subjects.models import Subject
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.authentication.models import User

print("Starting backup of core data...")

# Serialize all major objects
all_data = []
all_data.extend(list(User.objects.all()))
all_data.extend(list(Student.objects.all()))
all_data.extend(list(Subject.objects.all()))
all_data.extend(list(Enrollment.objects.all()))
all_data.extend(list(Payment.objects.all()))

with open('data_backup_utf8.json', 'w', encoding='utf-8') as f:
    serializers.serialize("json", all_data, stream=f, indent=2)

print("Successfully saved backup to data_backup_utf8.json")

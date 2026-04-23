import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.students.models import Student
from apps.students.serializers import StudentSerializer
from apps.analytics.views import AnalyticsViewSet
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

# Setup factory and request
factory = APIRequestFactory()
request = factory.get('/')

# 1. Check StudentSerializer
student = Student.objects.filter(student_id='STU001').first()
if student:
    serializer = StudentSerializer(student)
    print("--- StudentSerializer Output ---")
    print(f"Photo URL: {serializer.data.get('photo')}")
else:
    print("Student STU001 not found")

# 2. Check AnalyticsViewSet.student_stats
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    # Find user associated with STU001
    user = User.objects.filter(student_profile__student_id='STU001').first()
    if user:
        viewset = AnalyticsViewSet()
        request.user = user
        response = viewset.student_stats(request)
        print("\n--- Analytics student_stats Output ---")
        if response.status_code == 200:
            print(f"Photo URL: {response.data['data'].get('photo')}")
        else:
            print(f"Error: {response.data}")
    else:
        print("\nUser for STU001 not found")
except Exception as e:
    print(f"\nError checking analytics view: {e}")

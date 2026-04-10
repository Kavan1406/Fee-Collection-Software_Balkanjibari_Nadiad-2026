
import os
import django
import sys
import json
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.authentication.models import User

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.enrollments.views import EnrollmentViewSet

def test_list_enrollments():
    factory = APIRequestFactory()
    user = User.objects.filter(role='ADMIN').first()
    if not user:
        print("No admin user found")
        return
        
    request = factory.get('/api/v1/enrollments/?page_size=10')
    force_authenticate(request, user=user)
    
    view = EnrollmentViewSet.as_view({'get': 'list'})
    response = view(request)
    
    print(f"Status: {response.status_code}")
    print(json.dumps(response.data, indent=2)[:2000])

if __name__ == "__main__":
    test_list_enrollments()

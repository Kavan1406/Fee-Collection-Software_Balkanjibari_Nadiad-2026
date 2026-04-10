
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

from apps.payments.views_accountant import AccountantDashboardView

def test_accountant_stats():
    factory = APIRequestFactory()
    # Try with Admin first
    user = User.objects.filter(role='ADMIN').first()
    if not user:
        print("No admin user found")
        # Try Accountant
        user = User.objects.filter(role='ACCOUNTANT').first()
        if not user:
            print("No accountant user found")
            return
    
    print(f"Testing with user: {user.username} (Role: {user.role})")
        
    request = factory.get('/api/v1/payments/dashboard/')
    force_authenticate(request, user=user)
    
    view = AccountantDashboardView.as_view()
    response = view(request)
    
    print(f"Status: {response.status_code}")
    print(json.dumps(response.data, indent=2))

if __name__ == "__main__":
    test_accountant_stats()

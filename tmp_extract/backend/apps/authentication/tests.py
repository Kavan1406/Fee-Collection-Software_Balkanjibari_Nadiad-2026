from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User

class UserUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='testpassword',
            phone_number='1234567890'
        )
        self.client.force_authenticate(user=self.user)

    def test_update_profile_success(self):
        url = reverse('authentication:update-profile')
        data = {
            'phone_number': '0987654321',
            'address': 'New Address',
            'area': 'New Area'
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone_number, '0987654321')
        self.assertEqual(self.user.address, 'New Address')

    def test_update_profile_read_only_email(self):
        url = reverse('authentication:update-profile')
        data = {
            'email': 'hacked@example.com'
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        # Email should NOT change because it's read_only in serializer
        self.assertEqual(self.user.email, 'test@example.com')

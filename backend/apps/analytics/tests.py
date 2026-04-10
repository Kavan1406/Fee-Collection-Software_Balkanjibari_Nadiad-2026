from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.models import User
from apps.students.models import Student
from apps.subjects.models import Subject
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from datetime import date

class AnalyticsViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Admin User
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='password123'
        )
        self.admin_user.role = 'ADMIN'
        self.admin_user.name = 'Admin User'
        self.admin_user.save()
        self.client.force_authenticate(user=self.admin_user)
        
        # Setup Data
        self.student = Student.objects.create(
            name='Test Student',
            age=10,
            gender='MALE',
            date_of_birth=date(2013, 1, 1),
            parent_name='Parent',
            phone='1234567890',
            address='Address',
            area='Area'
        )
        
        self.subject = Subject.objects.create(
            name='Mathematics',
            description='Math',
            category='OTHER'
        )
        
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            subject=self.subject,
            enrollment_date=date.today(),
            status='ACTIVE',
            total_fee=1000
        )
        
        self.payment = Payment.objects.create(
            enrollment=self.enrollment,
            amount=500,
            payment_date=date.today(),
            payment_mode='CASH',
            recorded_by=self.admin_user
        )

    def test_dashboard_stats(self):
        url = reverse('analytics-dashboard-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data if hasattr(response, 'data') else 'No Data')
        self.assertTrue(response.data['success'], response.data.get('error'))
        self.assertEqual(response.data['data']['total_students'], 1)
        
    def test_payment_trends(self):
        url = reverse('analytics-payment-trends')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data if hasattr(response, 'data') else 'No Data')
        
    def test_subject_distribution(self):
        url = reverse('analytics-subject-distribution')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data if hasattr(response, 'data') else 'No Data')
        
    def test_payment_status_distribution(self):
        url = reverse('analytics-payment-status-distribution')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data if hasattr(response, 'data') else 'No Data')

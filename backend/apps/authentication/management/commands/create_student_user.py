"""
Management command to create a student user account.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.students.models import Student
from datetime import date

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a student user account for testing'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Creating student user account...')
        
        # Get or create a student record
        student, created = Student.objects.get_or_create(
            name='Aarav Sharma',
            defaults={
                'age': 12,
                'gender': 'MALE',
                'parent_name': 'Mr. Rajesh Sharma',
                'phone': '98765-43210',
                'address': 'MG Road, Bangalore',
                'area': 'Whitefield',
                'date_of_birth': date(2012, 3, 15),
            }
        )
        
        # Create or update user account for this student
        try:
            user = User.objects.get(username='student1')
            user.set_password('student123')
            user.is_active = True
            user.save()
            self.stdout.write(self.style.SUCCESS('✓ Student user password reset'))
        except User.DoesNotExist:
            user = User.objects.create_user(
                username='student1',
                email='aarav.sharma@example.com',
                password='student123',
                first_name='Aarav',
                last_name='Sharma',
                role='STUDENT',
                phone_number='98765-43210',
                address='MG Road, Bangalore',
                area='Whitefield'
            )
            self.stdout.write(self.style.SUCCESS('✓ Created student user'))
        
        # Link user to student record (if your model supports it)
        # student.user = user
        # student.save()
        
        self.stdout.write(self.style.SUCCESS('\n✅ Student account ready!'))
        self.stdout.write(self.style.SUCCESS('Login credentials:'))
        self.stdout.write(self.style.SUCCESS('  Username: student1'))
        self.stdout.write(self.style.SUCCESS('  Password: student123'))
        self.stdout.write(self.style.SUCCESS(f'  Student ID: {student.student_id}'))
        self.stdout.write(self.style.SUCCESS(f'  Name: {student.name}'))

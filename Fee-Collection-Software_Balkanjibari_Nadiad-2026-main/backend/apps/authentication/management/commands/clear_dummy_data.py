"""
Management command to clear all dummy data from the database.
Keeps only admin, staff, and student1 user accounts.
"""

from django.core.management.base import BaseCommand
from apps.students.models import Student
from apps.subjects.models import Subject, FeeStructure
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.authentication.models import User


class Command(BaseCommand):
    help = 'Clear all dummy data, keeping only essential user accounts'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting database cleanup...'))
        
        # Delete all payments
        payment_count = Payment.objects.count()
        Payment.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {payment_count} payments'))
        
        # Delete all enrollments
        enrollment_count = Enrollment.objects.count()
        Enrollment.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {enrollment_count} enrollments'))
        
        # Delete all fee structures
        fee_count = FeeStructure.objects.count()
        FeeStructure.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {fee_count} fee structures'))
        
        # Delete all subjects
        subject_count = Subject.objects.count()
        Subject.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {subject_count} subjects'))
        
        # Delete all students
        student_count = Student.objects.count()
        Student.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {student_count} students'))
        
        # Keep only admin, staff, and student1 users
        # Delete all other users
        users_to_keep = ['admin', 'staff', 'student1']
        deleted_users = User.objects.exclude(username__in=users_to_keep).delete()
        self.stdout.write(self.style.SUCCESS(f'✓ Deleted {deleted_users[0]} extra users'))
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('✅ Database cleaned successfully!'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.WARNING('\nRemaining users:'))
        for user in User.objects.all():
            self.stdout.write(f'  - {user.username} ({user.role})')
        
        self.stdout.write(self.style.WARNING('\n📝 Database is now empty and ready for real data!'))
        self.stdout.write(self.style.WARNING('You can now add your actual students, subjects, and enrollments.'))

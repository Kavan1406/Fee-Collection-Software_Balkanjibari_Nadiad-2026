from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.students.models import Student
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Synchronize student records with user accounts and ensure staff user exists'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting user synchronization...')

        with transaction.atomic():
            # 1. Ensure Staff User exists
            staff_user, created = User.objects.get_or_create(
                username='staff',
                defaults={
                    'email': 'staff@feemaster.local',
                    'role': 'STAFF',
                    'is_staff': True,
                }
            )
            if created:
                staff_user.set_password('staff123')
                staff_user.save()
                self.stdout.write(self.style.SUCCESS('Created staff user: staff / staff123'))
            else:
                self.stdout.write('Staff user already exists.')

            # 2. Sync Student users
            students = Student.objects.filter(is_deleted=False)
            synced_count = 0
            created_count = 0

            for student in students:
                username = student.student_id.replace('-', '').lower()
                password = student.login_password_hint or f"{username}1234"

                # Try to find user by username
                user = User.objects.filter(username=username).first()
                
                if not user:
                    # Create new user
                    user = User.objects.create_user(
                        username=username,
                        password=password,
                        email=f"{username}@feemaster.local",
                        role='STUDENT',
                        is_active=True
                    )
                    created_count += 1
                    self.stdout.write(f'Created user for student: {username}')
                
                # Link student to user if not already linked
                if student.user != user:
                    student.user = user
                    student.save()
                    synced_count += 1

            self.stdout.write(self.style.SUCCESS(f'Successfully synchronized {synced_count} students and created {created_count} new student users.'))

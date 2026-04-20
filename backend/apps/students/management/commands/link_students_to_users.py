from django.core.management.base import BaseCommand
from apps.students.models import Student
from apps.authentication.models import User

class Command(BaseCommand):
    help = 'Link existing students to their user accounts based on student_id'

    def handle(self, *args, **options):
        linked_count = 0
        unlinked_students = Student.objects.filter(user__isnull=True)
        self.stdout.write(f"Found {unlinked_students.count()} unlinked students.")

        for student in unlinked_students:
            # Try to find user by username (student_id)
            user = User.objects.filter(username__iexact=student.student_id).first()
            
            if not user:
                # If not found by student_id, maybe try login_username if available
                if student.login_username:
                    user = User.objects.filter(username__iexact=student.login_username).first()

            if user:
                student.user = user
                student.save()
                linked_count += 1
                self.stdout.write(self.style.SUCCESS(f"Linked {student.student_id} to user {user.username}"))
            else:
                self.stdout.write(self.style.WARNING(f"Could not find user for student {student.student_id}"))

        self.stdout.write(self.style.SUCCESS(f"Successfully linked {linked_count} students."))

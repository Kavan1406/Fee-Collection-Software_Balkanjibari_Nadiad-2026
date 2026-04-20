import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.students.models import Student
from apps.authentication.models import User

def fix_credentials():
    students = Student.objects.select_related('user').all()
    count = 0
    
    print(f"Found {len(students)} students to update.")
    
    for student in students:
        if not student.user:
            print(f"Skipping student {student.student_id} (No user profile linked)")
            continue
            
        # Pattern:
        # Username: stu### (lowercase student_id)
        # Password: STU###XXXX (student_id + last 4 of phone)
        
        new_username = student.student_id.lower()
        last_4_digits = student.phone[-4:] if student.phone else '0000'
        new_password = f"{student.student_id}{last_4_digits}"
        
        # Update User object
        user = student.user
        user.username = new_username
        user.set_password(new_password)
        user.save()
        
        # Update Student object for record keeping
        student.login_username = new_username
        student.login_password_hint = new_password # Hint stores the cleartext for reference
        student.save()
        
        count += 1
        if count % 10 == 0:
            print(f"Updated {count} students...")

    print(f"Successfully updated credentials for {count} students.")

if __name__ == "__main__":
    fix_credentials()

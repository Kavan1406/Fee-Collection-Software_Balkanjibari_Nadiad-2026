import os
import django
import time
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.authentication.models import User
from apps.students.models import Student, StudentRegistrationRequest
from apps.payments.models import Payment
from apps.enrollments.models import Enrollment
from apps.subjects.models import Subject, FeeStructure

def audit_data():
    print("--- DATA INTEGRITY AUDIT ---")
    
    # User Audit
    users = User.objects.all()
    print(f"Total Users: {users.count()}")
    role_counts = {role[0]: users.filter(role=role[0]).count() for role in User.ROLE_CHOICES}
    print(f"Role Distribution: {role_counts}")
    
    # Student Audit
    students = Student.objects.all()
    print(f"Total Students: {students.count()}")
    deleted_students = students.filter(is_deleted=True).count()
    print(f"Deleted Students: {deleted_students}")
    
    # Enrollment Audit
    enrollments = Enrollment.objects.all()
    print(f"Total Enrollments: {enrollments.count()}")
    orphan_enrollments = enrollments.filter(student__isnull=True).count()
    print(f"Orphan Enrollments (No Student): {orphan_enrollments}")
    
    # Payment Audit
    payments = Payment.objects.all()
    print(f"Total Payments: {payments.count()}")
    orphan_payments = payments.filter(enrollment__student__isnull=True).count()
    print(f"Orphan Payments (No Student via Enrollment): {orphan_payments}")
    
    # 2FA Audit
    print("\n--- 2FA AUDIT ---")
    try:
        from django_otp.plugins.otp_totp.models import TOTPDevice
        admin_users = User.objects.filter(role='ADMIN')
        for admin in admin_users:
            device = TOTPDevice.objects.filter(user=admin, confirmed=True).exists()
            print(f"Admin {admin.username} 2FA Confirmed: {device}")
    except ImportError:
        print("django-otp not installed or TOTPDevice model not found.")

    # Consistency Checks
    print("\n--- CONSISTENCY CHECKS ---")
    for student in students:
        s_user = User.objects.filter(email=student.email).first()
        if not s_user:
            print(f"WARNING: Student {student.student_id} ({student.email}) has no associated User account!")
            
    print("\n--- PERFORMANCE PROFILING ---")
    # Dashboard stats simulation
    start_time = time.time()
    total_revenue = sum(p.amount for p in Payment.objects.filter(is_deleted=False))
    active_students = Student.objects.filter(is_deleted=False).count()
    end_time = time.time()
    print(f"Dashboard Stats Calculation Time: {end_time - start_time:.4f}s")

    # Enrollment list performance (bottleneck investigation)
    start_time = time.time()
    list(Enrollment.objects_original.all()) if hasattr(Enrollment, 'objects_original') else list(Enrollment.objects.all())
    end_time = time.time()
    print(f"Raw Enrollment Fetch Time: {end_time - start_time:.4f}s")

if __name__ == "__main__":
    audit_data()

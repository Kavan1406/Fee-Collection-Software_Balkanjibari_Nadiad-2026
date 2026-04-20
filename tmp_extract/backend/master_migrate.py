import os
import django
import json
from decimal import Decimal

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.subjects.models import Subject
from apps.students.models import Student
from apps.payments.models import Payment
from apps.enrollments.models import Enrollment
from django.contrib.auth import get_user_model

User = get_user_model()

def migrate_from_json():
    backup_file = 'full_backend_dump_final.json'
    if not os.path.exists(backup_file):
        print(f"❌ Backup file {backup_file} not found.")
        return

    print(f"📂 Reading {backup_file}...")
    with open(backup_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"📊 Loaded {len(data)} objects from JSON. Starting migration...")

    # 1. Users
    print("\n👤 Migrating Users...")
    users_data = [obj for obj in data if obj['model'] == 'authentication.user']
    for obj in users_data:
        fields = obj['fields']
        try:
            user, created = User.objects.get_or_create(
                id=obj['pk'],
                defaults={
                    'email': fields.get('email'),
                    'username': fields.get('username'),
                    'password': fields.get('password'),
                    'is_staff': fields.get('is_staff', False),
                    'is_superuser': fields.get('is_superuser', False),
                    'is_active': fields.get('is_active', True),
                    'role': fields.get('role', 'staff')
                }
            )
            if created: print(f"✅ Created User: {user.username}")
        except Exception as e:
            print(f"⚠️ Error creating user {obj['pk']}: {e}")

    # 2. Subjects
    print("\n📚 Migrating Subjects...")
    subjects_data = [obj for obj in data if obj['model'] == 'subjects.subject']
    for obj in subjects_data:
        fields = obj['fields']
        try:
            subj, created = Subject.objects.update_or_create(
                id=obj['pk'],
                defaults={
                    'name': fields['name'],
                    'base_fee': fields['base_fee'],
                    'is_active': fields.get('is_active', True),
                }
            )
            if created: print(f"✅ Created Subject: {subj.name}")
        except Exception as e:
            print(f"⚠️ Error creating subject {obj['pk']}: {e}")

    # 3. Students
    print("\n🎓 Migrating Students...")
    students_data = [obj for obj in data if obj['model'] == 'students.student']
    for obj in students_data:
        fields = obj['fields']
        try:
            student, created = Student.objects.update_or_create(
                id=obj['pk'],
                defaults={
                    'student_id': fields.get('student_id', f"STU{obj['pk']:03d}"),
                    'name': fields['name'],
                    'age': fields.get('age'),
                    'gender': fields.get('gender'),
                    'date_of_birth': fields.get('date_of_birth'),
                    'phone': fields.get('phone', ''),
                    'email': fields.get('email'),
                    'address': fields.get('address'),
                    'area': fields.get('area'),
                    'city': fields.get('city'),
                    'pincode': fields.get('pincode'),
                    'status': fields.get('status', 'ACTIVE'),
                    'is_deleted': fields.get('is_deleted', False),
                    'user_id': fields.get('user')
                }
            )
            if created: print(f"✅ Created Student: {student.name}")
        except Exception as e:
             print(f"⚠️ Error creating student {obj['pk']}: {e}")

    # 4. Enrollments
    print("\n📝 Migrating Enrollments...")
    enrollments_data = [obj for obj in data if obj['model'] == 'enrollments.enrollment']
    for obj in enrollments_data:
        fields = obj['fields']
        try:
            enrollment, created = Enrollment.objects.update_or_create(
                id=obj['pk'],
                defaults={
                    'enrollment_id': fields.get('enrollment_id', f"ENR-{obj['pk']:03d}"),
                    'student_id': fields['student'],
                    'subject_id': fields['subject'],
                    'total_fee': fields.get('total_fee', 0),
                    'paid_amount': fields.get('paid_amount', 0),
                    'pending_amount': fields.get('pending_amount', 0),
                    'status': fields.get('status', 'ACTIVE'),
                    'is_deleted': fields.get('is_deleted', False)
                }
            )
            if created: print(f"✅ Created Enrollment: {enrollment.enrollment_id}")
        except Exception as e:
             print(f"⚠️ Error creating enrollment {obj['pk']}: {e}")

    # 5. Payments
    print("\n💳 Migrating Payments...")
    payments_data = [obj for obj in data if obj['model'] == 'payments.payment']
    for obj in payments_data:
        fields = obj['fields']
        try:
            payment, created = Payment.objects.update_or_create(
                id=obj['pk'],
                defaults={
                    'payment_id': fields.get('payment_id', f"PAY-{obj['pk']:03d}"),
                    'enrollment_id': fields['enrollment'],
                    'amount': fields['amount'],
                    'payment_date': fields['payment_date'],
                    'payment_mode': fields.get('payment_mode', 'CASH'),
                    'transaction_id': fields.get('transaction_id', ''),
                    'receipt_number': fields.get('receipt_number'),
                    'status': fields.get('status', 'SUCCESS'),
                    'is_deleted': fields.get('is_deleted', False),
                    'recorded_by_id': fields.get('recorded_by')
                }
            )
            if created: print(f"✅ Created Payment: {payment.payment_id}")
        except Exception as e:
            print(f"⚠️ Error creating payment {obj['pk']}: {e}")

    print("\n🏁 Final Migration and Data Transfer Complete.")

if __name__ == "__main__":
    migrate_from_json()

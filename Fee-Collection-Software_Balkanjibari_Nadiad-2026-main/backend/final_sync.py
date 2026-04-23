import os
import sqlite3
import django
from decimal import Decimal
from django.utils import timezone
from datetime import datetime
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.authentication.models import User
from apps.students.models import Student, StudentRegistrationRequest
from apps.subjects.models import Subject, FeeStructure
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.notifications.models import Notification

# Backup SQLite Path
SQLITE_DB = r'C:\Users\darsh\Downloads\re_extracted_backup\admin-student-dashboard-ui\backend\db.sqlite3'

def get_sqlite_conn():
    return sqlite3.connect(SQLITE_DB)

def sync_users():
    print("Syncing Users...")
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users")
    columns = [description[0] for description in cur.description]
    for row in cur.fetchall():
        data = dict(zip(columns, row))
        password = data.pop('password', None)
        username = data.pop('username')
        
        # Date conversion
        for field in ['last_login', 'date_joined', 'created_at', 'updated_at']:
            val = data.get(field)
            if val and isinstance(val, str):
                try:
                    data[field] = datetime.fromisoformat(val.replace('Z', '+00:00'))
                except:
                    data[field] = timezone.now()
        
        user, created = User.objects.update_or_create(username=username, defaults=data)
        if created and password:
            user.password = password
            user.save()
    conn.close()

def sync_subjects():
    print("Syncing Subjects...")
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM subjects")
    columns = [description[0] for description in cur.description]
    for row in cur.fetchall():
        data = dict(zip(columns, row))
        sub_id = data.pop('id')
        
        # Decimal handling
        for field in ['monthly_fee']:
            if data.get(field):
                data[field] = Decimal(str(data[field]))
        
        Subject.objects.update_or_create(id=sub_id, defaults=data)
    conn.close()

def sync_fee_structures():
    print("Syncing Fee Structures...")
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM fee_structures")
    columns = [description[0] for description in cur.description]
    for row in cur.fetchall():
        data = dict(zip(columns, row))
        fs_id = data.pop('id')
        
        # FK
        sub_id = data.pop('subject_id')
        data['subject'] = Subject.objects.filter(id=sub_id).first()
        
        # Decimal
        for field in ['fee_amount']:
            if data.get(field):
                data[field] = Decimal(str(data[field]))
        
        # Date
        val = data.get('effective_from')
        if val and isinstance(val, str):
            try:
                data['effective_from'] = datetime.fromisoformat(val).date()
            except:
                pass
                
        FeeStructure.objects.update_or_create(id=fs_id, defaults=data)
    conn.close()

def sync_students():
    print("Syncing Students...")
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM students")
    columns = [description[0] for description in cur.description]
    for row in cur.fetchall():
        data = dict(zip(columns, row))
        stu_id = data.pop('id')
        
        # Link to User
        uid = data.pop('user_id', None)
        if uid:
            data['user'] = User.objects.filter(id=uid).first()
        
        # Dates
        for field in ['date_of_birth', 'enrollment_date']:
            val = data.get(field)
            if val and isinstance(val, str):
                try:
                    data[field] = datetime.fromisoformat(val).date()
                except:
                    pass

        Student.objects.update_or_create(id=stu_id, defaults=data)
    conn.close()

def sync_enrollments():
    print("Syncing Enrollments...")
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM enrollments")
    columns = [description[0] for description in cur.description]
    for row in cur.fetchall():
        data = dict(zip(columns, row))
        eid = data.pop('id')
        
        # FKs
        stu_id = data.pop('student_id')
        sub_id = data.pop('subject_id')
        # Skip obsolete field
        data.pop('fee_structure_id', None)
        
        data['student'] = Student.objects.filter(id=stu_id).first()
        data['subject'] = Subject.objects.filter(id=sub_id).first()
        
        # Decimals
        for field in ['total_fee', 'paid_amount', 'pending_amount']:
            if data.get(field):
                data[field] = Decimal(str(data[field]))
        
        Enrollment.objects.update_or_create(id=eid, defaults=data)
    conn.close()

def sync_payments():
    print("Syncing Payments...")
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM payments")
    columns = [description[0] for description in cur.description]
    for row in cur.fetchall():
        data = dict(zip(columns, row))
        pid = data.pop('id')
        
        # FKs
        enr_id = data.pop('enrollment_id')
        data['enrollment'] = Enrollment.objects.filter(id=enr_id).first()
        recorded_id = data.pop('recorded_by_id', None)
        if recorded_id:
            data['recorded_by'] = User.objects.filter(id=recorded_id).first()
            
        # collected_by_id -> recorded_by_id mapping if needed
        coll_id = data.pop('collected_by_id', None)
        if coll_id and not data.get('recorded_by'):
             data['recorded_by'] = User.objects.filter(id=coll_id).first()

        # Decimal
        if data.get('amount'):
            data['amount'] = Decimal(str(data['amount']))
        
        # Date
        val = data.get('payment_date')
        if val and isinstance(val, str):
            try:
                data['payment_date'] = datetime.fromisoformat(val).date()
            except:
                pass
                
        Payment.objects.update_or_create(id=pid, defaults=data)
    conn.close()

def sync_reg_requests():
    print("Syncing Registration Requests...")
    conn = get_sqlite_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM student_registration_requests")
    columns = [description[0] for description in cur.description]
    for row in cur.fetchall():
        data = dict(zip(columns, row))
        rid = data.pop('id')
        
        stu_id = data.pop('created_student_id', None)
        if stu_id:
            data['created_student'] = Student.objects.filter(id=stu_id).first()
            
        for field in ['date_of_birth', 'enrollment_date']:
            val = data.get(field)
            if val and isinstance(val, str):
                try:
                    data[field] = datetime.fromisoformat(val).date()
                except:
                    pass
        
        if isinstance(data.get('subjects_data'), str):
            try:
                data['subjects_data'] = json.loads(data['subjects_data'])
            except:
                pass
                
        StudentRegistrationRequest.objects.update_or_create(id=rid, defaults=data)
    conn.close()

if __name__ == "__main__":
    try:
        sync_users()
        sync_subjects()
        sync_fee_structures()
        sync_students()
        sync_enrollments()
        sync_payments()
        sync_reg_requests()
        print("\nFinal Synchronization Complete!")
    except Exception as e:
        print(f"\nSynchronization Error: {e}")
        import traceback
        traceback.print_exc()

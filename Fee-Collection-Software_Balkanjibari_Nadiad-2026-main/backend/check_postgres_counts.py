import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def check_postgres_counts():
    tables = [
        'users', 'students', 'subjects', 'enrollments', 'payments', 
        'fee_structures', 'student_registration_requests', 'notifications'
    ]
    print("PostgreSQL Table Counts:")
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f"SELECT count(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"{table}: {count}")
            except Exception as e:
                print(f"Error checking {table}: {e}")

if __name__ == "__main__":
    check_postgres_counts()

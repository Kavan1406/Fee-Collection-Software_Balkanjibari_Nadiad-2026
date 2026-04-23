import os
import django
import sys
from django.db import connection

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def check_schema():
    print("--- Verifying Auth Schema ---")
    with connection.cursor() as cursor:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")
        columns = [row[0] for row in cursor.fetchall()]
        
        target_fields = ['can_view_dashboard', 'is_two_factor_enabled', 'role']
        print(f"Columns in 'users' table: {columns}")
        
        for field in target_fields:
            if field in columns:
                print(f"✅ Field '{field}' found.")
            else:
                print(f"❌ Field '{field}' MISSING!")

if __name__ == "__main__":
    check_schema()

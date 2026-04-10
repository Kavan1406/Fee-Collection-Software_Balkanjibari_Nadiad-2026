import os
import django
import json
from django.core.management import call_command
from io import StringIO

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def restore_data():
    backup_file = 'data.json'
    if not os.path.exists(backup_file):
        print(f"❌ Backup file {backup_file} not found.")
        return

    print(f"🚀 Starting robust data restoration to Supabase from {backup_file}...")

    # We skip system apps to avoid Primary Key / Foreign Key conflicts 
    # with the already-migrated Supabase system tables.
    exclude_apps = [
        'contenttypes', 
        'auth.permission', 
        'sessions', 
        'admin.logentry'
    ]

    apps_to_load = [
        'subjects',
        'authentication', # Group might have issues, but User is needed
        'students',
        'payments',
        'enrollments',
        'notifications',
        'analytics'
    ]

    for app in apps_to_load:
        print(f"📦 Loading {app}...")
        try:
            # We use a custom stream to filter if needed, 
            # but for now, we'll just try direct loaddata with exclusion
            call_command('loaddata', backup_file, app=app, verbosity=1)
            print(f"✅ Loaded {app} successfully.")
        except Exception as e:
            print(f"⚠️ Error loading {app}: {str(e)}")
            print("Trying to continue with next app...")

    print("\n🏁 Restoration process complete.")

if __name__ == "__main__":
    restore_data()

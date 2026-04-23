import os
import sys
import django
from django.core.management import call_command
import json

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

apps = [
    'subjects',
    'students',
    'payments',
    'enrollments'
]

output_file = 'Balkanji_DB_Backup_7_April.json'
all_data = []

print(f"Starting robust app-by-app dump to {output_file}...")

for app in apps:
    try:
        print(f"Dumping {app}...")
        # Get data as a string
        from io import StringIO
        out = StringIO()
        call_command('dumpdata', app, natural_foreign=True, natural_primary=True, stdout=out)
        data = json.loads(out.getvalue())
        all_data.extend(data)
        print(f"Successfully dumped {app} ({len(data)} objects)")
    except Exception as e:
        print(f"Error dumping {app}: {e}")

# Save combined data
try:
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2)
    print(f"\nFinal backup saved to {output_file} ({len(all_data)} total objects)")
except Exception as e:
    print(f"Error saving final file: {e}")

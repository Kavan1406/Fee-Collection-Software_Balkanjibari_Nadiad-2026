import os
import django
from django.db import connections
from django.db.utils import OperationalError

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def check_conn():
    db_conn = connections['default']
    try:
        db_conn.cursor()
        print('PostgreSQL Connection: SUCCESS')
    except Exception as e:
        print(f'PostgreSQL Connection: FAILED - {e}')

if __name__ == "__main__":
    check_conn()

import os
import sys
import django
import requests
import time
from django.db import connection

# Setup Django environment
sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

def check_db():
    print("--- 1. Testing Database Connection ---")
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            if row[0] == 1:
                print("[OK] Database connected successfully!")
                return True
    except Exception as e:
        print(f"[ERROR] Database connection FAILED: {str(e)}")
        print("\nPossible causes:")
        print("1. Network blocks port 6543 (Supabase Pooler).")
        print("2. DATABASE_URL in .env is incorrect or has expired.")
        print("3. Your IP is not allowlisted in Supabase (if IP restrictions are on).")
        return False

def check_health_endpoint():
    print("\n--- 2. Testing Local Health Endpoint ---")
    url = "http://127.0.0.1:8000/health/"
    print(f"Pinging {url}...")
    try:
        start = time.time()
        response = requests.get(url, timeout=10)
        duration = time.time() - start
        
        if response.status_code == 200:
            print(f"[OK] Health check successful! ({int(duration*1000)}ms)")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"[ERROR] Health check returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Connection Refused. Is 'python manage.py runserver' active?")
        return False
    except requests.exceptions.Timeout:
        print("[ERROR] Request Timed Out. The server hung while processing the request.")
        return False
    except Exception as e:
        print(f"[ERROR] An error occurred: {str(e)}")
        return False

if __name__ == "__main__":
    db_ok = check_db()
    health_ok = check_health_endpoint()
    
    print("\n--- Final Diagnostic Summary ---")
    if db_ok and health_ok:
        print("SYSTEM STATUS: GREEN - Everything is working correctly.")
        print("If you still see 'Network Error' in browser, check Browser Console for CORS errors.")
    elif health_ok:
        print("SYSTEM STATUS: YELLOW - Web server is up, but Database is DOWN/RESTRICTED.")
    else:
        print("SYSTEM STATUS: RED - Web server is unreachable or hanging.")

import os
import django
import time
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def diagnostic():
    print("--- PERFORMANCE DIAGNOSTICS ---")
    
    # 1. DB Connection Latency
    print("\n[1] Testing Database Latency...")
    latencies = []
    for i in range(5):
        start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        latencies.append(time.time() - start)
    avg_latency = sum(latencies) / len(latencies)
    print(f"Average 'SELECT 1' latency (PostgreSQL): {avg_latency:.4f}s")
    
    # 2. Key Table Counts (Visibility)
    from apps.students.models import Student
    from apps.payments.models import Payment
    
    start = time.time()
    s_count = Student.objects.count()
    p_count = Payment.objects.count()
    count_time = time.time() - start
    print(f"Counting {s_count} students and {p_count} payments took: {count_time:.4f}s")

    # 3. Environment Check
    from decouple import config
    debug_val = config('DEBUG', default=False, cast=bool)
    print(f"\n[Environment] DEBUG Mode: {debug_val}")
    
    if avg_latency > 0.3:
        print("\n!! CRITICAL: High database latency detected (>300ms). This is likely due to the database being hosted in Singapore (Render) while you are in India.")
    
    if debug_val:
        print("!! NOTE: DEBUG mode is ON, which slows down response times due to extra logging and middleware.")

if __name__ == "__main__":
    diagnostic()

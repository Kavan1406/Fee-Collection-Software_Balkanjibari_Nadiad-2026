import psycopg2
import os
from decouple import config

def check_supabase():
    # Load from .env
    db_url = config('DATABASE_URL', default=None)
    
    if not db_url:
        print("❌ DATABASE_URL not found in .env")
        return

    print(f"🔗 Attempting connection to: {db_url.split('@')[-1]}...")
    
    try:
        # Standard connection
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Test Query 1: Time
        cur.execute("SELECT NOW();")
        db_time = cur.fetchone()[0]
        print(f"✅ Connection Successful! DB Time: {db_time}")
        
        # Test Query 2: Data Check
        cur.execute("SELECT count(*) FROM students;")
        count = cur.fetchone()[0]
        print(f"📊 Live Student Count: {count}")
        
        cur.close()
        conn.close()
        print("\n🏁 Supabase is online and data is verified.")

    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    check_supabase()

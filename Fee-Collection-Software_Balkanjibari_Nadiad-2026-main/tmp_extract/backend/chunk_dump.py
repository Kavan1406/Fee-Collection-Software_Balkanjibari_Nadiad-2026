import psycopg2
from psycopg2 import extras
import json
import decimal

# Configuration
RENDER_URL = "postgresql://balkanji_user:7uZozPwepzIimrjpBvhT8WTSO4ngulA6@dpg-d6m00kcr85hc73aeft9g-a.singapore-postgres.render.com/balkanji_db?sslmode=require"

def decimal_default(obj):
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    raise TypeError

def chunk_dump():
    tables = [
        ('subjects', 'subjects.subject'),
        ('authentication_user', 'authentication.user', 'users'), # Try both
        ('students', 'students.student'),
        ('payments', 'payments.payment'),
        ('enrollments', 'enrollments.enrollment')
    ]

    all_data = []

    try:
        print("🔗 Connecting to Render for chunked extraction...")
        conn = psycopg2.connect(RENDER_URL)
        cur = conn.cursor(cursor_factory=extras.DictCursor)

        # First, find actual table names
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        db_tables = [t[0] for t in cur.fetchall()]
        print(f"🔎 Tables in DB: {db_tables}")

        # Correct mapping
        mapping = {
            'subjects': 'subjects.subject',
            'users': 'authentication.user',
            'students': 'students.student',
            'payments': 'payments.payment',
            'enrollments': 'enrollments.enrollment'
        }

        for table in ['subjects', 'users', 'students', 'enrollments', 'payments']:
            if table not in db_tables:
                print(f"⚠️ Skipping {table} (not found)")
                continue

            print(f"📦 Extraction: {table}...")
            cur.execute(f"SELECT * FROM {table}")
            rows = cur.fetchall()
            
            for row in rows:
                fields = dict(row)
                pk = fields.pop('id')
                all_data.append({
                    "model": mapping[table],
                    "pk": pk,
                    "fields": fields
                })
            
            print(f"✅ Extracted {len(rows)} from {table}")

        with open('hotspot_complete_dump.json', 'w', encoding='utf-8') as f:
            json.dump(all_data, f, default=str, indent=4) # Use str for dates
            
        print(f"🎉 Successfully created hotspot_complete_dump.json with {len(all_data)} objects.")

    except Exception as e:
        print(f"❌ Chunked dump failed: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    chunk_dump()

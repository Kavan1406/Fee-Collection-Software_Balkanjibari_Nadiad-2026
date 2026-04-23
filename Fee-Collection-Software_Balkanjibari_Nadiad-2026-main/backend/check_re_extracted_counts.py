import sqlite3
import os

db_path = r'C:\Users\darsh\Downloads\re_extracted_backup\admin-student-dashboard-ui\backend\db.sqlite3'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cur.fetchall()]
        print("Table Counts:")
        for table in tables:
            try:
                cur.execute(f"SELECT count(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"{table}: {count}")
            except Exception as e:
                print(f"Error checking {table}: {e}")
        conn.close()
    except Exception as e:
        print(f"Connection error: {e}")

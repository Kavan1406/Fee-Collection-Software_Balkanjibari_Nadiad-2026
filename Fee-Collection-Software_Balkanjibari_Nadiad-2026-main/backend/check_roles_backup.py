import sqlite3
import os

db_path = r'C:\Users\darsh\Downloads\re_extracted_backup\admin-student-dashboard-ui\backend\db.sqlite3'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        print("User Role Distribution in Backup:")
        try:
            cur.execute("SELECT role, count(*) FROM users GROUP BY role")
            for row in cur.fetchall():
                print(f"{row[0]}: {row[1]}")
        except Exception as e:
            print(f"Error checking users: {e}")
        
        print("\nStudent Count in Backup:")
        try:
            cur.execute("SELECT count(*) FROM students")
            print(f"Total Students: {cur.fetchone()[0]}")
        except Exception as e:
            print(f"Error checking students: {e}")
            
        conn.close()
    except Exception as e:
        print(f"Connection error: {e}")

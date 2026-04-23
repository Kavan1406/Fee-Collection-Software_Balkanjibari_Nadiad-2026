import os
import psycopg2
from decouple import config

database_url = "postgres://postgres:Balkanji%402026@db.xydszcryzwyfimkgcwml.supabase.co:5432/postgres"

def check_students():
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        cur.execute("SELECT count(*) FROM students")
        total_students = cur.fetchone()[0]
        print(f"Total Students in Database: {total_students}")
        
        cur.execute("SELECT student_id, name FROM students ORDER BY created_at DESC LIMIT 5")
        recent_students = cur.fetchall()
        print("\nRecent 5 Students:")
        for sid, name in recent_students:
            print(f"{sid}: {name}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_students()

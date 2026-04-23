import os
import psycopg2

database_url = "postgres://postgres:Balkanji%402026@db.xydszcryzwyfimkgcwml.supabase.co:5432/postgres"

def check_badminton_batches():
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT b.id, s.name, b.batch_time, b.capacity_limit, b.is_active 
            FROM subject_batches b
            JOIN subjects s ON b.subject_id = s.id
            WHERE s.name ILIKE 'Badminton'
        """)
        batches = cur.fetchall()
        print(f"Badminton Batches in Database:")
        if not batches:
            print("No custom batches found for Badminton.")
        else:
            for bid, sname, btime, cap, active in batches:
                print(f"ID: {bid} | Subject: {sname} | Time: {btime} | Limit: {cap} | Active: {active}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_badminton_batches()

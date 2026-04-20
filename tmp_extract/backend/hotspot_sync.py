import psycopg2
from psycopg2 import extras
import os

# Configuration
RENDER_URL = "postgresql://balkanji_user:7uZozPwepzIimrjpBvhT8WTSO4ngulA6@dpg-d6m00kcr85hc73aeft9g-a.singapore-postgres.render.com/balkanji_db?sslmode=require"
SUPABASE_URL = "postgresql://postgres:Balkanji%402026@db.supxulhaehglndleidbr.supabase.co:5432/postgres"

def migrate_table(src_cursor, dest_cursor, table_name):
    print(f"🔄 Migrating {table_name}...")
    
    # 1. Fetch from Render
    src_cursor.execute(f"SELECT * FROM {table_name}")
    rows = src_cursor.fetchall()
    if not rows:
        print(f"ℹ️ {table_name} is empty.")
        return

    # 2. Get column names
    colnames = [desc[0] for desc in src_cursor.description]
    
    # 3. Insert into Supabase
    query = f"INSERT INTO {table_name} ({', '.join(colnames)}) VALUES %s ON CONFLICT DO NOTHING"
    extras.execute_values(dest_cursor, query, rows)
    print(f"✅ Migrated {len(rows)} rows to {table_name}.")

def main():
    try:
        print("🔗 Connecting to Render and Supabase...")
        src_conn = psycopg2.connect(RENDER_URL)
        dest_conn = psycopg2.connect(SUPABASE_URL)
        
        src_conn.autocommit = True
        dest_conn.autocommit = True
        
        src_cur = src_conn.cursor()
        dest_cur = dest_conn.cursor()

        # Tables to migrate in order (Dependency Order)
        tables = [
            'subjects',
            'users',
            'students',
            'enrollments',
            'payments'
        ]

        # Note: Django table names might vary if custom db_table is set.
        # I'll check the actual names from the models I viewed earlier.
        # subjects -> subjects
        # authentication -> users (based on db_table='users' usually, or authentication_user)
        # students -> students
        # enrollments -> enrollments
        # payments -> payments

        # Let's verify table names first
        src_cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        all_tables = [t[0] for t in src_cur.fetchall()]
        print(f"🔎 Tables found in Render: {all_tables}")

        # Correct mapping based on current models
        actual_order = [
            'subjects',
            'users',
            'students',
            'enrollments',
            'payments'
        ]

        for table in actual_order:
            if table in all_tables:
                migrate_table(src_cur, dest_cur, table)
            else:
                print(f"⚠️ Table {table} not found in Render, skipping...")

        print("\n🎉 Migration Complete!")
        
        src_cur.close()
        dest_cur.close()
        src_conn.close()
        dest_conn.close()

    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    main()

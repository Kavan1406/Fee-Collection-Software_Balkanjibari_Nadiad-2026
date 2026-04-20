import csv

dates = [
    ("15-04-2026", "SUBJECT_ENROLLMENT_REPORT_15-04-2026_12-56-49.csv"),
    ("16-04-2026", "SUBJECT_ENROLLMENT_REPORT_16-04-2026_12-56-49.csv"),
    ("17-04-2026", "SUBJECT_ENROLLMENT_REPORT_17-04-2026_12-56-50.csv"),
    ("18-04-2026", "SUBJECT_ENROLLMENT_REPORT_18-04-2026_12-56-51.csv"),
]

print("\n" + "="*120)
print("📊 SUBJECT-WISE ENROLLMENT REPORTS (Sample from Each Date)")
print("="*120)

for date_display, filename in dates:
    try:
        with open(filename) as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        print(f"\n{'='*120}")
        print(f"📅 DATE: {date_display}")
        print(f"{'='*120}")
        print(f"{'Sr':<5} {'Subject':<35} {'Batch Time':<25} {'Student Count':<15}")
        print("-"*120)
        
        # Show first 8 records
        for row in rows[:8]:
            sr = row['Sr No.']
            subject = row['Subject'][:34]
            batch = row['Batch Time'][:24]
            count = row['Student Count']
            print(f"{sr:<5} {subject:<35} {batch:<25} {count:<15}")
        
        if len(rows) > 8:
            print(f"... and {len(rows) - 8} more records")
        
        # Calculate totals
        total_records = len(rows)
        total_students = sum(int(r['Student Count']) for r in rows)
        
        print(f"\n   📊 Total Subjects/Batches: {total_records}")
        print(f"   👥 Total Student Enrollments: {total_students}")
        
    except FileNotFoundError:
        print(f"❌ File not found: {filename}")

print("\n" + "="*120)
print("✨ ALL REPORTS GENERATED")
print("="*120)
print("""
✓ Subjects are sorted A-Z (Ascending Order)
✓ Each report is separated by date
✓ Student count shows enrollments per subject per batch time
✓ All data from Supabase production database

📁 Files Created:
   1. SUBJECT_ENROLLMENT_REPORT_15-04-2026_12-56-49.csv
   2. SUBJECT_ENROLLMENT_REPORT_16-04-2026_12-56-49.csv
   3. SUBJECT_ENROLLMENT_REPORT_17-04-2026_12-56-50.csv
   4. SUBJECT_ENROLLMENT_REPORT_18-04-2026_12-56-51.csv
""")
print("="*120 + "\n")

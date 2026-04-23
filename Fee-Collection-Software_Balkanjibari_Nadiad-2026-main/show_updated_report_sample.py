import csv

# Read and display sample rows with Student IDs
with open('DETAILED_ENROLLMENT_REPORT_WITH_STUDENT_IDS_2026-04-15_to_2026-04-19_2026-04-19_12-42-27.csv') as f:
    reader = csv.DictReader(f)
    rows = [next(reader) for _ in range(8)]

print("\n" + "="*150)
print("📊 SAMPLE FROM UPDATED REPORT (With Student IDs)")
print("="*150)
print(f"{'Sr':<4} {'Student ID':<12} {'Student Name':<25} {'Login ID':<15} {'Subject':<20} {'Status':<12} {'Amount':<10}")
print("-"*150)

for row in rows:
    sr = row['Sr No.']
    student_id = row['Student ID']
    name = row['Student Name'][:24]
    login = row['Student Login ID']
    subject = row['Subject Name'][:19]
    status = row['Payment Status']
    amount = row['Amount Paid']
    print(f"{sr:<4} {student_id:<12} {name:<25} {login:<15} {subject:<20} {status:<12} {amount:<10}")

print("\n" + "="*150)
print("✅ NEW REPORT WITH ALL 13 COLUMNS:")
print("="*150)
print("   1. Sr No.")
print("   2. Student ID ⭐ NEW")
print("   3. Student Name")
print("   4. Student Enrollment Date")
print("   5. Student Login ID")
print("   6. Batch Time")
print("   7. Subject Name")
print("   8. Payment ID")
print("   9. Payment Mode")
print("  10. Payment Status")
print("  11. Transaction ID")
print("  12. Amount Paid")
print("  13. Mobile Number")
print("\n📄 File: DETAILED_ENROLLMENT_REPORT_WITH_STUDENT_IDS_2026-04-15_to_2026-04-19_2026-04-19_12-42-27.csv")
print("📊 Total Records: 648")
print("="*150 + "\n")

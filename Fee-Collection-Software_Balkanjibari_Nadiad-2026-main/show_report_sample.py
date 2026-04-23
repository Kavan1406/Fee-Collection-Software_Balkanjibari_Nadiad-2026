import csv

# Read and display sample rows
with open('DETAILED_ENROLLMENT_REPORT_2026-04-15_to_2026-04-19_2026-04-19_12-04-03.csv') as f:
    reader = csv.DictReader(f)
    rows = [next(reader) for _ in range(5)]

print("\n" + "="*120)
print("🔍 SAMPLE DATA FROM REPORT (First 5 Records)")
print("="*120)
print(f"{'Sr No.':<6} {'Student Name':<25} {'Login ID':<15} {'Batch Time':<20} {'Payment Status':<12} {'Amount':<10}")
print("-"*120)

for row in rows:
    sr = row['Sr No.']
    name = row['Student Name'][:24]
    login = row['Student Login ID']
    batch = row['Batch Time'][:19]
    status = row['Payment Status']
    amount = row['Amount Paid']
    print(f"{sr:<6} {name:<25} {login:<15} {batch:<20} {status:<12} {amount:<10}")

print("\n" + "="*120)
print(f"✅ Complete report available as CSV file")
print(f"📄 File: DETAILED_ENROLLMENT_REPORT_2026-04-15_to_2026-04-19_2026-04-19_12-04-03.csv")
print("="*120)

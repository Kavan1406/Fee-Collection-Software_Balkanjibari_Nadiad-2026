import pandas as pd
import json
from datetime import datetime

# Read the detailed enrollment report
csv_path = "DETAILED_ENROLLMENT_REPORT_2026-04-15_to_2026-04-19_2026-04-19_12-04-03.csv"

print("=" * 100)
print("📊 COMPLETE DATABASE ENROLLMENT DATA FOR APRIL 19, 2026")
print("=" * 100)
print(f"\n📂 Source: {csv_path}")
print(f"📅 Report Generated: April 19, 2026 at 12:04:03")

try:
    # Read CSV
    df = pd.read_csv(csv_path)
    
    print(f"\n✅ Total Records in Database: {len(df):,}")
    
    # Convert date
    df['Student Enrollment Date'] = pd.to_datetime(df['Student Enrollment Date'])
    
    # Filter for April 19
    df_april_19 = df[df['Student Enrollment Date'].dt.date == pd.Timestamp('2026-04-19').date()].copy()
    
    print(f"📅 Records for April 19, 2026: {len(df_april_19)}")
    
    if len(df_april_19) == 0:
        print("❌ No records found")
        exit(1)
    
    print("\n" + "=" * 100)
    print("📋 DETAILED BREAKDOWN - ALL DATA FIELDS")
    print("=" * 100)
    
    for idx, (_, row) in enumerate(df_april_19.iterrows(), 1):
        print(f"\n{'='*100}")
        print(f"ENTRY #{idx}")
        print(f"{'='*100}")
        print(f"Sr. No.                : {idx}")
        print(f"Student Name           : {row['Student Name']}")
        print(f"Login ID               : {row['Student Login ID']}")
        print(f"Subject Name           : {row['Subject Name']}")
        print(f"Batch Time             : {row['Batch Time']}")
        print(f"Payment ID             : {row['Payment ID']}")
        print(f"Payment Mode           : {row['Payment Mode']}")
        print(f"Payment Status         : {row['Payment Status']}")
        print(f"Transaction ID         : {row['Transaction ID']}")
        print(f"Amount Paid            : ₹{float(row['Amount Paid']):,.2f}")
        print(f"Mobile Number          : {row['Mobile Number']}")
        print(f"Student Enrollment Date: {row['Student Enrollment Date'].strftime('%d-%m-%Y %H:%M:%S')}")
    
    print(f"\n{'='*100}")
    print("📊 SUMMARY STATISTICS")
    print(f"{'='*100}")
    
    # Statistics
    total_entries = len(df_april_19)
    unique_students = df_april_19['Student Name'].nunique()
    total_amount = df_april_19['Amount Paid'].sum()
    
    print(f"Total Enrollment Entries : {total_entries}")
    print(f"Unique Students          : {unique_students}")
    print(f"Total Amount Collected   : ₹{total_amount:,.2f}")
    
    # Payment status breakdown
    print(f"\nPayment Status Breakdown:")
    for status in df_april_19['Payment Status'].unique():
        count = len(df_april_19[df_april_19['Payment Status'] == status])
        amount = df_april_19[df_april_19['Payment Status'] == status]['Amount Paid'].sum()
        print(f"  {status:15} : {count:2} entries | ₹{amount:,.2f}")
    
    # Payment mode breakdown
    print(f"\nPayment Mode Breakdown:")
    for mode in df_april_19['Payment Mode'].unique():
        count = len(df_april_19[df_april_19['Payment Mode'] == mode])
        amount = df_april_19[df_april_19['Payment Mode'] == mode]['Amount Paid'].sum()
        print(f"  {mode:15} : {count:2} entries | ₹{amount:,.2f}")
    
    # Subject breakdown
    print(f"\nSubjects Enrolled:")
    for subject in df_april_19['Subject Name'].unique():
        count = len(df_april_19[df_april_19['Subject Name'] == subject])
        print(f"  {subject:30} : {count} enrollment(s)")
    
    print(f"\n{'='*100}")
    print("📈 TABULAR FORMAT")
    print(f"{'='*100}\n")
    
    # Display all columns in table format
    display_cols = ['Student Name', 'Student Login ID', 'Subject Name', 'Batch Time', 
                    'Payment Mode', 'Payment Status', 'Amount Paid', 'Mobile Number', 
                    'Payment ID', 'Transaction ID']
    
    display_df = df_april_19[display_cols].copy()
    display_df.index = range(1, len(display_df) + 1)
    
    print(display_df.to_string())
    
    print(f"\n{'='*100}")
    print("✅ CONCLUSION")
    print(f"{'='*100}")
    print(f"The database contains {total_entries} enrollment entry/entries for April 19, 2026.")
    print(f"These represent {unique_students} student(s) enrolling in {df_april_19['Subject Name'].nunique()} different subject(s).")
    print(f"Total revenue collected: ₹{total_amount:,.2f}")
    print(f"\nThis is the COMPLETE and FINAL data for April 19, 2026 from the database.")
    print(f"{'='*100}\n")
    
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

import pandas as pd
import csv
from datetime import datetime, timedelta

# Read the detailed enrollment report CSV
csv_path = "DETAILED_ENROLLMENT_REPORT_2026-04-15_to_2026-04-19_2026-04-19_12-04-03.csv"

print("=" * 90)
print("📊 ALL STUDENTS ENROLLED YESTERDAY (April 19, 2026) - ONLINE & OFFLINE")
print("=" * 90)

try:
    # Read CSV
    print(f"\n📂 Reading file: {csv_path}")
    df = pd.read_csv(csv_path)
    
    # Convert enrollment date to datetime
    df['Student Enrollment Date'] = pd.to_datetime(df['Student Enrollment Date'])
    
    # Get yesterday's date (April 19, 2026)
    target_date = pd.Timestamp('2026-04-19').date()
    df_yesterday = df[df['Student Enrollment Date'].dt.date == target_date].copy()
    
    print(f"✅ Total records in database: {len(df)}")
    print(f"📅 Records enrolled yesterday (April 19, 2026): {len(df_yesterday)}")
    
    if len(df_yesterday) == 0:
        print("⚠️ No records found for April 19, 2026")
        exit(1)
    
    # Count online vs offline
    online_count = len(df_yesterday[df_yesterday['Payment Mode'] == 'ONLINE'])
    offline_count = len(df_yesterday[df_yesterday['Payment Mode'] == 'CASH'])
    
    print(f"\n💳 Online Payments: {online_count}")
    print(f"💵 Offline Payments (CASH): {offline_count}")
    
    # Reset index
    df_yesterday = df_yesterday.reset_index(drop=True)
    
    # Create comprehensive report
    output_data = []
    
    for idx, row in df_yesterday.iterrows():
        record = {
            'Sr No': idx + 1,
            'Student Name': row['Student Name'],
            'Login ID': row['Student Login ID'],
            'Subject Name': row['Subject Name'],
            'Batch Time': row['Batch Time'],
            'Payment Mode': row['Payment Mode'],
            'Payment ID': row['Payment ID'] if pd.notna(row['Payment ID']) else 'N/A',
            'Transaction ID': row['Transaction ID'] if pd.notna(row['Transaction ID']) else 'N/A',
            'Payment Status': row['Payment Status'],
            'Amount Paid': float(row['Amount Paid']) if pd.notna(row['Amount Paid']) else 0.0,
            'Mobile Number': row['Mobile Number'],
            'Enrollment Date': row['Student Enrollment Date'].strftime('%d-%m-%Y'),
        }
        output_data.append(record)
    
    # Save complete report to CSV
    output_filename = f"all_students_enrolled_yesterday_19-04-2026_{datetime.now().strftime('%H-%M-%S')}.csv"
    
    fieldnames = [
        'Sr No',
        'Student Name',
        'Login ID',
        'Subject Name',
        'Batch Time',
        'Payment Mode',
        'Payment ID',
        'Transaction ID',
        'Payment Status',
        'Amount Paid',
        'Mobile Number',
        'Enrollment Date',
    ]
    
    with open(output_filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_data)
    
    print(f"\n✅ Report generated successfully!")
    print(f"📁 File: {output_filename}")
    
    # Print detailed summary
    print("\n" + "=" * 90)
    print("📈 DETAILED SUMMARY - APRIL 19, 2026")
    print("=" * 90)
    print(f"Total Enrollments: {len(output_data)}")
    print(f"Total Amount Collected: ₹{sum(r['Amount Paid'] for r in output_data):,.2f}")
    
    success_count = sum(1 for r in output_data if r['Payment Status'] == 'SUCCESS')
    pending_count = sum(1 for r in output_data if r['Payment Status'] in ['PENDING', 'CREATED'])
    unpaid_count = sum(1 for r in output_data if r['Payment Status'] == 'Unpaid')
    
    print(f"\nPayment Status Breakdown:")
    print(f"  ✅ Successful: {success_count}")
    print(f"  ⏳ Pending: {pending_count}")
    print(f"  ❌ Unpaid: {unpaid_count}")
    
    print(f"\nPayment Mode Breakdown:")
    print(f"  💳 Online: {online_count}")
    print(f"  💵 Offline (Cash): {offline_count}")
    
    # Online transactions
    online_data = [r for r in output_data if r['Payment Mode'] == 'ONLINE']
    online_amount = sum(r['Amount Paid'] for r in online_data)
    print(f"     Online Amount: ₹{online_amount:,.2f}")
    
    # Offline transactions
    offline_data = [r for r in output_data if r['Payment Mode'] == 'CASH']
    offline_amount = sum(r['Amount Paid'] for r in offline_data)
    print(f"     Offline Amount: ₹{offline_amount:,.2f}")
    
    # Print all records in table format
    print("\n" + "=" * 90)
    print("📋 ALL ENROLLED STUDENTS - APRIL 19, 2026")
    print("=" * 90)
    
    # Create display dataframe
    display_df = pd.DataFrame(output_data)[['Sr No', 'Student Name', 'Login ID', 'Subject Name', 
                                              'Batch Time', 'Payment Mode', 'Payment Status', 
                                              'Amount Paid', 'Mobile Number']]
    
    print(display_df.to_string(index=False))
    
    # Group by payment mode
    print("\n" + "=" * 90)
    print("💳 ONLINE PAYMENTS (APRIL 19, 2026)")
    print("=" * 90)
    
    online_df = pd.DataFrame(online_data)[['Sr No', 'Student Name', 'Login ID', 'Subject Name', 
                                             'Batch Time', 'Payment Status', 'Amount Paid']]
    if len(online_df) > 0:
        print(online_df.to_string(index=False))
        print(f"\nTotal Online: {len(online_data)} enrollments | Amount: ₹{online_amount:,.2f}")
    else:
        print("No online payments")
    
    print("\n" + "=" * 90)
    print("💵 OFFLINE PAYMENTS - CASH (APRIL 19, 2026)")
    print("=" * 90)
    
    if len(offline_data) > 0:
        offline_df = pd.DataFrame(offline_data)[['Sr No', 'Student Name', 'Login ID', 'Subject Name', 
                                                   'Batch Time', 'Payment Status', 'Amount Paid']]
        print(offline_df.to_string(index=False))
        print(f"\nTotal Offline: {len(offline_data)} enrollments | Amount: ₹{offline_amount:,.2f}")
    else:
        print("No offline (cash) payments found for April 19, 2026")
    
    print(f"\n✅ Full report saved to: {output_filename}")
    print("\n" + "=" * 90)

except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

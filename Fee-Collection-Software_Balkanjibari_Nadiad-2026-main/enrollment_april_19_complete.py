import pandas as pd
import csv
from datetime import datetime

# Parse the enrollment data from the user input
enrollment_data = [
    {
        'Sr No': 1,
        'Enrollment ID': 'ENR-KEY-020',
        'Student Name': 'Vindit Hemangbhai Patel',
        'Subject': 'Keyboard (Casio)',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 2,
        'Enrollment ID': 'ENR-PEN-059',
        'Student Name': 'DEVASYA RINKESHKUMAR PARMAR',
        'Subject': 'Pencil Sketch',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 600,
        'Amount Paid': 600,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 3,
        'Enrollment ID': 'ENR-SKA-336',
        'Student Name': 'DEVASYA RINKESHKUMAR PARMAR',
        'Subject': 'Skating',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 4,
        'Enrollment ID': 'ENR-YOG-012',
        'Student Name': 'yatharth hardik patel',
        'Subject': 'Yogasan',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 310,
        'Amount Paid': 310,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 5,
        'Enrollment ID': 'ENR-WES-008',
        'Student Name': 'Shah Jay Divyangbhai',
        'Subject': 'Western Dance',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 710,
        'Amount Paid': 710,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 6,
        'Enrollment ID': 'ENR-YOU-007',
        'Student Name': 'Bhatt Krisha Mitesh',
        'Subject': 'YouTube',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 7,
        'Enrollment ID': 'ENR-WES-007',
        'Student Name': 'Bhatt Krisha Mitesh',
        'Subject': 'Western Dance',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 710,
        'Amount Paid': 710,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 8,
        'Enrollment ID': 'ENR-ABA-047',
        'Student Name': 'Shah Aaradhya Hardikkumar',
        'Subject': 'Abacus and Brain Development',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 700,
        'Amount Paid': 700,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 9,
        'Enrollment ID': 'ENR-WES-009',
        'Student Name': 'Shah Aaradhya Hardikkumar',
        'Subject': 'Western Dance',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 710,
        'Amount Paid': 710,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 10,
        'Enrollment ID': 'ENR-PEN-061',
        'Student Name': 'Vandan Ravikumar Patel',
        'Subject': 'Pencil Sketch',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 11,
        'Enrollment ID': 'ENR-ABA-048',
        'Student Name': 'Praj J Modi',
        'Subject': 'Abacus and Brain Development',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 710,
        'Amount Paid': 710,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 12,
        'Enrollment ID': 'ENR-MEH-017',
        'Student Name': 'Ruchira Ravikumar Patel',
        'Subject': 'Mehendi',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 13,
        'Enrollment ID': 'ENR-KAT-011',
        'Student Name': 'Swara Rajeshbhai Marvadi',
        'Subject': 'Kathak Dance',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 14,
        'Enrollment ID': 'ENR-MEH-016',
        'Student Name': 'Rohit Nisha pravinbhai',
        'Subject': 'Mehendi',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 15,
        'Enrollment ID': 'ENR-KAT-010',
        'Student Name': 'Habika P Macwan',
        'Subject': 'Kathak Dance',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 16,
        'Enrollment ID': 'ENR-KEY-021',
        'Student Name': 'Shaun S Chauhan',
        'Subject': 'Keyboard (Casio)',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 17,
        'Enrollment ID': 'ENR-SKA-342',
        'Student Name': 'NITYAM HIRENKUMAR PATIL',
        'Subject': 'Skating',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 18,
        'Enrollment ID': 'ENR-PEN-060',
        'Student Name': 'Aaliya Mohammad Yusuf Shaikh',
        'Subject': 'Pencil Sketch',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 19,
        'Enrollment ID': 'ENR-SKA-341',
        'Student Name': 'HETANXI BIPINBHAI THAKKAR',
        'Subject': 'Skating',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 20,
        'Enrollment ID': 'ENR-TAB-019',
        'Student Name': 'Darshan H Rathod',
        'Subject': 'Table Tennis',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 21,
        'Enrollment ID': 'ENR-TABLA-007',
        'Student Name': 'Parmar krutarth shailash kumar',
        'Subject': 'Tabla',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 22,
        'Enrollment ID': 'ENR-SKA-340',
        'Student Name': 'Solanki Priyanshi Samarthkumar',
        'Subject': 'Skating',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 23,
        'Enrollment ID': 'ENR-ZUM-013',
        'Student Name': 'Diya Mehulkumar Prajapati',
        'Subject': 'Zumba',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'ONLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 24,
        'Enrollment ID': 'ENR-SKA-339',
        'Student Name': 'Jenika Volesh Macloen',
        'Subject': 'Skating',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 25,
        'Enrollment ID': 'ENR-SKA-338',
        'Student Name': 'Hanisha Hiteshkumar Sachdev',
        'Subject': 'Skating',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 600,
        'Amount Paid': 600,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 26,
        'Enrollment ID': 'ENR-ZUM-012',
        'Student Name': 'Hanisha Hiteshkumar Sachdev',
        'Subject': 'Zumba',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 510,
        'Amount Paid': 510,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
    {
        'Sr No': 27,
        'Enrollment ID': 'ENR-SKA-337',
        'Student Name': 'Vindit Hemangbhai Patel',
        'Subject': 'Skating',
        'Enrollment Date': '19-04-2026',
        'Enrollment Time': '05:30 AM',
        'Fee Amount': 610,
        'Amount Paid': 610,
        'Payment Mode': 'OFFLINE',
        'Payment Status': 'SUCCESS'
    },
]

print("=" * 120)
print("📊 COMPLETE ENROLLMENT REPORT - APRIL 19, 2026")
print("=" * 120)

# Create DataFrame
df = pd.DataFrame(enrollment_data)

# Print summary
print(f"\n✅ Total Enrollments: {len(df)}")
print(f"💰 Total Amount Collected: ₹{df['Amount Paid'].sum():,.2f}")

# Payment mode breakdown
online = len(df[df['Payment Mode'] == 'ONLINE'])
offline = len(df[df['Payment Mode'] == 'OFFLINE'])
online_amount = df[df['Payment Mode'] == 'ONLINE']['Amount Paid'].sum()
offline_amount = df[df['Payment Mode'] == 'OFFLINE']['Amount Paid'].sum()

print(f"\n💳 ONLINE Payments: {online} enrollments | ₹{online_amount:,.2f}")
print(f"💵 OFFLINE Payments: {offline} enrollments | ₹{offline_amount:,.2f}")

# Unique students
unique_students = df['Student Name'].nunique()
print(f"\n👥 Unique Students: {unique_students}")

# Top subjects
print(f"\n📚 Subjects Breakdown:")
for subject in df['Subject'].value_counts().index:
    count = len(df[df['Subject'] == subject])
    amount = df[df['Subject'] == subject]['Amount Paid'].sum()
    print(f"   {subject:35} : {count:2} enrollments | ₹{amount:,.2f}")

# Save to CSV
filename = f"enrollment_april_19_2026_complete_{datetime.now().strftime('%H-%M-%S')}.csv"

fieldnames = ['Sr No', 'Enrollment ID', 'Student Name', 'Subject', 'Enrollment Date', 
              'Enrollment Time', 'Fee Amount', 'Amount Paid', 'Payment Mode', 'Payment Status']

with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(enrollment_data)

print(f"\n✅ Report saved to: {filename}")

print("\n" + "=" * 120)
print("📋 DETAILED TABLE - ALL ENROLLMENTS")
print("=" * 120)

# Display table
display_df = df[['Sr No', 'Enrollment ID', 'Student Name', 'Subject', 'Enrollment Date',
                  'Enrollment Time', 'Fee Amount', 'Amount Paid', 'Payment Mode']]

print(display_df.to_string(index=False))

print(f"\n" + "=" * 120)
print(f"✅ FINAL SUMMARY - APRIL 19, 2026")
print("=" * 120)
print(f"Total Enrollment Entries    : {len(df)}")
print(f"Unique Students             : {unique_students}")
print(f"Different Subjects          : {df['Subject'].nunique()}")
print(f"Total Revenue               : ₹{df['Amount Paid'].sum():,.2f}")
print(f"Online Transactions         : {online} (₹{online_amount:,.2f})")
print(f"Offline Transactions        : {offline} (₹{offline_amount:,.2f})")
print(f"Report Generated            : {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}")
print(f"File Name                   : {filename}")
print("=" * 120)

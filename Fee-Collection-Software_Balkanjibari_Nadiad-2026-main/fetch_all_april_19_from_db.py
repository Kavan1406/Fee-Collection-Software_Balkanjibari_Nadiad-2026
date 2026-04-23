import requests
import json
import csv
from datetime import datetime

# Supabase credentials
SUPABASE_URL = "https://opjypwuhgsfqqvrvixwp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wanlwd3VoZ3NmcXF2cnZpeHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI2OTAwOTksImV4cCI6MjAyODI2NjA5OX0.pqM3bpLgXQQP-1EXKBJKDUNf0m7GGvG0yFdVzK0dQd4"

def fetch_enrollments_direct():
    """Fetch enrollments directly from Supabase database for April 19"""
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    print("=" * 90)
    print("📊 FETCHING ALL ENROLLMENT DATA FOR APRIL 19, 2026 - DIRECT FROM DATABASE")
    print("=" * 90)
    
    print("\n🔍 Connecting to Supabase database...")
    print(f"🌐 URL: {SUPABASE_URL}")
    
    try:
        # Fetch enrollments with filters
        url = f"{SUPABASE_URL}/rest/v1/enrollments"
        
        # Add query parameters for date range
        params = {
            "enrollment_date": "gte.2026-04-19T00:00:00,lt.2026-04-20T00:00:00",
            "select": "*"
        }
        
        print(f"📡 Fetching enrollments for 2026-04-19...")
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            enrollments = response.json()
            print(f"✅ Successfully fetched {len(enrollments)} enrollment records")
            return enrollments
        else:
            print(f"⚠️ API Response: {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return []

def fetch_students_batch(student_ids):
    """Fetch student details for a batch of IDs"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    if not student_ids:
        return {}
    
    students_map = {}
    
    # Fetch students
    try:
        url = f"{SUPABASE_URL}/rest/v1/students"
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            all_students = response.json()
            for student in all_students:
                students_map[student.get('id')] = student
    except:
        pass
    
    return students_map

def process_enrollments(enrollments):
    """Process and format enrollment data"""
    
    print(f"\n📋 Processing {len(enrollments)} enrollment records...")
    
    # Extract student IDs
    student_ids = set([e.get('student_id') for e in enrollments if e.get('student_id')])
    print(f"👥 Unique students: {len(student_ids)}")
    
    # Fetch student data
    students_map = fetch_students_batch(list(student_ids))
    print(f"📊 Fetched {len(students_map)} student records")
    
    # Format data
    formatted_data = []
    
    for idx, enrollment in enumerate(enrollments, 1):
        student_id = enrollment.get('student_id')
        student = students_map.get(student_id, {})
        
        record = {
            'Sr No': idx,
            'Student Name': student.get('name', 'N/A'),
            'Student ID': student.get('student_id', 'NOT_ASSIGNED'),
            'Login ID': student.get('login_username', 'N/A'),
            'Subject': enrollment.get('subject_name', 'N/A'),
            'Batch Time': enrollment.get('batch_time', 'N/A'),
            'Enrollment Date': enrollment.get('enrollment_date', 'N/A'),
            'Payment Status': enrollment.get('payment_status', 'PENDING'),
            'Payment Mode': enrollment.get('payment_mode', 'N/A'),
            'Payment ID': enrollment.get('payment_id', 'N/A'),
            'Transaction ID': enrollment.get('transaction_id', 'N/A'),
            'Amount': enrollment.get('paid_amount', 0),
            'Mobile Number': student.get('phone', 'N/A'),
            'Enrollment ID': enrollment.get('id', 'N/A'),
        }
        formatted_data.append(record)
    
    return formatted_data

def save_report(data, filename):
    """Save data to CSV"""
    
    if not data:
        print("⚠️ No data to save")
        return
    
    fieldnames = [
        'Sr No',
        'Student Name',
        'Student ID',
        'Login ID',
        'Subject',
        'Batch Time',
        'Enrollment Date',
        'Payment Status',
        'Payment Mode',
        'Payment ID',
        'Transaction ID',
        'Amount',
        'Mobile Number',
        'Enrollment ID',
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    
    print(f"✅ Report saved: {filename}")

def main():
    # Fetch data
    enrollments = fetch_enrollments_direct()
    
    if not enrollments:
        print("\n⚠️ No enrollments found or unable to connect to database")
        print("Trying alternative method with existing data...")
        return
    
    print(f"\n✅ Retrieved {len(enrollments)} total enrollments")
    
    # Process
    formatted_data = process_enrollments(enrollments)
    
    # Print summary
    print("\n" + "=" * 90)
    print("📈 SUMMARY")
    print("=" * 90)
    print(f"Total Enrollments: {len(formatted_data)}")
    
    if formatted_data:
        total_amount = sum(float(r.get('Amount', 0) or 0) for r in formatted_data)
        success = sum(1 for r in formatted_data if r.get('Payment Status') == 'SUCCESS')
        print(f"Total Amount: ₹{total_amount:,.2f}")
        print(f"Successful Payments: {success}")
        
        # Save report
        filename = f"database_enrollment_april_19_2026_{datetime.now().strftime('%H-%M-%S')}.csv"
        save_report(formatted_data, filename)
        
        # Print data
        print("\n" + "=" * 90)
        print("📋 ALL ENROLLMENT ENTRIES FOR APRIL 19, 2026")
        print("=" * 90)
        
        for record in formatted_data:
            print(f"\n{record['Sr No']}. {record['Student Name']} ({record['Student ID']})")
            print(f"   Login: {record['Login ID']} | Phone: {record['Mobile Number']}")
            print(f"   Subject: {record['Subject']} | Batch: {record['Batch Time']}")
            print(f"   Payment: {record['Payment Mode']} | Status: {record['Payment Status']} | Amount: ₹{record['Amount']}")
            print(f"   Payment ID: {record['Payment ID']} | Transaction: {record['Transaction ID']}")

if __name__ == "__main__":
    main()

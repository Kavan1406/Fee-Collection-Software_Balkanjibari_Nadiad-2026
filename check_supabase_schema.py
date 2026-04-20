"""
Get field names from Supabase tables
"""
import requests

SUPABASE_URL = "https://xydszcryzwyfimkgcwml.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZHN6Y3J5end5Zmlta2djd21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTQ4MTIsImV4cCI6MjA5MTE5MDgxMn0.Ywjl-Xb-68UyxjO67i04ULX4FxizQ8kosnrPmL_LspU"

# Get sample student data
url = f"{SUPABASE_URL}/rest/v1/students"
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
}
params = {"limit": 1}

response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    student = response.json()[0]
    print("\n📚 STUDENT TABLE FIELDS:")
    print("="*50)
    for key in student.keys():
        print(f"  • {key}")
    
    print("\n📝 Sample Student Data:")
    print("="*50)
    for key, value in student.items():
        if isinstance(value, str) and len(str(value)) > 50:
            print(f"  {key}: {str(value)[:50]}...")
        else:
            print(f"  {key}: {value}")

# Get sample enrollment data
url = f"{SUPABASE_URL}/rest/v1/enrollments"
response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    enrollment = response.json()[0]
    print("\n📖 ENROLLMENTS TABLE FIELDS:")
    print("="*50)
    for key in enrollment.keys():
        print(f"  • {key}")

# Get sample payment data
url = f"{SUPABASE_URL}/rest/v1/payments"
response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    payment = response.json()[0]
    print("\n💳 PAYMENTS TABLE FIELDS:")
    print("="*50)
    for key in payment.keys():
        print(f"  • {key}")

# Get sample batch data
url = f"{SUPABASE_URL}/rest/v1/batch"
response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    batch = response.json()[0]
    print("\n⏰ BATCH TABLE FIELDS:")
    print("="*50)
    for key in batch.keys():
        print(f"  • {key}")
else:
    print(f"\n⏰ BATCH TABLE: Error {response.status_code} - Table might be named differently")
    # Try other possible names
    for table_name in ['batches', 'batch_details', 'class_batches']:
        url = f"{SUPABASE_URL}/rest/v1/{table_name}"
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            print(f"\n✅ Found table: {table_name}")
            batch = response.json()[0]
            for key in batch.keys():
                print(f"  • {key}")
            break

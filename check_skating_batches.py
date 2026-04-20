"""
Check actual batch times for Skating subject in Supabase
"""

import requests

SUPABASE_URL = "https://xydszcryzwyfimkgcwml.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZHN6Y3J5end5Zmlta2djd21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTQ4MTIsImV4cCI6MjA5MTE5MDgxMn0.Ywjl-Xb-68UyxjO67i04ULX4FxizQ8kosnrPmL_LspU"

def fetch_data(table_name, limit=10000):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    params = {"limit": limit}
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code == 200:
        return response.json()
    return []

# Fetch data
subjects = fetch_data("subjects")
enrollments = fetch_data("enrollments")

# Find Skating subject
skating = None
for s in subjects:
    if s.get('name', '').lower() == 'skating':
        skating = s
        break

if skating:
    skating_id = skating['id']
    print(f"\n🏸 Skating Subject ID: {skating_id}")
    print(f"Subject Name: {skating.get('name')}")
    print(f"Default Batch Timing: {skating.get('default_batch_timing')}")
    print(f"Timing Schedule: {skating.get('timing_schedule')}\n")
    
    # Get all unique batch times for Skating
    skating_enrollments = [e for e in enrollments if e.get('subject_id') == skating_id and not e.get('is_deleted')]
    
    batch_times = set()
    for e in skating_enrollments:
        bt = e.get('batch_time', 'Unknown')
        batch_times.add(bt)
    
    print(f"Found {len(skating_enrollments)} Skating enrollments")
    print(f"\nActual Batch Times in Database:\n")
    
    for i, bt in enumerate(sorted(batch_times), 1):
        count = len([e for e in skating_enrollments if e.get('batch_time') == bt])
        print(f"  {i}. {bt} ({count} students)")
else:
    print("Skating subject not found")

import urllib.request
import json

url = "https://balkanji-backend.onrender.com/api/v1/auth/login/"

req = urllib.request.Request(url)
try:
    with urllib.request.urlopen(req) as response:
        data = response.read().decode()
        print(f"Status: OK {response.status}")
        try:
            parsed = json.loads(data)
            subjects = parsed.get('data', [])
            print(f"Subjects count: {len(subjects)}")
            for s in subjects[:10]:
                print(f"  - {s['name']} ({s.get('activity_type', 'N/A')})")
        except:
            print("Response:", data[:500])
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f"HTTP {e.code}")
    print("Body:", body[:2000])
except Exception as e:
    print(f"Error: {e}")

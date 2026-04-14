import urllib.request
import json

url = "https://balkanji-backend-ai5a.onrender.com/api/v1/auth/login/"

payload = {
    "username": "admin",
    "password": "Balkanji@2026"
}

data = json.dumps(payload).encode("utf-8")
headers = {
    "Content-Type": "application/json"
}

req = urllib.request.Request(url, data=data, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as response:
        data = response.read().decode()
        print(f"Status: OK {response.status}")
        try:
            parsed = json.loads(data)
            print(json.dumps(parsed, indent=2))
        except:
            print("Response:", data[:500])
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f"HTTP {e.code}")
    print("Body:", body[:2000])
except Exception as e:
    print(f"Error: {e}")

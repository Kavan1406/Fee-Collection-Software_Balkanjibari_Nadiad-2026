import requests
import json

url = "https://balkanji-backend-ai5a.onrender.com/api/v1/auth/login/"
payload = {
    "username": "admin",
    "password": "Balkanji@2026"
}
headers = {
    "Content-Type": "application/json"
}

print(f"Testing login at {url}...")
try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Also test admin_test
payload["username"] = "admin_test"
print(f"\nTesting login for 'admin_test'...")
try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

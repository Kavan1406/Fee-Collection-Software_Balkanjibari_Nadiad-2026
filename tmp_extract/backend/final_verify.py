import requests
import sys

def verify_all():
    base_url = "http://localhost:8000/api/v1"
    login_data = {"username": "admin", "password": "admin123"}
    
    # 1. Login
    print("--- Testing Login ---")
    try:
        r = requests.post(f"{base_url}/auth/login/", json=login_data)
        print(f"Login Status: {r.status_code}")
        if r.status_code != 200:
            print(f"Error: {r.text}")
            return
        
        data = r.json()["data"]
        token = data["access"]
        role = data["user"]["role"]
        print(f"Authenticated as: {data['user']['username']} (Role: {role})")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Test Endpoints
        endpoints = [
            "/students/",
            "/students/registration-requests/",
            "/analytics/dashboard/?period=month",
            "/notifications/",
            "/payments/stats/"
        ]
        
        print("\n--- Testing Protected Endpoints ---")
        for ep in endpoints:
            resp = requests.get(f"{base_url}{ep}", headers=headers)
            print(f"GET {ep:40} | Status: {resp.status_code} | OK: {resp.status_code == 200}")
            if resp.status_code != 200:
                print(f"   Details: {resp.text[:100]}...")

    except Exception as e:
        print(f"Unexpected Error: {e}")

if __name__ == "__main__":
    verify_all()

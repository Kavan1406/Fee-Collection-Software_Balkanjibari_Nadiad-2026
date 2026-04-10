import requests
import sys

def verify():
    base_url = "http://localhost:8000/api/v1"
    login_data = {"username": "admin", "password": "admin123"}
    
    # login
    login_resp = requests.post(f"{base_url}/auth/login/", json=login_data)
    if login_resp.status_code != 200:
        print(f"LOGIN FAILED: {login_resp.status_code}")
        return
    
    token = login_resp.json()["data"]["access"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # check students
    r1 = requests.get(f"{base_url}/students/", headers=headers)
    print(f"STUDENTS STATUS: {r1.status_code}")
    if r1.status_code != 200:
        print(f"ERROR: {r1.text[:200]}")
        
    # check reg requests
    r2 = requests.get(f"{base_url}/students/registration-requests/", headers=headers)
    print(f"REG-REQ STATUS: {r2.status_code}")
    if r2.status_code != 200:
        print(f"ERROR: {r2.text[:200]}")

if __name__ == "__main__":
    verify()

import requests
import json

def test_live():
    render_url = 'https://fee-collection-system.onrender.com/api/v1/subjects/'
    vercel_url = 'https://balkanji-bari-dashboard.vercel.app/api/v1/subjects/'
    
    print(f"Testing Render Backend: {render_url}")
    try:
        r = requests.get(render_url, timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Success: {data.get('success')}")
            print(f"Subjects Count: {len(data.get('data', []))}")
    except Exception as e:
        print(f"Error Render: {e}")
        
    print(f"\nTesting Vercel Frontend Access: {vercel_url}")
    try:
        r = requests.get(vercel_url, timeout=10)
        print(f"Status: {r.status_code}")
    except Exception as e:
        print(f"Error Vercel: {e}")

if __name__ == "__main__":
    test_live()

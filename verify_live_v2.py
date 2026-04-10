import requests
import json
import time

def test_live():
    render_url = 'https://fee-collection-system.onrender.com/api/v1/subjects/'
    
    print(f"Testing Render Backend (allowing 60s for spin-up): {render_url}")
    for i in range(3):
        try:
            r = requests.get(render_url, timeout=60)
            print(f"Attempt {i+1} Status: {r.status_code}")
            if r.status_code == 200:
                data = r.json()
                print(f"Success: {data.get('success')}")
                print(f"Subjects Count: {len(data.get('data', []))}")
                break
        except Exception as e:
            print(f"Attempt {i+1} failed: {e}")
            time.sleep(5)

if __name__ == "__main__":
    test_live()

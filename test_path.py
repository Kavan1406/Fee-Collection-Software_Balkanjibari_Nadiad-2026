import requests

url = "https://admin-student-dashboard-ui.vercel.app/api/v1/subjects?path_test=1"
try:
    print(f"Requesting: {url}")
    r = requests.get(url, allow_redirects=False, verify=False)
    print(f"Status: {r.status_code}")
    print(f"Location: {r.headers.get('Location')}")
    print("---BODY---")
    print(r.text)
except Exception as e:
    print(f"Error: {e}")

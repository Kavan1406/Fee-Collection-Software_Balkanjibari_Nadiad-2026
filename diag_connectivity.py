import requests
import sys

BACKEND_URL = "https://balkanji-backend.onrender.com"
HEALTH_ENDPOINT = f"{BACKEND_URL}/health/"

print(f"--- Production Connectivity Diagnostic ---")
print(f"Testing connection to: {BACKEND_URL}")

try:
    response = requests.get(HEALTH_ENDPOINT, timeout=10)
    if response.status_code == 200:
        print("\n✅ SUCCESS: Your backend is LIVE and accessible from your machine!")
        print(f"Status: {response.status_code} OK")
        print("\nNext Step: Go to your Vercel Dashboard and ensure NEXT_PUBLIC_API_URL is exactly:")
        print(f"  {BACKEND_URL}")
        print("\nThen REDEPLOY your project on Vercel.")
    else:
        print(f"\n⚠️ WARNING: Backend reached but returned status: {response.status_code}")
        print("Please check your Render.com dashboard for logs.")
except requests.exceptions.ConnectionError:
    print("\n❌ FAILURE: Could not connect to the backend.")
    print("Possibilities:")
    print("1. The Render server is spin-down (hibernating). Visit the URL in a browser to wake it up.")
    print("2. Your internet connection or a firewall is blocking the request.")
except Exception as e:
    print(f"\n❌ ERROR: An unexpected error occurred: {str(e)}")

print("\n-------------------------------------------")


import requests
import json

api_key = "8U4q6k3MzV4"
service_id = "srv-d6pa2224d50c73a6fp2g"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

try:
    # Get service details
    url = f"https://api.render.com/v1/services/{service_id}"
    r = requests.get(url, headers=headers)
    service_data = r.json()
    print("Service Name:", service_data.get('name'))
    
    # Get environment variables
    url_env = f"https://api.render.com/v1/services/{service_id}/env-vars"
    r_env = requests.get(url_env, headers=headers)
    env_vars = r_env.json()
    print("\nEnvironment Variables:")
    for ev in env_vars:
        print(f"{ev['envVar']['key']}: {ev['envVar']['value']}")

except Exception as e:
    print("Error:", str(e))

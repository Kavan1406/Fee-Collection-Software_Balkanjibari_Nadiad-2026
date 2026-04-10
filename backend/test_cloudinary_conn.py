
import os
import cloudinary
import cloudinary.uploader
from decouple import config

# Load from .env if exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import cloudinary.api
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME') or config('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY') or config('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET') or config('CLOUDINARY_API_SECRET'),
    secure=True
)

def test_connection():
    print(f"Testing Cloudinary connection for: {cloudinary.config().cloud_name}")
    try:
        # Simple ping/request
        res = cloudinary.api.ping()
        print(f"Ping result: {res}")
        
        # Test upload
        print("Attempting test upload...")
        upload_res = cloudinary.uploader.upload("https://cloudinary-res.cloudinary.com/image/upload/dweb/Cloudinary_logo.png", public_id="test_ping")
        print(f"Upload successful! URL: {upload_res['secure_url']}")
        
        # Cleanup
        cloudinary.uploader.destroy("test_ping")
        print("Cleanup successful.")
        return True
    except Exception as e:
        print(f"Connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_connection()

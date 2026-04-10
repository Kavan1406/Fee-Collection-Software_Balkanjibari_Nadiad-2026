import os
import django
from django.conf import settings
from decouple import config

# Direct check of settings
print(f"DEFAULT_FILE_STORAGE: {settings.DEFAULT_FILE_STORAGE}")
if hasattr(settings, 'CLOUDINARY_STORAGE'):
    print(f"CLOUDINARY_CLOUD_NAME: {settings.CLOUDINARY_STORAGE.get('CLOUD_NAME')}")
else:
    print("CLOUDINARY_STORAGE not found in settings")

try:
    from cloudinary_storage.storage import MediaCloudinaryStorage
    storage = MediaCloudinaryStorage()
    print("Successfully initialized MediaCloudinaryStorage")
except Exception as e:
    print(f"Failed to initialize MediaCloudinaryStorage: {e}")

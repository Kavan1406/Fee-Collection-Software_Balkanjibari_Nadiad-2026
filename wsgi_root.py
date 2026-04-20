import os
import sys
from pathlib import Path

# Add the 'backend' directory to the Python path
# This allows 'import config.wsgi' to work even when running from the root
BASE_DIR = Path(__file__).resolve().parent
backend_path = os.path.join(BASE_DIR, 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Set the settings module for production
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

# Import the application from the backend config
from config.wsgi import application

# This 'application' variable is what Gunicorn expects

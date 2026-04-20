import os
import sys
from pathlib import Path

# Fix: 500/ModuleNotFoundError Fix
# We add the 'backend' directory to the path so that 'config' refers to 'backend/config'
BASE_DIR = Path(__file__).resolve().parent
backend_path = os.path.join(BASE_DIR, 'backend')

if backend_path not in sys.path:
    # Insert at 0 to ensure our backend/config takes priority over anything else
    sys.path.insert(0, backend_path)

# Django Settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

try:
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
    print(">>> WSGI Application Loaded Successfully from backend/config")
except Exception as e:
    print(f">>> ERROR: Failed to load WSGI application: {e}")
    import traceback
    traceback.print_exc()
    raise

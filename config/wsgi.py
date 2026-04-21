import os
import sys
from pathlib import Path

# Balkanji-Bari Root Bridge WSGI
# This file allows 'gunicorn config.wsgi:application' to work from the root directory.

# 1. Resolve Paths
BASE_DIR = Path(__file__).resolve().parent.parent
backend_path = str(BASE_DIR / 'backend')

# 2. Add backend and root to sys.path
# This ensures both 'backend.config' and modules inside 'backend/' are found
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

# 3. Set Settings Module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

# 4. Import Application
try:
    # We use 'backend.config.wsgi' to bridge directly to the actual app file
    # This avoids circular imports with 'config.wsgi' (this file itself)
    from backend.config.wsgi import application
except Exception as e:
    print(f">>> WSGI Bridge Error: {e}")
    # Fallback: Try to let Django handle it if paths are already set
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()

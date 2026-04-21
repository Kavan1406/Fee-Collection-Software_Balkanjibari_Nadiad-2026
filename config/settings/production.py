import os
import sys
from pathlib import Path

# settings/production.py Bridge
# This allows 'config.settings.production' to resolve correctly for Render.

BASE_DIR = Path(__file__).resolve().parent.parent.parent
backend_path = str(BASE_DIR / 'backend')

# Add backend to path so we can import from it
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Import all settings from the actual production file
try:
    from backend.config.settings.production import *
except ImportError as e:
    # If the above fails, it might be because the name is just 'config.settings.production'
    # relative to the backend path.
    from config.settings.production import *

"""
Hardened Production Settings for Render.
"""

from .base import *
import dj_database_url
import os
from decouple import config

# Host and Security Settings
DEBUG = True  # TEMPORARY: Enabled for deep diagnostic of CORS/500 issues
ALLOWED_HOSTS = [
    "*",
    "www.balkanjibari.org",
    "balkanjibari.org",
    "balkanji-backend-ai5a.onrender.com",
    "balkanji-bari-dashboard.vercel.app",
    "fee-collection-software-balkanjibari-nadiad-2026.vercel.app",
    "fee-collection-software-balkanjibar.vercel.app",
    "admin-student-dashboard-ui.vercel.app",
    "localhost",
    "127.0.0.1",
]

# CORS Configuration - LIBERATION MODE
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.balkanjibari\.org$",
    r"^https://.*\.vercel\.app$",
    r"^https://.*\.onrender\.com$",
    r"^http://localhost(:\d+)?$",
    r"^http://127\.0\.0\.1(:\d+)?$",
]
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://www.balkanjibari.org",
    "https://balkanjibari.org",
    "https://balkanji-bari-dashboard.vercel.app",
    "https://fee-collection-software-balkanjibari-nadiad-2026.vercel.app",
    "https://fee-collection-software-balkanjibar.vercel.app",
    "https://admin-student-dashboard-ui.vercel.app",
    "https://balkanji-backend-ai5a.onrender.com",
]
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# Database configuration - prioritize env variable with proper decouple loading

DATABASES = {
    "default": {
        **dj_database_url.parse(
            config("DATABASE_URL", default=None),
            # Supabase pooler is more stable with short-lived Django DB connections.
            conn_max_age=0,
            ssl_require=True,
        ),
        "OPTIONS": {
            # Avoid false-negative DB outages during transient cold-start/network latency.
            "connect_timeout": 30,
        },
    }
}

# Validate stale/broken DB sockets before use.
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# Static file handling with WhiteNoise
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS = [
    "https://balkanjibari.org",
    "https://www.balkanjibari.org",
    "https://balkanji-bari-dashboard.vercel.app",
    "https://fee-collection-software-balkanjibari-nadiad-2026.vercel.app",
    "https://fee-collection-software-balkanjibar.vercel.app",
    "https://admin-student-dashboard-ui.vercel.app",
    "https://balkanji-backend-ai5a.onrender.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://*.vercel.app",
    "https://*.onrender.com",
    "https://*.balkanjibari.org",
]

# Time Zone
TIME_ZONE = "Asia/Kolkata"

# Render/Proxy Settings
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Security Headers for Render - DIAGNOSTIC OVERWRITE
SECURE_SSL_REDIRECT = False  # Set to False to prevent infinite redirect loops behind proxy
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=not DEBUG, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=not DEBUG, cast=bool)
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Ensure Whitenoise is in middleware (it's in base, but let's be sure)
if "whitenoise.middleware.WhiteNoiseMiddleware" not in MIDDLEWARE:
    MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

# Static file storage with WhiteNoise
_MEDIA_BACKEND = (
    os.getenv("DEFAULT_FILE_STORAGE")
    or globals().get("DEFAULT_FILE_STORAGE")
    or "django.core.files.storage.FileSystemStorage"
)

STORAGES = {
    "default": {
        "BACKEND": _MEDIA_BACKEND,
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

from .base import *
import os

# Robust defaults for Render
ALLOWED_HOSTS = ['*']
DEBUG = True
CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = [
    'https://balkanji-bari-dashboard.vercel.app',
    'https://balkanji-backend-ai5a.onrender.com',
    'https://*.vercel.app',
    'https://*.onrender.com',
]

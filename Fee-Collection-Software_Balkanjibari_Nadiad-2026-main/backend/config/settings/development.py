from .base import *

DEBUG = True

# Development-specific settings
ALLOWED_HOSTS = ['*']

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True  # More permissive for local dev
CORS_ALLOW_CREDENTIALS = True

# Use SMTP backend defined in base.py/env
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable some security features for development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

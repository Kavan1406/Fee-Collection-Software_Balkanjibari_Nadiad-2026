"""
Django settings for EduManager project.
Production-grade configuration with security, Celery, JWT, and PostgreSQL.
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config
import dj_database_url

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _strip_wrapping_quotes(value: str) -> str:
    """Normalize env values that may include accidental wrapping quotes."""
    if not isinstance(value, str):
        return value
    trimmed = value.strip()
    if len(trimmed) >= 2 and trimmed[0] == trimmed[-1] and trimmed[0] in {'"', "'"}:
        return trimmed[1:-1]
    return trimmed

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = _strip_wrapping_quotes(config('SECRET_KEY', default='django-insecure-mvp-dev-key-change-in-production-12345'))

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()]) or []

APPEND_SLASH = True

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
    r"^https://.*\.onrender\.com$",
]
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://www.balkanjibari.org',
    'https://balkanjibari.org',
    'https://fee-collection-software-balkanjibar.vercel.app',
    'https://balkanji-bari-dashboard.vercel.app',
    'https://balkan-ji-ni-bari-nadiad.vercel.app',
    'https://admin-student-dashboard-ui.vercel.app',
    'https://balkanji-backend-ai5a.onrender.com',
]

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'https://www.balkanjibari.org',
    'https://balkanjibari.org',
    'https://balkanji-bari-dashboard.vercel.app',
    'https://balkan-ji-ni-bari-nadiad.vercel.app',
    'https://admin-student-dashboard-ui.vercel.app',
    'https://balkanji-backend-ai5a.onrender.com',
    'https://*.vercel.app',
    'https://*.onrender.com',
]

# SSL/HTTPS Configuration (Standardized)
# These settings are crucial for production environments to enforce HTTPS
# and protect against various attacks. They are typically enabled when DEBUG is False.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False # Vercel handles this at the edge
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'whitenoise.runserver_nostatic',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'cloudinary_storage',
    'cloudinary',
    # 'django_celery_beat',  # Disabled for MVP
    # 'django_celery_results',  # Disabled for MVP
    # 'csp',  # Disabled for MVP
    
    # Local apps
    'apps.authentication',
    'apps.students',
    'apps.subjects',
    'apps.enrollments',
    'apps.payments',
    'apps.analytics',
    'apps.audit',
    'apps.notifications',
    'apps.reports',
    
    # TOTP 2FA
    'django_otp',
    'django_otp.plugins.otp_totp',
    'two_factor',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
    # 2FA Middleware
    'django_otp.middleware.OTPMiddleware',
    # Diagnostic Middleware for Login 400 Troubleshooting
    'utils.middleware.RequestErrorLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database Configuration
import dj_database_url

DATABASE_URL = config('DATABASE_URL', default=None)

# Parse database URL, only use ssl_require for non-SQLite databases
if DATABASE_URL and DATABASE_URL.startswith('sqlite'):
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
    }
else:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL, 
            conn_max_age=600,
            ssl_require=True
        )
    }
DATABASES['default']['CONN_HEALTH_CHECKS'] = True


# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Password Hashing - Use Argon2 for production
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Media files storage - Use Cloudinary if credentials are provided
CLOUDINARY_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default='dkjznnmaw')
if CLOUDINARY_CLOUD_NAME:
# Cloudinary config is handled automatically by django-cloudinary-storage via CLOUDINARY_STORAGE
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
        'API_KEY': config('CLOUDINARY_API_KEY'),
        'API_SECRET': config('CLOUDINARY_API_SECRET'),
        'SECURE': True,
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
else:
    DEFAULT_FILE_STORAGE = config('DEFAULT_FILE_STORAGE', default='django.core.files.storage.FileSystemStorage')

# S3 Configuration fallback (legacy, kept for structural compatibility if needed)
if 'S3Boto3Storage' in DEFAULT_FILE_STORAGE:
    AWS_ACCESS_KEY_ID = config('CF_R2_ACCESS_KEY_ID', default=None)
    AWS_SECRET_ACCESS_KEY = config('CF_R2_SECRET_ACCESS_KEY', default=None)
    AWS_STORAGE_BUCKET_NAME = config('CF_R2_BUCKET_NAME', default=None)
    AWS_S3_ENDPOINT_URL = config('CF_R2_ENDPOINT_URL', default=None)
    AWS_S3_REGION_NAME = 'auto'
    AWS_S3_CUSTOM_DOMAIN = config('CF_R2_PUBLIC_URL', default=None)
    
    MEDIA_URL = f'{AWS_S3_CUSTOM_DOMAIN}/media/' if AWS_S3_CUSTOM_DOMAIN else f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/media/'
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = False

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/hour',
        'user': '1000/hour',
    },
    'EXCEPTION_HANDLER': 'utils.exceptions.custom_exception_handler',
}

# JWT Configuration
SIMPLE_JWT = {
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    
    'JTI_CLAIM': 'jti',
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Celery Configuration (Disabled for MVP, will be enabled post-MVP)
# CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
# CELERY_RESULT_BACKEND = 'django-db'
# CELERY_CACHE_BACKEND = 'default'
# CELERY_ACCEPT_CONTENT = ['json']
# CELERY_TASK_SERIALIZER = 'json'
# CELERY_RESULT_SERIALIZER = 'json'
# CELERY_TIMEZONE = TIME_ZONE
# CELERY_TASK_TRACK_STARTED = True
# CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# Celery Beat Schedule (Disabled for MVP)
# from celery.schedules import crontab
# CELERY_BEAT_SCHEDULE = {
#     'send-fee-due-reminders': {
#         'task': 'apps.notifications.tasks.send_fee_due_reminders',
#         'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
#     },
#     'calculate-analytics': {
#         'task': 'apps.analytics.tasks.calculate_analytics',
#         'schedule': crontab(hour='*/1'),  # Every hour
#     },
#     'generate-monthly-revenue-snapshot': {
#         'task': 'apps.analytics.tasks.generate_monthly_snapshot',
#         'schedule': crontab(day_of_month=1, hour=0, minute=0),  # 1st of every month
#     },
# }

# Cache Configuration (Simplified for MVP - using local memory cache)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'edumanager-cache',
    }
}

# For production with Redis:
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.redis.RedisCache',
#         'LOCATION': config('REDIS_URL', default='redis://localhost:6379/1'),
#         'OPTIONS': {
#             'CLIENT_CLASS': 'django_redis.client.DefaultClient',
#         },
#         'KEY_PREFIX': 'edumanager',
#         'TIMEOUT': 300,
#     }
# }

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# CSP (Content Security Policy)
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'",)

# Production-only security settings (will be enabled in production.py)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Email Configuration
EMAIL_BACKEND = _strip_wrapping_quotes(config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend'))
EMAIL_HOST = _strip_wrapping_quotes(config('EMAIL_HOST', default='smtp.hostinger.com'))
EMAIL_PORT = config('EMAIL_PORT', default=465, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=False, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=True, cast=bool)
EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=10, cast=int)
EMAIL_HOST_USER = _strip_wrapping_quotes(config('EMAIL_HOST_USER', default=''))
EMAIL_HOST_PASSWORD = _strip_wrapping_quotes(config('EMAIL_HOST_PASSWORD', default=''))
DEFAULT_FROM_EMAIL = _strip_wrapping_quotes(config('DEFAULT_FROM_EMAIL', default='info@balkanjibari.org'))

# Logging Configuration (Simplified for MVP)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'gunicorn.error': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'gunicorn.access': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# API Documentation (drf-spectacular)
SPECTACULAR_SETTINGS = {
    'TITLE': 'EduManager API',
    'DESCRIPTION': 'Student Fee Management System API Documentation',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Razorpay Payment Gateway Settings
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')

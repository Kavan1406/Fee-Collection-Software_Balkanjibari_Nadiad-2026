# Performance Optimization Settings
# Session 13 - 16 April 2026

# DATABASE CONNECTION POOLING
# Improves database connection reuse and reduces connection overhead

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'balkanji_db',
        'USER': 'balkanji_user',
        'PASSWORD': 'balkanji_password',
        'HOST': 'localhost',
        'PORT': '5432',
        'ATOMIC_REQUESTS': True,
        # Connection pooling configuration
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'OPTIONS': {
            # Enable connection pooling for better performance
            'connect_timeout': 10,
            'options': '-c default_transaction_isolation=read_committed'
        }
    }
}

# CACHING CONFIGURATION
# Use Redis or in-memory cache for frequently accessed data
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',  # Local memory cache (fallback)
        'LOCATION': 'balkanji-cache',
        'OPTIONS': {
            'MAX_ENTRIES': 10000,  # Maximum cached items
        },
        'TIMEOUT': 300,  # 5 minute default cache timeout
    },
    # Optional: Add Redis cache for production (faster than file cache)
    # Install redis: pip install redis django-redis
    # Then uncomment below:
    # 'redis': {
    #     'BACKEND': 'django_redis.cache.RedisCache',
    #     'LOCATION': 'redis://127.0.0.1:6379/1',
    #     'OPTIONS': {
    #         'CLIENT_CLASS': 'django_redis.client.DefaultClient',
    #     },
    #     'TIMEOUT': 300,
    # }
}

# QUERY OPTIMIZATION SETTINGS
# Minimize database queries and use efficient query patterns

# Enable query logging in development to track N+1 queries
if DEBUG:
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
            },
            'sql_console': {
                'class': 'logging.StreamHandler',
            },
        },
        'loggers': {
            'django.db.backends': {
                'handlers': ['sql_console'],
                'level': 'DEBUG',
                'propagate': False,
            },
        },
    }

# REST FRAMEWORK PERFORMANCE SETTINGS
REST_FRAMEWORK = {
    'PAGE_SIZE': 20,  # Default pagination size
    'MAX_PAGE_SIZE': 100,  # Maximum allowed page size
    'DEFAULT_PAGINATION_CLASS': 'utils.pagination.StandardResultsSetPagination',
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.OrderingFilter',
    ],
    # Enable query parameter timeouts
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}

# RESPONSE COMPRESSION
# Automatically gzip responses for faster transfer
MIDDLEWARE = [
    # ... other middleware ...
    'django.middleware.gzip.GZipMiddleware',  # Must be high in middleware list
    # ... rest of middleware ...
]

# Enable compression for responses larger than 1KB
GZIP_MINIMUM_LENGTH = 1024  # bytes

# Enable streaming compression
if not DEBUG:
    GZIP_STREAM = True

print("✓ Performance optimization settings loaded")

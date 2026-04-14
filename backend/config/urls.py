"""
URL configuration for EduManager project.
API versioning with /api/v1/ prefix.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponse
from django.views.generic import RedirectView
from config.health import health_check, db_health_check
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

def api_root(request):
    """Root API endpoint with links to documentation."""
    response = JsonResponse({
        'message': 'EduManager API',
        'version': 'v1',
        'status': 'ULTRA-STRICT-DIAGNOSTIC-MODE',
        'deployment_marker': 'X-API-V-3.0.0',
        'documentation': {
            'swagger': request.build_absolute_uri('/api/schema/swagger-ui/'),
            'redoc': request.build_absolute_uri('/api/schema/redoc/'),
        },
        'endpoints': {
            'health': request.build_absolute_uri('/health/'),
            'auth': request.build_absolute_uri('/api/v1/auth/'),
            'students': request.build_absolute_uri('/api/v1/students/'),
            'subjects': request.build_absolute_uri('/api/v1/subjects/'),
            'enrollments': request.build_absolute_uri('/api/v1/enrollments/'),
            'payments': request.build_absolute_uri('/api/v1/payments/'),
        }
    })
    response['X-API-Version'] = '3.0.0-STRICT'
    return response

urlpatterns = [
    # Root
    path('', api_root, name='api-root'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/students/', include('apps.students.urls')),
    path('api/v1/subjects/', include('apps.subjects.urls')),
    path('api/v1/enrollments/', include('apps.enrollments.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Health check
    path('health/', health_check, name='health-check'),
    path('health/db/', db_health_check, name='db-health-check'),
    path('test-400/', lambda r: HttpResponse("OK", content_type="text/plain")),
]

# Media and static files
if settings.DEBUG or not getattr(settings, 'DEFAULT_FILE_STORAGE', '').endswith('S3Boto3Storage'):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

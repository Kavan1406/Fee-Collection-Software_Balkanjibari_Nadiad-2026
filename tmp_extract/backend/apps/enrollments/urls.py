"""
URL configuration for enrollments app.
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter
from . import views

router = SimpleRouter()
router.register(r'', views.EnrollmentViewSet, basename='enrollment')

app_name = 'enrollments'

urlpatterns = [
    path('', include(router.urls)),
]

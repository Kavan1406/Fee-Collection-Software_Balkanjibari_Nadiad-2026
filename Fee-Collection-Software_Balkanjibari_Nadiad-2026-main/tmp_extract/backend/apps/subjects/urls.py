"""
URL configuration for subjects app.
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter
from . import views

router = SimpleRouter()
router.register(r'', views.SubjectViewSet, basename='subject')

app_name = 'subjects'

urlpatterns = [
    path('', include(router.urls)),
]

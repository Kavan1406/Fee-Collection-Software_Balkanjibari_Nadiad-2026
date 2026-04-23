"""
URL configuration for students app.
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter
from . import views
from .registration_views import (
    register_student,
    confirm_registration_payment,
    download_registration_receipt,
)
from .import_views import import_students_csv

router = SimpleRouter()
router.register(r'registration-requests', views.StudentRegistrationRequestViewSet, basename='registration-request')
router.register(r'', views.StudentViewSet, basename='student')

app_name = 'students'

urlpatterns = [
    # Public self-registration endpoints (no auth required)
    path('register/', register_student, name='public-register'),
    path('confirm-registration-payment/', confirm_registration_payment, name='confirm-reg-payment'),
    path('download-receipt/', download_registration_receipt, name='download-reg-receipt'),
    path('import-csv/', import_students_csv, name='import-students-csv'),
    path('', include(router.urls)),
]


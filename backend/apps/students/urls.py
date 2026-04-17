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
    create_registration_order,
    register_after_payment,
)
from .import_views import import_students_csv

router = SimpleRouter()
router.register(r'registration-requests', views.StudentRegistrationRequestViewSet, basename='registration-request')
router.register(r'', views.StudentViewSet, basename='student')

app_name = 'students'

urlpatterns = [
    # Public self-registration endpoints (no auth required)
    path('register/', register_student, name='public-register'),
    # Explicit mapping keeps this endpoint stable even if router action wiring differs across deployments.
    path('register-offline/', views.StudentViewSet.as_view({'post': 'register_offline'}), name='register-offline'),
    path('confirm-registration-payment/', confirm_registration_payment, name='confirm-reg-payment'),
    path('download-receipt/', download_registration_receipt, name='download-reg-receipt'),
    # New 2-step flow: order created first, student only after payment verified
    path('create-registration-order/', create_registration_order, name='create-reg-order'),
    path('register-after-payment/', register_after_payment, name='register-after-payment'),
    path('import-csv/', import_students_csv, name='import-students-csv'),
    path('', include(router.urls)),
]


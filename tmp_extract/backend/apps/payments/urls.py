"""
URL configuration for payments app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .razorpay_views import (
    create_razorpay_order,
    verify_razorpay_payment,
    get_student_pending_fees
)
from .views_accountant import AccountantDashboardView, FeeLedgerViewSet

router = DefaultRouter()
router.register(r'ledger', FeeLedgerViewSet, basename='fee-ledger')
router.register(r'', views.PaymentViewSet, basename='payment')

app_name = 'payments'

urlpatterns = [
    # Razorpay endpoints
    path('razorpay/create-order/', create_razorpay_order, name='razorpay-create-order'),
    path('razorpay/verify/', verify_razorpay_payment, name='razorpay-verify'),
    path('student/pending-fees/', get_student_pending_fees, name='student-pending-fees'),
    
    # Accountant dashboard
    path('dashboard/', AccountantDashboardView.as_view(), name='accountant-dashboard'),
    
    # Standard CRUD & Actions via Router
    path('', include(router.urls)),
]

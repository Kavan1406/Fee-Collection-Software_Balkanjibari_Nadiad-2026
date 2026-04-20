from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ReportsViewSet

router = DefaultRouter()
router.register(r'', ReportsViewSet, basename='reports')

urlpatterns = router.urls

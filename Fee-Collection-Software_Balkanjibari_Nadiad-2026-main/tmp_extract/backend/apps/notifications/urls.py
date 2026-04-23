from django.urls import path
from .views import NotificationViewSet

urlpatterns = [
    path('', NotificationViewSet.as_view({'get': 'list'}), name='notification-list'),
    path('<int:pk>/mark-read/', NotificationViewSet.as_view({'post': 'mark_read'}), name='notification-mark-read'),
    path('mark-all-read/', NotificationViewSet.as_view({'post': 'mark_all_read'}), name='notification-mark-all-read'),
]

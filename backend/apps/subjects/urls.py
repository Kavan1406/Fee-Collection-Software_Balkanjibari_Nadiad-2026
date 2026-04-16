"""
URL configuration for subjects app.
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter
from . import views

# Main subject router
router = SimpleRouter()
router.register(r'', views.SubjectViewSet, basename='subject')

app_name = 'subjects'

# Batch-related URL patterns (nested under subjects)
batch_urls = [
    path('<int:subject_pk>/batches/', 
         views.SubjectBatchViewSet.as_view({
             'get': 'list',
             'post': 'create'
         }), 
         name='subject-batches-list'),
    
    path('<int:subject_pk>/batches/<int:pk>/', 
         views.SubjectBatchViewSet.as_view({
             'get': 'retrieve',
             'patch': 'partial_update',
             'put': 'update',
             'delete': 'destroy'
         }), 
         name='subject-batch-detail'),
    
    path('<int:subject_pk>/batches/<int:pk>/toggle-status/', 
         views.SubjectBatchViewSet.as_view({'patch': 'toggle_status'}), 
         name='subject-batch-toggle-status'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('', include(batch_urls)),
]

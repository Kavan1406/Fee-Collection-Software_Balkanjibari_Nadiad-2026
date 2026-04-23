"""
Views for Subject CRUD operations.
"""

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Subject
from .serializers import SubjectSerializer, SubjectCreateSerializer
from utils.permissions import IsStaffAccountantOrAdmin


class SubjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Subject CRUD operations.
    """
    
    queryset = Subject.objects.filter(is_deleted=False, is_active=True).prefetch_related('fee_structures')
    
    def get_permissions(self):
        """Allow public access to list and retrieve actions."""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsStaffAccountantOrAdmin()]
    
    def get_serializer_class(self):
        action = getattr(self, 'action', None)
        if action == 'create':
            return SubjectCreateSerializer
        return SubjectSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new subject with fee structure."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Subject created successfully.',
            'data': SubjectSerializer(subject).data
        }, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Get subject details with fee structure."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    def list(self, request, *args, **kwargs):
        """List all active subjects with optional activity type filtering."""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filter by activity type if provided
        activity_type = request.query_params.get('activity_type', None)
        if activity_type in ['SUMMER_CAMP', 'YEAR_ROUND']:
            queryset = queryset.filter(activity_type=activity_type)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """Update a subject."""
        instance = self.get_object()
        serializer = SubjectCreateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Subject updated successfully.',
            'data': SubjectSerializer(subject).data
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete a subject."""
        instance = self.get_object()
        instance.is_deleted = True
        instance.is_active = False
        instance.save()
        
        return Response({
            'success': True,
            'message': 'Subject deleted successfully.'
        }, status=status.HTTP_200_OK)

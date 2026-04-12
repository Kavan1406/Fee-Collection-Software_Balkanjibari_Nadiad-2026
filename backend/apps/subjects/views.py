"""
Views for Subject CRUD operations.
"""

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Subject
from .serializers import SubjectSerializer, SubjectCreateSerializer
from utils.permissions import IsStaffAccountantOrAdmin
from utils.id_cards import generate_bulk_id_cards_pdf
from django.http import HttpResponse
from rest_framework.decorators import action


class SubjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Subject CRUD operations.
    """
    
    from django.db.models import Count, Q
    queryset = Subject.objects.filter(is_deleted=False, is_active=True).annotate(
        enrolled_count_annotated=Count(
            'enrollments',
            filter=Q(enrollments__is_deleted=False, enrollments__status='ACTIVE')
        )
    ).prefetch_related('fee_structures')
    
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

    @action(detail=True, methods=['get'], url_path='download-bulk-id-cards')
    def download_bulk_id_cards(self, request, pk=None):
        """Generate/Serve bulk student ID cards for this subject."""
        subject = self.get_object()
        
        # Security: staff and admins only
        if request.user.role not in ['ADMIN', 'STAFF', 'ACCOUNTANT']:
            return Response({'success': False, 'error': {'message': 'Access denied.'}}, status=403)
        
        try:
            from apps.enrollments.models import Enrollment
            enrollments = list(Enrollment.objects.filter(
                subject=subject, 
                is_deleted=False, 
                status='ACTIVE'
            ).order_by('roll_number', 'created_at'))
            
            if not enrollments:
                return Response({'success': False, 'error': {'message': 'No active enrollments found for this subject.'}}, status=404)
            
            pdf_content = generate_bulk_id_cards_pdf(enrollments)
            
            filename = f"Bulk_ID_Cards_{subject.name.replace(' ', '_')}.pdf"
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

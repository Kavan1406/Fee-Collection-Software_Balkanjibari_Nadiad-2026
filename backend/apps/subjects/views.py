"""
Views for Subject CRUD operations.
"""

import logging

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Subject, SubjectBatch
from .serializers import SubjectSerializer, SubjectCreateSerializer, SubjectDetailSerializer, SubjectBatchSerializer
from utils.permissions import IsStaffAccountantOrAdmin
from utils.id_cards import generate_bulk_id_cards_pdf
from django.http import HttpResponse
from rest_framework.decorators import action
from django.db import connection
from django.db.utils import OperationalError, ProgrammingError


logger = logging.getLogger(__name__)


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
        activity_type = request.query_params.get('activity_type', None)
        logger.info(
            "Subject list request received | path=%s | activity_type=%s | auth_header_present=%s",
            request.path,
            activity_type,
            bool(request.headers.get('Authorization')),
        )

        try:
            # Explicit connectivity probe helps Render logs identify DB/network issues quickly.
            connection.ensure_connection()

            queryset = self.filter_queryset(self.get_queryset())

            # Filter by activity type if provided
            if activity_type in ['SUMMER_CAMP', 'YEAR_ROUND']:
                queryset = queryset.filter(activity_type=activity_type)

            subject_count = queryset.count()
            logger.info("Subject list query succeeded | row_count=%s", subject_count)

            serializer = self.get_serializer(queryset, many=True)

            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)

        except (ProgrammingError, OperationalError) as db_error:
            error_text = str(db_error).lower()

            # If table/schema is not ready yet, keep frontend stable with an empty list payload.
            if 'relation "subjects" does not exist' in error_text or 'no such table' in error_text:
                logger.exception("Subjects table is missing while listing subjects.")
                return Response({
                    'success': True,
                    'data': []
                }, status=status.HTTP_200_OK)

            logger.exception("Database error while listing subjects.")
            return Response({
                'success': False,
                'status': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception("Unhandled error while listing subjects.")
            return Response({
                'success': False,
                'status': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
    
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def batches(self, request, pk=None):
        """Get all batches for a subject with availability info."""
        try:
            subject = self.get_object()
            
            # Get all batch configurations for this subject
            batch_configs = SubjectBatch.objects.filter(
                subject=subject,
                is_active=True
            ).order_by('batch_time')
            
            serializer = SubjectBatchSerializer(batch_configs, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error fetching batches for subject {pk}")
            return Response({
                'success': False,
                'error': 'Failed to fetch batch information'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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


class SubjectBatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Subject Batches with capacity limits.
    Nested under SubjectViewSet with routes like /subjects/{subject_id}/batches/
    """
    
    queryset = SubjectBatch.objects.all()
    serializer_class = SubjectBatchSerializer

    def get_permissions(self):
        """Allow public read access for registration flow; restrict writes to staff/admin."""
        if self.action in ['list', 'retrieve', 'get_by_subject']:
            return [AllowAny()]
        return [IsAuthenticated(), IsStaffAccountantOrAdmin()]
    
    def get_queryset(self):
        """Filter batches by subject from URL parameter or query params."""
        queryset = SubjectBatch.objects.all()
        subject_id = self.kwargs.get('subject_pk') or self.request.query_params.get('subject_id')

        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)

        return queryset

    def list(self, request, *args, **kwargs):
        """Return batches in {success, data} format (no pagination wrapper)."""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response({'success': True, 'data': serializer.data})
        except (OperationalError, ProgrammingError) as db_error:
            error_text = str(db_error).lower()
            if 'subject_batches' in error_text or 'no such table' in error_text or 'does not exist' in error_text:
                logger.exception("subject_batches table missing — returning empty list.")
                return Response({'success': True, 'data': []}, status=status.HTTP_200_OK)
            logger.exception("Database error listing batches.")
            return Response({'success': False, 'message': 'Database error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception("Unhandled error listing batches.")
            return Response({'success': False, 'message': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_create(self, serializer):
        """Automatically set the subject from URL parameter."""
        subject_id = self.kwargs.get('subject_pk')
        if subject_id:
            serializer.save(subject_id=subject_id)
        else:
            serializer.save()
    
    def create(self, request, *args, **kwargs):
        """Create a new batch for a subject."""
        subject_id = self.kwargs.get('subject_pk')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            if subject_id:
                batch = serializer.save(subject_id=subject_id)
            else:
                batch = serializer.save()
        except Exception:
            logger.exception("Error creating batch.")
            return Response({'success': False, 'message': 'Failed to create batch.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'success': True,
            'message': 'Batch created successfully.',
            'data': SubjectBatchSerializer(batch).data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update batch capacity or status."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        batch = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Batch updated successfully.',
            'data': SubjectBatchSerializer(batch).data
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a batch."""
        instance = self.get_object()
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Batch deleted successfully.'
        }, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'], url_path='get-by-subject')
    def get_by_subject(self, request):
        """Get all batches for a specific subject."""
        subject_id = request.query_params.get('subject_id') or self.kwargs.get('subject_pk')
        
        if not subject_id:
            return Response({
                'success': False,
                'error': {'message': 'subject_id parameter is required'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            batches = SubjectBatch.objects.filter(subject_id=subject_id)
            serializer = SubjectBatchSerializer(batches, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None, **kwargs):
        """Toggle batch active/inactive status."""
        batch = self.get_object()
        batch.is_active = not batch.is_active
        batch.save()
        
        return Response({
            'success': True,
            'message': f'Batch is now {"active" if batch.is_active else "inactive"}.',
            'data': SubjectBatchSerializer(batch).data
        }, status=status.HTTP_200_OK)

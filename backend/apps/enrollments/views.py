"""
Views for Enrollment CRUD operations.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Enrollment
from .serializers import EnrollmentSerializer, EnrollmentCreateSerializer
from utils.permissions import IsStaffAccountantOrAdmin
from utils.pagination import StandardResultsSetPagination
from utils.id_cards import generate_id_card_pdf
from django.http import HttpResponse

class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Enrollment CRUD operations.
    """
    
    queryset = Enrollment.objects.filter(is_deleted=False).select_related('student', 'subject', 'student__user')
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        """Restrict write operations to staff and admins."""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'process_refund']:
            return [IsStaffAccountantOrAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EnrollmentCreateSerializer
        return EnrollmentSerializer
    
    def get_queryset(self):
        """Filter by student and activity type if provided."""
        queryset = super().get_queryset()
        
        # Security: Students can only see their own enrollments
        if self.request.user.role == 'STUDENT':
            student = getattr(self.request.user, 'student_profile', None)
            if student:
                queryset = queryset.filter(student=student)
            else:
                queryset = queryset.none()
        
        student_id = self.request.query_params.get('student_id', None)
        if student_id:
            queryset = queryset.filter(student__id=student_id)
        
        # Filter by activity type
        activity_type = self.request.query_params.get('activity_type', None)
        if activity_type in ['SUMMER_CAMP', 'YEAR_ROUND']:
            queryset = queryset.filter(subject__activity_type=activity_type)
        
        return queryset
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new enrollment."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create enrollment
        enrollment = Enrollment.objects.create(
            student=serializer.validated_data['student'],
            subject=serializer.validated_data['subject'],
            batch_time=serializer.validated_data['batch_time'],
            total_fee=serializer.validated_data['total_fee'],
            pending_amount=serializer.validated_data['total_fee']
        )
        
        return Response({
            'success': True,
            'message': 'Enrollment created successfully.',
            'data': EnrollmentSerializer(enrollment).data
        }, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Get enrollment details."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    def list(self, request, *args, **kwargs):
        """List enrollments with pagination."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            # Return paginated response directly (it already has the right format)
            return self.get_paginated_response(serializer.data)
        
        # Non-paginated response
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='process-refund')
    @transaction.atomic
    def process_refund(self, request, pk=None):
        """
        Process refund for an enrollment deletion.
        Only admins can process refunds.
        """
        # Admin-only permission check
        if request.user.role != 'ADMIN':
            return Response({
                'success': False,
                'error': {'message': 'Only admins can process refunds.'}
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get enrollment with lock for transaction safety
            enrollment = Enrollment.objects.select_for_update().get(
                id=pk,
                is_deleted=False
            )
            
            # Calculate refund amount (amount already paid)
            refund_amount = enrollment.paid_amount
            
            # Create refund payment record if there's a refund
            refund_payment = None
            if refund_amount > 0:
                from apps.payments.models import Payment
                from decimal import Decimal
                from django.utils import timezone
                
                refund_payment = Payment.objects.create(
                    enrollment=enrollment,
                    amount=refund_amount,
                    payment_date=timezone.now().date(),
                    payment_mode='REFUND',
                    status='SUCCESS',
                    recorded_by=request.user,
                    notes=f'Refund for enrollment deletion - {enrollment.subject.name}'
                )
            
            # Soft delete the enrollment
            enrollment.is_deleted = True
            enrollment.status = 'DROPPED'
            enrollment.save()
            
            return Response({
                'success': True,
                'message': f'Enrollment deleted successfully. Refund of ₹{refund_amount} processed.' if refund_amount > 0 else 'Enrollment deleted successfully. No refund required.',
                'refund_amount': float(refund_amount),
                'refund_payment_id': refund_payment.id if refund_payment else None,
                'refund_receipt': refund_payment.receipt_number if refund_payment else None
            }, status=status.HTTP_200_OK)
            
        except Enrollment.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Enrollment not found or already deleted.'}
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': {'message': f'Failed to process refund: {str(e)}'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        """Enrollment deletion is disabled. Use process-refund action instead."""
        return Response({
            'success': False,
            'message': 'Please use the refund action to delete enrollments.'
        }, status=status.HTTP_403_FORBIDDEN)
    @action(detail=True, methods=['get'], url_path='download-id-card')
    def download_id_card(self, request, pk=None):
        """Generate/Serve student ID card PDF (Optimized for Cloudinary)."""
        enrollment = self.get_object()
        student = enrollment.student
        
        # Security check
        if request.user.role == 'STUDENT':
            user_student = getattr(request.user, 'student_profile', None)
            if not user_student or student != user_student:
                return Response({'success': False, 'error': {'message': 'Access denied.'}}, status=403)
        
        try:
            # 1. Permanent Storage Check
            if enrollment.id_card:
                try:
                    from django.http import HttpResponseRedirect
                    return HttpResponseRedirect(enrollment.id_card.url)
                except Exception:
                    pass

            # 2. Unified ID Card Generation
            from utils.id_cards import generate_id_card_pdf
            is_provisional = enrollment.pending_amount > 0
            pdf_content = generate_id_card_pdf(enrollment, is_provisional=is_provisional)
            
            # 3. Persist to Cloudinary
            filename = f"ID_{student.student_id}_{enrollment.id}.pdf"
            try:
                from django.core.files.base import ContentFile
                enrollment.id_card.save(filename, ContentFile(pdf_content), save=True)
                from django.http import HttpResponseRedirect
                return HttpResponseRedirect(enrollment.id_card.url)
            except Exception:
                # Fallback: Serve raw
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=True, methods=['get'], url_path='download-receipt')
    def download_receipt(self, request, pk=None):
        """Standardized Receipt Download via Cloudinary."""
        enrollment = self.get_object()
        
        # Security check
        if request.user.role == 'STUDENT':
            user_student = getattr(request.user, 'student_profile', None)
            if not user_student or enrollment.student != user_student:
                return Response({'success': False, 'error': {'message': 'Access denied.'}}, status=403)
        
        # Find the latest successful payment
        payment = enrollment.payments.filter(status='SUCCESS').order_by('-created_at').first()
        if not payment:
            # Try to find a pending one to heal (Cash/Cheque)
            payment = enrollment.payments.filter(payment_mode__in=['CASH', 'CHEQUE']).first()
            if payment:
                payment.status = 'SUCCESS'
                payment.save()
            else:
                return Response({'success': False, 'error': {'message': 'No successful payment found.'}}, status=404)
            
        # 1. Storage Check
        if payment.receipt_pdf:
            try:
                from django.http import HttpResponseRedirect
                return HttpResponseRedirect(payment.receipt_pdf.url)
            except Exception:
                pass

        # 2. Unified Receipt Generation
        from utils.receipts import generate_receipt_pdf
        try:
            pdf_content = generate_receipt_pdf(payment)
            filename = f"Receipt_{payment.receipt_number or payment.id}.pdf"
            
            # 3. Store and Redirect
            from django.core.files.base import ContentFile
            payment.receipt_pdf.save(filename, ContentFile(pdf_content), save=True)
            from django.http import HttpResponseRedirect
            return HttpResponseRedirect(payment.receipt_pdf.url)
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['post'], url_path='bulk-backfill-roll-numbers')
    @transaction.atomic
    def bulk_backfill_roll_numbers(self, request):
        """Administrative action to assign roll numbers to all existing enrollments."""
        if request.user.role != 'ADMIN':
            return Response({'success': False, 'error': {'message': 'Only admins can perform backfill.'}}, status=403)
        
        from apps.subjects.models import Subject
        subjects = Subject.objects.filter(is_deleted=False)
        updated_count = 0
        
        for subject in subjects:
            # Order by created_at to assign in enrollment order
            enrollments = Enrollment.objects.filter(
                subject=subject, 
                is_deleted=False
            ).order_by('created_at')
            
            for index, enrollment in enumerate(enrollments, start=1):
                enrollment.roll_number = index
                enrollment.save()
                updated_count += 1
        
        return Response({
            'success': True, 
            'message': f'Successfully backfilled roll numbers for {updated_count} enrollments.'
        })


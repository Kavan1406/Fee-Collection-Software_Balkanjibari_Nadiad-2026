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
        """Generate and download a student ID card PDF for this enrollment."""
        # Persistent logging for debugging
        try:
            with open('incoming_debug.log', 'a') as f:
                f.write(f"DEBUG: download_id_card called for pk={pk} at {request.path}\n")
        except:
            pass
            
        print(f"DEBUG: download_id_card called for pk={pk}")
        try:
            enrollment = self.get_object()
            print(f"DEBUG: Found enrollment {enrollment.id} for student {enrollment.student.name}")
        except Exception as e:
            print(f"DEBUG: Enrollment get_object failed for pk={pk}: {str(e)}")
            try:
                with open('incoming_debug.log', 'a') as f:
                    f.write(f"ERROR: Enrollment get_object failed for pk={pk}: {str(e)}\n")
            except:
                pass
            raise e
        
        student = enrollment.student
        
        # Security check: Students can only download their own ID card
        if request.user.role == 'STUDENT':
            user_student = getattr(request.user, 'student_profile', None)
            if not user_student or student != user_student:
                return Response({
                    'success': False,
                    'error': {'message': 'Access denied.'}
                }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            is_provisional = enrollment.pending_amount > 0
            pdf_content = generate_id_card_pdf(enrollment, is_provisional=is_provisional)
            
            # Save the newly generated PDF to persistent storage
            try:
                from django.core.files.base import ContentFile
                prefix = "ID_PASS" if is_provisional else "ID_CARD"
                filename = f"{prefix}_{student.student_id}_{enrollment.subject.name.replace(' ', '_')}.pdf"
                enrollment.id_card.save(filename, ContentFile(pdf_content), save=True)
            except Exception as e:
                print(f"WARNING: Could not save ID card to storage: {str(e)}")
            
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{getattr(student, "student_id", "ID")}.pdf"'
            
            return response
        except Exception as e:
            print(f"ERROR generating ID card: {str(e)}")
            import traceback
            try:
                with open('incoming_debug.log', 'a') as f:
                    f.write(f"ERROR generating ID card for pk={pk}:\n{traceback.format_exc()}\n")
            except:
                pass
            return Response({
                'success': False,
                'error': {'message': f'Failed to generate ID card: {str(e)}'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='download-receipt')
    def download_receipt(self, request, pk=None):
        """Find the latest successful payment for this enrollment and download its receipt."""
        # Diagnostic logging
        try:
            with open('incoming_debug.log', 'a') as f:
                f.write(f"DEBUG: download_receipt(enrollment) called for pk={pk} at {request.path}\n")
        except:
            pass
            
        try:
            enrollment = self.get_object()
        except Exception as e:
            return Response({
                'success': False,
                'error': {'message': f'Enrollment not found: {str(e)}'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Security check
        if request.user.role == 'STUDENT':
            user_student = getattr(request.user, 'student_profile', None)
            if not user_student or enrollment.student != user_student:
                return Response({
                    'success': False,
                    'error': {'message': 'Access denied.'}
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Find the latest payment (any status) to try and heal it
        payment = enrollment.payments.order_by('-payment_date', '-created_at').first()
        
        if not payment:
            return Response({
                'success': False,
                'error': {'message': 'No payment record found for this enrollment.'}
            }, status=status.HTTP_404_NOT_FOUND)
            
        if payment.status != 'SUCCESS':
            # Try to heal it if it's a cash/cheque payment
            if payment.payment_mode in ['CASH', 'CHEQUE']:
                payment.status = 'SUCCESS'
                payment.save()
            else:
                return Response({
                    'success': False,
                    'error': {'message': f'Receipt is not available for payment status: {payment.status}.'}
                }, status=status.HTTP_400_BAD_REQUEST)
            
        from utils.receipts import generate_receipt_pdf
        try:
            pdf_content = generate_receipt_pdf(payment)
            
            # Attempt to save to storage if not already there, but don't crash if it fails
            try:
                if not payment.receipt_pdf:
                    from django.core.files.base import ContentFile
                    filename = f"Receipt_{payment.receipt_number}.pdf"
                    payment.receipt_pdf.save(filename, ContentFile(pdf_content), save=True)
            except Exception as save_err:
                print(f"WARNING: Could not save receipt to storage: {str(save_err)}")

            response = HttpResponse(pdf_content, content_type='application/pdf')
            filename = f"Receipt_{payment.receipt_number}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"ERROR generating receipt: {str(e)}\n{error_trace}")
            try:
                with open('incoming_debug.log', 'a') as f:
                    f.write(f"ERROR generating receipt for enrollment pk={pk}:\n{error_trace}\n")
            except:
                pass
            return Response({
                'success': False,
                'error': {'message': f'Failed to generate receipt: {str(e)}'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

"""
Views for Enrollment CRUD operations.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from .models import Enrollment
from apps.payments.models import Payment
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
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'process_refund', 'clear_pending']:
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

    @action(detail=True, methods=['post'], url_path='clear-pending')
    @transaction.atomic
    def clear_pending(self, request, pk=None):
        """
        Clear pending dues by recording a cash payment for the remaining amount.
        """
        try:
            enrollment = Enrollment.objects.select_for_update().get(id=pk, is_deleted=False)
        except Enrollment.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Enrollment not found.'}
            }, status=status.HTTP_404_NOT_FOUND)

        if enrollment.pending_amount <= 0:
            return Response({
                'success': False,
                'error': {'message': 'No pending amount to clear.'}
            }, status=status.HTTP_400_BAD_REQUEST)

        payment_mode = (request.data.get('payment_mode') or 'CASH').upper()
        if payment_mode not in ['CASH', 'ONLINE']:
            return Response({
                'success': False,
                'error': {'message': 'Invalid payment mode. Use CASH or ONLINE.'}
            }, status=status.HTTP_400_BAD_REQUEST)

        pending_amount = enrollment.pending_amount

        payment = Payment.objects.create(
            enrollment=enrollment,
            amount=pending_amount,
            payment_date=timezone.now().date(),
            payment_mode=payment_mode,
            status='SUCCESS',
            recorded_by=request.user,
            notes='Due clearance adjustment from dashboard'
        )

        enrollment.paid_amount += pending_amount
        enrollment.pending_amount = 0
        enrollment.save()

        return Response({
            'success': True,
            'message': f'Dues cleared for enrollment {enrollment.enrollment_id}.',
            'payment_id': payment.id
        }, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Enrollment deletion is disabled. Use process-refund action instead."""
        return Response({
            'success': False,
            'message': 'Please use the refund action to delete enrollments.'
        }, status=status.HTTP_403_FORBIDDEN)
    @action(detail=True, methods=['get'], url_path='download-id-card')
    def download_id_card(self, request, pk=None):
        """Generate/serve student ID card PDF directly from backend response."""
        enrollment = self.get_object()
        student = enrollment.student
        
        # Security check
        if request.user.role == 'STUDENT':
            user_student = getattr(request.user, 'student_profile', None)
            if not user_student or student != user_student:
                return Response({'success': False, 'error': {'message': 'Access denied.'}}, status=403)
        
        try:
            # 1. Serve stored file directly if available
            if enrollment.id_card:
                try:
                    enrollment.id_card.open('rb')
                    stored_content = enrollment.id_card.read()
                    enrollment.id_card.close()
                    response = HttpResponse(stored_content, content_type='application/pdf')
                    response['Content-Disposition'] = f'inline; filename="ID_{student.student_id}_{enrollment.id}.pdf"'
                    return response
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
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
            except Exception:
                # Fallback: Serve raw
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=True, methods=['get'], url_path='download-receipt')
    def download_receipt(self, request, pk=None):
        """Standardized receipt download served directly by backend."""
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
        
        student_code = str(getattr(enrollment.student, 'student_id', payment.id) or payment.id).lower()
        filename = f"receipt_{student_code}.pdf"
            
        # 1. Serve stored file directly if available
        if payment.receipt_pdf:
            try:
                payment.receipt_pdf.open('rb')
                stored_content = payment.receipt_pdf.read()
                payment.receipt_pdf.close()
                response = HttpResponse(stored_content, content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                return response
            except Exception:
                pass

        # 2. Unified Receipt Generation
        from utils.receipts import generate_receipt_pdf
        try:
            pdf_content = generate_receipt_pdf(payment)
            
            # 3. Store and serve directly
            from django.core.files.base import ContentFile
            payment.receipt_pdf.save(filename, ContentFile(pdf_content), save=True)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response
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

    @action(detail=False, methods=['get'], url_path='subject-wise-report')
    def subject_wise_report(self, request):
        """Get subject-wise student list with enrollment and payment status."""
        from apps.subjects.models import Subject
        from django.db.models import Count, Q, Sum, Case, When, DecimalField
        
        if request.user.role not in ['ADMIN', 'STAFF', 'ACCOUNTANT']:
            return Response({'error': 'Access denied'}, status=403)
        
        subjects = Subject.objects.filter(
            is_active=True,
            is_deleted=False,
            enrollments__isnull=False
        ).distinct().order_by('name')
        
        report_data = []
        
        for subject in subjects:
            enrollments = Enrollment.objects.filter(
                subject=subject,
                is_deleted=False,
                status='ACTIVE'
            ).select_related('student', 'student__user').order_by('student__name')
            
            subject_total_students = enrollments.count()
            subject_total_fee = enrollments.aggregate(
                total=Sum('total_fee', default=0)
            )['total']
            subject_paid = enrollments.aggregate(
                paid=Sum('paid_amount', default=0)
            )['paid']
            
            students = []
            for enr in enrollments:
                students.append({
                    'student_name': enr.student.name,
                    'student_id': enr.student.student_id,
                    'enrollment_id': enr.enrollment_id,
                    'batch_time': enr.batch_time,
                    'total_fee': str(enr.total_fee),
                    'paid_amount': str(enr.paid_amount),
                    'pending_amount': str(enr.pending_amount),
                    'payment_status': enr.payment_status,
                    'enrollment_date': enr.enrollment_date.isoformat(),
                })
            
            report_data.append({
                'subject_name': subject.name,
                'subject_fee': str(subject.current_fee.fee_amount if subject.current_fee else 0),
                'total_students': subject_total_students,
                'total_fees': str(subject_total_fee),
                'total_paid': str(subject_paid),
                'total_pending': str(subject_total_fee - subject_paid),
                'students': students
            })
        
        return Response({
            'success': True,
            'total_subjects': len(report_data),
            'report': report_data
        })

    @action(detail=False, methods=['get'], url_path='id-cards-report')
    def id_cards_report(self, request):
        """Get all registered students with ID card download data, organized by date."""
        if request.user.role not in ['ADMIN', 'STAFF', 'ACCOUNTANT']:
            return Response({'error': 'Access denied'}, status=403)
        
        enrollments = Enrollment.objects.filter(
            is_deleted=False,
            status='ACTIVE'
        ).select_related('student', 'subject', 'student__user').order_by('-created_at')
        
        report_data = []
        for enr in enrollments:
            # Determine payment type
            payment = enr.payments.filter(status__in=['SUCCESS', 'PENDING_CONFIRMATION']).first()
            payment_mode = 'OFFLINE' if payment and payment.payment_mode in ['CASH', 'CHEQUE'] else 'ONLINE'
            
            report_data.append({
                'student_name': enr.student.name,
                'student_id': enr.student.student_id,
                'enrollment_id': enr.enrollment_id,
                'phone': enr.student.phone or 'N/A',
                'subject': enr.subject.name,
                'batch_time': enr.batch_time,
                'payment_mode': payment_mode,
                'payment_status': enr.payment_status,
                'enrollment_date': enr.enrollment_date.isoformat(),
                'created_at': enr.created_at.isoformat(),
                'download_url': f'/api/v1/enrollments/{enr.id}/download-id-card/'
            })
        
        return Response({
            'success': True,
            'total_records': len(report_data),
            'report': report_data
        })

    @action(detail=False, methods=['get'], url_path='bulk-download-id-cards')
    def bulk_download_id_cards(self, request):
        """Administrative action to download multiple ID cards in a single PDF."""
        if request.user.role not in ['ADMIN', 'STAFF', 'ACCOUNTANT']:
            return Response({'error': 'Access denied'}, status=403)
        
        subject_id = request.query_params.get('subject_id')
        batch_time = request.query_params.get('batch_time')
        payment_mode = request.query_params.get('payment_mode') # ONLINE or OFFLINE
        
        enrollments = Enrollment.objects.filter(is_deleted=False, status='ACTIVE')
        
        if subject_id:
            enrollments = enrollments.filter(subject_id=subject_id)
        if batch_time and batch_time != 'ALL':
            enrollments = enrollments.filter(batch_time=batch_time)
            
        # Filter by payment mode if specified
        if payment_mode:
            from apps.payments.models import Payment
            if payment_mode.upper() == 'ONLINE':
                valid_enrollment_ids = Payment.objects.filter(
                    status='SUCCESS',
                    payment_mode='ONLINE'
                ).values_list('enrollment_id', flat=True)
            else:
                valid_enrollment_ids = Payment.objects.filter(
                    status='SUCCESS',
                    payment_mode='CASH'
                ).values_list('enrollment_id', flat=True)
            
            enrollments = enrollments.filter(id__in=valid_enrollment_ids)

        enrollments = enrollments.select_related('student', 'subject', 'student__user').order_by('student__name')
        
        if not enrollments.exists():
            return Response({'success': False, 'error': {'message': 'No matching enrollments found for the selected filters'}}, status=400)
        
        try:
            from utils.id_cards import generate_bulk_id_cards_pdf
            pdf_content = generate_bulk_id_cards_pdf(list(enrollments))
            
            filename = f"Bulk_ID_Cards_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'], url_path='fee-receipts-report')
    def fee_receipts_report(self, request):
        """Get all student-wise fee receipts with detailed payment information."""
        if request.user.role not in ['ADMIN', 'STAFF', 'ACCOUNTANT']:
            return Response({'error': 'Access denied'}, status=403)
        
        from apps.students.models import Student
        
        students = Student.objects.filter(
            is_deleted=False
        ).prefetch_related(
            'enrollments__subject',
            'enrollments__payments'
        ).order_by('name')
        
        report_data = []
        for student in students:
            enrollments = student.enrollments.filter(
                is_deleted=False,
                status='ACTIVE'
            ).select_related('subject').order_by('created_at')
            
            if not enrollments.exists():
                continue
            
            student_total_fee = sum(float(e.total_fee) for e in enrollments)
            student_total_paid = sum(float(e.paid_amount) for e in enrollments)
            
            enrollments_list = []
            for enr in enrollments:
                payment = enr.payments.filter(
                    status__in=['SUCCESS', 'PENDING_CONFIRMATION']
                ).order_by('-created_at').first()
                
                enrollments_list.append({
                    'subject': enr.subject.name,
                    'enrollment_id': enr.enrollment_id,
                    'batch_time': enr.batch_time,
                    'total_fee': str(enr.total_fee),
                    'paid_amount': str(enr.paid_amount),
                    'pending_amount': str(enr.pending_amount),
                    'payment_status': enr.payment_status,
                    'payment_date': payment.created_at.date().isoformat() if payment else None,
                    'payment_mode': payment.payment_mode if payment else 'PENDING',
                })
            
            report_data.append({
                'student_name': student.name,
                'student_id': student.student_id,
                'phone': student.phone or 'N/A',
                'email': student.email or 'N/A',
                'total_subjects': len(enrollments_list),
                'total_fees': str(student_total_fee),
                'total_paid': str(student_total_paid),
                'total_pending': str(student_total_fee - student_total_paid),
                'enrollment_date': student.enrollment_date.isoformat(),
                'enrollments': enrollments_list,
                'receipt_download_url': f'/api/v1/students/{student.id}/download-consolidated-receipt/'
            })
        
        return Response({
            'success': True,
            'total_students': len(report_data),
            'report': report_data
        })


from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse

import csv
from .models import Payment
from .serializers import PaymentSerializer, PaymentCreateSerializer, PaymentListSerializer
from apps.enrollments.models import Enrollment
from utils.permissions import IsStaffAccountantOrAdmin
from utils.pagination import StandardResultsSetPagination
from utils.receipts import generate_receipt_pdf
from utils.reports import generate_pdf_report
try:
    from apps.payments.razorpay_views import get_student_pending_fees as original_get_student_pending_fees
except ImportError:
    original_get_student_pending_fees = None

from apps.students.utils import get_or_repair_student

class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for recording and managing payments.
    """
    queryset = Payment.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['payment_id', 'receipt_number', 'enrollment__student__name', 'transaction_id']
    ordering_fields = ['payment_date', 'created_at', 'amount']
    
    def get_permissions(self):
        if self.action in ['my_payments', 'download_receipt', 'student_initiate_offline']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsStaffAccountantOrAdmin()]
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'student_initiate_offline':
            return PaymentCreateSerializer
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == 'STUDENT':
            student = getattr(self.request.user, 'student_profile', None)
            if student:
                queryset = queryset.filter(enrollment__student=student)
            else:
                queryset = queryset.none()
        
        # Admin filters
        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(enrollment__student_id=student_id)
            
        enrollment_id = self.request.query_params.get('enrollment_id')
        if enrollment_id:
            queryset = queryset.filter(enrollment_id=enrollment_id)
            
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Search filter for student name, subject name, or receipt number
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(enrollment__student__name__icontains=search) |
                Q(enrollment__subject__name__icontains=search) |
                Q(receipt_number__icontains=search)
            )
        
        # Payment mode filter
        payment_mode = self.request.query_params.get('payment_mode')
        if payment_mode:
            queryset = queryset.filter(payment_mode=payment_mode)
        
        # Date range filters
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
            
        return queryset.select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date', '-created_at')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Staff/Admin recording offline payments directly."""
        if request.user.role == 'STUDENT':
            return Response({
                'success': False,
                'error': {'message': 'Students cannot record payments directly. Use student_initiate_offline.'}
            }, status=status.HTTP_403_FORBIDDEN)
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        enrollment = Enrollment.objects.select_for_update().get(id=serializer.validated_data['enrollment_id'])
        
        payment = Payment.objects.create(
            enrollment=enrollment,
            amount=serializer.validated_data['amount'],
            payment_date=serializer.validated_data['payment_date'],
            payment_mode=serializer.validated_data['payment_mode'],
            transaction_id=serializer.validated_data.get('transaction_id', ''),
            notes=serializer.validated_data.get('notes', ''),
            recorded_by=request.user,
            status='SUCCESS' # Direct recordings are always SUCCESS
        )
        
        # Update enrollment amounts
        enrollment.paid_amount += payment.amount
        enrollment.pending_amount -= payment.amount
        enrollment.save()
        
        return Response({
            'success': True,
            'message': 'Payment recorded successfully.',
            'data': PaymentSerializer(payment).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='student-initiate-offline')
    @transaction.atomic
    def student_initiate_offline(self, request):
        """Students initiating Cash payments for fee master to confirm."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        enrollment = Enrollment.objects.get(id=serializer.validated_data['enrollment_id'])
        
        # Security check: Ensure student owns the enrollment
        if request.user.role == 'STUDENT':
            student = getattr(request.user, 'student_profile', None)
            if not student or enrollment.student != student:
                return Response({
                    'success': False,
                    'error': {'message': 'Access denied to this enrollment.'}
                }, status=status.HTTP_403_FORBIDDEN)
        
        payment = Payment.objects.create(
            enrollment=enrollment,
            amount=serializer.validated_data['amount'],
            payment_date=serializer.validated_data['payment_date'],
            payment_mode=serializer.validated_data['payment_mode'],
            notes=serializer.validated_data.get('notes', ''),
            status='PENDING_CONFIRMATION'
        )
        
        return Response({
            'success': True,
            'message': 'Offline payment request submitted. Awaiting admin confirmation.',
            'data': PaymentSerializer(payment).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='confirm')
    @transaction.atomic
    def confirm_payment(self, request, pk=None):
        """Admin/Staff confirming an offline payment request."""
        payment = self.get_object()
        
        if payment.status != 'PENDING_CONFIRMATION':
            return Response({
                'success': False,
                'error': {'message': f'Cannot confirm payment with status {payment.status}.'}
            }, status=status.HTTP_400_BAD_REQUEST)
            
        enrollment = Enrollment.objects.select_for_update().get(id=payment.enrollment_id)
        
        # Update payment
        payment.status = 'SUCCESS'
        payment.recorded_by = request.user
        payment.save() # receipt_number generated here on success
        
        # Update enrollment
        enrollment.paid_amount += payment.amount
        enrollment.pending_amount -= payment.amount
        enrollment.save()
        
        # --- NEW: Automated Document Generation for Counter Workflow ---
        receipt_url = None
        id_card_url = None
        
        try:
            # 1. Generate Receipt
            from utils.receipts import generate_receipt_pdf
            from django.core.files.base import ContentFile
            
            pdf_content = generate_receipt_pdf(payment)
            filename = f"Receipt_{payment.receipt_number}.pdf"
            payment.receipt_pdf.save(filename, ContentFile(pdf_content), save=True)
            receipt_url = payment.receipt_pdf.url
            
            # 2. Generate ID Card
            from utils.id_cards import generate_id_card_pdf
            card_content = generate_id_card_pdf(enrollment)
            card_filename = f"ID_Card_{enrollment.enrollment_id}.pdf"
            enrollment.id_card.save(card_filename, ContentFile(card_content), save=True)
            id_card_url = enrollment.id_card.url
            
        except Exception as e:
            # log the error but don't fail the confirmation
            logger.error(f"Failed to auto-generate docs during confirm: {str(e)}")
        
        return Response({
            'success': True,
            'message': f'Payment {payment.payment_id} confirmed.',
            'data': {
                **PaymentSerializer(payment).data,
                'receipt_url': receipt_url,
                'id_card_url': id_card_url
            }
        })

    @action(detail=True, methods=['get'], url_path='download_receipt')
    def download_receipt(self, request, pk=None):
        """Download receipt as PDF for successful payments (Optimized for Cloudinary)."""
        payment = self.get_object()
        if payment.status != 'SUCCESS':
            if payment.payment_mode in ['CASH', 'CHEQUE']:
                payment.status = 'SUCCESS'
                payment.save()
            else:
                return Response({
                    'success': False,
                    'error': {'message': f'Receipt is not available for status: {payment.status}.'}
                }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 1. Permanent Storage Check (Cloudinary)
            if payment.receipt_pdf:
                try:
                    from django.http import HttpResponseRedirect
                    return HttpResponseRedirect(payment.receipt_pdf.url)
                except Exception:
                    pass # Fallback to generation if URL fails

            # 2. Unified Design Generation
            from utils.receipts import generate_receipt_pdf
            pdf_content = generate_receipt_pdf(payment)
            filename = f"Receipt_{payment.receipt_number or payment.id}.pdf"
            
            # 3. Persist to Cloudinary
            try:
                from django.core.files.base import ContentFile
                payment.receipt_pdf.save(filename, ContentFile(pdf_content), save=True)
                # Redirect to the newly saved Cloudinary URL
                from django.http import HttpResponseRedirect
                return HttpResponseRedirect(payment.receipt_pdf.url)
            except Exception as storage_err:
                # Fallback: Serve the raw PDF content if storage fails
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response

        except Exception as e:
            return Response({'success': False, 'error': {'message': f'Generation Error: {str(e)}'}}, status=500)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"ERROR generating receipt: {str(e)}\n{error_trace}")
            try:
                with open('incoming_debug.log', 'a') as f:
                    f.write(f"ERROR generating receipt for payment pk={pk}:\n{error_trace}\n")
            except:
                pass
            return Response({
                'success': False,
                'error': {'message': f'Failed to generate receipt: {str(e)}'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='my-payments')
    def my_payments(self, request):
        """Get payment history for the logged-in student with Ultra-Strict Healing and Transparency."""
        student = get_or_repair_student(request)
        
        # Diagnostic Headers
        headers = {
            'X-Student-Healed': str(getattr(request, '_student_healed', False)),
            'X-User-Role': request.user.role if request.user else 'ANONYMOUS',
            'X-User-ID': str(request.user.id) if request.user else 'NONE'
        }
        
        if not student:
            # BYPASS: Return 200 OK but with linked: false
            return Response({
                'success': True, 
                'linked': False,
                'error': {'message': 'Student profile not found or repair failed'}
            }, status=200, headers=headers)
            
        payments = Payment.objects.filter(enrollment__student=student, is_deleted=False)
        page = self.paginate_queryset(payments)
        
        if page is not None:
            serializer = PaymentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = PaymentListSerializer(payments, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Get summary statistics for payments (Admin or Student)."""
        from django.db.models import Sum
        
        # If user is a student, show their specific stats or repair link
        if request.user.role == 'STUDENT':
            student = get_or_repair_student(request)
            if not student:
                return Response({'success': False, 'error': 'Profile missing'}, status=403)
            
            # Student-specific dashboard stats
            # (Note: Frontend usually calls analytics/student-stats instead)
            pass

        # Admin collection stats
        total_paid = Payment.objects.filter(status='SUCCESS', is_deleted=False).aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Total pending from all enrollments
        total_pending = Enrollment.objects.filter(is_deleted=False, status='ACTIVE').aggregate(Sum('pending_amount'))['pending_amount__sum'] or 0
        
        return Response({
            'success': True,
            'data': {
                'total_paid': float(total_paid),
                'total_pending': float(total_pending),
                'total_transactions': Payment.objects.filter(is_deleted=False).count()
            }
        })

    @action(detail=False, methods=['get'], url_path='student/pending-fees')
    def student_pending_fees(self, request):
        """Bridge to the student pending fees logic from razorpay_views."""
        if not original_get_student_pending_fees:
             return Response({'success': False, 'error': 'Razorpay module not loaded'}, status=500)
             
        response = original_get_student_pending_fees(request._request)
        
        # Inject diagnostic headers if possible
        if hasattr(response, 'headers'):
            response.headers['X-Student-Healed'] = str(getattr(request, '_student_healed', False))
            response.headers['X-User-Role'] = request.user.role if request.user else 'ANONYMOUS'
            
        return response

    @action(detail=False, methods=['get'], url_path='export_pending_fees_csv')
    def export_pending_fees_csv(self, request):
        """
        Export a CSV of students with pending fee dues.
        """
        enrollments = Enrollment.objects.filter(
            is_deleted=False, 
            status='ACTIVE',
            pending_amount__gt=0
        ).select_related('student', 'subject').order_by('student__name')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="pending_fees_due_report.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Student Name', 
            'Student ID', 
            'Subject', 
            'Total Fee', 
            'Paid Amount', 
            'Pending Amount', 
            'Status'
        ])
        
        for enr in enrollments:
            writer.writerow([
                enr.student.name,
                enr.student.student_id,
                enr.subject.name,
                f"{float(enr.total_fee):.2f}",
                f"{float(enr.paid_amount):.2f}",
                f"{float(enr.pending_amount):.2f}",
                enr.payment_status
            ])
            
        return response

    @action(detail=False, methods=['get'], url_path='export_transaction_audit_csv')
    def export_transaction_audit_csv(self, request):
        """
        Export a full transaction audit log as CSV.
        """
        payments = Payment.objects.filter(is_deleted=False).select_related(
            'enrollment__student', 
            'recorded_by'
        ).order_by('-payment_date', '-created_at')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="payment_transaction_audit.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Payment ID', 
            'Receipt No', 
            'Student Name', 
            'Date', 
            'Mode', 
            'Amount', 
            'Status', 
            'Transaction ID',
            'Recorded By'
        ])
        
        for p in payments:
            writer.writerow([
                p.payment_id,
                p.receipt_number or 'N/A',
                p.enrollment.student.name,
                p.payment_date.strftime('%d/%m/%y'),
                p.payment_mode,
                f"{float(p.amount):.2f}",
                p.get_status_display(),
                p.transaction_id or 'N/A',
                p.recorded_by.get_full_name() if p.recorded_by else 'System/Student'
            ])
            
        return response
    @action(detail=False, methods=['get'], url_path='export_pending_fees_pdf')
    def export_pending_fees_pdf(self, request):
        """Export a PDF of students with pending fee dues."""
        try:
            enrollments = Enrollment.objects.filter(
                is_deleted=False, 
                status='ACTIVE',
                pending_amount__gt=0
            ).select_related('student', 'subject').order_by('student__name')
            
            headers = ['Student Name', 'ID', 'Subject', 'Total', 'Paid', 'Pending']
            data = []
            
            for enr in enrollments:
                data.append([
                    enr.student.name,
                    enr.student.student_id,
                    enr.subject.name,
                    f"Rs. {float(enr.total_fee):.2f}",
                    f"Rs. {float(enr.paid_amount):.2f}",
                    f"Rs. {float(enr.pending_amount):.2f}"
                ])
                
            pdf_content = generate_pdf_report("Pending Fees Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="pending_fees_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'], url_path='export_transaction_audit_pdf')
    def export_transaction_audit_pdf(self, request):
        """Export a PDF transaction audit log."""
        try:
            payments = Payment.objects.filter(is_deleted=False).select_related(
                'enrollment__student'
            ).order_by('-payment_date', '-created_at')[:100] # Limit to last 100 for PDF
            
            headers = ['Date', 'Receipt', 'Student', 'Mode', 'Amount', 'Status']
            data = []
            
            for p in payments:
                data.append([
                    p.payment_date.strftime('%d/%m/%y'),
                    p.receipt_number or 'N/A',
                    p.enrollment.student.name,
                    p.payment_mode,
                    f"Rs. {float(p.amount):.2f}",
                    p.get_status_display()
                ])
                
            pdf_content = generate_pdf_report("Transaction Audit Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="transaction_audit_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Q, Prefetch
from django.http import HttpResponse
from datetime import datetime, timedelta
from django.utils import timezone

from apps.payments.models import Payment
from apps.enrollments.models import Enrollment
from apps.students.models import Student
from apps.subjects.models import Subject

from .serializers import PaymentReportSerializer, EnrollmentReportSerializer
from .utils import (
    generate_payment_report_csv,
    generate_enrollment_report_csv,
    generate_payment_report_pdf,
    generate_enrollment_report_pdf,
)


class ReportsViewSet(viewsets.ViewSet):
    """
    API endpoints for generating reports
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'], url_path='payments')
    def payment_report(self, request):
        """
        Get Payment Report with optional date range filter
        
        Query Parameters:
            - start_date: ISO format date (YYYY-MM-DD) - default: 30 days ago
            - end_date: ISO format date (YYYY-MM-DD) - default: today
        """
        try:
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Set defaults
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Convert to datetime for filtering
            start_datetime = timezone.make_aware(
                datetime.combine(start_date, datetime.min.time())
            )
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, datetime.max.time())
            )
            
            # Query payments with date filter - remove duplicates by receipt_number
            payments = Payment.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-created_at').distinct('receipt_number')
            
            # Serialize data
            serializer = PaymentReportSerializer(payments, many=True)
            
            return Response({
                'success': True,
                'count': payments.count(),
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'data': serializer.data,
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='enrollments')
    def enrollment_report(self, request):
        """
        Get Student Enrollment Report with optional date range filter
        
        Query Parameters:
            - start_date: ISO format date (YYYY-MM-DD) - default: 30 days ago
            - end_date: ISO format date (YYYY-MM-DD) - default: today
        """
        try:
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Set defaults
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Convert to datetime for filtering
            start_datetime = timezone.make_aware(
                datetime.combine(start_date, datetime.min.time())
            )
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, datetime.max.time())
            )
            
            # Query enrollments with date filter - remove duplicates by id (primary key)
            enrollments = Enrollment.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            ).select_related('student', 'subject').order_by('-created_at').distinct('id')
            
            # Serialize data
            serializer = EnrollmentReportSerializer(enrollments, many=True)
            
            return Response({
                'success': True,
                'count': enrollments.count(),
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'data': serializer.data,
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='payments/export/csv')
    def export_payment_report_csv(self, request):
        """
        Export Payment Report as CSV
        
        Query Parameters:
            - start_date: ISO format date (YYYY-MM-DD)
            - end_date: ISO format date (YYYY-MM-DD)
        """
        try:
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Set defaults
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Convert to datetime for filtering
            start_datetime = timezone.make_aware(
                datetime.combine(start_date, datetime.min.time())
            )
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, datetime.max.time())
            )
            
            # Query payments - remove duplicates
            payments = Payment.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-created_at').distinct('receipt_number')
            
            # Serialize data
            serializer = PaymentReportSerializer(payments, many=True)
            
            # Generate CSV
            csv_content = generate_payment_report_csv(serializer.data)
            
            # Return as file download
            response = HttpResponse(csv_content, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="payment_report_{start_date}_{end_date}.csv"'
            return response
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='enrollments/export/csv')
    def export_enrollment_report_csv(self, request):
        """
        Export Enrollment Report as CSV
        
        Query Parameters:
            - start_date: ISO format date (YYYY-MM-DD)
            - end_date: ISO format date (YYYY-MM-DD)
        """
        try:
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Set defaults
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Convert to datetime for filtering
            start_datetime = timezone.make_aware(
                datetime.combine(start_date, datetime.min.time())
            )
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, datetime.max.time())
            )
            
            # Query enrollments - remove duplicates
            enrollments = Enrollment.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            ).select_related('student', 'subject').order_by('-created_at').distinct('id')
            
            # Serialize data
            serializer = EnrollmentReportSerializer(enrollments, many=True)
            
            # Generate CSV
            csv_content = generate_enrollment_report_csv(serializer.data)
            
            # Return as file download
            response = HttpResponse(csv_content, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="enrollment_report_{start_date}_{end_date}.csv"'
            return response
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='payments/export/pdf')
    def export_payment_report_pdf(self, request):
        """
        Export Payment Report as PDF
        
        Query Parameters:
            - start_date: ISO format date (YYYY-MM-DD)
            - end_date: ISO format date (YYYY-MM-DD)
        """
        try:
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Set defaults
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Convert to datetime for filtering
            start_datetime = timezone.make_aware(
                datetime.combine(start_date, datetime.min.time())
            )
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, datetime.max.time())
            )
            
            # Query payments - remove duplicates
            payments = Payment.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-created_at').distinct('receipt_number')
            
            # Serialize data
            serializer = PaymentReportSerializer(payments, many=True)
            
            # Generate PDF
            pdf_buffer = generate_payment_report_pdf(serializer.data)
            
            # Return as file download
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="payment_report_{start_date}_{end_date}.pdf"'
            return response
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='enrollments/export/pdf')
    def export_enrollment_report_pdf(self, request):
        """
        Export Enrollment Report as PDF
        
        Query Parameters:
            - start_date: ISO format date (YYYY-MM-DD)
            - end_date: ISO format date (YYYY-MM-DD)
        """
        try:
            # Get date range from query params
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Set defaults
            if not end_date:
                end_date = timezone.now().date()
            else:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if not start_date:
                start_date = end_date - timedelta(days=30)
            else:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            # Convert to datetime for filtering
            start_datetime = timezone.make_aware(
                datetime.combine(start_date, datetime.min.time())
            )
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, datetime.max.time())
            )
            
            # Query enrollments - remove duplicates
            enrollments = Enrollment.objects.filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime
            ).select_related('student', 'subject').order_by('-created_at').distinct('id')
            
            # Serialize data
            serializer = EnrollmentReportSerializer(enrollments, many=True)
            
            # Generate PDF
            pdf_buffer = generate_enrollment_report_pdf(serializer.data)
            
            # Return as file download
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="enrollment_report_{start_date}_{end_date}.pdf"'
            return response
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

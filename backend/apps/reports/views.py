from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from utils.permissions import IsStaffAccountantOrAdmin
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
    generate_subject_student_report_csv,
    generate_payment_report_pdf,
    generate_enrollment_report_pdf,
    generate_subject_student_report_pdf,
    generate_attendance_sheet_csv,
    generate_attendance_sheet_pdf,
)


class ReportsViewSet(viewsets.ViewSet):
    """
    API endpoints for generating reports
    """
    permission_classes = [IsAuthenticated, IsStaffAccountantOrAdmin]

    def _base_active_enrollment_queryset(self):
        return Enrollment.objects.filter(
            is_deleted=False,
            student__is_deleted=False,
            student__status='ACTIVE',
            subject__is_deleted=False,
            subject__is_active=True,
        )

    def _base_active_payment_queryset(self):
        return Payment.objects.filter(
            is_deleted=False,
            enrollment__is_deleted=False,
            enrollment__student__is_deleted=False,
            enrollment__student__status='ACTIVE',
            enrollment__subject__is_deleted=False,
            enrollment__subject__is_active=True,
        )

    def _get_date_range(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        if not start_date:
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        start_datetime = timezone.make_aware(
            datetime.combine(start_date, datetime.min.time())
        )
        end_datetime = timezone.make_aware(
            datetime.combine(end_date, datetime.max.time())
        )

        return start_date, end_date, start_datetime, end_datetime

    @action(detail=False, methods=['get'], url_path='payments')
    def payment_report(self, request):
        """
        Get Payment Report with optional date range filter
        
        Query Parameters:
            - start_date: ISO format date (YYYY-MM-DD) - default: 30 days ago
            - end_date: ISO format date (YYYY-MM-DD) - default: today
        """
        try:
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)

            payments = self._base_active_payment_queryset().filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime,
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
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)

            enrollments = self._base_active_enrollment_queryset().filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime,
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
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)

            payments = self._base_active_payment_queryset().filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime,
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
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)

            enrollments = self._base_active_enrollment_queryset().filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime,
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
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)

            payments = self._base_active_payment_queryset().filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime,
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
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)

            enrollments = self._base_active_enrollment_queryset().filter(
                created_at__gte=start_datetime,
                created_at__lte=end_datetime,
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

    @action(detail=False, methods=['get'], url_path='subject-students')
    def subject_student_report(self, request):
        """
        Get Subject-wise Total Students Report
        """
        try:
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)
            
            report_data = []
            all_subjects = Subject.objects.filter(is_deleted=False, is_active=True).order_by('name')
            
            for sub in all_subjects:
                count = Enrollment.objects.filter(
                    subject=sub,
                    is_deleted=False,
                    created_at__gte=start_datetime,
                    created_at__lte=end_datetime
                ).values('student').distinct().count()
                
                report_data.append({
                    'subject_name': sub.name,
                    'student_count': count
                })
            
            return Response({
                'success': True,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'data': report_data,
                'total_unique_students': sum(item['student_count'] for item in report_data)
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='subject-students/export/csv')
    def export_subject_student_report_csv(self, request):
        """Export Subject-wise Total Students Report as CSV"""
        try:
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)
            
            report_data = []
            all_subjects = Subject.objects.filter(is_deleted=False, is_active=True).order_by('name')
            for sub in all_subjects:
                count = Enrollment.objects.filter(
                    subject=sub,
                    is_deleted=False,
                    created_at__gte=start_datetime,
                    created_at__lte=end_datetime
                ).values('student').distinct().count()
                report_data.append({'subject_name': sub.name, 'student_count': count})
            
            csv_content = generate_subject_student_report_csv(report_data)
            response = HttpResponse(csv_content, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="subject_students_report_{start_date}_{end_date}.csv"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='subject-students/export/pdf')
    def export_subject_student_report_pdf(self, request):
        """Export Subject-wise Total Students Report as PDF"""
        try:
            start_date, end_date, start_datetime, end_datetime = self._get_date_range(request)
            
            report_data = []
            all_subjects = Subject.objects.filter(is_deleted=False, is_active=True).order_by('name')
            for sub in all_subjects:
                count = Enrollment.objects.filter(
                    subject=sub,
                    is_deleted=False,
                    created_at__gte=start_datetime,
                    created_at__lte=end_datetime
                ).values('student').distinct().count()
                report_data.append({'subject_name': sub.name, 'student_count': count})
            
            pdf_buffer = generate_subject_student_report_pdf(report_data)
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="subject_students_report_{start_date}_{end_date}.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='attendance-sheet')
    def attendance_sheet(self, request):
        """Get Attendance Sheet data"""
        try:
            subject_id = request.query_params.get('subject_id')
            batch = request.query_params.get('batch')
            
            if not subject_id:
                return Response({'success': False, 'error': 'Subject ID is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            subject = Subject.objects.get(id=subject_id, is_deleted=False)
            enrollments = Enrollment.objects.filter(
                subject=subject,
                is_deleted=False,
                student__is_deleted=False,
                student__status='ACTIVE'
            )
            
            if batch:
                enrollments = enrollments.filter(batch_time=batch)
                
            enrollments = enrollments.select_related('student').order_by('student__name')
            
            report_data = []
            for enr in enrollments:
                report_data.append({
                    'student_name': str(enr.student.name).upper(),
                    'student_id': enr.student.student_id
                })
                
            return Response({
                'success': True,
                'subject_name': subject.name,
                'batch_time': batch or 'ALL BATCHES',
                'rows': report_data
            })
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='attendance-sheet/export/csv')
    def export_attendance_sheet_csv(self, request):
        """Export Attendance Sheet as CSV"""
        try:
            subject_id = request.query_params.get('subject_id')
            batch = request.query_params.get('batch')
            
            subject = Subject.objects.get(id=subject_id, is_deleted=False)
            enrollments = Enrollment.objects.filter(
                subject=subject,
                is_deleted=False,
                student__is_deleted=False,
                student__status='ACTIVE'
            )
            if batch: enrollments = enrollments.filter(batch_time=batch)
            enrollments = enrollments.select_related('student').order_by('student__name')
            
            report_data = []
            for enr in enrollments:
                report_data.append({
                    'student_name': str(enr.student.name).upper(),
                    'student_id': enr.student.student_id
                })
                
            csv_content = generate_attendance_sheet_csv(report_data, subject.name, batch or 'ALL BATCHES')
            response = HttpResponse(csv_content, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="attendance_sheet_{subject.name}_{batch or "all"}.csv"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='attendance-sheet/export/pdf')
    def export_attendance_sheet_pdf(self, request):
        """Export Attendance Sheet as PDF (Legal Landscape)"""
        try:
            subject_id = request.query_params.get('subject_id')
            batch = request.query_params.get('batch')
            
            subject = Subject.objects.get(id=subject_id, is_deleted=False)
            enrollments = Enrollment.objects.filter(
                subject=subject,
                is_deleted=False,
                student__is_deleted=False,
                student__status='ACTIVE'
            )
            if batch: enrollments = enrollments.filter(batch_time=batch)
            enrollments = enrollments.select_related('student').order_by('student__name')
            
            report_data = []
            for enr in enrollments:
                report_data.append({
                    'student_name': str(enr.student.name).upper(),
                    'student_id': enr.student.student_id
                })
                
            pdf_buffer = generate_attendance_sheet_pdf(report_data, subject.name, batch or 'ALL BATCHES')
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="attendance_sheet_{subject.name}_{batch or "all"}.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

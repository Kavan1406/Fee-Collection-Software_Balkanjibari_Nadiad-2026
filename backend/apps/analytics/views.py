from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, F, Q, Prefetch
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta, datetime
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import csv

from apps.students.models import Student
from apps.students.utils import get_or_repair_student
from apps.payments.models import Payment
from apps.enrollments.models import Enrollment
from apps.subjects.models import Subject
from utils.permissions import IsStaffOrAdmin, IsAccountantOrAdmin, IsStaffAccountantOrAdmin
from utils.reports import generate_pdf_report

class AnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for Analytics and Reporting.
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['student_stats', 'payment_status_distribution']:
            return [IsAuthenticated()]
        # Allow Staff and Accountants to see dashboard analytics
        return [IsAuthenticated(), IsStaffAccountantOrAdmin()]

    def _build_subject_batch_enrollment_report(self, subject_id, batch, start_date_str, end_date_str):
        filters = {
            'is_deleted': False,
            'subject_id': int(subject_id)
        }

        if batch and batch.upper() != 'ALL':
            filters['batch_time'] = batch

        enrollments = Enrollment.objects.filter(**filters).select_related('student', 'subject').prefetch_related(
            Prefetch(
                'payments',
                queryset=Payment.objects.filter(is_deleted=False).order_by('-created_at'),
                to_attr='report_payments'
            )
        ).order_by('batch_time', 'student__name')

        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            enrollments = enrollments.filter(enrollment_date__gte=start_date)
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            enrollments = enrollments.filter(enrollment_date__lte=end_date)

        rows = []
        summary_stats = {
            'total_students': 0,
            'total_fees': 0,
            'total_enrolled': 0,
            'total_paid': 0,
            'total_pending': 0,
            'online_payments': 0,
            'offline_payments': 0,
        }

        for idx, enr in enumerate(enrollments, start=1):
            student = enr.student
            subject = enr.subject
            payments = list(getattr(enr, 'report_payments', []))
            latest_payment = payments[0] if payments else None

            total_fee = float(enr.total_fee or 0)
            paid_amount = float(enr.paid_amount or 0)
            pending_amount = float(enr.pending_amount or max(total_fee - paid_amount, 0))

            if latest_payment:
                payment_mode = latest_payment.payment_mode or 'N/A'
                payment_status = enr.payment_status or latest_payment.status or 'N/A'
                payment_id = latest_payment.payment_id or 'N/A'
                payment_reference_no = latest_payment.transaction_id or latest_payment.razorpay_payment_id or latest_payment.payment_id or 'N/A'
                receipt_id = latest_payment.receipt_number or 'N/A'
                payment_date = latest_payment.payment_date.strftime('%d-%m-%Y') if getattr(latest_payment, 'payment_date', None) else 'N/A'
                payment_time = latest_payment.payment_time.strftime('%I:%M %p') if getattr(latest_payment, 'payment_time', None) else 'N/A'
            else:
                payment_mode = 'N/A'
                payment_status = enr.payment_status or 'PAYMENT PENDING'
                payment_id = 'N/A'
                payment_reference_no = 'N/A'
                receipt_id = 'N/A'
                payment_date = 'N/A'
                payment_time = 'N/A'

            payment_mode_display = 'Online' if payment_mode == 'ONLINE' else ('Offline' if payment_mode == 'CASH' else 'N/A')
            login_id = (
                getattr(student, 'login_username', None)
                or getattr(getattr(student, 'user', None), 'username', None)
                or (student.student_id if student else 'N/A')
            )
            password_masked = '***ENCRYPTED***' if getattr(student, 'login_password_hint', None) else 'N/A'

            rows.append({
                'sr_no': idx,
                'enrollment_id': enr.enrollment_id,
                'student_name': student.name if student else 'N/A',
                'student_id': student.student_id if student else 'N/A',
                'login_id': login_id,
                'password': password_masked,
                'subject_name': subject.name if subject else 'N/A',
                'batch_time': enr.batch_time or 'N/A',
                'enrollment_date': enr.enrollment_date.strftime('%d-%m-%Y') if enr.enrollment_date else 'N/A',
                'total_fee': total_fee,
                'paid_amount': paid_amount,
                'pending_amount': max(pending_amount, 0),
                'payment_mode': payment_mode_display,
                'payment_status': payment_status,
                'payment_id': payment_id,
                'payment_reference_no': payment_reference_no,
                'phone_number': student.phone if student else 'N/A',
                'receipt_id': receipt_id,
                'payment_date': payment_date,
                'payment_time': payment_time,
            })

            summary_stats['total_students'] += 1
            summary_stats['total_fees'] += total_fee
            summary_stats['total_enrolled'] += total_fee
            summary_stats['total_paid'] += paid_amount
            summary_stats['total_pending'] += max(pending_amount, 0)
            if payment_mode == 'ONLINE':
                summary_stats['online_payments'] += paid_amount
            elif payment_mode == 'CASH':
                summary_stats['offline_payments'] += paid_amount

        subject = Subject.objects.filter(id=int(subject_id), is_deleted=False).first()
        subject_name = subject.name if subject else 'Selected Subject'

        return {
            'subject_id': int(subject_id),
            'subject_name': subject_name,
            'batch': batch,
            'start_date': start_date_str or 'All',
            'end_date': end_date_str or 'All',
            'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'rows': rows,
            'summary': summary_stats,
        }

    @action(detail=False, methods=['get'], url_path='student-stats')
    def student_stats(self, request):
        """
        Get dashboard statistics for the logged-in student with Ultra-Strict Healing logic.
        """
        try:
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
                    'error': {'message': 'Student profile not linked (Repair Failed)'}
                }, status=status.HTTP_200_OK, headers=headers)
                
            enrollments = Enrollment.objects.filter(student=student, is_deleted=False).select_related('subject')
            
            stats = enrollments.aggregate(
                total_fee=Sum('total_fee'),
                total_paid=Sum('paid_amount'),
                total_pending=Sum('pending_amount'),
                subjects_count=Count('id')
            )
            
            # Format subject list
            subjects_data = []
            for e in enrollments:
                # Try to get duration from the first active fee structure
                fee_struct = e.subject.fee_structures.filter(is_active=True).first()
                duration = fee_struct.duration if fee_struct else "Monthly"
                
                subjects_data.append({
                    'name': e.subject.name,
                    'activity_type': e.subject.activity_type,
                    'duration': duration,
                    'total_fee': float(e.total_fee or 0),
                    'paid_amount': float(e.paid_amount or 0),
                    'pending_amount': float(e.pending_amount or 0),
                    'status': e.payment_status,
                    'enrollment_id': e.enrollment_id,
                    'id': e.id
                })
            
            try:
                photo_url = student.photo.url if student.photo and hasattr(student.photo, 'url') else None
            except Exception:
                photo_url = None
                
            return Response({
                'success': True,
                'data': {
                    'student_name': student.name,
                    'student_id': student.student_id,
                    'photo': photo_url,
                    'gender': student.gender,
                    'phone': student.phone,
                    'email': student.email,
                    'area': student.area,
                    'address': student.address,
                    'enrollment_date': student.enrollment_date,
                    'subjects_count': stats['subjects_count'] or 0,
                    'total_fee': float(stats['total_fee'] or 0),
                    'total_paid': float(stats['total_paid'] or 0),
                    'total_pending': float(stats['total_pending'] or 0),
                    'enrolled_subjects': subjects_data
                }
            })
        except Exception as e:
            return Response({
                'success': False, 
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_date_range(self, period):
        now = timezone.now()
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start_date = now - timedelta(days=now.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'month':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'quarter':
            month = now.month - (now.month - 1) % 3
            start_date = now.replace(month=month, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == 'year':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else: # default to month
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start_date

    def _build_date_wise_fee_report(self, start_date, end_date):
        """Build date-wise fee report payload for a date range (inclusive)."""
        base_qs = Payment.objects.filter(
            is_deleted=False,
            status='SUCCESS',
            payment_date__range=(start_date, end_date)
        )

        daily_aggregates = base_qs.values('payment_date').annotate(
            online_total=Sum('amount', filter=Q(payment_mode='ONLINE')),
            offline_total=Sum('amount', filter=~Q(payment_mode='ONLINE')),
            total_fees=Sum('amount')
        ).order_by('payment_date')

        by_date = {
            item['payment_date']: {
                'online_fees': float(item['online_total'] or 0),
                'offline_fees': float(item['offline_total'] or 0),
                'total_fees': float(item['total_fees'] or 0),
            }
            for item in daily_aggregates
        }

        previous_total = Payment.objects.filter(
            is_deleted=False,
            status='SUCCESS',
            payment_date__lt=start_date
        ).aggregate(total=Sum('amount'))['total'] or 0

        running_cumulative = float(previous_total)
        rows = []
        current_date = start_date
        while current_date <= end_date:
            day_data = by_date.get(current_date, {
                'online_fees': 0.0,
                'offline_fees': 0.0,
                'total_fees': 0.0,
            })
            running_cumulative += day_data['total_fees']

            rows.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'online_fees': day_data['online_fees'],
                'offline_fees': day_data['offline_fees'],
                'total_fees': day_data['total_fees'],
                'cumulative_total': float(running_cumulative),
            })
            current_date += timedelta(days=1)

        grand_total = sum(row['total_fees'] for row in rows)

        return {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'rows': rows,
            'grand_total': float(grand_total),
            'final_cumulative_total': float(running_cumulative),
        }

    @action(detail=False, methods=['get'])
    def date_wise_fee_report(self, request):
        """Return date-wise fee collection report data for a selected date range."""
        try:
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            else:
                end_date = timezone.localdate()

            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                start_date = end_date

            if start_date > end_date:
                return Response({'success': False, 'error': {'message': 'Start date cannot be after end date.'}}, status=400)

            report = self._build_date_wise_fee_report(start_date, end_date)

            return Response({
                'success': True,
                'data': report
            })
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_date_wise_fee_report_csv(self, request):
        """Export date-wise fee report as CSV for a date range."""
        try:
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            else:
                end_date = timezone.localdate()

            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                start_date = end_date

            if start_date > end_date:
                return Response({'success': False, 'error': {'message': 'Start date cannot be after end date.'}}, status=400)

            report = self._build_date_wise_fee_report(start_date, end_date)
            file_date = f"{report['start_date']}-to-{report['end_date']}"

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="fee-report-{file_date}.csv"'

            writer = csv.writer(response)
            writer.writerow(['Date', 'Online Fees', 'Offline Fees', 'Total Fees'])
            for row in report['rows']:
                writer.writerow([
                    row['date'],
                    f"{row['online_fees']:.2f}",
                    f"{row['offline_fees']:.2f}",
                    f"{row['total_fees']:.2f}",
                ])
            writer.writerow([])
            writer.writerow(['Grand Total', f"{report['grand_total']:.2f}"])
            writer.writerow(['Final Cumulative Total', f"{report['final_cumulative_total']:.2f}"])

            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_date_wise_fee_report_pdf(self, request):
        """Export date-wise fee report as PDF for a date range."""
        try:
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            else:
                end_date = timezone.localdate()

            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            else:
                start_date = end_date

            if start_date > end_date:
                return Response({'success': False, 'error': {'message': 'Start date cannot be after end date.'}}, status=400)

            report = self._build_date_wise_fee_report(start_date, end_date)
            file_date = f"{report['start_date']}-to-{report['end_date']}"

            headers = ['Date', 'Online Fees', 'Offline Fees', 'Total Fees']
            data = []
            for row in report['rows']:
                data.append([
                    row['date'],
                    f"Rs. {row['online_fees']:,.2f}",
                    f"Rs. {row['offline_fees']:,.2f}",
                    f"Rs. {row['total_fees']:,.2f}",
                ])
            data.append([])
            data.append(['Grand Total', '', '', f"Rs. {report['grand_total']:,.2f}"])
            data.append(['Final Cumulative Total', '', '', f"Rs. {report['final_cumulative_total']:,.2f}"])

            pdf_content = generate_pdf_report(f"Date-wise Fee Report ({report['start_date']} to {report['end_date']})", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="fee-report-{file_date}.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def subject_wise_daily_fee_report(self, request):
        """Return subject-wise fee collection for a selected date."""
        try:
            date_str = request.query_params.get('date')
            if date_str:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                target_date = timezone.localdate()

            subject_rows = Payment.objects.filter(
                is_deleted=False,
                status='SUCCESS',
                payment_date=target_date
            ).values(
                'enrollment__subject__id',
                'enrollment__subject__name'
            ).annotate(
                total_students=Count('enrollment__student_id', distinct=True),
                total_fees_collected=Sum('amount')
            ).order_by('enrollment__subject__name')

            rows = [
                {
                    'subject_name': item['enrollment__subject__name'] or 'Unknown Subject',
                    'total_students': int(item['total_students'] or 0),
                    'total_fees_collected': float(item['total_fees_collected'] or 0),
                }
                for item in subject_rows
            ]

            grand_total = sum(row['total_fees_collected'] for row in rows)

            return Response({
                'success': True,
                'data': {
                    'date': target_date.strftime('%Y-%m-%d'),
                    'rows': rows,
                    'grand_total': float(grand_total),
                }
            })
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def subject_batch_enrollment_report(self, request):
        """Return subject-wise, batch-wise enrollment data for a date range."""
        try:
            subject_id = request.query_params.get('subject_id')
            batch = request.query_params.get('batch', 'ALL')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            if not subject_id:
                return Response({'success': False, 'error': {'message': 'subject_id is required.'}}, status=400)
            report = self._build_subject_batch_enrollment_report(subject_id, batch, start_date_str, end_date_str)

            return Response({
                'success': True,
                'data': report,
            })
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_subject_batch_enrollment_report_csv(self, request):
        """Export subject/batch enrollment report as CSV."""
        try:
            subject_id = request.query_params.get('subject_id')
            batch = request.query_params.get('batch', 'ALL')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            if not subject_id:
                return Response({'success': False, 'error': {'message': 'subject_id is required.'}}, status=400)
            report = self._build_subject_batch_enrollment_report(subject_id, batch, start_date_str, end_date_str)

            file_date = timezone.now().strftime('%Y-%m-%d')
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="subject_batch_enrollment_report_{subject_id}_{batch}_{file_date}.csv"'
            writer = csv.writer(response)

            writer.writerow(['Sr. No.', 'Enrollment ID', 'Student Name', 'Student ID', 'Login ID', 'Password', 'Subject Name', 'Batch Name', 'Enrollment Date', 'Total Fee', 'Paid Amount', 'Pending Amount', 'Payment Mode', 'Payment Status', 'Payment ID', 'Payment Ref. No', 'Phone Number', 'Receipt ID', 'Payment Date', 'Payment Time'])
            for row in report['rows']:
                writer.writerow([
                    row.get('sr_no', ''),
                    row.get('enrollment_id', ''),
                    row.get('student_name', ''),
                    row.get('student_id', ''),
                    row.get('login_id', ''),
                    row.get('password', ''),
                    row.get('subject_name', ''),
                    row.get('batch_time', ''),
                    row.get('enrollment_date', ''),
                    f"{float(row.get('total_fee', 0) or 0):.2f}",
                    f"{float(row.get('paid_amount', 0) or 0):.2f}",
                    f"{float(row.get('pending_amount', 0) or 0):.2f}",
                    row.get('payment_mode', ''),
                    row.get('payment_status', ''),
                    row.get('payment_id', ''),
                    row.get('payment_reference_no', ''),
                    row.get('phone_number', ''),
                    row.get('receipt_id', ''),
                    row.get('payment_date', ''),
                    row.get('payment_time', ''),
                ])

            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_subject_batch_enrollment_report_pdf(self, request):
        """Export subject/batch enrollment report as PDF."""
        try:
            subject_id = request.query_params.get('subject_id')
            batch = request.query_params.get('batch', 'ALL')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            if not subject_id:
                return Response({'success': False, 'error': {'message': 'subject_id is required.'}}, status=400)
            report = self._build_subject_batch_enrollment_report(subject_id, batch, start_date_str, end_date_str)
            file_date = timezone.now().strftime('%Y-%m-%d')

            headers = ['Sr. No.', 'Enrollment ID', 'Student Name', 'Student ID', 'Login ID', 'Password', 'Subject Name', 'Batch Name', 'Enrollment Date', 'Total Fee', 'Paid Amount', 'Pending Amount', 'Payment Mode', 'Payment Status', 'Payment ID', 'Payment Ref. No', 'Phone Number', 'Receipt ID', 'Payment Date', 'Payment Time']
            data = []
            for row in report['rows']:
                data.append([
                    row.get('sr_no', ''),
                    row.get('enrollment_id', ''),
                    row.get('student_name', ''),
                    row.get('student_id', ''),
                    row.get('login_id', ''),
                    row.get('password', ''),
                    row.get('subject_name', ''),
                    row.get('batch_time', ''),
                    row.get('enrollment_date', ''),
                    f"₹{float(row.get('total_fee', 0) or 0):,.2f}",
                    f"₹{float(row.get('paid_amount', 0) or 0):,.2f}",
                    f"₹{float(row.get('pending_amount', 0) or 0):,.2f}",
                    row.get('payment_mode', ''),
                    row.get('payment_status', ''),
                    row.get('payment_id', ''),
                    row.get('payment_reference_no', ''),
                    row.get('phone_number', ''),
                    row.get('receipt_id', ''),
                    row.get('payment_date', ''),
                    row.get('payment_time', ''),
                ])

            title = f"Subject-wise Batch-wise Enrollment Report ({report['subject_name']})"
            pdf_content = generate_pdf_report(title, headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="subject_batch_enrollment_report_{subject_id}_{batch}_{file_date}.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_subject_wise_daily_fee_report_csv(self, request):
        """Export subject-wise daily fee report as CSV."""
        try:
            date_str = request.query_params.get('date')
            if date_str:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                target_date = timezone.localdate()

            subject_rows = Payment.objects.filter(
                is_deleted=False,
                status='SUCCESS',
                payment_date=target_date
            ).values(
                'enrollment__subject__name'
            ).annotate(
                total_students=Count('enrollment__student_id', distinct=True),
                total_fees_collected=Sum('amount')
            ).order_by('enrollment__subject__name')

            response = HttpResponse(content_type='text/csv')
            file_date = target_date.strftime('%Y-%m-%d')
            response['Content-Disposition'] = f'attachment; filename="subject-report-{file_date}.csv"'

            writer = csv.writer(response)
            writer.writerow(['Subject Name', 'Total Students', 'Total Fees Collected'])

            grand_total = 0
            if not subject_rows:
                writer.writerow(['No records found', 0, '0.00'])
            else:
                for item in subject_rows:
                    total_fees = float(item['total_fees_collected'] or 0)
                    grand_total += total_fees
                    writer.writerow([
                        item['enrollment__subject__name'] or 'Unknown Subject',
                        int(item['total_students'] or 0),
                        f"{total_fees:.2f}",
                    ])

            writer.writerow([])
            writer.writerow(['Grand Total', '', f"{grand_total:.2f}"])

            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_subject_wise_daily_fee_report_pdf(self, request):
        """Export subject-wise daily fee report as PDF."""
        try:
            date_str = request.query_params.get('date')
            if date_str:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                target_date = timezone.localdate()

            subject_rows = Payment.objects.filter(
                is_deleted=False,
                status='SUCCESS',
                payment_date=target_date
            ).values(
                'enrollment__subject__name'
            ).annotate(
                total_students=Count('enrollment__student_id', distinct=True),
                total_fees_collected=Sum('amount')
            ).order_by('enrollment__subject__name')

            headers = ['Subject Name', 'Total Students', 'Total Fees Collected']
            data = []
            grand_total = 0

            if not subject_rows:
                data.append(['No records found', '0', 'Rs. 0.00'])
            else:
                for item in subject_rows:
                    total_fees = float(item['total_fees_collected'] or 0)
                    grand_total += total_fees
                    data.append([
                        item['enrollment__subject__name'] or 'Unknown Subject',
                        str(int(item['total_students'] or 0)),
                        f"Rs. {total_fees:,.2f}",
                    ])

            data.append([])
            data.append(['Grand Total', '', f"Rs. {grand_total:,.2f}"])

            file_date = target_date.strftime('%Y-%m-%d')
            pdf_content = generate_pdf_report(f"Subject-wise Daily Fee Report ({file_date})", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="subject-report-{file_date}.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Get high-level dashboard statistics with period filtering.
        """
        try:
            period = request.query_params.get('period', 'month')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            if start_date_str and end_date_str:
                from django.utils.dateparse import parse_date
                start_date = timezone.make_aware(datetime.combine(parse_date(start_date_str), datetime.min.time()))
                end_date = timezone.make_aware(datetime.combine(parse_date(end_date_str), datetime.max.time()))
            else:
                start_date = self.get_date_range(period)
                end_date = timezone.now()
            
            # Unified Revenue & Growth Query
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).date()
            
            # Identify period bounds for comparison
            prev_start_date = None
            prev_end_date = None
            if start_date_str and end_date_str:
                duration = end_date - start_date
                prev_end_date = start_date - timedelta(days=1)
                prev_start_date = prev_end_date - duration
            elif period == 'month':
                prev_end_date = start_date - timedelta(seconds=1)
                prev_start_date = prev_end_date.replace(day=1)
            elif period == 'week':
                prev_end_date = start_date - timedelta(seconds=1) # End of previous week
                prev_start_date = prev_end_date - timedelta(days=6) # Start of previous week
            elif period == 'today':
                prev_end_date = start_date - timedelta(seconds=1)
                prev_start_date = prev_end_date.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == 'quarter':
                # Calculate previous quarter
                current_month = start_date.month
                prev_quarter_month = current_month - 3
                if prev_quarter_month <= 0:
                    prev_quarter_month += 12
                    prev_quarter_year = start_date.year - 1
                else:
                    prev_quarter_year = start_date.year
                
                prev_start_date = start_date.replace(year=prev_quarter_year, month=prev_quarter_month, day=1)
                prev_end_date = prev_start_date + timedelta(days=90) # Approx 3 months
                prev_end_date = prev_end_date.replace(day=1) - timedelta(seconds=1) # End of prev quarter
            elif period == 'year':
                prev_start_date = start_date.replace(year=start_date.year - 1)
                prev_end_date = end_date.replace(year=end_date.year - 1)

            revenue_stats = Payment.objects.filter(is_deleted=False, status='SUCCESS').aggregate(
                total_revenue=Sum('amount', filter=Q(payment_date__range=(start_date.date(), end_date.date())) if start_date_str and end_date_str else Q(payment_date__gte=start_date.date()) if period != 'all' else Q()),
                today_revenue=Sum('amount', filter=Q(payment_date=today_start)),
                prev_revenue=Sum('amount', filter=Q(payment_date__range=(prev_start_date.date(), prev_end_date.date())) if prev_start_date and prev_end_date else Q(pk=None))
            )

            total_revenue = revenue_stats['total_revenue'] or 0
            today_revenue = revenue_stats['today_revenue'] or 0
            prev_period_revenue = revenue_stats['prev_revenue'] or 0

            # Combined Student Stats
            student_stats = Student.objects.filter(is_deleted=False).aggregate(
                total_active=Count('id', filter=Q(status='ACTIVE')),
                new_this_period=Count('id', filter=Q(created_at__range=(start_date, end_date)) if start_date_str and end_date_str else Q(created_at__gte=start_date))
            )

            total_students = student_stats['total_active']
            new_students_this_period = student_stats['new_this_period']

            # Total Pending Fees (current snapshot)
            total_pending = Enrollment.objects.filter(
                is_deleted=False, 
                status='ACTIVE'
            ).aggregate(total=Sum('pending_amount'))['total'] or 0

            if prev_period_revenue > 0:
                growth_rate = ((total_revenue - prev_period_revenue) / prev_period_revenue) * 100
            else:
                growth_rate = 100 if total_revenue > 0 else 0

            return Response({
                'success': True,
                'data': {
                    'total_students': total_students,
                    'total_revenue': float(total_revenue),
                    'total_pending': float(total_pending),
                    'today_revenue': float(today_revenue),
                    'growth_rate': round(growth_rate, 1),
                    'new_students_this_month': new_students_this_period
                }
            })
        except Exception as e:
            return Response({
                'success': False, 
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def payment_trends(self, request):
        """
        Get payment collection trends (last 6 months).
        """
        try:
            # Get last 6 months
            six_months_ago = timezone.now() - timedelta(days=180)
            
            trends = Payment.objects.filter(
                is_deleted=False,
                payment_date__gte=six_months_ago
            ).annotate(
                month=TruncMonth('payment_date')
            ).values('month').annotate(
                total=Sum('amount')
            ).order_by('month')
            
            data = []
            for item in trends:
                data.append({
                    'month': item['month'].strftime('%b'),
                    'full_date': item['month'].strftime('%Y-%m'),
                    'amount': float(item['total'])
                })
                
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({
                'success': False, 
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def subject_distribution(self, request):
        """
        Get student distribution by subject.
        Shows ALL subjects including those with 0 enrollments.
        """
        try:
            # Get all subjects
            all_subjects = Subject.objects.filter(is_deleted=False)
            
            # Get enrollment counts per subject
            enrollment_counts = Enrollment.objects.filter(
                is_deleted=False,
                status='ACTIVE'
            ).values(
                'subject__id'
            ).annotate(
                count=Count('id')
            )
            
            # Create a dictionary for quick lookup
            counts_dict = {item['subject__id']: item['count'] for item in enrollment_counts}
            
            # Calculate total for percentages
            total_enrollments = sum(counts_dict.values())
            
            data = []
            colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042']
            
            for index, subject in enumerate(all_subjects):
                count = counts_dict.get(subject.id, 0)
                data.append({
                    'name': subject.name,
                    'value': count,
                    'percentage': round((count / total_enrollments * 100), 1) if total_enrollments > 0 else 0,
                    'fill': colors[index % len(colors)]
                })
            
            # Sort by count descending for better visualization
            data.sort(key=lambda x: x['value'], reverse=True)
            
            # Limit to top 10 subjects for popular subjects graph
            data = data[:10]
                
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({
                'success': False, 
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def payment_status_distribution(self, request):
        """
        Get distribution of paid vs pending amounts with optional filtering.
        """
        try:
            period = request.query_params.get('period', 'month')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            # Revenue query for distribution
            revenue_query = Payment.objects.filter(is_deleted=False)
            if start_date_str and end_date_str:
                from django.utils.dateparse import parse_date
                start_date = parse_date(start_date_str)
                end_date = parse_date(end_date_str)
                revenue_query = revenue_query.filter(payment_date__range=(start_date, end_date))
            elif period != 'all' and period != 'month':
                 start_date = self.get_date_range(period)
                 revenue_query = revenue_query.filter(payment_date__gte=start_date)

            total_revenue = revenue_query.aggregate(total=Sum('amount'))['total'] or 0
            
            # Pending query (Snapshot of students created/active in range)
            pending_query = Enrollment.objects.filter(is_deleted=False, status='ACTIVE')
            if start_date_str and end_date_str:
                pending_query = pending_query.filter(created_at__date__range=(start_date, end_date))
            elif period != 'all':
                start_date = self.get_date_range(period)
                pending_query = pending_query.filter(created_at__gte=start_date)
            
            total_pending = pending_query.aggregate(total=Sum('pending_amount'))['total'] or 0
            
            total_receivable = float(total_revenue) + float(total_pending)
            
            data = [
                {
                    'name': 'Collected',
                    'value': float(total_revenue),
                    'percentage': round((float(total_revenue) / float(total_receivable) * 100), 1) if total_receivable > 0 else 0,
                    'color': '#22c55e'
                },
                {
                    'name': 'Pending',
                    'value': float(total_pending),
                    'percentage': round((float(total_pending) / float(total_receivable) * 100), 1) if total_receivable > 0 else 0,
                    'color': '#ef4444'
                }
            ]
            
            return Response({'success': True, 'data': data})
        except Exception as e:
            return Response({
                'success': False, 
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    @action(detail=False, methods=['get'])
    def export_monthly_collection_csv(self, request):
        """
        Detailed Monthly Fee Collection Report.
        - Month / Year
        - Total amount collected
        - Number of payments
        - Online vs Offline payments
        - Growth / decline compared to previous month
        """
        try:
            # Aggregate by month
            monthly_stats = Payment.objects.filter(is_deleted=False).annotate(
                month=TruncMonth('payment_date')
            ).values('month').annotate(
                total_amount=Sum('amount'),
                payment_count=Count('id'),
                online_total=Sum('amount', filter=Q(payment_mode__in=['UPI', 'CARD', 'BANK'])),
                offline_total=Sum('amount', filter=Q(payment_mode='CASH'))
            ).order_by('month')
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="monthly_fee_collection_report.csv"'
            
            writer = csv.writer(response)
            writer.writerow([
                'Month/Year', 
                'Total Collected', 
                'Payment Count', 
                'Online Payments', 
                'Offline Payments', 
                'Growth (%)'
            ])
            
            # For growth calculation
            prev_total = 0
            
            for item in monthly_stats:
                total = item['total_amount'] or 0
                online = item['online_total'] or 0
                offline = item['offline_total'] or 0
                
                # Growth Calculation
                if prev_total > 0:
                    growth = ((total - prev_total) / prev_total) * 100
                else:
                    growth = 0
                
                writer.writerow([
                    item['month'].strftime('%B %Y'),
                    f"{float(total):.2f}",
                    item['payment_count'],
                    f"{float(online):.2f}",
                    f"{float(offline):.2f}",
                    f"{float(growth):.1f}%"
                ])
                prev_total = total
                
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_daily_collection_csv(self, request):
        """Daily Fee Collection CSV."""
        try:
            date_str = request.query_params.get('date', timezone.now().strftime('%Y-%m-%d'))
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            payments = Payment.objects.filter(payment_date=target_date, is_deleted=False).values('payment_mode').annotate(
                total=Sum('amount'), count=Count('id'))
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="daily_collection_{date_str}.csv"'
            writer = csv.writer(response)
            writer.writerow(['Payment Mode', 'Transaction Count', 'Total Amount'])
            for p in payments:
                writer.writerow([p['payment_mode'], p['count'], f"{float(p['total'] or 0):.2f}"])
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_daily_collection_pdf(self, request):
        """Daily Fee Collection Report."""
        try:
            date_str = request.query_params.get('date', timezone.now().strftime('%Y-%m-%d'))
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            payments = Payment.objects.filter(
                payment_date=target_date,
                is_deleted=False
            ).values('payment_mode').annotate(
                total=Sum('amount'),
                count=Count('id')
            )
            
            headers = ['Payment Mode', 'Transaction Count', 'Total Amount']
            data = []
            grand_total = 0
            
            for p in payments:
                total = float(p['total'] or 0)
                data.append([p['payment_mode'], str(p['count']), f"Rs. {total:,.2f}"])
                grand_total += total
                
            data.append(['GRAND TOTAL', '', f"Rs. {grand_total:,.2f}"])
            
            pdf_content = generate_pdf_report(f"Daily Collection: {date_str}", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="daily_collection_{date_str}.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_enrollment_report_csv(self, request):
        """Student Enrollment Report CSV - Subject distribution and trends."""
        try:
            enrollments = Enrollment.objects.filter(is_deleted=False).select_related('student', 'subject').order_by('-enrollment_date')
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename=\"enrollment_report.csv\"'
            writer = csv.writer(response)
            writer.writerow(['Student ID', 'Student Name', 'Subject', 'Batch Time', 'Enrollment Date', 'Total Fee', 'Paid', 'Pending', 'Status'])
            
            for e in enrollments:
                writer.writerow([
                    e.student.student_id,
                    e.student.name,
                    e.subject.name,
                    e.batch_time,
                    e.enrollment_date.strftime('%Y-%m-%d'),
                    f"{float(e.total_fee):.2f}",
                    f"{float(e.paid_amount):.2f}",
                    f"{float(e.pending_amount):.2f}",
                    e.status
                ])
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_enrollment_report_pdf(self, request):
        """Student Enrollment Report PDF - Subject distribution and trends."""
        try:
            enrollments = Enrollment.objects.filter(is_deleted=False).select_related('student', 'subject').order_by('-enrollment_date')
            
            headers = ['Student ID', 'Name', 'Subject', 'Batch', 'Date', 'Fee', 'Paid', 'Pending']
            data = []
            
            for e in enrollments:
                data.append([
                    e.student.student_id,
                    e.student.name,
                    e.subject.name,
                    e.batch_time,
                    e.enrollment_date.strftime('%Y-%m-%d'),
                    f"Rs. {float(e.total_fee):,.2f}",
                    f"Rs. {float(e.paid_amount):,.2f}",
                    f"Rs. {float(e.pending_amount):,.2f}"
                ])
            
            pdf_content = generate_pdf_report("Student Enrollment Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename=\"enrollment_report.pdf\"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)


    @action(detail=False, methods=['get'])
    def export_subject_report_pdf(self, request):
        """Detailed Subject-wise Report."""
        try:
            subjects = Subject.objects.filter(is_deleted=False)
            headers = ['Subject', 'Enrolled', 'Paid', 'Pending', 'Total Revenue']
            data = []
            
            for sub in subjects:
                enrolls = Enrollment.objects.filter(subject=sub, is_deleted=False)
                stats = enrolls.aggregate(
                    total=Count('id'),
                    paid=Sum('paid_amount'),
                    pending=Sum('pending_amount'),
                    revenue=Sum('total_fee')
                )
                data.append([
                    sub.name, 
                    str(stats['total']),
                    f"Rs. {float(stats['paid'] or 0):,.2f}",
                    f"Rs. {float(stats['pending'] or 0):,.2f}",
                    f"Rs. {float(stats['revenue'] or 0):,.2f}"
                ])
                
            pdf_content = generate_pdf_report("Subject-wise Detailed Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="subject_wise_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_monthly_collection_pdf(self, request):
        """PDF version of collection report."""
        try:
            monthly_stats = Payment.objects.filter(is_deleted=False).annotate(
                month=TruncMonth('payment_date')
            ).values('month').annotate(
                total_amount=Sum('amount'),
                payment_count=Count('id'),
                online_total=Sum('amount', filter=Q(payment_mode__in=['UPI', 'CARD', 'BANK'])),
                offline_total=Sum('amount', filter=Q(payment_mode='CASH'))
            ).order_by('month')
            
            headers = ['Month/Year', 'Total Collected', 'Count', 'Online', 'Offline', 'Growth']
            data = []
            prev_total = 0
            
            for item in monthly_stats:
                total = float(item['total_amount'] or 0)
                online = float(item['online_total'] or 0)
                offline = float(item['offline_total'] or 0)
                growth = f"{((total - float(prev_total)) / float(prev_total)) * 100:.1f}%" if prev_total > 0 else "0.0%"
                
                data.append([
                    item['month'].strftime('%B %Y'),
                    f"Rs. {float(total):,.2f}",
                    str(item['payment_count']),
                    f"Rs. {float(online):,.2f}",
                    f"Rs. {float(offline):,.2f}",
                    growth
                ])
                prev_total = total
                
            pdf_content = generate_pdf_report("Monthly Fee Collection Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="monthly_collection_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_batch_report_pdf(self, request):
        """Batch-wise Statistics Report."""
        try:
            batches = Enrollment.objects.filter(is_deleted=False).values(
                'batch_time', 'subject__name'
            ).annotate(count=Count('id')).order_by('batch_time', 'subject__name')
            
            headers = ['Batch Time', 'Subject', 'Student Count']
            data = []
            for b in batches:
                data.append([b['batch_time'], b['subject__name'], str(b['count'])])
                
            pdf_content = generate_pdf_report("Batch-wise Enrollment Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="batch_wise_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    # ===== NEW REPORTS (Session 12) =====
    
    @action(detail=False, methods=['get'])
    def online_razorpay_report(self, request):
        """Get online Razorpay payments report data."""
        try:
            payments = Payment.objects.filter(
                is_deleted=False,
                payment_mode='ONLINE',
                razorpay_order_id__isnull=False,
                razorpay_order_id__exact=''  # Has razorpay_order_id
            ).exclude(razorpay_order_id='').select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date')
            
            # Alternative: simpler check
            payments = Payment.objects.filter(
                is_deleted=False,
                payment_mode='ONLINE'
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date')
            
            rows = []
            total_amount = 0
            total_count = 0
            
            for p in payments:
                total_amount += float(p.amount or 0)
                total_count += 1
                rows.append({
                    'payment_id': p.payment_id,
                    'student_name': p.enrollment.student.name if p.enrollment else 'N/A',
                    'student_id': p.enrollment.student.student_id if p.enrollment else 'N/A',
                    'subject': p.enrollment.subject.name if p.enrollment and p.enrollment.subject else 'N/A',
                    'amount': float(p.amount or 0),
                    'payment_date': p.payment_date.strftime('%Y-%m-%d'),
                    'status': p.status,
                    'razorpay_order_id': p.razorpay_order_id or 'N/A'
                })
            
            return Response({
                'success': True,
                'data': {
                    'rows': rows,
                    'total_payments': total_count,
                    'total_amount': float(total_amount)
                }
            })
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_online_razorpay_report_csv(self, request):
        """Export online Razorpay payments as CSV."""
        try:
            payments = Payment.objects.filter(
                is_deleted=False,
                payment_mode='ONLINE'
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date')
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="online_razorpay_report.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Payment ID', 'Student Name', 'Student ID', 'Subject', 'Amount', 'Date', 'Status', 'Order ID'])
            
            total_amount = 0
            for p in payments:
                amount = float(p.amount or 0)
                total_amount += amount
                writer.writerow([
                    p.payment_id,
                    p.enrollment.student.name if p.enrollment else 'N/A',
                    p.enrollment.student.student_id if p.enrollment else 'N/A',
                    p.enrollment.subject.name if p.enrollment and p.enrollment.subject else 'N/A',
                    f"{amount:.2f}",
                    p.payment_date.strftime('%Y-%m-%d'),
                    p.status,
                    p.razorpay_order_id or 'N/A'
                ])
            
            writer.writerow([])
            writer.writerow(['TOTAL', '', '', '', f"{total_amount:.2f}"])
            
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_online_razorpay_report_pdf(self, request):
        """Export online Razorpay payments as PDF."""
        try:
            payments = Payment.objects.filter(
                is_deleted=False,
                payment_mode='ONLINE'
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date')
            
            headers = ['Payment ID', 'Student Name', 'Student ID', 'Subject', 'Amount', 'Date', 'Status']
            data = []
            total_amount = 0
            
            for p in payments:
                amount = float(p.amount or 0)
                total_amount += amount
                data.append([
                    p.payment_id,
                    p.enrollment.student.name if p.enrollment else 'N/A',
                    p.enrollment.student.student_id if p.enrollment else 'N/A',
                    p.enrollment.subject.name if p.enrollment and p.enrollment.subject else 'N/A',
                    f"Rs. {amount:,.2f}",
                    p.payment_date.strftime('%Y-%m-%d'),
                    p.status
                ])
            
            data.append([])
            data.append(['TOTAL', '', '', '', f"Rs. {total_amount:,.2f}"])
            
            pdf_content = generate_pdf_report("Online Razorpay Payment Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="online_razorpay_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def online_balkanji_bari_report(self, request):
        """Get all online payments report data (Balkanji Bari online channel)."""
        try:
            payments = Payment.objects.filter(
                is_deleted=False,
                payment_mode='ONLINE'
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date')
            
            rows = []
            total_amount = 0
            total_count = 0
            status_breakdown = {}
            
            for p in payments:
                total_amount += float(p.amount or 0)
                total_count += 1
                
                # Breakdown by status
                status = p.status
                if status not in status_breakdown:
                    status_breakdown[status] = 0
                status_breakdown[status] += float(p.amount or 0)
                
                rows.append({
                    'payment_id': p.payment_id,
                    'student_name': p.enrollment.student.name if p.enrollment else 'N/A',
                    'student_id': p.enrollment.student.student_id if p.enrollment else 'N/A',
                    'subject': p.enrollment.subject.name if p.enrollment and p.enrollment.subject else 'N/A',
                    'amount': float(p.amount or 0),
                    'payment_date': p.payment_date.strftime('%Y-%m-%d'),
                    'status': p.status
                })
            
            return Response({
                'success': True,
                'data': {
                    'rows': rows,
                    'total_payments': total_count,
                    'total_amount': float(total_amount),
                    'status_breakdown': status_breakdown
                }
            })
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_online_balkanji_bari_report_csv(self, request):
        """Export all online payments (Balkanji Bari) as CSV."""
        try:
            payments = Payment.objects.filter(
                is_deleted=False,
                payment_mode='ONLINE'
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date')
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="online_balkanji_bari_report.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Payment ID', 'Student Name', 'Student ID', 'Subject', 'Amount', 'Date', 'Status'])
            
            total_amount = 0
            for p in payments:
                amount = float(p.amount or 0)
                total_amount += amount
                writer.writerow([
                    p.payment_id,
                    p.enrollment.student.name if p.enrollment else 'N/A',
                    p.enrollment.student.student_id if p.enrollment else 'N/A',
                    p.enrollment.subject.name if p.enrollment and p.enrollment.subject else 'N/A',
                    f"{amount:.2f}",
                    p.payment_date.strftime('%Y-%m-%d'),
                    p.status
                ])
            
            writer.writerow([])
            writer.writerow(['TOTAL', '', '', '', f"{total_amount:.2f}"])
            
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_online_balkanji_bari_report_pdf(self, request):
        """Export all online payments (Balkanji Bari) as PDF."""
        try:
            payments = Payment.objects.filter(
                is_deleted=False,
                payment_mode='ONLINE'
            ).select_related('enrollment__student', 'enrollment__subject').order_by('-payment_date')
            
            headers = ['Payment ID', 'Student Name', 'Student ID', 'Subject', 'Amount', 'Date', 'Status']
            data = []
            total_amount = 0
            
            for p in payments:
                amount = float(p.amount or 0)
                total_amount += amount
                data.append([
                    p.payment_id,
                    p.enrollment.student.name if p.enrollment else 'N/A',
                    p.enrollment.student.student_id if p.enrollment else 'N/A',
                    p.enrollment.subject.name if p.enrollment and p.enrollment.subject else 'N/A',
                    f"Rs. {amount:,.2f}",
                    p.payment_date.strftime('%Y-%m-%d'),
                    p.status
                ])
            
            data.append([])
            data.append(['TOTAL', '', '', '', f"Rs. {total_amount:,.2f}"])
            
            pdf_content = generate_pdf_report("Online Balkanji Bari Payment Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="online_balkanji_bari_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def subjectwise_total_report(self, request):
        """Get comprehensive subject-wise statistics report."""
        try:
            subjects = Subject.objects.filter(is_deleted=False)
            
            rows = []
            grand_total_enrollments = 0
            grand_total_fees = 0
            grand_total_paid = 0
            grand_total_pending = 0
            
            for subject in subjects:
                enrollments = Enrollment.objects.filter(subject=subject, is_deleted=False)
                stats = enrollments.aggregate(
                    total_enrollments=Count('id'),
                    total_fees=Sum('total_fee'),
                    total_paid=Sum('paid_amount'),
                    total_pending=Sum('pending_amount')
                )
                
                total_enrollments = stats['total_enrollments'] or 0
                total_fees = float(stats['total_fees'] or 0)
                total_paid = float(stats['total_paid'] or 0)
                total_pending = float(stats['total_pending'] or 0)
                
                grand_total_enrollments += total_enrollments
                grand_total_fees += total_fees
                grand_total_paid += total_paid
                grand_total_pending += total_pending
                
                collection_percentage = (total_paid / total_fees * 100) if total_fees > 0 else 0
                
                rows.append({
                    'subject_name': subject.name,
                    'total_enrollments': total_enrollments,
                    'total_fees': total_fees,
                    'total_paid': total_paid,
                    'total_pending': total_pending,
                    'collection_percentage': round(collection_percentage, 1)
                })
            
            return Response({
                'success': True,
                'data': {
                    'rows': rows,
                    'summary': {
                        'total_subjects': subjects.count(),
                        'grand_total_enrollments': grand_total_enrollments,
                        'grand_total_fees': grand_total_fees,
                        'grand_total_paid': grand_total_paid,
                        'grand_total_pending': grand_total_pending,
                        'overall_collection_percentage': round((grand_total_paid / grand_total_fees * 100) if grand_total_fees > 0 else 0, 1)
                    }
                }
            })
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_subjectwise_total_report_csv(self, request):
        """Export comprehensive subject-wise statistics as CSV."""
        try:
            subjects = Subject.objects.filter(is_deleted=False)
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="subjectwise_total_report.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Subject', 'Total Enrollments', 'Total Fees', 'Total Paid', 'Total Pending', 'Collection %'])
            
            grand_total_enrollments = 0
            grand_total_fees = 0
            grand_total_paid = 0
            grand_total_pending = 0
            
            for subject in subjects:
                enrollments = Enrollment.objects.filter(subject=subject, is_deleted=False)
                stats = enrollments.aggregate(
                    total_enrollments=Count('id'),
                    total_fees=Sum('total_fee'),
                    total_paid=Sum('paid_amount'),
                    total_pending=Sum('pending_amount')
                )
                
                total_enrollments = stats['total_enrollments'] or 0
                total_fees = float(stats['total_fees'] or 0)
                total_paid = float(stats['total_paid'] or 0)
                total_pending = float(stats['total_pending'] or 0)
                
                grand_total_enrollments += total_enrollments
                grand_total_fees += total_fees
                grand_total_paid += total_paid
                grand_total_pending += total_pending
                
                collection_percentage = (total_paid / total_fees * 100) if total_fees > 0 else 0
                
                writer.writerow([
                    subject.name,
                    total_enrollments,
                    f"{total_fees:.2f}",
                    f"{total_paid:.2f}",
                    f"{total_pending:.2f}",
                    f"{collection_percentage:.1f}%"
                ])
            
            writer.writerow([])
            writer.writerow([
                'GRAND TOTAL',
                grand_total_enrollments,
                f"{grand_total_fees:.2f}",
                f"{grand_total_paid:.2f}",
                f"{grand_total_pending:.2f}",
                f"{(grand_total_paid / grand_total_fees * 100) if grand_total_fees > 0 else 0:.1f}%"
            ])
            
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_subjectwise_total_report_pdf(self, request):
        """Export comprehensive subject-wise statistics as PDF."""
        try:
            subjects = Subject.objects.filter(is_deleted=False)
            
            headers = ['Subject', 'Enrollments', 'Total Fees', 'Paid', 'Pending', 'Collection %']
            data = []
            
            grand_total_enrollments = 0
            grand_total_fees = 0
            grand_total_paid = 0
            grand_total_pending = 0
            
            for subject in subjects:
                enrollments = Enrollment.objects.filter(subject=subject, is_deleted=False)
                stats = enrollments.aggregate(
                    total_enrollments=Count('id'),
                    total_fees=Sum('total_fee'),
                    total_paid=Sum('paid_amount'),
                    total_pending=Sum('pending_amount')
                )
                
                total_enrollments = stats['total_enrollments'] or 0
                total_fees = float(stats['total_fees'] or 0)
                total_paid = float(stats['total_paid'] or 0)
                total_pending = float(stats['total_pending'] or 0)
                
                grand_total_enrollments += total_enrollments
                grand_total_fees += total_fees
                grand_total_paid += total_paid
                grand_total_pending += total_pending
                
                collection_percentage = (total_paid / total_fees * 100) if total_fees > 0 else 0
                
                data.append([
                    subject.name,
                    str(total_enrollments),
                    f"Rs. {total_fees:,.2f}",
                    f"Rs. {total_paid:,.2f}",
                    f"Rs. {total_pending:,.2f}",
                    f"{collection_percentage:.1f}%"
                ])
            
            data.append([])
            data.append([
                'GRAND TOTAL',
                str(grand_total_enrollments),
                f"Rs. {grand_total_fees:,.2f}",
                f"Rs. {grand_total_paid:,.2f}",
                f"Rs. {grand_total_pending:,.2f}",
                f"{(grand_total_paid / grand_total_fees * 100) if grand_total_fees > 0 else 0:.1f}%"
            ])
            
            pdf_content = generate_pdf_report("Subject-wise Total Report", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="subjectwise_total_report.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_total_enrollments_pdf(self, request):
        """Detailed Total Enrollments Report."""
        try:
            enrolls = Enrollment.objects.filter(is_deleted=False).select_related('student', 'subject').order_by('-created_at')
            headers = ['Name', 'ID', 'Phone', 'Subject', 'Batch', 'Date']
            data = []
            
            for e in enrolls:
                data.append([
                    e.student.name,
                    e.student.student_id,
                    e.student.phone,
                    e.subject.name,
                    e.batch_time,
                    e.enrollment_date.strftime('%Y-%m-%d')
                ])
                
            pdf_content = generate_pdf_report("Detailed Enrollment List", headers, data)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="detailed_enrollments.pdf"'
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_batch_report_csv(self, request):
        """Batch-wise Statistics CSV."""
        try:
            batches = Enrollment.objects.filter(is_deleted=False).values(
                'batch_time', 'subject__name'
            ).annotate(count=Count('id')).order_by('batch_time', 'subject__name')
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="batch_wise_report.csv"'
            writer = csv.writer(response)
            writer.writerow(['Batch Time', 'Subject', 'Student Count'])
            for b in batches:
                writer.writerow([b['batch_time'], b['subject__name'], b['count']])
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_total_enrollments_csv(self, request):
        """Detailed Total Enrollments CSV."""
        try:
            enrolls = Enrollment.objects.filter(is_deleted=False).select_related('student', 'subject').order_by('-created_at')
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="detailed_enrollments.csv"'
            writer = csv.writer(response)
            writer.writerow(['Name', 'ID', 'Phone', 'Subject', 'Batch', 'Date'])
            for e in enrolls:
                writer.writerow([e.student.name, e.student.student_id, e.student.phone, e.subject.name, e.batch_time, e.enrollment_date.strftime('%Y-%m-%d')])
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    @action(detail=False, methods=['get'])
    def export_time_interval_report_csv(self, request):
        """Report based on entry timings CSV."""
        try:
            start_hour = int(request.query_params.get('start_hour', 9))
            end_hour = int(request.query_params.get('end_hour', 12))
            enrolls = Enrollment.objects.filter(is_deleted=False, created_at__hour__gte=start_hour, created_at__hour__lt=end_hour).select_related('student', 'subject')
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="entry_timing_report.csv"'
            writer = csv.writer(response)
            writer.writerow(['Student Name', 'Subject', 'Batch', 'Entry Time'])
            for e in enrolls:
                writer.writerow([e.student.name, e.subject.name, e.batch_time, e.created_at.strftime('%H:%M:%S')])
            return response
        except Exception as e:
            return Response({'success': False, 'error': {'message': str(e)}}, status=500)

    # ===== Session 14: Comprehensive Admin Analytics =====
    
    @action(detail=False, methods=['get'])
    def admin_dashboard_comprehensive(self, request):
        """
        Comprehensive admin dashboard endpoint - all data in single request
        Includes: students, fees, subjects, payments, trends
        """
        try:
            # 1. STUDENT STATISTICS
            total_students = Student.objects.filter(is_deleted=False).count()
            online_students = Student.objects.filter(is_deleted=False, registration_type='ONLINE').count()
            offline_students = Student.objects.filter(is_deleted=False, registration_type='OFFLINE').count()
            active_students = Student.objects.filter(is_deleted=False, status='ACTIVE').count()
            
            # Students created in last 30 days
            month_ago = timezone.now() - timedelta(days=30)
            new_students_month = Student.objects.filter(
                is_deleted=False,
                created_at__gte=month_ago
            ).count()
            
            # 2. FEE STATISTICS
            payment_stats = Payment.objects.filter(is_deleted=False).aggregate(
                total_collected=Sum('amount'),
                total_count=Count('id'),
                online_total=Sum('amount', filter=Q(payment_mode='ONLINE')),
                offline_total=Sum('amount', filter=Q(payment_mode__in=['CASH', 'CHEQUE', 'BANK'])),
            )
            
            total_collected = float(payment_stats['total_collected'] or 0)
            total_payments = payment_stats['total_count'] or 0
            online_revenue = float(payment_stats['online_total'] or 0)
            offline_revenue = float(payment_stats['offline_total'] or 0)
            
            # Pending fees (sum of pending_amount from active enrollments)
            total_pending = Enrollment.objects.filter(
                is_deleted=False,
                status='ACTIVE'
            ).aggregate(pending=Sum('pending_amount'))['pending'] or 0
            total_pending = float(total_pending)
            
            # 3. ENROLLMENT STATISTICS
            total_enrollments = Enrollment.objects.filter(is_deleted=False).count()
            active_enrollments = Enrollment.objects.filter(is_deleted=False, status='ACTIVE').count()
            completed_enrollments = Enrollment.objects.filter(is_deleted=False, status='COMPLETED').count()
            
            # Monthly enrollments growth
            enrollments_month = Enrollment.objects.filter(
                is_deleted=False,
                created_at__gte=month_ago
            ).count()
            
            # 4. SUBJECT-WISE DISTRIBUTION
            subject_distribution = Subject.objects.filter(is_deleted=False).values(
                'id', 'name'
            ).annotate(
                enrolled_count=Count('enrollments', filter=Q(enrollments__is_deleted=False)),
                total_revenue=Sum('enrollments__paid_amount', filter=Q(enrollments__is_deleted=False)),
                pending_revenue=Sum('enrollments__pending_amount', filter=Q(enrollments__is_deleted=False)),
            ).order_by('-enrolled_count')[:10]
            
            subject_data = []
            for subject in subject_distribution:
                subject_data.append({
                    'id': subject['id'],
                    'name': subject['name'],
                    'enrolled_count': subject['enrolled_count'] or 0,
                    'total_revenue': float(subject['total_revenue'] or 0),
                    'pending_revenue': float(subject['pending_revenue'] or 0),
                })
            
            # 5. PAYMENT TRENDS (Last 6 months)
            six_months_ago = timezone.now() - timedelta(days=180)
            
            payment_trends = Payment.objects.filter(
                is_deleted=False,
                payment_date__gte=six_months_ago
            ).annotate(
                month=TruncMonth('payment_date')
            ).values('month').annotate(
                total=Sum('amount'),
                count=Count('id')
            ).order_by('month')
            
            trends = []
            for trend in payment_trends:
                if trend['month']:
                    trends.append({
                        'month': trend['month'].strftime('%b %Y'),
                        'amount': float(trend['total'] or 0),
                        'count': trend['count']
                    })
            
            # 6. RECENT ENROLLMENTS
            recent_enrollments = Enrollment.objects.filter(
                is_deleted=False
            ).select_related('student', 'subject').order_by('-created_at')[:10]
            
            recent_enrollment_data = []
            for enrollment in recent_enrollments:
                recent_enrollment_data.append({
                    'student_name': enrollment.student.name,
                    'student_id': enrollment.student.student_id,
                    'subject': enrollment.subject.name,
                    'batch_time': enrollment.batch_time,
                    'enrollment_date': enrollment.enrollment_date.strftime('%Y-%m-%d'),
                    'total_fee': float(enrollment.total_fee or 0),
                    'paid_amount': float(enrollment.paid_amount or 0),
                    'pending_amount': float(enrollment.pending_amount or 0),
                    'status': enrollment.status
                })
            
            # 7. PAYMENT STATUS BREAKDOWN
            today = timezone.now().date()
            today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
            today_end = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.max.time()))
            
            today_payments = Payment.objects.filter(
                is_deleted=False,
                payment_date__range=(today_start, today_end)
            ).aggregate(
                total=Sum('amount'),
                count=Count('id')
            )
            
            today_revenue = float(today_payments['total'] or 0)
            today_payment_count = today_payments['count'] or 0
            
            # 8. COLLECTION EFFICIENCY
            collection_rate = (total_collected / (total_collected + total_pending) * 100) if (total_collected + total_pending) > 0 else 0
            
            return Response({
                'success': True,
                'data': {
                    'timestamp': timezone.now().isoformat(),
                    'students': {
                        'total': total_students,
                        'online': online_students,
                        'offline': offline_students,
                        'active': active_students,
                        'new_this_month': new_students_month,
                    },
                    'fees': {
                        'total_collected': total_collected,
                        'total_pending': total_pending,
                        'total_receivable': total_collected + total_pending,
                        'online_collected': online_revenue,
                        'offline_collected': offline_revenue,
                        'collection_rate_percentage': round(collection_rate, 1),
                    },
                    'payments': {
                        'total_transactions': total_payments,
                        'today_revenue': today_revenue,
                        'today_count': today_payment_count,
                        'average_payment': round(total_collected / total_payments, 2) if total_payments > 0 else 0,
                    },
                    'enrollments': {
                        'total': total_enrollments,
                        'active': active_enrollments,
                        'completed': completed_enrollments,
                        'new_this_month': enrollments_month,
                    },
                    'subjects': subject_data,
                    'trends': trends,
                    'recent_enrollments': recent_enrollment_data,
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def admin_dashboard_summary(self, request):
        """
        Lightweight dashboard summary endpoint (for quick loads)
        Returns only key metrics without detailed data
        """
        try:
            # Quick aggregates with optimized queries
            total_students = Student.objects.filter(is_deleted=False).count()
            total_revenue = Payment.objects.filter(is_deleted=False).aggregate(total=Sum('amount'))['total'] or 0
            pending_fees = Enrollment.objects.filter(is_deleted=False, status='ACTIVE').aggregate(total=Sum('pending_amount'))['total'] or 0
            total_enrollments = Enrollment.objects.filter(is_deleted=False).count()
            
            return Response({
                'success': True,
                'data': {
                    'total_students': total_students,
                    'total_revenue': float(total_revenue),
                    'pending_fees': float(pending_fees),
                    'total_enrollments': total_enrollments,
                    'collection_rate': round((float(total_revenue) / (float(total_revenue) + float(pending_fees)) * 100), 1) if (float(total_revenue) + float(pending_fees)) > 0 else 0
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': {'message': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

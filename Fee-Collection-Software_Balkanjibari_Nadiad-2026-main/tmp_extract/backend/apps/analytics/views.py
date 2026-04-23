from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, F, Q
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

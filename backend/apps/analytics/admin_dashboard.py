"""
Comprehensive Admin Analytics Dashboard Endpoint
Session 14 - April 16, 2026

This endpoint provides all admin dashboard data in a single request:
- Total students (online + offline)
- Total fees collected and pending
- Subject-wise distribution
- Payment trends
- Recent enrollments
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from datetime import timedelta

# Analytics action endpoint to add to AnalyticsViewSet

@action(detail=False, methods=['get'])
@method_decorator(cache_page(300))  # Cache for 5 minutes
def admin_dashboard_comprehensive(self, request):
    """
    Comprehensive admin dashboard endpoint - all data in single request
    Includes: students, fees, subjects, payments, trends
    """
    try:
        from apps.students.models import Student
        from apps.enrollments.models import Enrollment
        from apps.payments.models import Payment
        from apps.subjects.models import Subject
        
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
        ).order_by('-enrolled_count')[:10]  # Top 10 subjects
        
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
        ).extra(
            select={'month': 'DATE_TRUNC(\'month\', payment_date)'}
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
        from apps.students.models import Student
        from apps.enrollments.models import Enrollment
        from apps.payments.models import Payment
        
        # Quick aggregates
        stats = {
            'total_students': Student.objects.filter(is_deleted=False).count(),
            'total_revenue': float(Payment.objects.filter(is_deleted=False).aggregate(total=Sum('amount'))['total'] or 0),
            'pending_fees': float(Enrollment.objects.filter(is_deleted=False, status='ACTIVE').aggregate(total=Sum('pending_amount'))['total'] or 0),
            'total_enrollments': Enrollment.objects.filter(is_deleted=False).count(),
        }
        
        return Response({'success': True, 'data': stats})
        
    except Exception as e:
        return Response({
            'success': False,
            'error': {'message': str(e)}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

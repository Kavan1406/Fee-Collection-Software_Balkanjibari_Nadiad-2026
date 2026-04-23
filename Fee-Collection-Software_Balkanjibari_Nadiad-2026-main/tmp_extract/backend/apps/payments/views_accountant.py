from rest_framework import viewsets, status, views, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta
from .models import Payment, FeeLedgerEntry
from .serializers import PaymentSerializer, FeeLedgerEntrySerializer
from apps.enrollments.models import Enrollment
from utils.permissions import IsAccountantOrAdmin, IsStaffAccountantOrAdmin
from utils.pagination import StandardResultsSetPagination

class AccountantDashboardView(views.APIView):
    """
    API View for Accountant Dashboard statistics.
    """
    permission_classes = [IsStaffAccountantOrAdmin]

    def get(self, request):
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        
        # Today's Collection
        today_collection = Payment.objects.filter(
            payment_date=today, 
            status='SUCCESS', 
            is_deleted=False
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Monthly Revenue
        monthly_revenue = Payment.objects.filter(
            payment_date__gte=start_of_month, 
            status='SUCCESS', 
            is_deleted=False
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Outstanding Fees
        outstanding_fees = Enrollment.objects.filter(
            status='ACTIVE', 
            is_deleted=False
        ).aggregate(total=Sum('pending_amount'))['total'] or 0
        
        # Recent Transactions
        recent_transactions = Payment.objects.filter(
            is_deleted=False,
            status='SUCCESS'
        ).select_related('enrollment__student', 'enrollment__subject').order_by('-created_at')[:5]
        
        recent_data = PaymentSerializer(recent_transactions, many=True).data

        return Response({
            'success': True,
            'data': {
                'today_collection': float(today_collection),
                'monthly_revenue': float(monthly_revenue),
                'outstanding_fees': float(outstanding_fees),
                'recent_transactions': recent_data
            }
        })

class FeeLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing student fee ledgers.
    """
    queryset = FeeLedgerEntry.objects.all()
    serializer_class = FeeLedgerEntrySerializer
    permission_classes = [IsStaffAccountantOrAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['student__name', 'student__student_id', 'notes']

    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        transaction_type = self.request.query_params.get('transaction_type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
            
        return queryset.select_related('student', 'reference_payment', 'created_by')

    @action(detail=False, methods=['get'], url_path='student/(?P<student_id>\d+)')
    def student_ledger(self, request, student_id=None):
        """Get ledger for a specific student with running balance."""
        entries = FeeLedgerEntry.objects.filter(student_id=student_id).order_by('created_at')
        
        # In a real ledger, we might want to calculate running balance
        # For now, we return the entries. The frontend can calculate balance if needed.
        serializer = self.get_serializer(entries, many=True)
        
        # Also get current outstanding
        total_pending = Enrollment.objects.filter(
            student_id=student_id, 
            is_deleted=False
        ).aggregate(total=Sum('pending_amount'))['total'] or 0

        return Response({
            'success': True,
            'data': {
                'entries': serializer.data,
                'outstanding_balance': float(total_pending)
            }
        })

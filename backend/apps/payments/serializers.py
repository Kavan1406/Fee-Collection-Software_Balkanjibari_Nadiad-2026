"""
Serializers for Payment model.
"""

from rest_framework import serializers
from .models import Payment, FeeLedgerEntry
from apps.enrollments.models import Enrollment
from apps.students.serializers import StudentSerializer
from apps.subjects.models import Subject


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model."""
    
    student_name = serializers.CharField(source='enrollment.student.name', read_only=True)
    student_id = serializers.CharField(source='enrollment.student.student_id', read_only=True)
    subject_name = serializers.CharField(source='enrollment.subject.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    receipt_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_id', 'receipt_number', 'enrollment', 
            'student_name', 'student_id', 'subject_name',
            'amount', 'payment_date', 'payment_mode', 'transaction_id',
            'recorded_by', 'recorded_by_name', 'notes', 'created_at',
            'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
            'status', 'receipt_url'
        ]
        read_only_fields = ['id', 'payment_id', 'receipt_number', 'recorded_by', 'created_at']
    
    def get_receipt_url(self, obj):
        if obj.receipt_pdf:
            return obj.receipt_pdf.url
        return None


class PaymentCreateSerializer(serializers.Serializer):
    """Serializer for creating payments with validation."""
    
    enrollment_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_date = serializers.DateField()
    payment_mode = serializers.ChoiceField(choices=Payment.PAYMENT_MODE_CHOICES)
    transaction_id = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_enrollment_id(self, value):
        """Validate that enrollment exists and is active."""
        try:
            enrollment = Enrollment.objects.get(id=value, is_deleted=False)
            if enrollment.status != 'ACTIVE':
                raise serializers.ValidationError('Cannot record payment for inactive enrollment.')
            return value
        except Enrollment.DoesNotExist:
            raise serializers.ValidationError('Enrollment not found.')
    
    def validate_amount(self, value):
        """Validate that amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value
    
    def validate(self, data):
        """Validate that payment doesn't exceed pending amount."""
        enrollment = Enrollment.objects.get(id=data['enrollment_id'])
        
        if data['amount'] > enrollment.pending_amount:
            raise serializers.ValidationError({
                'amount': f'Payment amount (₹{data["amount"]}) exceeds pending amount (₹{enrollment.pending_amount}).'
            })
        
        return data


class PaymentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for payment list."""
    
    student_name = serializers.CharField(source='enrollment.student.name', read_only=True)
    subject_name = serializers.CharField(source='enrollment.subject.name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_id', 'receipt_number', 'enrollment',
            'student_name', 'subject_name',
            'amount', 'payment_date', 'payment_mode', 'status', 'created_at'
        ]

class FeeLedgerEntrySerializer(serializers.ModelSerializer):
    """Serializer for FeeLedgerEntry model."""
    
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id_code = serializers.CharField(source='student.student_id', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    reference_payment_id = serializers.CharField(source='reference_payment.payment_id', read_only=True)
    
    class Meta:
        model = FeeLedgerEntry
        fields = [
            'id', 'student', 'student_name', 'student_id_code',
            'transaction_type', 'amount', 'reference_payment', 
            'reference_payment_id', 'created_by', 'created_by_name', 
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']

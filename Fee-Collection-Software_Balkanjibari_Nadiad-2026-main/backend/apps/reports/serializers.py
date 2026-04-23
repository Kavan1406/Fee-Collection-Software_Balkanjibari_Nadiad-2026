from rest_framework import serializers
from apps.students.models import Student
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.subjects.models import Subject


class PaymentReportSerializer(serializers.Serializer):
    """Serializer for Payment Report data"""
    receipt_id = serializers.CharField(source='receipt_number', allow_null=True)
    payment_ref = serializers.CharField(source='payment_id', allow_null=True)
    student_name = serializers.CharField(source='enrollment.student.name')
    subject_name = serializers.CharField(source='enrollment.subject.name', allow_null=True)
    phone = serializers.CharField(source='enrollment.student.phone', allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = serializers.CharField(source='payment_mode')
    payment_status = serializers.CharField(source='status')
    created_at = serializers.DateTimeField()

    class Meta:
        fields = [
            'receipt_id',
            'payment_ref',
            'student_name',
            'subject_name',
            'phone',
            'amount',
            'payment_mode',
            'payment_status',
            'created_at',
        ]


class EnrollmentReportSerializer(serializers.Serializer):
    """Serializer for Student Enrollment Report data - same format as Payment Report"""
    receipt_id = serializers.SerializerMethodField()
    payment_ref = serializers.SerializerMethodField()
    student_id = serializers.CharField(source='student.student_id')
    student_name = serializers.CharField(source='student.name')
    subject_name = serializers.CharField(source='subject.name')
    phone = serializers.CharField(source='student.phone', allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, source='total_fee')
    payment_mode = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()

    class Meta:
        fields = [
            'receipt_id',
            'payment_ref',
            'student_id',
            'student_name',
            'subject_name',
            'phone',
            'amount',
            'payment_mode',
            'payment_status',
            'created_at',
        ]

    def get_receipt_id(self, obj):
        """Get the receipt ID from the related payment"""
        try:
            payment = Payment.objects.filter(enrollment=obj).first()
            if payment:
                return payment.receipt_number or 'N/A'
            return 'N/A'
        except:
            return 'N/A'

    def get_payment_ref(self, obj):
        """Get the payment reference from the related payment"""
        try:
            payment = Payment.objects.filter(enrollment=obj).first()
            if payment:
                return payment.payment_id or 'N/A'
            return 'N/A'
        except:
            return 'N/A'

    def get_payment_status(self, obj):
        """Get the payment status for the enrollment"""
        try:
            payment = Payment.objects.filter(enrollment=obj).first()
            if payment:
                return payment.status
            return 'PENDING'
        except:
            return 'PENDING'

    def get_payment_mode(self, obj):
        """Get the payment mode (ONLINE/CASH) for the enrollment"""
        try:
            payment = Payment.objects.filter(enrollment=obj).first()
            if payment:
                return payment.payment_mode  # ONLINE or CASH
            return 'NOT_PAID'
        except:
            return 'NOT_PAID'

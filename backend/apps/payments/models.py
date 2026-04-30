"""
Payment model with transaction safety and immutability.
"""

from django.db import models
from django.core.validators import MinValueValidator
from apps.enrollments.models import Enrollment
from apps.authentication.models import User
from decimal import Decimal
from cloudinary.models import CloudinaryField


class Payment(models.Model):
    """
    Payment model for recording fee payments.
    Immutable records with soft delete only.
    """
    
    PAYMENT_MODE_CHOICES = [
        ('CASH', 'Cash'),
        ('ONLINE', 'Online'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('PENDING_CONFIRMATION', 'Pending Confirmation'),
        ('CREATED', 'Created'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]
    
    # Auto-generated payment ID (PAY-2024-001)
    payment_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        help_text='Auto-generated payment ID'
    )
    
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.PROTECT,  # Prevent deletion of enrollment with payments
        related_name='payments'
    )
    
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Payment amount'
    )
    
    
    payment_date = models.DateField()
    payment_time = models.TimeField(
        auto_now_add=True,
        help_text='Time when payment was recorded'
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default='CASH'
    )
    
    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Transaction ID for digital payments'
    )
    receipt_number = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        editable=False,
        help_text='Auto-generated receipt number - shared by all payments of same student'
    )
    
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='recorded_payments',
        null=True,
        blank=True
    )
    
    notes = models.TextField(blank=True)
    
    # Razorpay fields for online payments
    razorpay_order_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Razorpay order ID for online payments'
    )
    razorpay_payment_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Razorpay payment ID for online payments'
    )
    razorpay_signature = models.CharField(
        max_length=200,
        blank=True,
        help_text='Razorpay signature for payment verification'
    )
    
    # Payment status (for tracking payment lifecycle)
    status = models.CharField(
        max_length=25,
        choices=PAYMENT_STATUS_CHOICES,
        default='SUCCESS',
        help_text='Payment status - PENDING_CONFIRMATION for cash/offline awaiting admin confirmation, CREATED for pending online, SUCCESS for completed, FAILED for failed'
    )
    
    # Generated documents
    receipt_pdf = models.FileField(
        upload_to='receipts/',
        null=True,
        blank=True,
        help_text='Stored receipt PDF'
    )
    
    
    # Installment tracking for year-round activities
    installment_number = models.IntegerField(
        null=True,
        blank=True,
        help_text='Installment number for partial payments (1st, 2nd, 3rd, etc.)'
    )
    
    is_installment = models.BooleanField(
        default=False,
        help_text='Whether this is an installment payment'
    )
    
    # Soft delete only (immutable records)
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['payment_id']),
            models.Index(fields=['receipt_number']),
            models.Index(fields=['payment_date']),
            models.Index(fields=['enrollment']),
        ]
        # Note: Amount validation is handled by MinValueValidator on the field
    
    def __str__(self):
        return f"{self.payment_id} - ₹{self.amount}"
    
    def save(self, *args, **kwargs):
        print(f"DEBUG: Payment.save() called for ID={self.id}, Status={self.status}, Mode={self.payment_mode}")
        # Auto-generate payment_id if not set
        if not self.payment_id:
            from datetime import datetime
            year = datetime.now().year
            
            payments = Payment.objects.filter(
                payment_id__startswith=f'PAY-{year}'
            ).values_list('payment_id', flat=True)
            
            if payments:
                max_num = max(int(pid.split('-')[2]) for pid in payments)
                new_num = max_num + 1
            else:
                new_num = 1
            
            self.payment_id = f'PAY-{year}-{new_num:04d}'
        
        # Auto-generate receipt_number only if status is SUCCESS and not already set
        # ONE RECEIPT PER STUDENT: Use the same receipt number for all payments of a student
        if self.status == 'SUCCESS' and not self.receipt_number:
            from datetime import datetime
            year = datetime.now().year
            
            # Check if this student already has a receipt number from an earlier payment
            student = self.enrollment.student if self.enrollment else None
            if student:
                existing_receipt = Payment.objects.filter(
                    enrollment__student=student,
                    receipt_number__isnull=False,
                    status='SUCCESS',
                    is_deleted=False
                ).first()
                
                if existing_receipt and existing_receipt.receipt_number:
                    # Use the existing receipt number for this student
                    self.receipt_number = existing_receipt.receipt_number
                    print(f"DEBUG: Reusing receipt number {self.receipt_number} for student {student.student_id}")
                else:
                    # Generate a new receipt number for this student's first payment
                    receipts = Payment.objects.filter(
                        receipt_number__startswith=f'REC-{year}'
                    ).values_list('receipt_number', flat=True)
                    
                    if receipts:
                        max_num = max(int(rid.split('-')[2]) for rid in receipts)
                        new_num = max_num + 1
                    else:
                        new_num = 1
                    
                    self.receipt_number = f'REC-{year}-{new_num:04d}'
                    print(f"DEBUG: Generated new receipt number {self.receipt_number} for student {student.student_id}")
        
        super().save(*args, **kwargs)

class FeeLedgerEntry(models.Model):
    """
    Model for tracking chronological financial transactions for students.
    Similar to a bank ledger.
    """
    TRANSACTION_TYPES = [
        ('PAYMENT', 'Payment'),
        ('REFUND', 'Refund'),
        ('ADJUSTMENT', 'Adjustment'),
    ]

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='ledger_entries'
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Amount for this transaction (positive for payments, negative for adjustments/refunds)'
    )
    reference_payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ledger_entries'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_ledger_entries'
    )
    notes = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fee_ledger_entries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', '-created_at']),
            models.Index(fields=['student', 'is_deleted']),
        ]

    def __str__(self):
        return f"{self.student.name} - {self.transaction_type} - ₹{self.amount}"

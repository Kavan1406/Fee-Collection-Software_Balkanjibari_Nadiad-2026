"""
Enrollment model for student-subject relationships.
"""

from django.db import models
from apps.students.models import Student
from apps.subjects.models import Subject
from decimal import Decimal
from cloudinary.models import CloudinaryField


class Enrollment(models.Model):
    """
    Enrollment model linking students to subjects with fee tracking.
    """
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('DROPPED', 'Dropped'),
    ]
    
    # Auto-generated enrollment ID (ENR-2024-001-PIANO)
    enrollment_id = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
        help_text='Auto-generated enrollment ID'
    )
    
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='enrollments',
        db_index=True
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    
    batch_time = models.CharField(
        max_length=20,
        default='7-8 AM',
        help_text='Batch timing for the subject'
    )
    
    include_library_fee = models.BooleanField(
        default=False,
        help_text='Whether library fee (₹10) is included for this enrollment'
    )
    
    enrollment_date = models.DateField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE'
    )
    
    # Fee tracking
    total_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Total fee for this enrollment'
    )
    paid_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total amount paid'
    )
    pending_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Pending amount to be paid'
    )
    
    # Generated documents
    id_card = CloudinaryField(
        resource_type="raw",
        null=True,
        blank=True,
        help_text='Stored ID card PDF'
    )
    
    # Soft delete
    is_deleted = models.BooleanField(default=False, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'enrollments'
        ordering = ['-created_at']
        unique_together = ['student', 'subject']
        indexes = [
            models.Index(fields=['enrollment_id']),
            models.Index(fields=['student', 'status']),
        ]
    
    def __str__(self):
        return f"{self.enrollment_id} - {self.student.name} - {self.subject.name}"
    
    def save(self, *args, **kwargs):
        # 1. Auto-generate enrollment_id if not set (Phase 3: Subject-Wise)
        if not self.enrollment_id:
            # Get short code from subject name (first 3-4 letters, capitalized)
            # Example: "Drawing" -> "DRA", "Piano" -> "PIA"
            import re
            subject_name = self.subject.name
            # Remove spaces and non-alpha, upper case
            clean_name = re.sub(r'[^A-Z]', '', subject_name.upper())
            prefix = clean_name[:3] if len(clean_name) >= 3 else clean_name
            
            # Find the last enrollment for THIS SUBJECT
            last_for_subject = Enrollment.objects.filter(
                subject=self.subject
            ).order_by('id').last()
            
            if last_for_subject and last_for_subject.enrollment_id:
                try:
                    # Expecting format ENR-DRA-001
                    parts = last_for_subject.enrollment_id.split('-')
                    last_num = int(parts[-1])
                    new_num = last_num + 1
                except (IndexError, ValueError):
                    # Fallback if format was different
                    new_num = Enrollment.objects.filter(subject=self.subject).count() + 1
            else:
                new_num = 1
            
            self.enrollment_id = f'ENR-{prefix}-{new_num:03d}'
        
        # Calculate pending amount
        self.pending_amount = self.total_fee - self.paid_amount
        
        super().save(*args, **kwargs)
    
    @property
    def payment_status(self):
        """Get payment status based on amounts."""
        if self.paid_amount >= self.total_fee:
            return 'PAID'
        elif self.paid_amount > 0:
            return 'PARTIAL'
        else:
            return 'PAYMENT PENDING'

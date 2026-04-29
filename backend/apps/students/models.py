"""
Student model for student management.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.authentication.models import User
from cloudinary.models import CloudinaryField


class Student(models.Model):
    """
    Student model with all required fields for student management.
    """
    
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    # Auto-generated student ID (STU001, STU002, ...)
    student_id = models.CharField(
        max_length=10,
        unique=True,
        editable=False,
        help_text='Auto-generated student ID'
    )
    
    # Link to User model for student login
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='student_profile'
    )
    
    # Basic Information
    name = models.CharField(max_length=200)
    age = models.IntegerField(
        validators=[MinValueValidator(4), MaxValueValidator(17)],
        null=True,
        blank=True
    )
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    photo = CloudinaryField(
        'image',
        null=True,
        blank=True,
        help_text='Student photo for ID card'
    )
    
    # Contact Information
    parent_name = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(
        max_length=15,
        help_text='Student phone number (required, can be duplicated across students)'
    )
    email = models.EmailField(
        max_length=254,
        blank=True,
        null=True,
        help_text='Student email for notifications (optional, can be used by multiple students)'
    )
    address = models.TextField(blank=True, null=True)
    area = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    blood_group = models.CharField(
        max_length=3,
        choices=BLOOD_GROUP_CHOICES,
        blank=True,
        null=True,
        help_text='Blood group for ID card'
    )
    
    # Status
    from django.utils import timezone
    enrollment_date = models.DateField(default=timezone.now)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE'
    )
    
    # Auto-generated login credentials (for admin reference)
    # Format: username = stu001, password = STU0018229 (STU + enrollment_number + last_4_digits_of_phone)
    login_username = models.CharField(max_length=50, blank=True, null=True)
    login_password_hint = models.CharField(max_length=100, blank=True, null=True)
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'students'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student_id']),
            models.Index(fields=['name']),
            models.Index(fields=['area']),
            models.Index(fields=['status']),
        ]
    
    @property
    def total_fees(self):
        """Aggregate total fees, favoring annotated values for performance."""
        annotated = getattr(self, 'annotated_total_fees', None)
        if annotated is not None:
            return annotated
        return sum(e.total_fee for e in self.enrollments.filter(is_deleted=False)) or 0

    @property
    def total_paid(self):
        """Aggregate total paid amount, favoring annotated values for performance."""
        annotated = getattr(self, 'annotated_total_paid', None)
        if annotated is not None:
            return annotated
        return sum(e.paid_amount for e in self.enrollments.filter(is_deleted=False)) or 0

    @property
    def total_pending(self):
        """Aggregate total pending amount, favoring annotated values for performance."""
        annotated = getattr(self, 'annotated_total_pending', None)
        if annotated is not None:
            return annotated
        return sum(e.pending_amount for e in self.enrollments.filter(is_deleted=False)) or 0

    def __str__(self):
        return f"{self.student_id} - {self.name}"
    
    def save(self, *args, **kwargs):
        # Auto-generate student_id if not set
        if not self.student_id:
            from django.db.models.functions import Cast, Substr
            from django.db.models import IntegerField, Max
            
            # Find the maximum numeric part of existing STU IDs
            max_id_val = Student.objects.filter(
                student_id__startswith='STU'
            ).aggregate(
                max_val=Max(
                    Cast(Substr('student_id', 4), IntegerField())
                )
            )['max_val']

            if max_id_val:
                new_id = max_id_val + 1
            else:
                new_id = 1
            
            # Use 3-digit padding (STU001) but allow it to grow (STU1000)
            self.student_id = f'STU{new_id:03d}'
            
            # Final safety check for collisions
            while Student.objects.filter(student_id=self.student_id).exists():
                new_id += 1
                self.student_id = f'STU{new_id:03d}'
        
        super().save(*args, **kwargs)


class StudentRegistrationRequest(models.Model):
    """
    Stores self-registration applications submitted by prospective students
    via the public registration form. Admin can Accept or Reject each request.
    """

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('ONLINE', 'Online'),
    ]

    GENDER_CHOICES = Student.GENDER_CHOICES
    BLOOD_GROUP_CHOICES = Student.BLOOD_GROUP_CHOICES

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(blank=True, null=True)

    # Basic Information (mirrors Student model)
    name = models.CharField(max_length=200)
    age = models.IntegerField(
        validators=[MinValueValidator(4), MaxValueValidator(17)],
        null=True,
        blank=True
    )
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    photo = CloudinaryField('image', null=True, blank=True)

    # Contact
    parent_name = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=15)
    email = models.EmailField(max_length=254, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    area = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUP_CHOICES, blank=True, null=True)

    # Enrollment date requested
    enrollment_date = models.DateField(null=True, blank=True)

    # Payment preference
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='CASH')

    # Subjects requested — stored as JSON list of {subject_id, subject_name, batch_time, include_library_fee}
    subjects_data = models.JSONField(default=list, blank=True)

    # Link to created student (set on Accept)
    created_student = models.OneToOneField(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registration_request'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_registration_requests'
        ordering = ['-created_at']

    @property
    def subject_names(self):
        """Extract subject names from subjects_data."""
        if not self.subjects_data or not isinstance(self.subjects_data, list):
            return "General"
        
        names = []
        for item in self.subjects_data:
            name = item.get('subject_name') or item.get('name')
            if name:
                names.append(name)
            else:
                # Try to fetch from DB if only ID is present
                try:
                    from apps.subjects.models import Subject
                    s = Subject.objects.get(id=item.get('subject_id'))
                    names.append(s.name)
                except:
                    names.append("Subject")
        
        return ", ".join(names) if names else "General"

    @property
    def total_fees(self):
        """Calculate total fees from subjects_data."""
        from decimal import Decimal
        total = Decimal('0.00')
        if not self.subjects_data or not isinstance(self.subjects_data, list):
            return total
            
        for i, item in enumerate(self.subjects_data):
            # Try to get fee from the data itself if stored
            fee_val = item.get('total_fee') or item.get('fee') or item.get('fee_amount')
            if fee_val is not None:
                total += Decimal(str(fee_val))
            else:
                # Fallback to fetching from Subject model if possible (expensive in list view, but okay for single)
                try:
                    from apps.subjects.models import Subject
                    subject = Subject.objects.get(id=item.get('subject_id'))
                    curr_fee = subject.current_fee
                    if curr_fee:
                        s_fee = Decimal(str(curr_fee.fee_amount))
                    elif subject.monthly_fee:
                        s_fee = Decimal(str(subject.monthly_fee))
                    else:
                        s_fee = Decimal('0.00')
                    
                    lib_fee = Decimal('10.00') if i == 0 else Decimal('0.00')
                    total += s_fee + lib_fee
                except:
                    pass
        return total

    def __str__(self):
        return f"RegistrationRequest({self.name}, {self.status})"

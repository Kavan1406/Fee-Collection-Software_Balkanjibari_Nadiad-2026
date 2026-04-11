"""
Subject and FeeStructure models.
"""

from django.db import models
from decimal import Decimal


class Subject(models.Model):
    """
    Subject model for courses/classes offered.
    """
    
    
    CATEGORY_CHOICES = [
        ('EDUCATION', 'Education'),
        ('MUSIC', 'Music'),
        ('ART', 'Art'),
        ('SPORTS', 'Sports'),
        ('DANCE', 'Dance'),
        ('COMPUTER', 'Computer'),
        ('OTHER', 'Other'),
    ]
    
    ACTIVITY_TYPE_CHOICES = [
        ('SUMMER_CAMP', 'Summer Camp'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='OTHER'
    )
    
    # Activity type classification
    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_TYPE_CHOICES,
        default='SUMMER_CAMP',
        help_text='Type of activity - Summer Camp or Year-Round'
    )
    
    # Year-round activity specific fields
    duration_months = models.IntegerField(
        null=True,
        blank=True,
        help_text='Course duration in months (for year-round activities)'
    )
    
    timing_schedule = models.CharField(
        max_length=200,
        blank=True,
        help_text='Class timing schedule (e.g., "Mon & Fri 5 PM - 6 PM")'
    )
    
    monthly_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Monthly fee for year-round activities'
    )
    
    instructor_name = models.CharField(max_length=200, blank=True)
    default_batch_timing = models.CharField(
        max_length=200,
        default='7-8 AM',
        help_text='Default batch timing for this subject'
    )
    max_seats = models.IntegerField(
        default=50,
        help_text='Maximum number of students for this subject'
    )
    age_limit = models.CharField(
        max_length=100,
        blank=True,
        help_text='Age group/limit for this subject (e.g. "4 to 16")'
    )
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'subjects'
        ordering = ['name']
    
    @property
    def current_fee(self):
        """Get the current active fee structure."""
        from datetime import date
        return self.fee_structures.filter(
            is_active=True,
            effective_from__lte=date.today()
        ).first()

    def __str__(self):
        return self.name


class FeeStructure(models.Model):
    """
    Fee structure for subjects.
    """
    
    DURATION_CHOICES = [
        ('1_MONTH', '1 Month'),
    ]
    
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='fee_structures'
    )
    fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Fee amount in rupees'
    )
    duration = models.CharField(
        max_length=20,
        choices=DURATION_CHOICES,
        default='1_MONTH'
    )
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fee_structures'
        ordering = ['-effective_from']
    
    def __str__(self):
        return f"{self.subject.name} - ₹{self.fee_amount} ({self.duration})"

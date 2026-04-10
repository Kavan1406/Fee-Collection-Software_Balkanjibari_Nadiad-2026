"""
Custom User model with role-based authentication.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """
    Custom User model with role-based access control.
    Extends Django's AbstractUser to add role, phone, address fields.
    """
    
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
        ('STUDENT', 'Student'),
        ('ACCOUNTANT', 'Accountant'),
    ]
    
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='STUDENT',
        help_text='User role for access control'
    )
    full_name = models.CharField(
        max_length=255,
        blank=True,
        help_text='User full name'
    )
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        help_text='Contact phone number'
    )
    address = models.TextField(
        blank=True,
        help_text='Full address'
    )
    area = models.CharField(
        max_length=100,
        blank=True,
        help_text='Area/Location'
    )
    # Granular Permissions for Staff
    can_view_dashboard = models.BooleanField(default=False)
    can_view_registration_requests = models.BooleanField(default=False)
    can_view_students = models.BooleanField(default=False)
    can_view_subjects = models.BooleanField(default=False)
    can_view_enrollments = models.BooleanField(default=False)
    can_view_payments = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    can_view_users = models.BooleanField(default=False)
    can_view_settings = models.BooleanField(default=False)
    
    # 2FA Toggle for Staff
    is_two_factor_enabled = models.BooleanField(default=False)
    is_authorized = models.BooleanField(default=True, help_text='Designates whether this user is authorized to use the system')
    
    # Notification Preferences
    notify_email = models.BooleanField(default=True)
    notify_whatsapp = models.BooleanField(default=True)
    notify_sms = models.BooleanField(default=False)
    
    is_active = models.BooleanField(
        default=True,
        help_text='Designates whether this user should be treated as active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        return self.role == 'ADMIN'
    
    @property
    def is_staff_member(self):
        return self.role in ['STAFF', 'ADMIN', 'ACCOUNTANT']
    
    @property
    def is_accountant(self):
        return self.role == 'ACCOUNTANT'

    @property
    def is_student(self):
        return self.role == 'STUDENT'


class RefreshToken(models.Model):
    """
    Model to store and blacklist refresh tokens.
    Used for token rotation and logout functionality.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='refresh_tokens'
    )
    token = models.CharField(
        max_length=2000,
        unique=True,
        help_text='Refresh token string'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text='Token expiration timestamp'
    )
    is_blacklisted = models.BooleanField(
        default=False,
        help_text='Whether this token has been blacklisted'
    )
    blacklisted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the token was blacklisted'
    )
    
    class Meta:
        db_table = 'refresh_tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'is_blacklisted']),
        ]
    
    def __str__(self):
        return f"Token for {self.user.username} ({'Blacklisted' if self.is_blacklisted else 'Active'})"
    
    def blacklist(self):
        """Blacklist this refresh token."""
        self.is_blacklisted = True
        self.blacklisted_at = timezone.now()
        self.save()
    
    @property
    def is_expired(self):
        """Check if token is expired."""
        return timezone.now() > self.expires_at

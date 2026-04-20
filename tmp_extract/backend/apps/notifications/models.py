from django.db import models
from apps.authentication.models import User

class Notification(models.Model):
    """
    Model to store user notifications.
    """
    NOTIFICATION_TYPES = [
        ('REGISTRATION_NEW', 'New Registration Request'),
        ('REGISTRATION_ACCEPTED', 'Registration Accepted'),
        ('REGISTRATION_REJECTED', 'Registration Rejected'),
        ('PAYMENT_SUCCESS', 'Payment Successful'),
        ('GENERAL', 'General Notification'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES,
        default='GENERAL'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username}"

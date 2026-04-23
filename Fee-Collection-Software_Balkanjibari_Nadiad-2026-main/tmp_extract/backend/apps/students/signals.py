from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import StudentRegistrationRequest
from apps.notifications.models import Notification
from django.contrib.auth import get_user_model
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=StudentRegistrationRequest)
def notify_admin_on_registration_request(sender, instance, created, **kwargs):
    """
    Automatically notify Admins and permitted Staff/Accountants 
    when a new student registration request is submitted.
    """
    if created:
        try:
            User = get_user_model()
            
            # Target users:
            # 1. All ADMINs
            # 2. STAFF or ACCOUNTANT users with can_view_registration_requests = True
            recipients = User.objects.filter(
                Q(role='ADMIN') | 
                (Q(role__in=['STAFF', 'ACCOUNTANT']) & Q(can_view_registration_requests=True)),
                is_active=True
            ).distinct()
            
            notifications_to_create = []
            for recipient in recipients:
                notifications_to_create.append(
                    Notification(
                        user=recipient,
                        notification_type='REGISTRATION_NEW',
                        title='New Registration Request',
                        message=f'A new student registration request has been submitted by {instance.name}.'
                    )
                )
            
            if notifications_to_create:
                Notification.objects.bulk_create(notifications_to_create)
                logger.info(f"Created {len(notifications_to_create)} registration notifications for request {instance.id}")
                
        except Exception as e:
            # Non-fatal error to ensure the registration request itself isn't rolled back
            logger.error(f"Failed to create registration notifications for request {instance.id}: {str(e)}", exc_info=True)

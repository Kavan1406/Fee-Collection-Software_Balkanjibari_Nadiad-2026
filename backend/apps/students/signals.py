from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import StudentRegistrationRequest, Student
from apps.notifications.models import Notification
from django.contrib.auth import get_user_model
from django.db.models import Q
import logging

# Import credential and email services
try:
    from utils.email_notifications import StudentCredentialManager, EmailNotificationService
except ImportError:
    StudentCredentialManager = None
    EmailNotificationService = None

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


@receiver(post_save, sender=Student)
def generate_student_login_credentials(sender, instance, created, **kwargs):
    """
    Signal to automatically generate login credentials for newly registered students.
    Session 14: Auto-generate username/password and send email with credentials.
    """
    if created and StudentCredentialManager and instance.email:
        try:
            from django.db import transaction as _tx
            with _tx.atomic():
                username, password, user_created = StudentCredentialManager.create_student_login(instance)

            if user_created:
                logger.info(f"✓ Credentials generated for student {instance.student_id}")

                email_sent = EmailNotificationService.send_registration_confirmation(
                    instance,
                    username,
                    password
                )

                if email_sent:
                    logger.info(f"✓ Registration email sent to {instance.email}")
                else:
                    logger.warning(f"⚠️ Could not send email to {instance.email}")
        except Exception as e:
            logger.error(f"Error generating student credentials: {str(e)}", exc_info=True)


@receiver(post_save, sender=StudentRegistrationRequest)
def create_student_on_approved_registration(sender, instance, created, **kwargs):
    """
    When a registration request is approved, create the student account with credentials.
    """
    if not created and instance.status == 'APPROVED' and StudentCredentialManager:
        try:
            # Check if student already exists
            if not Student.objects.filter(email=instance.email).exists():
                # Create student from registration request
                student = Student.objects.create(
                    name=instance.name,
                    email=instance.email,
                    phone=instance.phone,
                    student_id=instance.student_id or f"STU_{instance.id}",
                    gender=instance.gender,
                    status='ACTIVE'
                )
                logger.info(f"Created student {student.student_id} from approved registration request")
                # Signal will handle credential generation automatically
        except Exception as e:
            logger.error(f"Error creating student from registration request: {str(e)}", exc_info=True)

import logging
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Student

logger = logging.getLogger(__name__)

def get_or_repair_student(request):
    """
    Unified utility to get a student profile for the logged-in user.
    Includes 'Triple-Factor Healing' to link orphaned student accounts on the fly:
    1. student_id == username.upper()
    2. email == user.email
    3. phone == user.phone_number
    """
    user = request.user
    if not user.is_authenticated:
        return None
        
    # Standard check: Does the link already exist?
    student = getattr(user, 'student_profile', None)
    if student:
        return student
        
    # ONLY attempt healing for users with role 'STUDENT'
    if user.role != 'STUDENT':
        return None
        
    logger.error(f"[DIAGNOSTIC] HEALING: Orphan student detected: {user.username} (Email: {user.email}, Phone: {user.phone_number})")
    
    # TRIPLE-FACTOR HEALING LOGIC
    # ---------------------------
    
    # Factor 1: Student ID derived from Username (STU001)
    potential_id = user.username.upper().replace('STU', 'STU')
    if not potential_id.startswith('STU'):
        potential_id = f"STU{potential_id}"

    # Search candidates (including already linked ones for aggressive recovery)
    all_students = Student.objects.filter(is_deleted=False)
    
    # Try ID Match (Unlinked preferred)
    student = all_students.filter(student_id=potential_id, user=None).first()
    if student:
        logger.error(f"[DIAGNOSTIC] HEALING: Success via ID Match (Unlinked: {potential_id})")
    
    # Try Email Match (Aggressive: even if linked to another user)
    if not student and user.email:
        student = all_students.filter(email=user.email).first()
        if student:
            if student.user and student.user != user:
                logger.error(f"[DIAGNOSTIC] HEALING: STEALING link via Email Match. Old user: {student.user.username}, New user: {user.username}")
            else:
                logger.error(f"[DIAGNOSTIC] HEALING: Success via Email Match ({user.email})")
            
    # Try Phone Match (Aggressive)
    if not student and user.phone_number:
        clean_phone = ''.join(filter(str.isdigit, user.phone_number))
        if len(clean_phone) >= 10:
            student = all_students.filter(phone__icontains=clean_phone[-10:]).first()
            if student:
                logger.error(f"[DIAGNOSTIC] HEALING: Success via Phone Match ({clean_phone})")

    # Factor 4: Fuzzy Name Match (Last Resort)
    if not student and user.full_name:
        # Search for student with same name (exact or icontains)
        student = all_students.filter(name__iexact=user.full_name, user=None).first()
        if not student:
            student = all_students.filter(name__icontains=user.full_name, user=None).first()
        
        if student:
            logger.error(f"[DIAGNOSTIC] HEALING: Success via Name Match ({user.full_name})")
                
    # If a match was found, repair the link!
    if student:
        try:
            # Force re-link to current user
            student.user = user
            if not student.login_username:
                student.login_username = user.username
            student.save()
            # Try to populate user fields from student if they are empty
            if not user.full_name:
                user.full_name = student.name
            if not user.phone_number:
                user.phone_number = student.phone
            user.save()
            
            logger.error(f"[DIAGNOSTIC] HEALING: Final link REPAIRED for {user.username} -> {student.student_id}")
            request._student_healed = True
            return student
        except Exception as e:
            logger.error(f"[DIAGNOSTIC] HEALING: Error during save: {str(e)}")
            
    logger.error(f"[DIAGNOSTIC] HEALING: FAILED. No matching student found for user {user.username}. DB Count: {all_students.count()}, Unlinked: {all_students.filter(user=None).count()}")
    request._student_healed = False
    return None


@transaction.atomic
def archive_student(student):
    """
    Soft-delete a student and archive related active records needed by the app.
    """
    from apps.authentication.models import RefreshToken
    from apps.enrollments.models import Enrollment
    from apps.payments.models import Payment, FeeLedgerEntry

    refund_amount = Payment.objects.filter(
        enrollment__student=student,
        is_deleted=False,
        status='SUCCESS',
    ).aggregate(total=Sum('amount'))['total'] or 0

    archived_payment_count = Payment.objects.filter(
        enrollment__student=student,
        is_deleted=False,
    ).count()

    student.is_deleted = True
    student.status = 'INACTIVE'
    student.save(update_fields=['is_deleted', 'status', 'updated_at'])

    Payment.objects.filter(
        enrollment__student=student,
        is_deleted=False,
    ).update(is_deleted=True)

    FeeLedgerEntry.objects.filter(
        student=student,
        is_deleted=False,
    ).update(is_deleted=True)

    Enrollment.objects.filter(
        student=student,
        is_deleted=False,
    ).update(
        is_deleted=True,
        status='DROPPED',
        updated_at=timezone.now(),
    )

    user = getattr(student, 'user', None)
    if user:
        user.is_active = False
        if hasattr(user, 'is_authorized'):
            user.is_authorized = False
            user.save(update_fields=['is_active', 'is_authorized', 'updated_at'])
        else:
            user.save(update_fields=['is_active', 'updated_at'])

        RefreshToken.objects.filter(
            user=user,
            is_blacklisted=False,
        ).update(
            is_blacklisted=True,
            blacklisted_at=timezone.now(),
        )

    return {
        'refund_amount': refund_amount,
        'archived_payment_count': archived_payment_count,
    }

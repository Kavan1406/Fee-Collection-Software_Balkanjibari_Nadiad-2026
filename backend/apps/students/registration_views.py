"""
registration_views.py — Public endpoints for the new self-service student
registration flow with instant account creation on payment.

Endpoints:
  POST /api/v1/students/register/
  POST /api/v1/students/confirm-registration-payment/
  GET  /api/v1/students/download-receipt/
"""

import json
import hmac
import hashlib
import secrets
import string
import time
from decimal import Decimal
from django.db import OperationalError

from django.contrib.auth import get_user_model
from django.conf import settings
from django.http import HttpResponse
from django.db import transaction, IntegrityError
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

try:
    import razorpay
except ImportError:
    razorpay = None

from apps.students.models import Student
from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.subjects.models import Subject

User = get_user_model()

RAZORPAY_KEY_ID = getattr(settings, 'RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

razorpay_client = None
if razorpay and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET and RAZORPAY_KEY_ID.startswith('rzp_'):
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception:
        razorpay_client = None


def _generate_password(student_id: str, phone: str) -> str:
    """Generate password: STU + numeric_part + last4_of_phone"""
    numeric = ''.join(filter(str.isdigit, student_id))
    last4 = phone[-4:] if len(phone) >= 4 else phone
    return f"STU{numeric}{last4}"


def _generate_username(student_id: str) -> str:
    """Generate username: lowercase student_id e.g. stu042"""
    return student_id.lower()


def _allocate_unique_username(base_username: str, current_user_id: int | None = None) -> str:
    """Pick a unique username, adding a numeric suffix only if needed."""
    qs = User.objects.filter(username=base_username)
    if current_user_id is not None:
        qs = qs.exclude(id=current_user_id)
    if not qs.exists():
        return base_username

    # Fallback: stu069 -> stu0691, stu0692, ...
    for idx in range(1, 1000):
        candidate = f"{base_username}{idx}"
        qs = User.objects.filter(username=candidate)
        if current_user_id is not None:
            qs = qs.exclude(id=current_user_id)
        if not qs.exists():
            return candidate

    # Last resort should be practically unreachable.
    return f"{base_username}{secrets.token_hex(2)}"


def _parse_date(val: str):
    """Parse DD-MM-YYYY or YYYY-MM-DD to a date object"""
    if not val:
        return None
    from datetime import date
    val = val.strip()
    if '-' in val:
        parts = val.split('-')
        if len(parts[0]) == 4:  # YYYY-MM-DD
            try:
                return date(int(parts[0]), int(parts[1]), int(parts[2]))
            except Exception:
                return None
        elif len(parts[2]) == 4:  # DD-MM-YYYY
            try:
                return date(int(parts[2]), int(parts[1]), int(parts[0]))
            except Exception:
                return None
    return None


def _calculate_age(dob) -> int | None:
    """Calculate age from a date object"""
    if not dob:
        return None
    today = timezone.now().date()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age


def _return_registration_success(student, user, order_id):
    """Unified success response for new and resumed registrations."""
    # Find active enrollments and payments for this order
    enrollments = Enrollment.objects.filter(student=student, payments__razorpay_order_id=order_id).distinct()
    payments = Payment.objects.filter(razorpay_order_id=order_id, enrollment__student=student)
    
    total_amount = sum(e.total_fee for e in enrollments)
    
    return Response({
        'success': True,
        'student_id': student.student_id,
        'username': user.username,
        'order_id': order_id,
        'amount': float(total_amount),
        'amount_paise': int(total_amount * 100),
        'currency': 'INR',
        'key_id': RAZORPAY_KEY_ID,
        'enrollment_ids': [e.id for e in enrollments],
        'payment_ids': [p.id for p in payments],
        'test_mode': not razorpay_client or (order_id or '').startswith('order_test_'),
    }, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    """
    Step 1: Create student account + enrollments, then create Razorpay order.
    Includes a retry mechanism for database connectivity issues (e.g. DNS resolution).
    """
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            with transaction.atomic():
                return _handle_registration_logic(request)
        except OperationalError as e:
            last_error = e
            error_str = str(e).lower()
            if ("translate host name" in error_str or "could not connect" in error_str) and attempt < max_retries - 1:
                time.sleep(1)  # Wait 1s before retry
                continue
            break
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                'success': False, 
                'error': f'Registration failed: {str(e)}',
                'detail': 'An unexpected server error occurred.'
            }, status=500)

    return Response({
        'success': False, 
        'error': 'Server connection error. Please try again in a few seconds.',
        'detail': str(last_error) if last_error else 'Connection pooler timeout.'
    }, status=500)


def _handle_registration_logic(request):
    """Internal helper for registration logic wrapped in a transaction."""
    data = request.data

    # --- Validate required fields ---
    name = (data.get('name') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()

    if not name:
        return Response({'success': False, 'error': 'Full name is required.'}, status=400)
    if not phone or len(phone) < 10:
        return Response({'success': False, 'error': 'Valid 10-digit mobile number is required.'}, status=400)
    # Email is now optional, but recommended
    # if not email:
    #     return Response({'success': False, 'error': 'Email is required for login credentials.'}, status=400)

    # Parse subjects
    subjects_raw = data.get('subjects_data', '[]')
    if isinstance(subjects_raw, str):
        try:
            subjects_list = json.loads(subjects_raw)
        except json.JSONDecodeError:
            subjects_list = []
    else:
        subjects_list = subjects_raw

    if not subjects_list:
        return Response({'success': False, 'error': 'At least one subject must be selected.'}, status=400)

    # --- Limit to 4 subjects ---
    if len(subjects_list) > 4:
        return Response({'success': False, 'error': 'Maximum 4 subjects can be selected per student.'}, status=400)

    # --- Check for timing conflicts ---
    batch_times = [str(s.get('batch_time', '')).strip().lower() for s in subjects_list if s.get('subject_id')]
    if len(batch_times) != len(set(batch_times)):
        return Response({
            'success': False, 
            'error': 'Timing conflict: Multiple subjects cannot be scheduled at the same time.'
        }, status=400)

    # --- Check email uniqueness (only if provided) ---
    if email and User.objects.filter(email=email).exists():
        # Optimization: If student already exists but has not completed payment,
        # allow them to "re-register" to get a new order_id and finish the process.
        try:
            user = User.objects.get(email=email)
            student = Student.objects.get(user=user)
            # Find the most recent unpaid enrollment/payment
            pending_pay = Payment.objects.filter(
                enrollment__student=student,
                status='CREATED'
            ).order_by('-created_at').first()
            
            if pending_pay:
                # User exists and has a pending payment. Return success so they can pay.
                # We reuse the existing student info but generate a new order if needed.
                return _return_registration_success(student, user, pending_pay.razorpay_order_id)
        except (User.DoesNotExist, Student.DoesNotExist):
            pass

        return Response({
            'success': False,
            'error': 'An account with this email already exists. Please use a different email or login.'
        }, status=400)

    # --- Parse optional fields ---
    dob = _parse_date(data.get('date_of_birth', ''))
    age = _calculate_age(dob) if dob else None
    if data.get('age') and not age:
        try:
            age = int(data.get('age'))
        except Exception:
            age = None

    enrollment_date = _parse_date(data.get('enrollment_date', '')) or timezone.now().date()

    # --- Create User account ---
    # Temporary username (will be updated after student_id is assigned)
    temp_suffix = secrets.token_hex(4)
    temp_username = f"stu_temp_{temp_suffix}"
    raw_password = None  # Will be set after student_id known

    user = User.objects.create_user(
        username=temp_username,
        email=email,
        password=temp_suffix,  # Temporary; replaced below
        role='STUDENT',
        full_name=name,
    )

    # --- Create Student record ---
    student = Student.objects.create(
        user=user,
        name=name,
        age=age,
        gender=data.get('gender') or None,
        date_of_birth=dob,
        phone=phone,
        email=email,
        address=data.get('address') or '',
        area=data.get('area') or '',
        city=data.get('city') or '',
        pincode=data.get('pincode') or '',
        enrollment_date=enrollment_date,
        status='ACTIVE',
    )

    # --- Update user username to final student_id-based username ---
    base_username = _generate_username(student.student_id)
    final_username = _allocate_unique_username(base_username, current_user_id=user.id)
    raw_password = _generate_password(student.student_id, phone)

    username_saved = False
    # Handle rare race conditions where another request claims the same username
    # between availability check and save.
    for _ in range(5):
        try:
            user.username = final_username
            user.set_password(raw_password)
            user.save()
            username_saved = True
            break
        except IntegrityError:
            final_username = _allocate_unique_username(base_username, current_user_id=user.id)

    if not username_saved:
        transaction.set_rollback(True)
        return Response({
            'success': False,
            'error': 'Could not allocate a unique username. Please retry registration.'
        }, status=409)

    # Store login hints on student
    student.login_username = final_username
    student.login_password_hint = raw_password
    student.save()

    # Handle photo upload
    if 'photo' in request.FILES:
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(request.FILES['photo'], folder='student_photos')
            student.photo = result.get('public_id')
            student.save()
        except Exception:
            pass  # Photo upload is optional

    # --- Create Enrollments + calculate total fee ---
    total_amount = Decimal('0.00')
    created_enrollments = []

    for i, sub_data in enumerate(subjects_list):
        subject_id = sub_data.get('subject_id')
        batch_time = sub_data.get('batch_time', '7-8 AM')
        include_library = (i == 0)  # Only first subject gets library fee

        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            continue

        # Check seat availability
        enrolled_count = Enrollment.objects.filter(subject=subject, is_deleted=False, status='ACTIVE').count()
        if enrolled_count >= subject.max_seats:
            transaction.set_rollback(True)
            return Response({
                'success': False, 
                'error': f'Sorry, "{subject.name}" is now full. Please pick another subject.'
            }, status=400)

        # Calculate subject fee
        curr_fee = subject.current_fee
        if curr_fee:
            subj_fee = Decimal(str(curr_fee.fee_amount))
        elif subject.monthly_fee:
            subj_fee = Decimal(str(subject.monthly_fee))
        else:
            subj_fee = Decimal('0.00')

        library_fee = Decimal('10.00') if include_library else Decimal('0.00')
        total_fee = subj_fee + library_fee

        enrollment = Enrollment.objects.create(
            student=student,
            subject=subject,
            batch_time=batch_time,
            include_library_fee=include_library,
            total_fee=total_fee,
            paid_amount=Decimal('0.00'),
            pending_amount=total_fee,
            status='ACTIVE',
        )
        created_enrollments.append(enrollment)
        total_amount += total_fee

    if not created_enrollments:
        # Rollback: no valid subjects
        user.delete()
        return Response({'success': False, 'error': 'No valid subjects found. Please try again.'}, status=400)

    # --- Create Razorpay order ---
    amount_paise = int(total_amount * 100)
    order_id = None

    if razorpay_client:
        try:
            order_data = {
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': f'REG-{student.student_id}',
                'notes': {
                    'student_id': student.student_id,
                    'student_name': student.name,
                    'email': email,
                }
            }
            rzp_order = razorpay_client.order.create(data=order_data)
            order_id = rzp_order['id']
        except Exception as e:
            order_id = f'order_test_{student.student_id}'
    else:
        order_id = f'order_test_{student.student_id}'

    # Create payment records (CREATED status, one per enrollment)
    payment_ids = []
    for enr in created_enrollments:
        pay = Payment.objects.create(
            enrollment=enr,
            amount=enr.total_fee,
            payment_date=timezone.now().date(),
            payment_mode='ONLINE',
            razorpay_order_id=order_id,
            status='CREATED',
            notes=f'Registration payment for {enr.subject.name}',
        )
        payment_ids.append(pay.id)

    return _return_registration_success(student, user, order_id)


@api_view(['POST'])
@permission_classes([AllowAny])
@transaction.atomic
def confirm_registration_payment(request):
    """
    Step 2: Verify Razorpay payment and mark all enrollments as PAID.
    Returns student credentials and receipt data.
    """
    razorpay_order_id = request.data.get('razorpay_order_id', '')
    razorpay_payment_id = request.data.get('razorpay_payment_id', '')
    razorpay_signature = request.data.get('razorpay_signature', '')
    student_id = request.data.get('student_id', '')
    payment_ids = request.data.get('payment_ids', [])

    if not student_id:
        return Response({'success': False, 'error': 'student_id is required.'}, status=400)

    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({'success': False, 'error': 'Student not found.'}, status=404)

    # --- Verify Razorpay signature (skip for test orders) ---
    is_test_order = razorpay_order_id.startswith('order_test_')
    if not is_test_order and razorpay_client and razorpay_order_id and razorpay_payment_id:
        try:
            generated_sig = hmac.new(
                RAZORPAY_KEY_SECRET.encode(),
                f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
                hashlib.sha256
            ).hexdigest()
            if generated_sig != razorpay_signature:
                return Response({'success': False, 'error': 'Payment verification failed. Invalid signature.'}, status=400)
        except Exception:
            pass  # Fallback: allow if signature check fails in test mode

    # --- Mark all payments as SUCCESS and update enrollments ---
    payments_updated = Payment.objects.filter(
        id__in=payment_ids,
        razorpay_order_id=razorpay_order_id,
        status='CREATED'
    )

    if not payments_updated.exists():
        # Try to find by order_id alone (test mode fallback)
        payments_updated = Payment.objects.filter(
            razorpay_order_id=razorpay_order_id,
            status='CREATED'
        )

    enrolled_subjects = []
    for payment in payments_updated:
        payment.razorpay_payment_id = razorpay_payment_id or 'test_pay_confirmed'
        payment.razorpay_signature = razorpay_signature or 'test_sig'
        payment.status = 'SUCCESS'
        payment.transaction_id = razorpay_payment_id or 'test_pay_confirmed'
        payment.notes += ' | Payment confirmed via registration flow'
        payment.save()

        # Update enrollment
        enr = payment.enrollment
        enr.paid_amount = enr.total_fee
        enr.pending_amount = Decimal('0.00')
        enr.save()

        enrolled_subjects.append({
            'subject': enr.subject.name,
            'batch_time': enr.batch_time,
            'fee': float(enr.total_fee),
            'enrollment_id': enr.enrollment_id,
        })

    # --- Generate receipt token (simple: student_id encoded) ---
    import base64
    receipt_token = base64.urlsafe_b64encode(
        f"{student.student_id}:{razorpay_order_id}".encode()
    ).decode()

    # Send confirmation email inline for reliability.
    # Daemon threads may be terminated early by production worker restarts.
    try:
        _send_registration_email(student, enrolled_subjects, receipt_token)
    except Exception as e:
        print(f"[EMAIL] Failed to send registration confirmation: {e}")

    return Response({
        'success': True,
        'student_id': student.student_id,
        'username': student.login_username,
        'password': student.login_password_hint,
        'enrolled_subjects': enrolled_subjects,
        'total_paid': sum(s['fee'] for s in enrolled_subjects),
        'receipt_token': receipt_token,
        'message': 'Payment confirmed! Your account has been created successfully.',
    }, status=200)


def _send_registration_email(student, enrolled_subjects, receipt_token=None):
    """Send confirmation email with fee receipt PDF attached."""
    from django.core.mail import EmailMessage
    from django.conf import settings

    subjects_text = ', '.join(s['subject'] for s in enrolled_subjects)
    
    # Base URL for the receipt (defaulting to current production URL)
    base_url = "https://fee-collection-software-balkanjibar.vercel.app"
    receipt_link = f"{base_url}/download-receipt?token={receipt_token}" if receipt_token else "Viewable in your dashboard"

    message = f"""✅ Payment Successful
Student ID: {student.student_id}
Username:   {student.login_username}
Password:   {student.login_password_hint}
Subjects: {subjects_text}
Thanks for enrolling in Summer Camp 2026!

Your fee receipt is attached to this email as a PDF."""

    if not student.email:
        print("\n" + "="*50)
        print("SIMULATED SMS NOTIFICATION (No Email Provided)")
        print(f"To: {student.phone}")
        print("-" * 50)
        print(message.strip())
        print("="*50 + "\n")
        return

    # Generate the fee receipt PDF
    pdf_bytes = None
    try:
        from utils.receipts import generate_receipt_pdf
        # Extract order_id from enrolled payments
        from apps.payments.models import Payment
        latest_payment = Payment.objects.filter(
            enrollment__student=student,
            status='SUCCESS'
        ).order_by('-payment_date').first()
        order_id = latest_payment.razorpay_order_id if latest_payment else None
        
        pdf_bytes = generate_receipt_pdf(student=student, order_id=order_id)
        
        # PERSISTENCE: Save to the payment record in Cloudinary so it's ready for the dashboard
        if pdf_bytes and latest_payment and not latest_payment.receipt_pdf:
            try:
                from django.core.files.base import ContentFile
                filename = f"Registration_Receipt_{student.student_id}.pdf"
                latest_payment.receipt_pdf.save(filename, ContentFile(pdf_bytes), save=True)
                print(f"[CLOUD] Saved registration receipt to Cloudinary for {student.student_id}")
            except Exception as e:
                print(f"[CLOUD] Error saving to Cloudinary: {e}")
    except Exception as e:
        print(f"[PDF] Could not generate receipt PDF for attachment: {e}")

    try:
        email = EmailMessage(
            subject='Welcome to Balkanji Bari — Your Login Details',
            body=message.strip(),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@balkanjibari.org'),
            to=[student.email],
        )

        # Attach the fee receipt PDF if generated successfully
        if pdf_bytes:
            safe_name = ''.join(c if c.isalnum() else '_' for c in student.name)
            filename = f"FeeReceipt_{safe_name}_{student.student_id}.pdf"
            email.attach(filename, pdf_bytes, 'application/pdf')

        email.send(fail_silently=False)
        print(f"[EMAIL] Confirmation with receipt PDF sent to {student.email}")
    except Exception as e:
        print(f"[EMAIL] Error: {e}")
        # Log error but don't crash registration if smtp fails
        pass 


@api_view(['GET'])
@permission_classes([AllowAny])
def download_registration_receipt(request):
    """
    Generate and return a PDF receipt for a registered student.
    Uses token=<base64_encoded_student_id:order_id>
    """
    token = request.GET.get('token', '')
    if not token:
        return Response({'error': 'Token required.'}, status=400)

    import base64
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        student_id, order_id = decoded.split(':', 1)
        student = Student.objects.get(student_id=student_id)
    except Exception:
        return Response({'error': 'Invalid or expired token.'}, status=400)

    # Generate PDF using unified utility
    from utils.receipts import generate_receipt_pdf
    pdf_bytes = generate_receipt_pdf(student=student, order_id=order_id)

    # Build filename
    safe_name = ''.join(c if c.isalnum() else '_' for c in student.name)
    filename = f"Receipt_{safe_name}_{student.student_id}.pdf"

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

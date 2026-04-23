"""
Razorpay payment integration views.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.db import transaction
try:
    import razorpay
except ImportError:
    razorpay = None

import hashlib
import hmac

from apps.enrollments.models import Enrollment
from apps.payments.models import Payment
from apps.students.utils import get_or_repair_student


# Initialize Razorpay client
RAZORPAY_KEY_ID = getattr(settings, 'RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

# Initialize client if we have valid keys and razorpay is installed
razorpay_client = None
print(f"DEBUG: Initializing Razorpay with KEY_ID: {RAZORPAY_KEY_ID}")
print(f"DEBUG: RAZORPAY_KEY_SECRET present: {bool(RAZORPAY_KEY_SECRET)}")

if razorpay and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET and RAZORPAY_KEY_ID.startswith('rzp_'):
    try:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        print("DEBUG: Razorpay client successfully initialized.")
    except Exception as e:
        print(f"DEBUG: Failed to initialize Razorpay client: {e}")
        razorpay_client = None
else:
    print(f"DEBUG: Razorpay client NOT initialized. razorpay={bool(razorpay)}, KEY_ID={RAZORPAY_KEY_ID.startswith('rzp_') if RAZORPAY_KEY_ID else False}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_razorpay_order(request):
    """
    Create a Razorpay order for payment.
    Only students can create online payment orders.
    """
    # RBAC: Only students can initiate online payments
    if request.user.role != 'STUDENT':
        return Response({
            'success': False,
            'error': {'message': 'Only students can initiate online payments.'}
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Check/Repair student profile
    student = get_or_repair_student(request)
    
    # Diagnostic Headers
    headers = {
        'X-Student-Healed': str(getattr(request, '_student_healed', False)),
        'X-User-Role': request.user.role if request.user else 'ANONYMOUS'
    }
    
    if not student:
        return Response({
            'success': True,
            'linked': False,
            'error': {'message': 'Student profile not linked (Repair Failed)'}
        }, status=status.HTTP_200_OK, headers=headers)
    
    enrollment_id = request.data.get('enrollment_id')
    
    if not enrollment_id:
        return Response({
            'success': False,
            'error': {'message': 'enrollment_id is required'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get enrollment and validate it belongs to the logged-in student
        enrollment = Enrollment.objects.get(id=enrollment_id, is_deleted=False)
        
        # Validate enrollment belongs to the student
        if not hasattr(request.user, 'student_profile') or enrollment.student != request.user.student_profile:
            return Response({
                'success': False,
                'error': {'message': 'You can only pay for your own enrollments.'}
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Backend calculates the amount (pending amount)
        amount = float(enrollment.pending_amount)
        
        if amount <= 0:
            return Response({  
                'success': False,
                'error': {'message': 'No pending amount for this enrollment.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Convert amount to paise (Razorpay uses smallest currency unit)
        amount_paise = int(amount * 100)
        
        print(f"DEBUG: Creating Razorpay order for Enrollment {enrollment.id}")
        print(f"DEBUG: Amount: {amount}, Amount Paise: {amount_paise}")
        print(f"DEBUG: Razorpay Client Initialized: {razorpay_client is not None}")
        
        # Create Razorpay order
        if razorpay_client:
            try:
                order_data = {
                    'amount': amount_paise,
                    'currency': 'INR',
                    'receipt': f'ENR-{enrollment.enrollment_id}',
                    'notes': {
                        'enrollment_id': str(enrollment.id),
                        'student_name': enrollment.student.name,
                        'subject_name': enrollment.subject.name
                    }
                }
                
                razorpay_order = razorpay_client.order.create(data=order_data)
                order_id = razorpay_order['id']
                print(f"DEBUG: Created Real Razorpay Order ID: {order_id}")
            except Exception as e:
                print(f"DEBUG: Razorpay Order Creation Error: {e}")
                order_id = f'order_test_{enrollment.id}'
                print(f"DEBUG: Falling back to Mock Order ID: {order_id}")
        else:
            # Fallback for testing without Razorpay credentials
            order_id = f'order_test_{enrollment.id}'
            print(f"DEBUG: No Razorpay client, using Mock Order ID: {order_id}")
        
        # Create payment record with CREATED status
        from decimal import Decimal
        from django.utils import timezone
        
        payment = Payment.objects.create(
            enrollment=enrollment,
            amount=Decimal(str(amount)),
            payment_date=timezone.now().date(),
            payment_mode='ONLINE',
            razorpay_order_id=order_id,
            status='CREATED',
            recorded_by=request.user,
            notes=f'Online payment initiated for {enrollment.subject.name}'
        )
        
        response_data = {
            'success': True,
            'order_id': order_id,
            'amount': amount,
            'currency': 'INR',
            'key_id': RAZORPAY_KEY_ID,
            'payment_id': payment.id,
            'test_mode': not razorpay_client or order_id.startswith('order_test_'), # Added explicit flag
            'enrollment': {
                'id': enrollment.id,
                'enrollment_id': enrollment.enrollment_id,
                'student_name': enrollment.student.name,
                'subject_name': enrollment.subject.name
            }
        }
        
        print(f"DEBUG: Response Data: {response_data}")
        return Response(response_data, status=status.HTTP_200_OK)
            
    except Enrollment.DoesNotExist:
        return Response({
            'success': False,
            'error': {'message': 'Enrollment not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': {'message': str(e)}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def verify_razorpay_payment(request):
    """
    Verify Razorpay payment and update payment record.
    Only students can verify their own payments.
    """
    # RBAC: Only students can verify online payments
    if request.user.role != 'STUDENT':
        return Response({
            'success': False,
            'error': {'message': 'Only students can verify online payments.'}
        }, status=status.HTTP_403_FORBIDDEN)
    
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_signature = request.data.get('razorpay_signature')
    payment_id = request.data.get('payment_id')  # Payment ID from create_order response
    
    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return Response({
            'success': False,
            'error': {'message': 'Missing required payment verification data'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify signature
        if razorpay_client:
            generated_signature = hmac.new(
                RAZORPAY_KEY_SECRET.encode(),
                f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
                hashlib.sha256
            ).hexdigest()
            
            if generated_signature != razorpay_signature:
                # Mark payment as FAILED
                if payment_id:
                    try:
                        payment = Payment.objects.get(id=payment_id)
                        payment.status = 'FAILED'
                        payment.notes += ' | Payment verification failed: Invalid signature'
                        payment.save()
                    except Payment.DoesNotExist:
                        pass
                
                return Response({
                    'success': False,
                    'error': {'message': 'Invalid payment signature'}
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the payment record created during order creation
        try:
            payment = Payment.objects.select_for_update().get(
                razorpay_order_id=razorpay_order_id,
                status='CREATED'
            )
        except Payment.DoesNotExist:
            return Response({
                'success': False,
                'error': {'message': 'Payment record not found or already processed'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get enrollment with lock
        enrollment = payment.enrollment
        
        # Update payment record with success details
        from decimal import Decimal
        
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        payment.status = 'SUCCESS'
        payment.transaction_id = razorpay_payment_id
        payment.notes += ' | Payment verified and completed successfully'
        payment.save()
        
        # Update enrollment amounts
        enrollment.paid_amount += payment.amount
        enrollment.pending_amount = enrollment.total_fee - enrollment.paid_amount
        enrollment.save()
        
        # Generate URLs for receipt and ID card
        from django.urls import reverse
        receipt_url = f"/api/v1/payments/{payment.id}/download_receipt/"
        id_card_url = f"/api/v1/enrollments/{enrollment.id}/download-id-card/"
        
        # --- Send confirmation email (Live SMTP) ---
        try:
            from apps.students.registration_views import _send_registration_email
            
            # Simple subject list for existing payment
            payment_subjects = [{
                'subject': enrollment.subject.name,
                'batch_time': enrollment.batch_time,
                'fee': float(payment.amount)
            }]
            
            # Generate receipt token (encoded student_id:payment_id)
            import base64
            token = base64.urlsafe_b64encode(
                f"{enrollment.student.student_id}:PAY_{payment.id}".encode()
            ).decode()
            
            _send_registration_email(enrollment.student, payment_subjects, token)
            print(f"[EMAIL] Payment confirmation sent to {enrollment.student.email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send payment confirmation: {e}")

        # --- Send confirmation email (Live SMTP) ---
        try:
            from apps.students.registration_views import _send_registration_email
            
            # Simple subject list for existing payment
            payment_subjects = [{
                'subject': enrollment.subject.name,
                'batch_time': enrollment.batch_time,
                'fee': float(payment.amount)
            }]
            
            # Generate receipt token (encoded student_id:payment_id)
            import base64
            token = base64.urlsafe_b64encode(
                f"{enrollment.student.student_id}:PAY_{payment.id}".encode()
            ).decode()
            
            _send_registration_email(enrollment.student, payment_subjects, token)
            print(f"[EMAIL] Payment confirmation sent to {enrollment.student.email}")
        except Exception as e:
            print(f"[EMAIL] Failed to send payment confirmation: {e}")

        return Response({
            'success': True,
            'message': 'Payment verified and recorded successfully',
            'payment_id': payment.id,
            'receipt_id': payment.receipt_number,
            'receipt_url': receipt_url,
            'id_card_url': id_card_url,
            'enrollment_id': enrollment.id
        }, status=status.HTTP_200_OK)
        
    except Enrollment.DoesNotExist:
        return Response({
            'success': False,
            'error': {'message': 'Enrollment not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': {'message': str(e)}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_pending_fees(request):
    """
    Get all pending fees for the logged-in student.
    """
    try:
        # Get student with Ultra-Strict Healing
        student = get_or_repair_student(request)
        
        # Diagnostic Headers
        headers = {
            'X-Student-Healed': str(getattr(request, '_student_healed', False)),
            'X-User-Role': request.user.role if request.user else 'ANONYMOUS'
        }
        
        if not student:
            return Response({
                'success': True,
                'linked': False,
                'error': {'message': 'Student profile not linked (Repair Failed)'}
            }, status=status.HTTP_200_OK, headers=headers)
        
        # Get all active enrollments
        enrollments = Enrollment.objects.filter(
            student=student,
            is_deleted=False,
            status='ACTIVE'
        ).select_related('subject')
        
        data = []
        for enrollment in enrollments:
            data.append({
                'id': enrollment.id,
                'enrollment_id': enrollment.enrollment_id,
                'subject_name': enrollment.subject.name,
                'total_fee': float(enrollment.total_fee),
                'paid_amount': float(enrollment.paid_amount),
                'pending_amount': float(enrollment.pending_amount),
                'payment_status': enrollment.payment_status
            })
        
        return Response({
            'success': True,
            'data': data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': {'message': str(e)}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

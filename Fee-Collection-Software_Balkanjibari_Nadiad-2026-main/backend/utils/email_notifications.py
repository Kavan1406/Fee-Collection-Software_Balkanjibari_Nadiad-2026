"""
Student Login & Email Notification System
Session 14 - April 16, 2026
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.response import Response
import secrets
import string

class StudentCredentialManager:
    """
    Manages automatic credential generation for students
    Credentials format:
    - Username: STU{student_id} (e.g., STU0018229)
    - Password: {student_id}{last_4_digits_mobile} (e.g., STU00182294567)
    """
    
    @staticmethod
    def generate_password(student_id, phone):
        """
        Generate password from student ID and last 4 digits of mobile
        Format: STU0018229 + 4567 = STU00182294567
        """
        try:
            # Remove non-digits from phone
            digits = ''.join(filter(str.isdigit, phone)) if phone else '0000'
            # Get last 4 digits
            last_four = digits[-4:] if len(digits) >= 4 else digits.zfill(4)
            # Combine: student_id + last 4 digits of phone
            password = f"{student_id}{last_four}"
            return password
        except Exception as e:
            print(f"Error generating password: {e}")
            # Fallback: just student_id + random 4 digits
            return f"{student_id}{secrets.randbelow(10000):04d}"
    
    @staticmethod
    def generate_student_username(student_id):
        """
        Generate username from student ID
        Format: STU{student_id} (e.g., STU0018229)
        """
        return f"STU{student_id}"
    
    @staticmethod
    def create_student_login(student):
        """
        Create login credentials for student
        Returns: (username, password, created)
        Username: STU{student_id}
        Password: {student_id}{last_4_mobile_digits}
        """
        try:
            User = get_user_model()
            username = StudentCredentialManager.generate_student_username(student.student_id)
            password = StudentCredentialManager.generate_password(student.student_id, student.phone)

            # Create or update user account
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': student.email,
                    'first_name': student.name.split()[0] if student.name else 'Student',
                    'last_name': ' '.join(student.name.split()[1:]) if len(student.name.split()) > 1 else '',
                    'is_active': True
                }
            )
            
            # Set password if new user or password not yet set
            if created or not user.has_usable_password():
                user.set_password(password)
                user.save()
            
            # Link user to student profile
            if not hasattr(student, 'user') or student.user is None:
                student.user = user
                student.save()
            
            return username, password, created
        except Exception as e:
            print(f"Error creating student login: {e}")
            raise


class EmailNotificationService:
    """
    Sends email notifications for student registration and payment
    """
    
    @staticmethod
    def send_registration_confirmation(student, username, password):
        """
        Send welcome email with login credentials to student after registration
        """
        try:
            if not student.email:
                print(f"⚠️ Student {student.student_id} has no email address")
                return False
            
            # Prepare email context
            context = {
                'student_name': student.name,
                'student_id': student.student_id,
                'username': username,
                'password': password,
                'phone': student.phone,
                'organization_name': 'Balkanj Bari, Nadiad',
                'login_url': 'http://localhost:3002/login',  # Update for production
            }
            
            # Render HTML email
            html_message = render_to_string(
                'emails/student_registration.html',
                context
            )
            plain_message = strip_tags(html_message)
            
            # Send email
            email = EmailMultiAlternatives(
                subject=f'Welcome {student.name}! Your Login Credentials for Balkanj Bari',
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[student.email]
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)
            
            print(f"✓ Registration confirmation email sent to {student.email}")
            return True
            
        except Exception as e:
            print(f"Error sending registration email: {e}")
            return False
    
    @staticmethod
    def send_payment_confirmation(enrollment, payment):
        """
        Send payment confirmation email after successful payment
        """
        try:
            student = enrollment.student
            if not student.email:
                return False
            
            context = {
                'student_name': student.name,
                'student_id': student.student_id,
                'subject': enrollment.subject.name,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date,
                'payment_id': payment.payment_id,
                'receipt_number': payment.receipt_number,
                'payment_mode': payment.payment_mode,
                'organization_name': 'Balkanj Bari, Nadiad',
            }
            
            html_message = render_to_string(
                'emails/payment_confirmation.html',
                context
            )
            plain_message = strip_tags(html_message)
            
            email = EmailMultiAlternatives(
                subject=f'Payment Confirmation - {payment.payment_id}',
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[student.email]
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)
            
            print(f"✓ Payment confirmation email sent to {student.email}")
            return True
            
        except Exception as e:
            print(f"Error sending payment email: {e}")
            return False
    
    @staticmethod
    def send_pending_fees_reminder(student, enrollments):
        """
        Send reminder email for pending fees
        """
        try:
            if not student.email:
                return False
            
            # Calculate total pending
            total_pending = sum(float(e.pending_amount) for e in enrollments)
            
            if total_pending <= 0:
                return False
            
            context = {
                'student_name': student.name,
                'student_id': student.student_id,
                'total_pending': total_pending,
                'enrollments': [
                    {
                        'subject': e.subject.name,
                        'pending_amount': float(e.pending_amount)
                    }
                    for e in enrollments if e.pending_amount > 0
                ],
                'organization_name': 'Balkanj Bari, Nadiad',
            }
            
            html_message = render_to_string(
                'emails/pending_fees_reminder.html',
                context
            )
            plain_message = strip_tags(html_message)
            
            email = EmailMultiAlternatives(
                subject=f'Fee Payment Reminder - {student.name}',
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[student.email]
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)
            
            return True
            
        except Exception as e:
            print(f"Error sending reminder email: {e}")
            return False


# Email Templates (create in templates/emails/ directory)
STUDENT_REGISTRATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 5px; border: 1px solid #ddd; }
        .credential-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{ organization_name }}!</h1>
            <p>Your account has been successfully created.</p>
        </div>
        
        <div class="content">
            <p>Dear {{ student_name }},</p>
            
            <p>Thank you for registering with us! Your account has been created and is ready to use.</p>
            
            <h3>Your Login Credentials:</h3>
            <div class="credential-box">
                <p><strong>Student ID:</strong> {{ student_id }}</p>
                <p><strong>Username:</strong> {{ username }}</p>
                <p><strong>Password:</strong> {{ password }}</p>
                <p><strong>Phone:</strong> {{ phone }}</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security.</p>
            
            <a href="{{ login_url }}" class="button">Login to Your Dashboard</a>
            
            <p>If you have any questions or need assistance, please contact us.</p>
        </div>
        
        <div class="footer">
            <p>&copy; 2026 {{ organization_name }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

PAYMENT_CONFIRMATION_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #22c55e; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
        .details { background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; margin: 15px 0; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .details-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #666; }
        .amount { color: #22c55e; font-weight: bold; font-size: 18px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Payment Confirmed</h1>
            <p>Your payment has been successfully received</p>
        </div>
        
        <div class="content">
            <p>Dear {{ student_name }},</p>
            
            <h3>Payment Details:</h3>
            <div class="details">
                <div class="details-row">
                    <span class="label">Student ID:</span>
                    <span>{{ student_id }}</span>
                </div>
                <div class="details-row">
                    <span class="label">Subject:</span>
                    <span>{{ subject }}</span>
                </div>
                <div class="details-row">
                    <span class="label">Amount Paid:</span>
                    <span class="amount">₹{{ amount }}</span>
                </div>
                <div class="details-row">
                    <span class="label">Payment Date:</span>
                    <span>{{ payment_date }}</span>
                </div>
                <div class="details-row">
                    <span class="label">Payment ID:</span>
                    <span>{{ payment_id }}</span>
                </div>
                <div class="details-row">
                    <span class="label">Receipt No:</span>
                    <span>{{ receipt_number }}</span>
                </div>
                <div class="details-row">
                    <span class="label">Payment Mode:</span>
                    <span>{{ payment_mode }}</span>
                </div>
            </div>
            
            <p>Thank you for your timely payment. Your receipt has been generated and is available in your dashboard.</p>
        </div>
    </div>
</body>
</html>
"""

PENDING_FEES_REMINDER_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
        .amount { color: #ef4444; font-weight: bold; font-size: 16px; }
        .fees-list { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .fee-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Fee Payment Reminder</h1>
        </div>
        
        <div class="content">
            <p>Dear {{ student_name }},</p>
            
            <p>This is a friendly reminder that you have pending fees to pay.</p>
            
            <h3>Pending Fees Details:</h3>
            <div class="fees-list">
                {% for enrollment in enrollments %}
                <div class="fee-item">
                    <span>{{ enrollment.subject }}</span>
                    <span class="amount">₹{{ enrollment.pending_amount }}</span>
                </div>
                {% endfor %}
                <div class="fee-item" style="border-top: 2px solid #333; border-bottom: none; font-weight: bold;">
                    <span>Total Pending</span>
                    <span class="amount">₹{{ total_pending }}</span>
                </div>
            </div>
            
            <p>Please make the payment at your earliest convenience. You can pay online or offline.</p>
            
            <a href="http://localhost:3002/student/payments" class="button">Pay Now</a>
        </div>
    </div>
</body>
</html>
"""

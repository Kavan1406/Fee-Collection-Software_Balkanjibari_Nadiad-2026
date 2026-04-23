import os
import django
import pyotp
import base64
import binascii

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.authentication.models import User
from django_otp.plugins.otp_totp.models import TOTPDevice

def apply_credentials():
    print("Applying new credentials to Render DB...")
    
    # 1. Update Admin
    admin_user = User.objects.filter(role='ADMIN').first()
    if admin_user:
        print(f"Updating Admin user: {admin_user.username}")
        # Use existing username or Admin? User requested "username:Admin"
        admin_user.username = 'Admin'
        admin_user.set_password('Admin1234')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.is_active = True
        admin_user.save()
        print(f"  Admin username set to 'Admin', password set to 'Admin1234'")
        
        # 2FA Configuration for Admin
        device = TOTPDevice.objects.filter(user=admin_user).first()
        if not device:
            print("  Creating new TOTP device...")
            device = TOTPDevice.objects.create(user=admin_user, name="Admin-Default-TOTP", confirmed=True)
        else:
            print("  Updating existing TOTP device...")
            device.confirmed = True
            device.save()
            
        # Extract secret key
        # django-otp stores the secret as hex string in 'key'
        secret_hex = device.key
        
        # Convert hex to base32 for Google Authenticator
        try:
            raw_bytes = binascii.unhexlify(secret_hex)
            secret_b32 = base64.b32encode(raw_bytes).decode('utf-8').replace('=', '')
            print(f"  2FA ENABLED for 'Admin'")
            print(f"  2FA Secret Key (Base32): {secret_b32}")
        except Exception as e:
            print(f"  Error converting secret: {e}")
            # Fallback to generating a fresh one if extraction fails
            print("  Generating fresh secret...")
            TOTPDevice.objects.filter(user=admin_user).delete()
            device = TOTPDevice.objects.create(user=admin_user, name="Admin-Default-TOTP", confirmed=True)
            secret_hex = device.key
            secret_b32 = base64.b32encode(binascii.unhexlify(secret_hex)).decode('utf-8').replace('=', '')
            print(f"  2FA ENABLED for 'Admin'")
            print(f"  NEW 2FA Secret Key (Base32): {secret_b32}")
            
    else:
        print("Creating new Admin user...")
        admin_user = User.objects.create_superuser('Admin', 'admin@example.com', 'Admin1234', role='ADMIN')
        device = TOTPDevice.objects.create(user=admin_user, name="Admin-Default-TOTP", confirmed=True)
        secret_b32 = base64.b32encode(binascii.unhexlify(device.key)).decode('utf-8').replace('=', '')
        print(f"  Admin user created.")
        print(f"  2FA Secret Key (Base32): {secret_b32}")

    # 2. Update Staff
    staff_user = User.objects.filter(role='STAFF').first()
    if staff_user:
        print(f"Updating Staff user: {staff_user.username}")
        staff_user.set_password('Staff1234')
        staff_user.is_active = True
        staff_user.save()
        print("  Staff password set to 'Staff1234'")
    else:
        print("Creating new Staff user...")
        User.objects.create_user('staff', 'staff@example.com', 'Staff1234', role='STAFF', is_staff=True)
        print("  Staff user created.")

    # 3. Update Student
    student_user = User.objects.filter(role='STUDENT').first()
    if student_user:
        print(f"Updating Student user: {student_user.username}")
        student_user.set_password('Student1234')
        student_user.is_active = True
        student_user.save()
        print(f"  Student ({student_user.username}) password set to 'Student1234'")
    else:
        print("Creating new Student user...")
        User.objects.create_user('stu056', 'student@example.com', 'Student1234', role='STUDENT')
        print("  Student user created.")

    print("\nCredentials update complete.")

if __name__ == "__main__":
    apply_credentials()

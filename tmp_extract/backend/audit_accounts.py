import os
import django
import sys
from django.db import connection

# Set up Django environment
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.authentication.models import User
from django_otp.plugins.otp_totp.models import TOTPDevice

def audit_full_system():
    print("--- 🛡️ FINAL SYSTEM AUDIT: User Directory ---")
    
    users = User.objects.all()
    print(f"Total Users: {users.count()}")
    
    roles = ['ADMIN', 'STAFF', 'ACCOUNTANT', 'STUDENT']
    for role in roles:
        role_users = users.filter(role=role)
        print(f"\n[{role}] Count: {role_users.count()}")
        for u in role_users:
            has_device = TOTPDevice.objects.filter(user=u, confirmed=True).exists()
            pending_device = TOTPDevice.objects.filter(user=u, confirmed=False).exists()
            status = "✅ 2FA ACTIVE" if has_device else ("⏳ 2FA PENDING" if pending_device else "❌ NO 2FA")
            dashboard = "🖥️ Dashboard: YES" if u.can_view_dashboard else "🚫 Dashboard: NO"
            print(f"- {u.username} ({u.email}) | {status} | {dashboard}")

    print("\n🏁 Audit Complete.")

if __name__ == "__main__":
    audit_full_system()

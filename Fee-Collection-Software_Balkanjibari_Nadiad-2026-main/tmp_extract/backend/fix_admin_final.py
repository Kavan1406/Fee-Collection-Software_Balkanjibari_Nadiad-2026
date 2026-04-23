"""
Fix administrative flags for all ADMIN role users in Render PostgreSQL.
"""
import os
import sys
import django

sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.authentication.models import User

# Fix all ADMIN role users
admin_users = User.objects.filter(role='ADMIN')
print(f"Found {admin_users.count()} admin users.")

for user in admin_users:
    print(f"Updating {user.username}...")
    user.is_active = True
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"  {user.username} is now active, staff, and superuser.")

# Ensure 'admin' has the password 'admin123'
try:
    admin = User.objects.get(username='admin')
    admin.set_password('admin123')
    admin.save()
    print("\n'admin' password set to 'admin123'.")
except:
    pass

# Ensure 'admin_test' has the password 'admin123'
try:
    admin_test = User.objects.get(username='admin_test')
    admin_test.set_password('admin123')
    admin_test.save()
    print("\n'admin_test' password set to 'admin123'.")
except:
    pass

print("\nValidation check:")
for u in User.objects.filter(role='ADMIN'):
    print(f" - {u.username}: active={u.is_active}, staff={u.is_staff}, superuser={u.is_superuser}")

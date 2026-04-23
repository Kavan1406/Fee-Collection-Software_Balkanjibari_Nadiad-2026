from django.contrib.auth import get_user_model
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

User = get_user_model()
u = User.objects.filter(username__iexact='admin').first()

if u:
    print(f"--- USER AUDIT ---")
    print(f"Username: {u.username}")
    print(f"Role: '{u.role}'")
    print(f"Is Staff: {u.is_staff}")
    print(f"Is Superuser: {u.is_superuser}")
    print(f"Is Active: {u.is_active}")
    print(f"------------------")
    
    # Check case sensitivity
    if u.role != 'ADMIN':
        print(f"WARNING: Role is '{u.role}', not 'ADMIN'. This will cause 403 errors.")
else:
    print("ERROR: User 'admin' not found.")

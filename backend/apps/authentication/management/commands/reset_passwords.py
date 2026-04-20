"""
Management command to reset admin password.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Reset admin and staff user passwords'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Resetting user passwords...')
        
        # Reset admin password
        try:
            admin = User.objects.get(username='admin')
            admin.set_password('admin123')
            admin.is_active = True
            admin.save()
            self.stdout.write(self.style.SUCCESS('✓ Admin password reset: admin / admin123'))
        except User.DoesNotExist:
            # Create admin if doesn't exist
            admin = User.objects.create_superuser(
                username='admin',
                email='admin@edumanager.com',
                password='admin123',
                first_name='Admin',
                last_name='User',
                role='ADMIN'
            )
            self.stdout.write(self.style.SUCCESS('✓ Created admin user: admin / admin123'))
        
        # Reset staff password
        try:
            staff = User.objects.get(username='staff')
            staff.set_password('staff123')
            staff.is_active = True
            staff.save()
            self.stdout.write(self.style.SUCCESS('✓ Staff password reset: staff / staff123'))
        except User.DoesNotExist:
            # Create staff if doesn't exist
            staff = User.objects.create_user(
                username='staff',
                email='staff@edumanager.com',
                password='staff123',
                first_name='Staff',
                last_name='Member',
                role='STAFF',
                is_staff=True
            )
            self.stdout.write(self.style.SUCCESS('✓ Created staff user: staff / staff123'))
        
        # Verify passwords
        self.stdout.write('\nVerifying passwords...')
        admin_check = admin.check_password('admin123')
        staff_check = staff.check_password('staff123')
        
        if admin_check and staff_check:
            self.stdout.write(self.style.SUCCESS('✓ All passwords verified successfully!'))
            self.stdout.write(self.style.SUCCESS('\nYou can now login with:'))
            self.stdout.write(self.style.SUCCESS('  Admin: admin / admin123'))
            self.stdout.write(self.style.SUCCESS('  Staff: staff / staff123'))
        else:
            self.stdout.write(self.style.ERROR('✗ Password verification failed!'))

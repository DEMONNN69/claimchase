"""
Django management command to create superuser on remote database
Run: python manage.py create_remote_superuser
"""

from django.core.management.base import BaseCommand
from claimchase.apps.users.models import CustomUser


class Command(BaseCommand):
    help = 'Create a superuser on remote database'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating superuser for remote database...\n')
        
        email = input('Email: ')
        password = input('Password: ')
        
        if not email or not password:
            self.stdout.write(self.style.ERROR('Email and password are required'))
            return
        
        # Check if user already exists
        if CustomUser.objects.filter(email=email).exists():
            self.stdout.write(self.style.ERROR(f'User with email {email} already exists'))
            return
        
        try:
            # Create superuser using custom manager
            user = CustomUser.objects.create_superuser(
                email=email,
                password=password,
                first_name='Admin',
                last_name='User',
            )
            
            self.stdout.write(self.style.SUCCESS(f'\n✅ Superuser created successfully!'))
            self.stdout.write(f'   Email: {user.email}')
            self.stdout.write(f'   ID: {user.id}')
            self.stdout.write(f'   is_staff: {user.is_staff}')
            self.stdout.write(f'   is_superuser: {user.is_superuser}')
            self.stdout.write(f'   is_verified: {user.is_verified}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating superuser: {str(e)}'))

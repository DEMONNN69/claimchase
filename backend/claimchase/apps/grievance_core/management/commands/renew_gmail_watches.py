"""
Management command to renew expiring Gmail watches.

Run daily via cron or task scheduler:
    python manage.py renew_gmail_watches

Gmail watches expire after 7 days, this command renews watches
that will expire within 2 days.
"""

from django.core.management.base import BaseCommand
from claimchase.apps.grievance_core.webhooks import renew_gmail_watches


class Command(BaseCommand):
    help = 'Renew Gmail Pub/Sub watches that are about to expire'

    def handle(self, *args, **options):
        self.stdout.write('Starting Gmail watch renewal...')
        
        renewed, failed = renew_gmail_watches()
        
        self.stdout.write(
            self.style.SUCCESS(f'Completed: {renewed} renewed, {failed} failed')
        )

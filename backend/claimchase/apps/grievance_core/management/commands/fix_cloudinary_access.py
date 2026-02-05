"""
Django management command to fix access control for existing Cloudinary documents.
Run this to make all existing PDFs publicly accessible.

Usage:
    python manage.py fix_cloudinary_access
"""

from django.core.management.base import BaseCommand
import cloudinary.uploader
from claimchase.apps.grievance_core.models import Document
from claimchase.apps.consumer_disputes.models import DisputeDocument


class Command(BaseCommand):
    help = 'Fix Cloudinary access control for existing documents to make them publicly accessible'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Fix insurance claim documents
        self.stdout.write(self.style.NOTICE('Processing insurance claim documents...'))
        claim_docs = Document.objects.all()
        claim_success = 0
        claim_errors = 0
        claim_not_found = 0
        
        for doc in claim_docs:
            if doc.file and hasattr(doc.file, 'public_id'):
                try:
                    public_id = doc.file.public_id
                    if not dry_run:
                        cloudinary.uploader.explicit(
                            public_id,
                            type='upload',
                            resource_type='raw',
                            access_mode='public'
                        )
                    claim_success += 1
                    self.stdout.write(f'  ✓ {doc.file_name}')
                except Exception as e:
                    if 'not found' in str(e).lower():
                        claim_not_found += 1
                        self.stdout.write(self.style.WARNING(f'  ⚠ {doc.file_name}: File not found in Cloudinary (may have been deleted)'))
                    else:
                        claim_errors += 1
                        self.stdout.write(self.style.ERROR(f'  ✗ {doc.file_name}: {e}'))
        
        # Fix consumer dispute documents
        self.stdout.write(self.style.NOTICE('\nProcessing consumer dispute documents...'))
        dispute_docs = DisputeDocument.objects.all()
        dispute_success = 0
        dispute_errors = 0
        dispute_not_found = 0
        
        for doc in dispute_docs:
            if doc.file and hasattr(doc.file, 'public_id'):
                try:
                    public_id = doc.file.public_id
                    if not dry_run:
                        cloudinary.uploader.explicit(
                            public_id,
                            type='upload',
                            resource_type='raw',
                            access_mode='public'
                        )
                    dispute_success += 1
                    self.stdout.write(f'  ✓ {doc.file_name}')
                except Exception as e:
                    if 'not found' in str(e).lower():
                        dispute_not_found += 1
                        self.stdout.write(self.style.WARNING(f'  ⚠ {doc.file_name}: File not found in Cloudinary (may have been deleted)'))
                    else:
                        dispute_errors += 1
                        self.stdout.write(self.style.ERROR(f'  ✗ {doc.file_name}: {e}'))
        self.stdout.write(f'Claim documents: {claim_success} fixed, {claim_not_found} not found, {claim_errors} errors')
        self.stdout.write(f'Dispute documents: {dispute_success} fixed, {dispute_not_found} not found, {dispute_errors} errors')
        total_fixed = claim_success + dispute_success
        total_not_found = claim_not_found + dispute_not_found
        total_errors = claim_errors + dispute_errors
        self.stdout.write(f'\nTotal: {total_fixed} fixed, {total_not_found} not found, {total_errors} errors')
        
        if total_not_found > 0:
            self.stdout.write(self.style.WARNING(f'\n⚠ {total_not_found} files not found in Cloudinary - they may need to be re-uploaded'))
        self.stdout.write(self.style.SUCCESS('SUMMARY'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'Claim documents: {claim_success} fixed, {claim_errors} errors')
        self.stdout.write(f'Dispute documents: {dispute_success} fixed, {dispute_errors} errors')
        self.stdout.write(f'Total: {claim_success + dispute_success} fixed, {claim_errors + dispute_errors} errors')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. Run without --dry-run to apply changes.'))

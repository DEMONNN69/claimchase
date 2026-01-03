"""
Django management command to seed insurance company data
Run: python manage.py seed_insurance_companies
"""

from django.core.management.base import BaseCommand
from claimchase.apps.grievance_core.models import InsuranceCompany


class Command(BaseCommand):
    help = 'Seed insurance companies with grievance contact details'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting insurance company data seeding...')
        
        insurance_data = [
            # LIFE INSURANCE COMPANIES
            {
                'name': 'LIC (Life Insurance Corporation of India)',
                'category': 'life',
                'grievance_email': 'co_complaints@licindia.com',
                'additional_emails': [],
                'grievance_helpline': '1800-223-4696',
                'gro_email': '',
                'website': 'https://licindia.in/grievances',
            },
            {
                'name': 'HDFC Life Insurance Company Limited',
                'category': 'life',
                'grievance_email': 'gro@hdfclife.com',
                'additional_emails': ['service@hdfclife.com'],
                'grievance_helpline': '022-68446530 (Mon-Sat, 10 AM-7 PM); Toll Free: 1860-267-9999',
                'gro_email': 'gro@hdfclife.com',
                'website': 'https://www.hdfclife.com/customer-service/grievance-redressal',
            },
            {
                'name': 'ICICI Prudential Life Insurance Company Limited',
                'category': 'life',
                'grievance_email': 'gro@iciciprulife.com',
                'additional_emails': [],
                'grievance_helpline': '1860-500-5555; +91 98201 98201 (Mon-Sat, 10 AM-7 PM)',
                'gro_email': 'gro@iciciprulife.com',
                'website': 'https://www.iciciprulife.com/services/grievance-redressal.html',
            },
            {
                'name': 'SBI Life Insurance Company Limited',
                'category': 'life',
                'grievance_email': 'gro@sbilife.co.in',
                'additional_emails': ['info@sbilife.co.in'],
                'grievance_helpline': '1800-267-9090',
                'gro_email': 'gro@sbilife.co.in',
                'website': 'https://www.sbilife.co.in/en/grievances',
            },
            {
                'name': 'Aditya Birla Sun Life Insurance Company Limited',
                'category': 'life',
                'grievance_email': 'gro@adityabirlacapital.com',
                'additional_emails': [],
                'grievance_helpline': '1800-270-7000',
                'gro_email': 'gro@adityabirlacapital.com',
                'website': 'https://lifeinsurance.adityabirlacapital.com/grievance-redressal/',
            },
            {
                'name': 'Bajaj Allianz Life Insurance Company Limited',
                'category': 'life',
                'grievance_email': 'customercare@bajajallianz.co.in',
                'additional_emails': ['gro@bajajallianz.co.in'],
                'grievance_helpline': '1800-233-7272 (7 days, 9 AM-7 PM); Customer Care: 1800-209-7272',
                'gro_email': 'gro@bajajallianz.co.in',
                'website': 'https://www.bajajallianzlife.com',
            },
            {
                'name': 'Kotak Mahindra Life Insurance Company Limited',
                'category': 'life',
                'grievance_email': 'kli.grievance@kotak.com',
                'additional_emails': ['gro@kotak.com'],
                'grievance_helpline': '1800-209-8800 (Mon-Sat, 8 AM-10 PM)',
                'gro_email': 'gro@kotak.com',
                'website': 'https://www.cioins.co.in/GROLife',
            },
            {
                'name': 'Tata AIA Life Insurance Company Limited',
                'category': 'life',
                'grievance_email': 'life.complaints@tataaia.com',
                'additional_emails': ['GRO@tataaia.com'],
                'grievance_helpline': '+91-8655452390 (Mon-Fri, 10 AM-7 PM)',
                'gro_email': 'GRO@tataaia.com',
                'website': 'https://www.tataaia.com/customer-service/grievance-redressal.html',
            },
            
            # HEALTH INSURANCE COMPANIES
            {
                'name': 'Star Health and Allied Insurance Company Limited',
                'category': 'health',
                'grievance_email': 'gro@starhealth.in',
                'additional_emails': ['grievances@starhealth.in'],
                'grievance_helpline': '1800-425-2255; 044-6900-6900; Senior Citizens: 044-6900-7500',
                'gro_email': 'gro@starhealth.in',
                'website': 'https://www.starhealth.in/grievance-redressal/',
            },
            {
                'name': 'Niva Bupa Health Insurance Company Limited',
                'category': 'health',
                'grievance_email': 'customercare@maxbupa.com',
                'additional_emails': ['seniorcitizensupport@nivabupa.com'],
                'grievance_helpline': '1860-500-8888 (24x7)',
                'gro_email': 'customercare@maxbupa.com',
                'website': 'https://transactions.nivabupa.com/pages/grievance-redressal.aspx',
            },
            {
                'name': 'Apollo Munich Health Insurance Company Limited',
                'category': 'health',
                'grievance_email': 'customerservice@apollomunichinsurance.com',
                'additional_emails': [],
                'grievance_helpline': '1800-102-0333',
                'gro_email': 'customerservice@apollomunichinsurance.com',
                'website': '',
            },
            {
                'name': 'Go Digit Health Insurance Company Limited',
                'category': 'health',
                'grievance_email': 'grievance@godigit.com',
                'additional_emails': ['gro@godigit.com'],
                'grievance_helpline': '1800-258-4242 (24x7)',
                'gro_email': 'gro@godigit.com',
                'website': 'https://www.godigit.com/claim/grievance-redressal-procedure',
                'correspondence_address': 'Atlantis, 95, 4th B Cross Road, Koramangala Industrial Layout, 5th Block, Bengaluru 560095',
            },
            {
                'name': 'Bajaj Allianz Health Insurance Company Limited',
                'category': 'health',
                'grievance_email': 'bagichelp@bajajallianz.co.in',
                'additional_emails': ['customercare@bajajallianz.co.in', 'ggro@bajajallianz.co.in'],
                'grievance_helpline': '1800-209-5858; 80809-45060 (Missed Call)',
                'gro_email': 'ggro@bajajallianz.co.in',
                'website': '',
            },
            
            # GENERAL INSURANCE COMPANIES
            {
                'name': 'HDFC ERGO General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'grievance@hdfcergo.com',
                'additional_emails': ['cgo@hdfcergo.com'],
                'grievance_helpline': '1800-267-7444 (Mon-Sat, 9 AM-6 PM); Senior Citizens: 022-6158-2026',
                'gro_email': 'gro@hdfcergo.com',
                'website': 'https://www.hdfcergo.com/customer-voice/grievances',
            },
            {
                'name': 'Bajaj Allianz General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'customercare@bajajallianz.co.in',
                'additional_emails': ['irda.nonlifecomplaints@bajajallianz.co.in'],
                'grievance_helpline': '1800-209-5858; 1800-102-5858; 020-3030-5858',
                'gro_email': 'gro@bajajallianz.co.in',
                'website': '',
            },
            {
                'name': 'New India Assurance Company Limited',
                'category': 'general',
                'grievance_email': 'gro@newindia.co.in',
                'additional_emails': [],
                'grievance_helpline': '022-2270-8212',
                'gro_email': 'gro@newindia.co.in',
                'website': 'https://www.newindia.co.in/grievance',
            },
            {
                'name': 'ICICI Lombard General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'customersupport@icicilombard.com',
                'additional_emails': ['gro@icicilombard.com'],
                'grievance_helpline': '1800-2666 (Toll Free, 24x7); WhatsApp: +917738282666',
                'gro_email': 'gro@icicilombard.com',
                'website': 'https://www.icicilombard.com/grievance-redressal',
            },
            {
                'name': 'Reliance General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'rgicl.services@relianceada.com',
                'additional_emails': ['rgicl.grievances@relianceada.com', 'rgicl.headgrievances@relianceada.com'],
                'grievance_helpline': '022-4890-3009; 1800-209-5522; Senior Citizens: 022-3383-4185',
                'gro_email': 'rgicl.headgrievances@relianceada.com',
                'website': 'https://www.reliancegeneral.co.in',
            },
            {
                'name': 'SBI General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'virag.mishra@sbigeneral.in',
                'additional_emails': ['gro@sbigeneral.in'],
                'grievance_helpline': '1800-266-9400',
                'gro_email': 'gro@sbigeneral.in',
                'website': 'https://www.sbigeneral.in/grievance-redressal',
            },
            {
                'name': 'Tata AIG General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'customersupport@tataaig.com',
                'additional_emails': ['head.customerservices@tataaig.com'],
                'grievance_helpline': '',
                'gro_email': 'gro@tataaig.com',
                'website': 'https://www.tataaig.com/grievance-redressal-policy',
            },
            {
                'name': 'Kotak Mahindra General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'rahul.wadhwa@kotak.com',
                'additional_emails': ['grievanceofficer@kotak.com'],
                'grievance_helpline': '1800-266-4545 (24x7)',
                'gro_email': 'grievanceofficer@kotak.com',
                'website': 'https://www.cioins.co.in/GRONonLife',
            },
            {
                'name': 'Go Digit General Insurance Company Limited',
                'category': 'general',
                'grievance_email': 'grievance@godigit.com',
                'additional_emails': ['gro@godigit.com'],
                'grievance_helpline': '1800-258-5956 (Motor 24x7)',
                'gro_email': 'gro@godigit.com',
                'website': 'https://www.godigit.com/claim/grievance-redressal-procedure',
                'correspondence_address': 'Atlantis, 95, 4th B Cross Road, Koramangala Industrial Layout, 5th Block, Bengaluru 560095',
            },
            {
                'name': 'ACKO General Insurance Limited',
                'category': 'general',
                'grievance_email': 'reena.evans@acko.com',
                'additional_emails': ['gro@acko.com'],
                'grievance_helpline': '',
                'gro_email': 'gro@acko.com',
                'website': '',
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for data in insurance_data:
            company, created = InsuranceCompany.objects.update_or_create(
                name=data['name'],
                defaults={
                    'category': data['category'],
                    'grievance_email': data['grievance_email'],
                    'additional_emails': data.get('additional_emails', []),
                    'grievance_helpline': data.get('grievance_helpline', ''),
                    'gro_email': data.get('gro_email', ''),
                    'website': data.get('website', ''),
                    'correspondence_address': data.get('correspondence_address', ''),
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {company.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'↻ Updated: {company.name}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Seeding complete!'))
        self.stdout.write(f'   Created: {created_count}')
        self.stdout.write(f'   Updated: {updated_count}')
        self.stdout.write(f'   Total: {created_count + updated_count}')

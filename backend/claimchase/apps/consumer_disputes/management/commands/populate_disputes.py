"""
Management command to populate consumer dispute categories, subcategories, and entities.
"""

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from claimchase.apps.consumer_disputes.models import DisputeCategory, Entity


class Command(BaseCommand):
    help = 'Populate consumer dispute categories, subcategories, and popular entities'

    def handle(self, *args, **options):
        self.stdout.write('Populating consumer dispute data...\n')
        
        # Create categories and subcategories
        categories_data = {
            'Online Shopping': {
                'icon': 'shopping-bag',
                'description': 'E-commerce and online retail disputes',
                'subcategories': [
                    {'name': 'Electronics', 'description': 'Phones, laptops, gadgets'},
                    {'name': 'Fashion & Apparel', 'description': 'Clothing, shoes, accessories'},
                    {'name': 'Home & Kitchen', 'description': 'Appliances, furniture, decor'},
                    {'name': 'Beauty & Personal Care', 'description': 'Cosmetics, skincare, grooming'},
                    {'name': 'Books & Media', 'description': 'Books, music, movies'},
                    {'name': 'Grocery & Food', 'description': 'Online grocery and food delivery'},
                ]
            },
            'Airlines': {
                'icon': 'plane',
                'description': 'Flight bookings and airline service issues',
                'subcategories': [
                    {'name': 'Domestic Flights', 'description': 'Within India flight issues'},
                    {'name': 'International Flights', 'description': 'International travel issues'},
                    {'name': 'Refunds & Cancellations', 'description': 'Flight cancellation and refund problems'},
                    {'name': 'Baggage Issues', 'description': 'Lost, delayed, or damaged baggage'},
                    {'name': 'Booking Issues', 'description': 'Ticket booking problems'},
                ]
            },
            'Travel & Hotels': {
                'icon': 'hotel',
                'description': 'Hotel bookings and travel service disputes',
                'subcategories': [
                    {'name': 'Hotel Bookings', 'description': 'Hotel reservation issues'},
                    {'name': 'Holiday Packages', 'description': 'Travel package disputes'},
                    {'name': 'Car Rentals', 'description': 'Vehicle rental problems'},
                    {'name': 'Bus & Train Bookings', 'description': 'Ground transport booking issues'},
                ]
            },
            'Food Delivery': {
                'icon': 'utensils',
                'description': 'Online food ordering and delivery issues',
                'subcategories': [
                    {'name': 'Order Issues', 'description': 'Wrong or missing items'},
                    {'name': 'Refund Problems', 'description': 'Payment and refund disputes'},
                    {'name': 'Delivery Issues', 'description': 'Late or no delivery'},
                    {'name': 'Quality Complaints', 'description': 'Food quality issues'},
                ]
            },
            'Banking & Finance': {
                'icon': 'landmark',
                'description': 'Banking services and financial product issues',
                'subcategories': [
                    {'name': 'Credit Cards', 'description': 'Credit card billing and service issues'},
                    {'name': 'Debit Cards', 'description': 'Debit card transaction issues'},
                    {'name': 'UPI & Digital Payments', 'description': 'UPI, wallets, online payment issues'},
                    {'name': 'Loans', 'description': 'Loan disbursement and EMI issues'},
                    {'name': 'Account Services', 'description': 'Bank account related issues'},
                ]
            },
            'Telecom & Internet': {
                'icon': 'wifi',
                'description': 'Mobile and internet service provider issues',
                'subcategories': [
                    {'name': 'Mobile Services', 'description': 'Prepaid/postpaid mobile issues'},
                    {'name': 'Broadband', 'description': 'Internet connectivity issues'},
                    {'name': 'DTH & Cable', 'description': 'TV service issues'},
                    {'name': 'Billing Issues', 'description': 'Incorrect billing'},
                ]
            },
            'E-Wallet & Fintech': {
                'icon': 'wallet',
                'description': 'Digital wallet and fintech app issues',
                'subcategories': [
                    {'name': 'Payment Failed', 'description': 'Failed transactions'},
                    {'name': 'Refund Issues', 'description': 'Refund not received'},
                    {'name': 'Account Issues', 'description': 'Account access problems'},
                    {'name': 'Cashback & Offers', 'description': 'Promotional offer disputes'},
                ]
            },
        }

        created_categories = {}
        
        for cat_name, cat_data in categories_data.items():
            category, created = DisputeCategory.objects.get_or_create(
                slug=slugify(cat_name),
                defaults={
                    'name': cat_name,
                    'description': cat_data['description'],
                    'icon': cat_data['icon'],
                    'parent': None,
                    'is_active': True,
                }
            )
            created_categories[cat_name] = category
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  Category: {cat_name} - {status}')
            
            # Create subcategories
            for idx, subcat_data in enumerate(cat_data['subcategories']):
                subcat, sub_created = DisputeCategory.objects.get_or_create(
                    slug=slugify(f"{cat_name}-{subcat_data['name']}"),
                    defaults={
                        'name': subcat_data['name'],
                        'description': subcat_data['description'],
                        'parent': category,
                        'display_order': idx,
                        'is_active': True,
                    }
                )
                status = 'Created' if sub_created else 'Already exists'
                self.stdout.write(f'    Sub-category: {subcat_data["name"]} - {status}')

        self.stdout.write('\nPopulating entities...\n')

        # Popular entities with their categories
        entities_data = [
            # Online Shopping
            {
                'name': 'Amazon India',
                'website': 'https://www.amazon.in',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Flipkart',
                'website': 'https://www.flipkart.com',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Myntra',
                'website': 'https://www.myntra.com',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Ajio',
                'website': 'https://www.ajio.com',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Meesho',
                'website': 'https://www.meesho.com',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Snapdeal',
                'website': 'https://www.snapdeal.com',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Nykaa',
                'website': 'https://www.nykaa.com',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Tata CLiQ',
                'website': 'https://www.tatacliq.com',
                'categories': ['Online Shopping'],
                'is_verified': True,
            },
            
            # Airlines
            {
                'name': 'IndiGo',
                'website': 'https://www.goindigo.in',
                'categories': ['Airlines'],
                'is_verified': True,
            },
            {
                'name': 'Air India',
                'website': 'https://www.airindia.com',
                'categories': ['Airlines'],
                'is_verified': True,
            },
            {
                'name': 'SpiceJet',
                'website': 'https://www.spicejet.com',
                'categories': ['Airlines'],
                'is_verified': True,
            },
            {
                'name': 'Vistara',
                'website': 'https://www.airvistara.com',
                'categories': ['Airlines'],
                'is_verified': True,
            },
            {
                'name': 'Go First',
                'website': 'https://www.flygofirst.com',
                'categories': ['Airlines'],
                'is_verified': True,
            },
            {
                'name': 'AirAsia India',
                'website': 'https://www.airasia.co.in',
                'categories': ['Airlines'],
                'is_verified': True,
            },
            {
                'name': 'Akasa Air',
                'website': 'https://www.akasaair.com',
                'categories': ['Airlines'],
                'is_verified': True,
            },
            
            # Travel & Hotels
            {
                'name': 'MakeMyTrip',
                'website': 'https://www.makemytrip.com',
                'categories': ['Travel & Hotels', 'Airlines'],
                'is_verified': True,
            },
            {
                'name': 'Goibibo',
                'website': 'https://www.goibibo.com',
                'categories': ['Travel & Hotels', 'Airlines'],
                'is_verified': True,
            },
            {
                'name': 'Yatra',
                'website': 'https://www.yatra.com',
                'categories': ['Travel & Hotels', 'Airlines'],
                'is_verified': True,
            },
            {
                'name': 'Cleartrip',
                'website': 'https://www.cleartrip.com',
                'categories': ['Travel & Hotels', 'Airlines'],
                'is_verified': True,
            },
            {
                'name': 'OYO Rooms',
                'website': 'https://www.oyorooms.com',
                'categories': ['Travel & Hotels'],
                'is_verified': True,
            },
            {
                'name': 'Booking.com',
                'website': 'https://www.booking.com',
                'categories': ['Travel & Hotels'],
                'is_verified': True,
            },
            {
                'name': 'Agoda',
                'website': 'https://www.agoda.com',
                'categories': ['Travel & Hotels'],
                'is_verified': True,
            },
            {
                'name': 'IRCTC',
                'website': 'https://www.irctc.co.in',
                'categories': ['Travel & Hotels'],
                'is_verified': True,
            },
            {
                'name': 'RedBus',
                'website': 'https://www.redbus.in',
                'categories': ['Travel & Hotels'],
                'is_verified': True,
            },
            
            # Food Delivery
            {
                'name': 'Zomato',
                'website': 'https://www.zomato.com',
                'categories': ['Food Delivery'],
                'is_verified': True,
            },
            {
                'name': 'Swiggy',
                'website': 'https://www.swiggy.com',
                'categories': ['Food Delivery'],
                'is_verified': True,
            },
            {
                'name': 'EatSure',
                'website': 'https://www.eatsure.com',
                'categories': ['Food Delivery'],
                'is_verified': True,
            },
            {
                'name': 'Dominos India',
                'website': 'https://www.dominos.co.in',
                'categories': ['Food Delivery'],
                'is_verified': True,
            },
            {
                'name': 'Pizza Hut India',
                'website': 'https://www.pizzahut.co.in',
                'categories': ['Food Delivery'],
                'is_verified': True,
            },
            {
                'name': 'BigBasket',
                'website': 'https://www.bigbasket.com',
                'categories': ['Food Delivery', 'Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Blinkit',
                'website': 'https://www.blinkit.com',
                'categories': ['Food Delivery', 'Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Zepto',
                'website': 'https://www.zeptonow.com',
                'categories': ['Food Delivery', 'Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'Instamart (Swiggy)',
                'website': 'https://www.swiggy.com/instamart',
                'categories': ['Food Delivery', 'Online Shopping'],
                'is_verified': True,
            },
            
            # Banking & Finance
            {
                'name': 'HDFC Bank',
                'website': 'https://www.hdfcbank.com',
                'categories': ['Banking & Finance'],
                'is_verified': True,
            },
            {
                'name': 'ICICI Bank',
                'website': 'https://www.icicibank.com',
                'categories': ['Banking & Finance'],
                'is_verified': True,
            },
            {
                'name': 'State Bank of India',
                'website': 'https://www.sbi.co.in',
                'categories': ['Banking & Finance'],
                'is_verified': True,
            },
            {
                'name': 'Axis Bank',
                'website': 'https://www.axisbank.com',
                'categories': ['Banking & Finance'],
                'is_verified': True,
            },
            {
                'name': 'Kotak Mahindra Bank',
                'website': 'https://www.kotak.com',
                'categories': ['Banking & Finance'],
                'is_verified': True,
            },
            
            # Telecom
            {
                'name': 'Jio',
                'website': 'https://www.jio.com',
                'categories': ['Telecom & Internet'],
                'is_verified': True,
            },
            {
                'name': 'Airtel',
                'website': 'https://www.airtel.in',
                'categories': ['Telecom & Internet'],
                'is_verified': True,
            },
            {
                'name': 'Vi (Vodafone Idea)',
                'website': 'https://www.myvi.in',
                'categories': ['Telecom & Internet'],
                'is_verified': True,
            },
            {
                'name': 'BSNL',
                'website': 'https://www.bsnl.co.in',
                'categories': ['Telecom & Internet'],
                'is_verified': True,
            },
            {
                'name': 'ACT Fibernet',
                'website': 'https://www.actcorp.in',
                'categories': ['Telecom & Internet'],
                'is_verified': True,
            },
            {
                'name': 'Tata Play',
                'website': 'https://www.tataplay.com',
                'categories': ['Telecom & Internet'],
                'is_verified': True,
            },
            
            # E-Wallet & Fintech
            {
                'name': 'Paytm',
                'website': 'https://www.paytm.com',
                'categories': ['E-Wallet & Fintech', 'Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'PhonePe',
                'website': 'https://www.phonepe.com',
                'categories': ['E-Wallet & Fintech'],
                'is_verified': True,
            },
            {
                'name': 'Google Pay',
                'website': 'https://pay.google.com',
                'categories': ['E-Wallet & Fintech'],
                'is_verified': True,
            },
            {
                'name': 'Amazon Pay',
                'website': 'https://www.amazon.in/pay',
                'categories': ['E-Wallet & Fintech', 'Online Shopping'],
                'is_verified': True,
            },
            {
                'name': 'CRED',
                'website': 'https://www.cred.club',
                'categories': ['E-Wallet & Fintech'],
                'is_verified': True,
            },
            {
                'name': 'MobiKwik',
                'website': 'https://www.mobikwik.com',
                'categories': ['E-Wallet & Fintech'],
                'is_verified': True,
            },
            {
                'name': 'Freecharge',
                'website': 'https://www.freecharge.in',
                'categories': ['E-Wallet & Fintech'],
                'is_verified': True,
            },
        ]

        for entity_data in entities_data:
            entity, created = Entity.objects.get_or_create(
                slug=slugify(entity_data['name']),
                defaults={
                    'name': entity_data['name'],
                    'website': entity_data.get('website', ''),
                    'is_active': True,
                    'is_verified': entity_data.get('is_verified', False),
                }
            )
            
            # Link to categories
            for cat_name in entity_data['categories']:
                if cat_name in created_categories:
                    entity.categories.add(created_categories[cat_name])
            
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'  Entity: {entity_data["name"]} - {status}')

        self.stdout.write(self.style.SUCCESS('\n✅ Successfully populated consumer dispute data!'))
        
        # Summary
        cat_count = DisputeCategory.objects.filter(parent__isnull=True).count()
        subcat_count = DisputeCategory.objects.filter(parent__isnull=False).count()
        entity_count = Entity.objects.count()
        
        self.stdout.write(f'\nSummary:')
        self.stdout.write(f'  - Categories: {cat_count}')
        self.stdout.write(f'  - Sub-categories: {subcat_count}')
        self.stdout.write(f'  - Entities: {entity_count}')

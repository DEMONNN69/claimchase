"""
Consumer Disputes app config.
"""

from django.apps import AppConfig


class ConsumerDisputesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'claimchase.apps.consumer_disputes'
    verbose_name = 'Consumer Disputes'

    def ready(self):
        # Import signals to register them
        import claimchase.apps.consumer_disputes.signals

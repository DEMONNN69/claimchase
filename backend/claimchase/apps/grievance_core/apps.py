"""
Grievance Core app config.
"""

from django.apps import AppConfig


class GrievanceCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'claimchase.apps.grievance_core'
    verbose_name = 'Grievance Management'

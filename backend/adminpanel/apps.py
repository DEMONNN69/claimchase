from django.contrib.admin.apps import AdminConfig


class UnfoldAdminConfig(AdminConfig):
    default_site = "unfold.sites.UnfoldAdminSite"

from django.contrib.admin.apps import AdminConfig


class UnfoldAdminConfig(AdminConfig):
    default_site = "unfold.sites.UnfoldAdminSite"
    
    def ready(self):
        super().ready()
        # Import components so they are registered
        import claimchase.unfold_components  # noqa

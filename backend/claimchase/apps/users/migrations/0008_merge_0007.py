from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_customuser_terms_accepted"),
        ("users", "0007_remove_customuser_username_alter_customuser_role"),
    ]

    operations = []

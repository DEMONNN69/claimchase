from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_customuser_gmail_history_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='terms_accepted',
            field=models.BooleanField(
                default=False,
                help_text='Whether the user has accepted the Terms & Conditions',
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='terms_accepted_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Timestamp when the user accepted the Terms & Conditions',
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='LegalDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('doc_type', models.CharField(
                    choices=[('terms', 'Terms & Conditions'), ('privacy', 'Privacy Policy')],
                    help_text='Type of legal document',
                    max_length=20,
                )),
                ('title', models.CharField(
                    help_text='Display title, e.g. "Terms & Conditions — v2.1"',
                    max_length=200,
                )),
                ('content', models.TextField(
                    help_text='Paste your document content here.',
                )),
                ('content_format', models.CharField(
                    choices=[
                        ('html', 'HTML — paste formatted HTML markup'),
                        ('plain_text', 'Plain Text — paste raw text, line breaks preserved'),
                    ],
                    default='plain_text',
                    help_text='Select the format of the content you are pasting above',
                    max_length=20,
                )),
                ('version', models.CharField(
                    default='1.0',
                    help_text='Version label shown to users',
                    max_length=50,
                )),
                ('effective_date', models.DateField(
                    help_text='Date from which this version is effective',
                )),
                ('is_active', models.BooleanField(
                    default=False,
                    help_text='Check to make this the version shown to users.',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Legal Document',
                'verbose_name_plural': 'Legal Documents',
                'ordering': ['-created_at'],
            },
        ),
    ]

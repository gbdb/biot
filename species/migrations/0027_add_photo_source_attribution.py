# Generated for Photo source attribution (Wikimedia, etc.)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0026_reminder_recurrence_and_user_preference'),
    ]

    operations = [
        migrations.AddField(
            model_name='photo',
            name='source_url',
            field=models.URLField(
                blank=True,
                help_text='URL de la page source (Wikimedia Commons, Wikidata)',
                max_length=500,
            ),
        ),
        migrations.AddField(
            model_name='photo',
            name='source_author',
            field=models.CharField(
                blank=True,
                help_text="Auteur et licence (ex: John Doe, CC BY-SA 4.0)",
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name='photo',
            name='source_license',
            field=models.CharField(
                blank=True,
                help_text='Code licence (ex: CC-BY-SA-4.0)',
                max_length=50,
            ),
        ),
    ]

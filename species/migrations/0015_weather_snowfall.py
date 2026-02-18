# Add snowfall to WeatherRecord for winter tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0014_add_garden_weather'),
    ]

    operations = [
        migrations.AddField(
            model_name='weatherrecord',
            name='snowfall_cm',
            field=models.FloatField(blank=True, help_text='Neige (cm)', null=True),
        ),
    ]

# Add forecast/alert fields to Garden and SprinklerZone

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0015_weather_snowfall'),
    ]

    operations = [
        migrations.AddField(
            model_name='garden',
            name='jours_sans_pluie_prevision',
            field=models.IntegerField(
                default=3,
                help_text="Nombre de jours sans pluie prévus pour alerter (planifier arrosage avant vacances)",
            ),
        ),
        migrations.AddField(
            model_name='garden',
            name='seuil_gel_c',
            field=models.FloatField(
                default=-2.0,
                help_text="Température min en dessous de laquelle alerter (gel risque pour fruitiers)",
            ),
        ),
        migrations.AddField(
            model_name='garden',
            name='seuil_pluie_forte_mm',
            field=models.FloatField(
                default=15.0,
                help_text="Précipitations au-dessus desquelles annuler l'arrosage automatique (mm/jour)",
            ),
        ),
        migrations.AddField(
            model_name='garden',
            name='zone_rusticite',
            field=models.CharField(
                blank=True,
                help_text="Zone USDA du jardin (ex: 4a) pour alertes protection hivernale",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='sprinklerzone',
            name='annuler_si_pluie_prevue',
            field=models.BooleanField(
                default=True,
                help_text="Ne pas déclencher si forte pluie prévue dans les 24-48h",
            ),
        ),
    ]

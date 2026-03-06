# Generated manually for plan Cultivars / pollinisation / groupes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0034_alter_organism_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='organism',
            name='distance_pollinisation_max',
            field=models.FloatField(
                blank=True,
                help_text="Distance max de pollinisation en mètres (si pertinent). Prioritaire sur la préférence utilisateur et la config globale.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='pollination_distance_max_default_m',
            field=models.FloatField(
                blank=True,
                help_text="Distance de pollinisation par défaut (m) pour les plants. Utilisée quand l'espèce n'a pas de distance_pollinisation_max.",
                null=True,
            ),
        ),
    ]

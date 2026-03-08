# Remove garden models from species app state only (tables stay in DB).
# Run after gardens.0001_initial.
# First update FKs in species that point to garden, then remove garden models from state.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gardens', '0001_initial'),
        ('species', '0040_remove_catalog_models'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Update FK so Specimen.garden points to gardens.garden before we remove Garden from state
                migrations.AlterField(
                    model_name='specimen',
                    name='garden',
                    field=models.ForeignKey(
                        blank=True,
                        help_text='Jardin où se trouve ce spécimen',
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name='specimens',
                        to='gardens.garden',
                    ),
                ),
                # Now remove garden models from species state
                migrations.DeleteModel(name='UserPreference'),
                migrations.DeleteModel(name='SprinklerZone'),
                migrations.DeleteModel(name='WeatherRecord'),
                migrations.DeleteModel(name='Garden'),
            ],
            database_operations=[],
        ),
    ]

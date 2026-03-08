# Update FK references in species app state: point to catalog.* and gardens.*
# so that the migration state matches models.py after catalog/gardens split.
# Database columns unchanged (same tables).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
        ('gardens', '0001_initial'),
        ('species', '0041_remove_gardens_models'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='event',
                    name='amendment',
                    field=models.ForeignKey(
                        blank=True,
                        help_text='Amendement utilisé (si applicable)',
                        null=True,
                        on_delete=models.SET_NULL,
                        to='catalog.amendment',
                    ),
                ),
                migrations.AlterField(
                    model_name='organismfavorite',
                    name='organism',
                    field=models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name='favorited_by',
                        to='catalog.organism',
                    ),
                ),
                migrations.AlterField(
                    model_name='photo',
                    name='organisme',
                    field=models.ForeignKey(
                        blank=True,
                        help_text="Photo générique de l'espèce",
                        null=True,
                        on_delete=models.CASCADE,
                        related_name='photos',
                        to='catalog.organism',
                    ),
                ),
                migrations.AlterField(
                    model_name='specimen',
                    name='cultivar',
                    field=models.ForeignKey(
                        blank=True,
                        help_text='Variété/cultivar si connu (ex: Dolgo)',
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name='specimens',
                        to='catalog.cultivar',
                    ),
                ),
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
                migrations.AlterField(
                    model_name='specimen',
                    name='organisme',
                    field=models.ForeignKey(
                        help_text='Espèce (ex: Malus pumila)',
                        on_delete=models.PROTECT,
                        related_name='specimens',
                        to='catalog.organism',
                    ),
                ),
                migrations.AlterField(
                    model_name='specimen',
                    name='seed_collection',
                    field=models.ForeignKey(
                        blank=True,
                        help_text='Lot de semences utilisé (quand source = Semis maison)',
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name='specimens_issus',
                        to='catalog.seedcollection',
                    ),
                ),
                migrations.AlterField(
                    model_name='specimengroup',
                    name='organisme',
                    field=models.ForeignKey(
                        blank=True,
                        help_text='Espèce commune (optionnel, pour cross_pollination_cultivar)',
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name='+',
                        to='catalog.organism',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]

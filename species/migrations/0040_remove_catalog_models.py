# Remove catalog models from species app state only (tables stay in DB).
# Run after catalog.0001_initial.
# First update FKs in species that point to catalog models, then remove catalog models from state.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
        ('species', '0039_enrichment_score_and_base_stats'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Update FK refs so remaining species models point to catalog.* before we remove them from state
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
                # Now remove catalog models from species state
                migrations.DeleteModel(name='BaseEnrichmentStats'),
                migrations.DeleteModel(name='OrganismAmendment'),
                migrations.DeleteModel(name='SemisBatch'),
                migrations.DeleteModel(name='SeedCollection'),
                migrations.DeleteModel(name='Amendment'),
                migrations.DeleteModel(name='SeedSupplier'),
                migrations.DeleteModel(name='CultivarPollinator'),
                migrations.DeleteModel(name='Cultivar'),
                migrations.DeleteModel(name='CompanionRelation'),
                migrations.DeleteModel(name='OrganismCalendrier'),
                migrations.DeleteModel(name='OrganismUsage'),
                migrations.DeleteModel(name='OrganismPropriete'),
                migrations.DeleteModel(name='Organism'),
                migrations.DeleteModel(name='UserTag'),
            ],
            database_operations=[],
        ),
    ]

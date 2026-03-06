# Note d'enrichissement (fiche + global) — stockée, mise à jour après imports

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0038_organism_genus'),
    ]

    operations = [
        migrations.AddField(
            model_name='organism',
            name='enrichment_score_pct',
            field=models.PositiveSmallIntegerField(
                blank=True,
                help_text="Note d'enrichissement de la fiche (0-100 %). Recalculée après import/migration.",
                null=True,
            ),
        ),
        migrations.CreateModel(
            name='BaseEnrichmentStats',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('global_score_pct', models.PositiveSmallIntegerField(
                    blank=True,
                    help_text="Note d'enrichissement moyenne de toutes les fiches (0-100 %).",
                    null=True,
                )),
                ('organism_count', models.PositiveIntegerField(
                    default=0,
                    help_text="Nombre d'organismes au moment du calcul.",
                )),
                ('last_updated', models.DateTimeField(auto_now=True, help_text="Dernière mise à jour des stats.")),
                ('computed_at', models.DateTimeField(blank=True, null=True, help_text="Date/heure du dernier recalcul complet.")),
            ],
            options={
                'verbose_name': 'Stats enrichissement (base)',
                'verbose_name_plural': 'Stats enrichissement (base)',
                'db_table': 'species_base_enrichment_stats',
            },
        ),
    ]

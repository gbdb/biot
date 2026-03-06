# DataImportRun: historique des exécutions d'import / enrichissement

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('species', '0032_slug_latin_cultivar_espece_table'),
    ]

    operations = [
        migrations.CreateModel(
            name='DataImportRun',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('source', models.CharField(
                    choices=[
                        ('pfaf', 'PFAF'),
                        ('seeds', 'Semences (CSV/JSON)'),
                        ('import_vascan', 'Import VASCAN'),
                        ('import_usda', 'Import USDA'),
                        ('import_hydroquebec', 'Import Hydro-Québec'),
                        ('import_botanipedia', 'Import Botanipedia'),
                        ('merge_organism_duplicates', 'Merge doublons'),
                        ('populate_proprietes_usage_calendrier', 'Populate propriétés/usages/calendrier'),
                        ('wipe_species', 'Wipe species'),
                        ('wipe_db_and_media', 'Wipe DB and media'),
                    ],
                    db_index=True,
                    help_text="Type d'import ou commande exécutée",
                    max_length=80,
                )),
                ('status', models.CharField(
                    choices=[
                        ('running', 'En cours'),
                        ('success', 'Succès'),
                        ('failure', 'Échec'),
                    ],
                    db_index=True,
                    default='running',
                    max_length=20,
                )),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('stats', models.JSONField(blank=True, default=dict, help_text='Résumé: created, updated, errors, etc.')),
                ('output_snippet', models.TextField(blank=True, help_text='Derniers caractères de la sortie (stdout/err) pour débogage')),
                ('trigger', models.CharField(
                    choices=[
                        ('admin_import', 'Admin (import)'),
                        ('gestion_donnees', 'Gestion des données'),
                        ('api', 'API'),
                    ],
                    default='gestion_donnees',
                    max_length=30,
                )),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='data_import_runs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': "Exécution d'import",
                'verbose_name_plural': "Exécutions d'import",
                'ordering': ['-started_at'],
            },
        ),
        migrations.AddIndex(
            model_name='dataimportrun',
            index=models.Index(fields=['source', '-started_at'], name='species_dat_source_0a2b0d_idx'),
        ),
    ]

# Plan 1 - Étape 2: Tables domaine (Propriétés, Usages, Calendrier)

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0030_organism_tsn_vascan_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrganismPropriete',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_sol', models.JSONField(blank=True, default=list, help_text='Liste de types: sablonneux, argileux, limoneux, loameux, rocailleux, tourbeux')),
                ('ph_min', models.FloatField(blank=True, help_text='pH minimum accepté', null=True)),
                ('ph_max', models.FloatField(blank=True, help_text='pH maximum accepté', null=True)),
                ('tolerance_ombre', models.CharField(
                    blank=True,
                    choices=[
                        ('ombre_complete', 'Ombre complète'),
                        ('ombre', 'Ombre'),
                        ('mi_ombre', 'Mi-ombre'),
                        ('soleil_partiel', 'Soleil partiel'),
                        ('plein_soleil', 'Plein soleil'),
                    ],
                    help_text="Tolérance à l'ombre / besoin en lumière",
                    max_length=20,
                )),
                ('source', models.CharField(blank=True, help_text='Source: hydroquebec, usda, vascan, manuel', max_length=50)),
                ('organisme', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='proprietes', to='species.organism')),
            ],
            options={
                'verbose_name': 'Propriété (sol / exposition)',
                'verbose_name_plural': 'Propriétés (sol / exposition)',
                'ordering': ['organisme', 'source'],
            },
        ),
        migrations.CreateModel(
            name='OrganismUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_usage', models.CharField(
                    choices=[
                        ('comestible_fruit', 'Comestible (fruit)'),
                        ('comestible_feuille', 'Comestible (feuille)'),
                        ('comestible_racine', 'Comestible (racine)'),
                        ('comestible_fleur', 'Comestible (fleur)'),
                        ('comestible_autre', 'Comestible (autre)'),
                        ('medicinal', 'Médicinal'),
                        ('bois_oeuvre', "Bois d'œuvre"),
                        ('artisanat', 'Artisanat'),
                        ('ornement', 'Ornement'),
                        ('autre', 'Autre'),
                    ],
                    max_length=30,
                )),
                ('parties', models.CharField(blank=True, help_text='Parties concernées (ex: fruit, feuille)', max_length=200)),
                ('description', models.TextField(blank=True)),
                ('source', models.CharField(blank=True, help_text='Source: pfaf, hydroquebec, manuel', max_length=50)),
                ('organisme', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usages', to='species.organism')),
            ],
            options={
                'verbose_name': 'Usage',
                'verbose_name_plural': 'Usages',
                'ordering': ['organisme', 'type_usage'],
            },
        ),
        migrations.CreateModel(
            name='OrganismCalendrier',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_periode', models.CharField(
                    choices=[
                        ('floraison', 'Floraison'),
                        ('fructification', 'Fructification'),
                        ('recolte', 'Récolte'),
                        ('semis', 'Semis'),
                        ('taille', 'Taille'),
                        ('autre', 'Autre'),
                    ],
                    max_length=20,
                )),
                ('mois_debut', models.PositiveSmallIntegerField(blank=True, help_text='Mois de début (1-12)', null=True)),
                ('mois_fin', models.PositiveSmallIntegerField(blank=True, help_text='Mois de fin (1-12)', null=True)),
                ('source', models.CharField(blank=True, help_text='Source: pfaf, hydroquebec, usda, manuel', max_length=50)),
                ('organisme', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='calendrier', to='species.organism')),
            ],
            options={
                'verbose_name': 'Calendrier (période)',
                'verbose_name_plural': 'Calendrier (périodes)',
                'ordering': ['organisme', 'type_periode', 'mois_debut'],
            },
        ),
    ]

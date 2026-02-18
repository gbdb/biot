# Generated manually for Jardin bIOT weather feature

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0013_add_organism_amendment'),
    ]

    operations = [
        migrations.CreateModel(
            name='Garden',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(help_text="Nom du jardin (ex: Mont Caprice, Potager urbain)", max_length=200)),
                ('adresse', models.CharField(blank=True, help_text="Adresse complète (rue, ville, code postal, pays)", max_length=400)),
                ('ville', models.CharField(blank=True, max_length=100)),
                ('code_postal', models.CharField(blank=True, max_length=20)),
                ('pays', models.CharField(default='Canada', max_length=100)),
                ('latitude', models.FloatField(blank=True, help_text="Latitude pour la météo (Open-Meteo)", null=True)),
                ('longitude', models.FloatField(blank=True, help_text="Longitude pour la météo", null=True)),
                ('timezone', models.CharField(default='America/Montreal', help_text="Fuseau horaire (ex: America/Montreal)", max_length=50)),
                ('seuil_temp_chaud_c', models.FloatField(default=25.0, help_text="Température moyenne quotidienne au-dessus de laquelle on considère 'chaud' (°C)")),
                ('seuil_pluie_faible_mm', models.FloatField(default=5.0, help_text="Pluie totale en-dessous de laquelle on considère 'sec' sur la période (mm)")),
                ('jours_periode_analyse', models.IntegerField(default=5, help_text="Nombre de jours consécutifs à analyser pour l'alerte sécheresse")),
                ('notes', models.TextField(blank=True)),
                ('date_ajout', models.DateTimeField(auto_now_add=True)),
                ('date_modification', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Jardin',
                'verbose_name_plural': 'Jardins',
                'ordering': ['nom'],
            },
        ),
        migrations.AddField(
            model_name='specimen',
            name='garden',
            field=models.ForeignKey(
                blank=True,
                help_text="Jardin où se trouve ce spécimen",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='specimens',
                to='species.garden',
            ),
        ),
        migrations.CreateModel(
            name='WeatherRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True)),
                ('temp_max', models.FloatField(blank=True, null=True)),
                ('temp_min', models.FloatField(blank=True, null=True)),
                ('temp_mean', models.FloatField(blank=True, null=True)),
                ('precipitation_mm', models.FloatField(default=0.0, help_text="Précipitations totales (mm)")),
                ('rain_mm', models.FloatField(blank=True, help_text="Pluie uniquement (mm)", null=True)),
                ('et0_mm', models.FloatField(blank=True, null=True)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('garden', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weather_records', to='species.garden')),
            ],
            options={
                'verbose_name': 'Enregistrement météo',
                'verbose_name_plural': 'Enregistrements météo',
                'ordering': ['-date'],
                'unique_together': {('garden', 'date')},
            },
        ),
        migrations.CreateModel(
            name='SprinklerZone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(help_text="Ex: Zone potager, Sprinkler Nord, Arrosage serre", max_length=100)),
                ('type_integration', models.CharField(choices=[('webhook', 'Webhook (URL)'), ('mqtt', 'MQTT'), ('home_assistant', 'Home Assistant'), ('ifttt', 'IFTTT'), ('autre', 'Autre')], default='webhook', max_length=30)),
                ('webhook_url', models.URLField(blank=True, help_text="URL à appeler pour déclencher l'arrosage (POST)")),
                ('config', models.JSONField(blank=True, default=dict, help_text="Config supplémentaire (topic MQTT, entity_id HA, etc.)")),
                ('actif', models.BooleanField(default=True)),
                ('duree_defaut_minutes', models.IntegerField(default=15, help_text="Durée d'arrosage par défaut (minutes)")),
                ('notes', models.TextField(blank=True)),
                ('date_ajout', models.DateTimeField(auto_now_add=True)),
                ('garden', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sprinkler_zones', to='species.garden')),
            ],
            options={
                'verbose_name': 'Zone sprinkler',
                'verbose_name_plural': 'Zones sprinkler',
                'ordering': ['garden', 'nom'],
            },
        ),
    ]

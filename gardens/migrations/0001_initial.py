# State-only migration: adopt species garden models into gardens app without touching DB.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        ('species', '0040_remove_catalog_models'),
    ]

    state_ops = [
        migrations.CreateModel(
            name='Garden',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=200, help_text="Nom du jardin (ex: Mont Caprice, Potager urbain)")),
                ('adresse', models.CharField(blank=True, max_length=400, help_text="Adresse complète (rue, ville, code postal, pays)")),
                ('ville', models.CharField(blank=True, max_length=100)),
                ('code_postal', models.CharField(blank=True, max_length=20)),
                ('pays', models.CharField(default='Canada', max_length=100)),
                ('latitude', models.FloatField(blank=True, null=True, help_text="Latitude pour la météo (Open-Meteo)")),
                ('longitude', models.FloatField(blank=True, null=True, help_text="Longitude pour la météo")),
                ('timezone', models.CharField(default='America/Montreal', max_length=50, help_text="Fuseau horaire (ex: America/Montreal)")),
                ('seuil_temp_chaud_c', models.FloatField(default=25.0, help_text="Température moyenne quotidienne au-dessus de laquelle on considère 'chaud' (°C)")),
                ('seuil_pluie_faible_mm', models.FloatField(default=5.0, help_text="Pluie totale en-dessous de laquelle on considère 'sec' sur la période (mm)")),
                ('jours_periode_analyse', models.IntegerField(default=5, help_text="Nombre de jours consécutifs à analyser pour l'alerte sécheresse")),
                ('jours_sans_pluie_prevision', models.IntegerField(default=3, help_text="Nombre de jours sans pluie prévus pour alerter")),
                ('seuil_gel_c', models.FloatField(default=-2.0, help_text="Température min en dessous de laquelle alerter (gel risque pour fruitiers)")),
                ('seuil_temp_elevee_c', models.FloatField(blank=True, default=32.0, null=True, help_text="Température max au-dessus de laquelle alerter (canicule)")),
                ('seuil_pluie_forte_mm', models.FloatField(default=15.0, help_text="Précipitations au-dessus desquelles annuler l'arrosage automatique (mm/jour)")),
                ('zone_rusticite', models.CharField(blank=True, max_length=10, help_text="Zone USDA du jardin (ex: 4a)")),
                ('notes', models.TextField(blank=True)),
                ('date_ajout', models.DateTimeField(auto_now_add=True)),
                ('date_modification', models.DateTimeField(auto_now=True)),
            ],
            options={'db_table': 'species_garden', 'verbose_name': 'Jardin', 'verbose_name_plural': 'Jardins', 'ordering': ['nom']},
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
                ('rain_mm', models.FloatField(blank=True, null=True)),
                ('snowfall_cm', models.FloatField(blank=True, null=True)),
                ('et0_mm', models.FloatField(blank=True, null=True)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('garden', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weather_records', to='gardens.garden')),
            ],
            options={'db_table': 'species_weatherrecord', 'verbose_name': 'Météo', 'verbose_name_plural': 'Météo', 'ordering': ['-date']},
        ),
        migrations.CreateModel(
            name='SprinklerZone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(help_text="Ex: Zone potager, Sprinkler Nord", max_length=100)),
                ('type_integration', models.CharField(choices=[('webhook', 'Webhook (URL)'), ('mqtt', 'MQTT'), ('home_assistant', 'Home Assistant'), ('ifttt', 'IFTTT'), ('autre', 'Autre')], default='webhook', max_length=30)),
                ('webhook_url', models.URLField(blank=True, help_text="URL à appeler pour déclencher l'arrosage (POST)")),
                ('config', models.JSONField(blank=True, default=dict, help_text="Config supplémentaire (topic MQTT, entity_id HA, etc.)")),
                ('actif', models.BooleanField(default=True)),
                ('annuler_si_pluie_prevue', models.BooleanField(default=True, help_text="Ne pas déclencher si forte pluie prévue dans les 24-48h")),
                ('duree_defaut_minutes', models.IntegerField(default=15, help_text="Durée d'arrosage par défaut (minutes)")),
                ('notes', models.TextField(blank=True)),
                ('date_ajout', models.DateTimeField(auto_now_add=True)),
                ('garden', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sprinkler_zones', to='gardens.garden')),
            ],
            options={'db_table': 'species_sprinklerzone', 'verbose_name': 'Sprinkler system', 'verbose_name_plural': 'Sprinklers system', 'ordering': ['garden', 'nom']},
        ),
        migrations.CreateModel(
            name='UserPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pollination_distance_max_default_m', models.FloatField(blank=True, null=True, help_text="Distance de pollinisation par défaut (m) pour les plants.")),
                ('default_garden', models.ForeignKey(blank=True, help_text="Jardin par défaut (saisons, repères)", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='gardens.garden')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='species_preference', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'species_userpreference', 'verbose_name': 'Préférence utilisateur', 'verbose_name_plural': 'Préférences utilisateur'},
        ),
        migrations.AlterUniqueTogether(
            name='weatherrecord',
            unique_together={('garden', 'date')},
        ),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(state_operations=state_ops, database_operations=[]),
    ]

# Generated manually for Vue Terrain 3D: Garden terrain fields + GardenGCP

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('gardens', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='garden',
            name='boundary',
            field=models.JSONField(
                blank=True,
                help_text='Limites géographiques de la propriété en GeoJSON Polygon',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='garden',
            name='contours_geojson',
            field=models.JSONField(
                blank=True,
                help_text='Courbes de niveau en GeoJSON FeatureCollection (polylines)',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='garden',
            name='terrain_stats',
            field=models.JSONField(
                blank=True,
                help_text='altitude_min, altitude_max, pente_moyenne, surface_ha, nb_cours_eau',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='garden',
            name='surface_ha',
            field=models.FloatField(
                blank=True,
                help_text='Surface en hectares (optionnel)',
                null=True,
            ),
        ),
        migrations.CreateModel(
            name='GardenGCP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(help_text='Ex: GCP-01, GCP-02', max_length=50)),
                ('latitude', models.FloatField()),
                ('longitude', models.FloatField()),
                ('photo', models.ImageField(blank=True, null=True, upload_to='garden_gcps/')),
                ('date_capture', models.DateField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('garden', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gcps', to='gardens.garden')),
            ],
            options={
                'verbose_name': 'Point de contrôle (GCP)',
                'verbose_name_plural': 'Points de contrôle (GCP)',
                'db_table': 'gardens_gardengcp',
                'ordering': ['label'],
            },
        ),
    ]

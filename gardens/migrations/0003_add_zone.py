# Zone model (boundary GeoJSON JSONField, surface_m2 calculée avec shapely+pyproj)

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('gardens', '0002_terrain_fields_and_gardengcp'),
    ]

    operations = [
        migrations.CreateModel(
            name='Zone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=100)),
                ('type', models.CharField(
                    choices=[
                        ('stationnement', 'Stationnement'),
                        ('culture', 'Culture'),
                        ('boise', 'Boisé'),
                        ('eau', 'Eau'),
                        ('autre', 'Autre'),
                    ],
                    default='autre',
                    max_length=20,
                )),
                ('boundary', models.JSONField(
                    blank=True,
                    help_text='Polygone GeoJSON (type Polygon, WGS84). Ex: {"type":"Polygon","coordinates":[[[lng,lat],...]]}',
                    null=True,
                )),
                ('surface_m2', models.FloatField(blank=True, help_text='Surface en m² (calculée depuis boundary)', null=True)),
                ('couleur', models.CharField(default='#3d5c2e', max_length=7)),
                ('ordre', models.IntegerField(default=0)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('garden', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='zones',
                    to='gardens.garden',
                )),
            ],
            options={
                'verbose_name': 'Zone',
                'verbose_name_plural': 'Zones',
                'db_table': 'gardens_zone',
                'ordering': ['ordre', 'nom'],
            },
        ),
    ]

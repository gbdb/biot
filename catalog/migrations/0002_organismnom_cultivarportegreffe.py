# Generated manually for OrganismNom and CultivarPorteGreffe

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrganismNom',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(max_length=200)),
                ('langue', models.CharField(choices=[('fr', 'Français'), ('en', 'Anglais'), ('autre', 'Autre')], max_length=10)),
                ('source', models.CharField(max_length=80)),
                ('principal', models.BooleanField(default=False)),
                ('organism', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='noms', to='catalog.organism')),
            ],
            options={
                'db_table': 'species_organismnom',
                'verbose_name': 'Nom (organisme)',
                'verbose_name_plural': 'Noms (organismes)',
                'ordering': ['organism', 'langue', 'source'],
            },
        ),
        migrations.CreateModel(
            name='CultivarPorteGreffe',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom_porte_greffe', models.CharField(help_text='Ex: B9, MM106', max_length=100)),
                ('vigueur', models.CharField(blank=True, choices=[('nain', 'Nain'), ('semi_nain', 'Semi-nain'), ('semi_vigoureux', 'Semi-vigoureux'), ('vigoureux', 'Vigoureux'), ('standard', 'Standard')], max_length=20)),
                ('hauteur_max_m', models.FloatField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('source', models.CharField(max_length=80)),
                ('disponible_chez', models.JSONField(blank=True, default=list, help_text='Liste d\'objets ex. [{"source": "ancestrale", "age": "1.5"}]')),
                ('cultivar', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='porte_greffes', to='catalog.cultivar')),
            ],
            options={
                'db_table': 'species_cultivarportegreffe',
                'verbose_name': 'Porte-greffe (cultivar)',
                'verbose_name_plural': 'Porte-greffes (cultivars)',
                'ordering': ['cultivar', 'nom_porte_greffe'],
            },
        ),
    ]

# slug_latin (espèce), table species_espece, Cultivar, Specimen.cultivar

import unicodedata
from django.db import migrations, models
import django.db.models.deletion
from django.utils.text import slugify


def _slugify_latin(name):
    if not name or not isinstance(name, str):
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    return slugify(n or name, allow_unicode=False) or ''


def fill_slug_latin(apps, schema_editor):
    Organism = apps.get_model('species', 'Organism')
    seen = set()
    for o in Organism.objects.all():
        base = _slugify_latin(o.nom_latin) if o.nom_latin else ''
        if not base:
            base = f'org-{o.pk}'
        slug = base
        idx = 0
        while slug in seen or Organism.objects.filter(slug_latin=slug).exclude(pk=o.pk).exists():
            idx += 1
            slug = f'{base}-{o.pk}' if idx == 1 else f'{base}-{o.pk}-{idx}'
        seen.add(slug)
        o.slug_latin = slug
        o.save(update_fields=['slug_latin'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0031_organism_propriete_usage_calendrier'),
    ]

    operations = [
        # 1) Add slug_latin nullable (no unique yet)
        migrations.AddField(
            model_name='organism',
            name='slug_latin',
            field=models.SlugField(blank=True, help_text='Clé unique dérivée du nom latin (ex: malus-pumila).', max_length=220, null=True),
        ),
        # 2) Populate slug_latin
        migrations.RunPython(fill_slug_latin, noop),
        # 3) Set unique (column stays nullable for backwards compat; new rows get slug in save())
        migrations.AlterField(
            model_name='organism',
            name='slug_latin',
            field=models.SlugField(blank=True, help_text='Clé unique dérivée du nom latin (ex: malus-pumila).', max_length=220, unique=True),
        ),
        # 4) Remove unique_together (nom_commun, nom_latin)
        migrations.AlterUniqueTogether(
            name='organism',
            unique_together=set(),
        ),
        # 5) Rename table to species_espece
        migrations.AlterModelTable(
            name='organism',
            table='species_espece',
        ),
        # 6) Create Cultivar
        migrations.CreateModel(
            name='Cultivar',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug_cultivar', models.SlugField(help_text='Clé unique (ex: malus-pumila-dolgo)', max_length=250, unique=True)),
                ('nom', models.CharField(help_text='Nom du cultivar / variété (ex: Dolgo, Conica)', max_length=200)),
                ('description', models.TextField(blank=True)),
                ('couleur_fruit', models.CharField(blank=True, help_text='Couleur du fruit ou de la partie récoltée', max_length=100)),
                ('gout', models.CharField(blank=True, help_text='Goût, usage culinaire', max_length=200)),
                ('resistance_maladies', models.TextField(blank=True, help_text='Résistances ou sensibilités spécifiques')),
                ('notes', models.TextField(blank=True)),
                ('date_ajout', models.DateTimeField(auto_now_add=True)),
                ('date_modification', models.DateTimeField(auto_now=True)),
                ('organism', models.ForeignKey(help_text='Espèce (ex: Malus pumila)', on_delete=django.db.models.deletion.CASCADE, related_name='cultivars', to='species.organism')),
            ],
            options={
                'db_table': 'species_cultivar',
                'verbose_name': 'Cultivar',
                'verbose_name_plural': 'Cultivars',
                'ordering': ['organism__nom_latin', 'nom'],
            },
        ),
        migrations.AddField(
            model_name='specimen',
            name='cultivar',
            field=models.ForeignKey(blank=True, help_text='Variété/cultivar si connu (ex: Dolgo)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='specimens', to='species.cultivar'),
        ),
        # Add index on nom_latin for Organism (we added db_index in model)
        migrations.AlterField(
            model_name='organism',
            name='nom_latin',
            field=models.CharField(db_index=True, help_text='Nom scientifique latin (ex: Malus pumila)', max_length=200),
        ),
    ]

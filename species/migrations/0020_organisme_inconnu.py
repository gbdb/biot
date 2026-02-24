# Data migration: create "Espèce non identifiée" organism for quick observations

from django.db import migrations


def create_organisme_inconnu(apps, schema_editor):
    Organism = apps.get_model('species', 'Organism')
    Organism.objects.get_or_create(
        nom_commun='Espèce non identifiée',
        defaults={
            'nom_latin': 'Species unidentified',
            'type_organisme': 'vivace',
            'regne': 'plante',
        },
    )


def reverse_noop(apps, schema_editor):
    # Do not delete - other specimens might reference it
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0019_alter_seedcollection_options_and_more'),
    ]

    operations = [
        migrations.RunPython(create_organisme_inconnu, reverse_noop),
    ]

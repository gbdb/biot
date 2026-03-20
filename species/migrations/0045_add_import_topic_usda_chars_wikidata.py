# Generated manually for new DataImportRun sources

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0044_specimen_zone_fk'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dataimportrun',
            name='source',
            field=models.CharField(
                choices=[
                    ('pfaf', 'PFAF'),
                    ('seeds', 'Semences (CSV/JSON)'),
                    ('import_vascan', 'Import VASCAN'),
                    ('import_usda', 'Import USDA'),
                    ('import_hydroquebec', 'Import Hydro-Québec'),
                    ('import_botanipedia', 'Import Botanipedia'),
                    ('import_arbres_en_ligne', 'Import Arbres en ligne'),
                    ('import_ancestrale', 'Import Pépinière ancestrale'),
                    ('import_topic', 'Import TOPIC Canada'),
                    ('import_usda_chars', 'Import USDA PLANTS (caractéristiques)'),
                    ('import_wikidata', 'Import Wikidata'),
                    ('merge_organism_duplicates', 'Merge doublons'),
                    ('populate_proprietes_usage_calendrier', 'Populate propriétés/usages/calendrier'),
                    ('wipe_species', 'Wipe species'),
                    ('wipe_db_and_media', 'Wipe DB and media'),
                ],
                db_index=True,
                help_text="Type d'import ou commande exécutée",
                max_length=80,
            ),
        ),
    ]

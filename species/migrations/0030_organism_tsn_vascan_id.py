# Plan 1 - Étape 1: Identifiants taxonomiques (TSN, VASCAN)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0029_event_type_mort_enlever'),
    ]

    operations = [
        migrations.AddField(
            model_name='organism',
            name='tsn',
            field=models.PositiveIntegerField(
                blank=True,
                db_index=True,
                help_text='Taxonomic Serial Number (ITIS/USDA), clé de liaison sans doublon',
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name='organism',
            name='vascan_id',
            field=models.PositiveIntegerField(
                blank=True,
                db_index=True,
                help_text='Identifiant VASCAN (Canadensys), clé de liaison sans doublon',
                null=True,
                unique=True,
            ),
        ),
    ]

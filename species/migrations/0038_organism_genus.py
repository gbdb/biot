# Plan 2: Extraction genre — champ genus sur Organism

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0037_specimengroup_specimengroupmember'),
    ]

    operations = [
        migrations.AddField(
            model_name='organism',
            name='genus',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Genre botanique (ex. Vaccinium, Amelanchier), dérivé du nom latin.',
                max_length=80,
            ),
        ),
    ]

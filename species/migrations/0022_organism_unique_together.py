# Generated manually for unique_together (nom_commun, nom_latin)
# Si des doublons existent en base, la migration échouera.
# Nettoyez les doublons avant : Organism.objects.values('nom_commun','nom_latin').annotate(Count('id')).filter(id__count__gt=1)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0021_specimen_favorite'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='organism',
            unique_together={('nom_commun', 'nom_latin')},
        ),
    ]

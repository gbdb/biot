# Specimen.zone FK vers gardens.Zone (zone_jardin conservé)

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('gardens', '0003_add_zone'),
        ('species', '0043_alter_dataimportrun_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='specimen',
            name='zone',
            field=models.ForeignKey(
                blank=True,
                help_text='Zone du jardin (modèle Zone) si définie',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='specimens',
                to='gardens.zone',
            ),
        ),
    ]

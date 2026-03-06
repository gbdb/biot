# Generated manually for plan Cultivars / pollinisation

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0035_pollination_distance_and_user_pref'),
    ]

    operations = [
        migrations.CreateModel(
            name='CultivarPollinator',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notes', models.TextField(blank=True)),
                ('source', models.CharField(blank=True, max_length=200)),
                ('companion_cultivar', models.ForeignKey(
                    blank=True,
                    help_text="Variété compagne précise (ex. Liberty pour Dolgo)",
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='+',
                    to='species.cultivar',
                )),
                ('companion_organism', models.ForeignKey(
                    blank=True,
                    help_text="Espèce compagne (n'importe quelle variété de cette espèce)",
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='+',
                    to='species.organism',
                )),
                ('cultivar', models.ForeignKey(
                    help_text="Cultivar qui a besoin d'un pollinisateur",
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pollinator_companions',
                    to='species.cultivar',
                )),
            ],
            options={
                'verbose_name': 'Pollinisateur recommandé (cultivar)',
                'verbose_name_plural': 'Pollinisateurs recommandés (cultivars)',
                'db_table': 'species_cultivar_pollinator',
            },
        ),
        migrations.AddConstraint(
            model_name='cultivarpollinator',
            constraint=models.CheckConstraint(
                check=models.Q(companion_cultivar__isnull=False) | models.Q(companion_organism__isnull=False),
                name='cultivar_pollinator_companion_required',
            ),
        ),
    ]

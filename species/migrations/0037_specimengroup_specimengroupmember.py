# Generated manually for plan Cultivars / pollinisation / groupes

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0036_cultivarpollinator'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpecimenGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_groupe', models.CharField(
                    choices=[('male_female', 'Mâle / femelle'), ('cross_pollination_cultivar', 'Pollinisation croisée (cultivars)')],
                    max_length=30,
                )),
                ('date_ajout', models.DateTimeField(auto_now_add=True)),
                ('organisme', models.ForeignKey(
                    blank=True,
                    help_text="Espèce commune (optionnel, pour cross_pollination_cultivar)",
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to='species.organism',
                )),
            ],
            options={
                'verbose_name': 'Groupe de pollinisation',
                'verbose_name_plural': 'Groupes de pollinisation',
                'ordering': ['-date_ajout'],
            },
        ),
        migrations.CreateModel(
            name='SpecimenGroupMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(
                    blank=True,
                    choices=[('pollinisateur', 'Pollinisateur (mâle)'), ('principal', 'Principal (femelle)'), ('partenaire', 'Partenaire')],
                    help_text="pollinisateur (1 par groupe male_female), principal (jusqu'à 6), partenaire (cross_pollination)",
                    max_length=20,
                    null=True,
                )),
                ('group', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='members',
                    to='species.specimengroup',
                )),
                ('specimen', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pollination_groups',
                    to='species.specimen',
                )),
            ],
            options={
                'verbose_name': 'Membre du groupe',
                'verbose_name_plural': 'Membres du groupe',
                'ordering': ['group', 'role', 'specimen__nom'],
                'unique_together': {('group', 'specimen')},
            },
        ),
    ]

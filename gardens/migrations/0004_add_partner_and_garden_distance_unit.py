# Partner model + Garden.distance_unit (unité par défaut m/ft)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gardens', '0003_add_zone'),
    ]

    operations = [
        migrations.AddField(
            model_name='garden',
            name='distance_unit',
            field=models.CharField(
                choices=[('m', 'Mètres'), ('ft', 'Pieds')],
                default='m',
                help_text="Unité de mesure par défaut pour ce jardin (la vue peut basculer temporairement).",
                max_length=2,
            ),
        ),
        migrations.CreateModel(
            name='Partner',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom', models.CharField(help_text='Nom du partenaire ou fournisseur', max_length=200)),
                ('url', models.URLField(help_text='Lien vers le site')),
                ('ordre', models.IntegerField(default=0, help_text="Ordre d'affichage (plus petit = en premier)")),
                ('actif', models.BooleanField(default=True)),
                ('notes', models.TextField(blank=True, help_text='Notes internes (optionnel)')),
            ],
            options={
                'verbose_name': 'Partenaire / Fournisseur',
                'verbose_name_plural': 'Partenaires / Fournisseurs',
                'db_table': 'gardens_partner',
                'ordering': ['ordre', 'nom'],
            },
        ),
    ]

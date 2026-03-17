# Zone: type Bâtiment + batiment_hauteur_m, couleur max_length 20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gardens', '0004_add_partner_and_garden_distance_unit'),
    ]

    operations = [
        migrations.AddField(
            model_name='zone',
            name='batiment_hauteur_m',
            field=models.FloatField(
                blank=True,
                help_text='Hauteur en m (pour type Bâtiment uniquement)',
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='zone',
            name='couleur',
            field=models.CharField(default='#3d5c2e', max_length=20),
        ),
        migrations.AlterField(
            model_name='zone',
            name='type',
            field=models.CharField(
                choices=[
                    ('stationnement', 'Stationnement'),
                    ('culture', 'Culture'),
                    ('boise', 'Boisé'),
                    ('eau', 'Eau'),
                    ('batiment', 'Bâtiment'),
                    ('autre', 'Autre'),
                ],
                default='autre',
                max_length=20,
            ),
        ),
    ]

# Generated manually for OrganismFavorite

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('species', '0022_organism_unique_together'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrganismFavorite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('organism', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorited_by', to='species.organism')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='organism_favorites', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Espèce favorie',
                'verbose_name_plural': 'Espèces favorites',
                'unique_together': {('user', 'organism')},
            },
        ),
    ]

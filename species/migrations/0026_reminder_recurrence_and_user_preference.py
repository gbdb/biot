# Generated manually for reminder recurrence + user default garden

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0025_reminder_and_garden_temp'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='reminder',
            name='recurrence_rule',
            field=models.CharField(
                blank=True,
                choices=[
                    ('none', 'Aucune'),
                    ('biweekly', 'Toutes les 2 semaines'),
                    ('annual', 'Annuel'),
                    ('biannual', 'Bi-annuel (2×/an)'),
                ],
                default='none',
                help_text='Répétition du rappel après complétion',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='UserPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('default_garden', models.ForeignKey(
                    blank=True,
                    help_text='Jardin par défaut (saisons, repères)',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to='species.garden',
                )),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='species_preference',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Préférence utilisateur',
                'verbose_name_plural': 'Préférences utilisateur',
            },
        ),
    ]

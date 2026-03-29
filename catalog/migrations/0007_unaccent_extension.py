from django.contrib.postgres.operations import UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):
    """Active l'extension PostgreSQL unaccent pour les recherches insensibles aux accents."""

    dependencies = [
        ("catalog", "0006_missingspeciesrequest"),
    ]

    operations = [
        UnaccentExtension(),
    ]

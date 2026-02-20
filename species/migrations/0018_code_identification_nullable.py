# Generated manually for code_identification null=True

from django.db import migrations, models


def empty_code_to_null(apps, schema_editor):
    """Convert empty strings to NULL so multiple specimens can have no code."""
    Specimen = apps.get_model('species', 'Specimen')
    Specimen.objects.filter(code_identification='').update(code_identification=None)


def noop(apps, schema_editor):
    """No reverse - we don't convert NULL back to ''."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('species', '0017_add_nfc_tag_uid'),
    ]

    operations = [
        migrations.AlterField(
            model_name='specimen',
            name='code_identification',
            field=models.CharField(
                blank=True,
                help_text='Code unique (ex: PMMDOL-001, code manuel)',
                max_length=50,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(empty_code_to_null, noop),
    ]

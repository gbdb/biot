# Organism: B-tree indexes + search_vector (PostgreSQL) / TEXT placeholder (SQLite)

from django.db import migrations, models
from django.contrib.postgres.search import SearchVectorField


def add_search_vector_column(apps, schema_editor):
    """Add search_vector column: tsvector on PostgreSQL, TEXT NULL on SQLite."""
    connection = schema_editor.connection
    if connection.vendor == 'postgresql':
        schema_editor.execute("""
            ALTER TABLE species_espece
            ADD COLUMN IF NOT EXISTS search_vector tsvector NULL
        """)
        schema_editor.execute("""
            CREATE INDEX IF NOT EXISTS species_espece_sv_gin
            ON species_espece USING gin(search_vector)
        """)
    else:
        schema_editor.execute("""
            ALTER TABLE species_espece ADD COLUMN search_vector TEXT NULL
        """)


def remove_search_vector_column(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor == 'postgresql':
        schema_editor.execute("DROP INDEX IF EXISTS species_espece_sv_gin")
    schema_editor.execute("ALTER TABLE species_espece DROP COLUMN IF EXISTS search_vector")


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0002_organismnom_cultivarportegreffe'),
    ]

    operations = [
        migrations.AlterField(
            model_name='organism',
            name='comestible',
            field=models.BooleanField(db_index=True, default=True, help_text="Est-ce comestible pour les humains?"),
        ),
        migrations.AlterField(
            model_name='organism',
            name='enrichment_score_pct',
            field=models.PositiveSmallIntegerField(blank=True, db_index=True, help_text="Note d'enrichissement (0-100 %)", null=True),
        ),
        migrations.AlterField(
            model_name='organism',
            name='famille',
            field=models.CharField(blank=True, db_index=True, help_text='Famille botanique', max_length=100),
        ),
        migrations.AlterField(
            model_name='organism',
            name='fixateur_azote',
            field=models.BooleanField(db_index=True, default=False, help_text="Fixe l'azote atmosphérique"),
        ),
        migrations.AlterField(
            model_name='organism',
            name='indigene',
            field=models.BooleanField(db_index=True, default=False, help_text='Espèce indigène'),
        ),
        migrations.AlterField(
            model_name='organism',
            name='mellifere',
            field=models.BooleanField(db_index=True, default=False, help_text='Attire les pollinisateurs'),
        ),
        migrations.AlterField(
            model_name='organism',
            name='nom_commun',
            field=models.CharField(db_index=True, help_text='Nom commun principal (ex: Pommier, Basilic)', max_length=200),
        ),
        migrations.AlterField(
            model_name='organism',
            name='type_organisme',
            field=models.CharField(choices=[('arbre_fruitier', 'Arbre fruitier'), ('arbre_noix', 'Arbre à noix'), ('arbre_ornement', "Arbre d'ornement"), ('arbre_bois', 'Arbre forestier/bois'), ('arbuste_fruitier', 'Arbuste fruitier'), ('arbuste_baies', 'Arbuste à baies'), ('arbuste', 'Arbuste'), ('vivace', 'Plante vivace'), ('annuelle', 'Plante annuelle'), ('bisannuelle', 'Plante bisannuelle'), ('herbe_aromatique', 'Herbe aromatique'), ('legume', 'Légume'), ('grimpante', 'Plante grimpante'), ('couvre_sol', 'Couvre-sol'), ('champignon_comestible', 'Champignon comestible'), ('champignon_mycorhize', 'Champignon mycorhizien'), ('mousse', 'Mousse')], db_index=True, max_length=30),
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='organism',
                    name='search_vector',
                    field=SearchVectorField(blank=True, null=True),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_search_vector_column, remove_search_vector_column),
            ],
        ),
    ]

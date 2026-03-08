"""
Signals pour le catalogue (ex: mise à jour search_vector sur Organism).
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Organism


@receiver(post_save, sender=Organism)
def update_organism_search_vector(sender, instance, update_fields=None, **kwargs):
    """
    Met à jour search_vector après save d'un Organism.
    Pondération : A = nom_commun, nom_latin ; B = description, usages_autres, noms (OrganismNom).
    Ne s'exécute pas sur bulk_create/bulk_update (pas de post_save).
    Guard : si on ne met à jour que search_vector, ne pas reboucler.
    """
    if update_fields is not None and update_fields == frozenset({'search_vector'}):
        return
    from django.db import connection
    if connection.vendor != 'postgresql':
        return
    if not hasattr(Organism, 'search_vector') or not hasattr(instance, 'search_vector'):
        return
    # Inclut les noms alternatifs (OrganismNom) via sous-requête pour une seule UPDATE
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE species_espece SET search_vector =
                setweight(to_tsvector('simple', coalesce(nom_commun, '')), 'A')
                || setweight(to_tsvector('simple', coalesce(nom_latin, '')), 'A')
                || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
                || setweight(to_tsvector('simple', coalesce(usages_autres, '')), 'C')
                || coalesce(
                    (SELECT setweight(to_tsvector('simple', coalesce(string_agg(nom, ' '), '')), 'B')
                     FROM species_organismnom WHERE organism_id = species_espece.id),
                    to_tsvector('')
                )
            WHERE id = %s
            """,
            [instance.pk],
        )

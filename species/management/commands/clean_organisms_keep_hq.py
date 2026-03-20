"""
Supprime tous les organismes qui n'ont PAS la clé "hydroquebec" dans data_sources.
Conserve uniquement les espèces d'origine Hydro-Québec.

Supprime d'abord les dépendances (spécimens, semences, cultivars, etc.) liés à ces organismes,
puis les organismes concernés.

Usage:
  python manage.py clean_organisms_keep_hq
  python manage.py clean_organisms_keep_hq --no-input
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError
from django.db.models import Q

from species.models import (
    Specimen,
    SemisBatch,
    SeedCollection,
    OrganismFavorite,
    OrganismAmendment,
    CompanionRelation,
    OrganismPropriete,
    OrganismUsage,
    OrganismCalendrier,
    Cultivar,
    Organism,
)
from catalog.models import OrganismNom


class Command(BaseCommand):
    help = (
        "Supprime les organismes sans data_sources['hydroquebec'] (garder uniquement les espèces HQ). "
        "Supprime aussi leurs spécimens, semences, cultivars, etc."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Ne pas demander de confirmation",
        )

    def handle(self, *args, **options):
        def _delete_organisms_raw_by_ids(ids: list[int], batch_size: int = 900) -> int:
            """
            Fallback robuste quand Django échoue à cause de tables manquantes
            (ex. table de liaison M2M inexistante en SQLite dev).
            """
            if not ids:
                return 0
            # SQLite a une limite de variables bindées : on chunk.
            total = 0
            # Utiliser le curseur DBAPI brut pour contourner CursorDebugWrapper
            # (sinon Django tente un `sql % params` qui casse avec les placeholders `?`).
            cursor = connection.connection.cursor()
            try:
                for i in range(0, len(ids), batch_size):
                    batch = ids[i : i + batch_size]
                    placeholders = ",".join(["?"] * len(batch))
                    cursor.execute(
                        f"DELETE FROM species_espece WHERE id IN ({placeholders})",
                        batch,
                    )
                    total += len(batch)
            finally:
                try:
                    cursor.close()
                except Exception:
                    pass
            return total

        # Requête portable : organismes qui n'ont pas la clé 'hydroquebec'
        if connection.vendor == "postgresql":
            to_delete_qs = Organism.objects.exclude(data_sources__has_key="hydroquebec")
        else:
            # SQLite / autre : filtre en Python
            pks = [
                o.pk
                for o in Organism.objects.only("pk", "data_sources").iterator()
                if "hydroquebec" not in (o.data_sources or {})
            ]
            to_delete_qs = Organism.objects.filter(pk__in=pks)

        to_delete_ids = list(to_delete_qs.values_list("pk", flat=True))
        total_organisms = Organism.objects.count()
        kept = total_organisms - len(to_delete_ids)

        if not to_delete_ids:
            self.stdout.write(self.style.SUCCESS("Aucun organisme à supprimer (tous ont hydroquebec dans data_sources)."))
            return

        if not options["no_input"]:
            msg = (
                f"Supprimer {len(to_delete_ids)} organismes (sans data_sources['hydroquebec']) "
                f"et garder {kept} espèces HQ ? (oui/non): "
            )
            if input(msg).strip().lower() != "oui":
                self.stdout.write(self.style.WARNING("Annulé."))
                return

        counts = {}

        self.stdout.write("Suppression des spécimens liés...")
        counts["specimens"] = Specimen.objects.filter(organisme_id__in=to_delete_ids).delete()[0]

        self.stdout.write("Suppression des semis et lots de semences liés...")
        sc_ids = list(SeedCollection.objects.filter(organisme_id__in=to_delete_ids).values_list("pk", flat=True))
        if sc_ids:
            counts["semis_batches"] = SemisBatch.objects.filter(seed_collection_id__in=sc_ids).delete()[0]
        else:
            counts["semis_batches"] = 0
        counts["seed_collections"] = SeedCollection.objects.filter(organisme_id__in=to_delete_ids).delete()[0]

        self.stdout.write("Suppression des cultivars liés...")
        counts["cultivars"] = Cultivar.objects.filter(organism_id__in=to_delete_ids).delete()[0]

        self.stdout.write("Suppression des favoris, amendements, compagnonnage, propriétés, usages, calendrier...")
        counts["organism_favorites"] = OrganismFavorite.objects.filter(organism_id__in=to_delete_ids).delete()[0]
        counts["organism_amendments"] = OrganismAmendment.objects.filter(organisme_id__in=to_delete_ids).delete()[0]
        counts["companion_relations"] = CompanionRelation.objects.filter(
            Q(organisme_source_id__in=to_delete_ids) | Q(organisme_cible_id__in=to_delete_ids)
        ).delete()[0]
        counts["organism_propriete"] = OrganismPropriete.objects.filter(organisme_id__in=to_delete_ids).delete()[0]
        counts["organism_usage"] = OrganismUsage.objects.filter(organisme_id__in=to_delete_ids).delete()[0]
        counts["organism_calendrier"] = OrganismCalendrier.objects.filter(organisme_id__in=to_delete_ids).delete()[0]
        counts["organism_noms"] = OrganismNom.objects.filter(organism_id__in=to_delete_ids).delete()[0]

        self.stdout.write("Suppression des organismes sans hydroquebec...")
        try:
            counts["organisms"] = Organism.objects.filter(pk__in=to_delete_ids).delete()[0]
        except OperationalError as e:
            # Cas courant en SQLite dev : table M2M / through manquante.
            # On bascule alors en DELETE SQL direct sur la table principale.
            if "no such table" in str(e).lower():
                self.stdout.write(self.style.WARNING(f"  Table(s) manquante(s) lors de la suppression Django : {e}"))
                counts["organisms"] = _delete_organisms_raw_by_ids(to_delete_ids)
            else:
                raise

        self.stdout.write(self.style.SUCCESS(
            f"Terminé. Supprimés : {counts.get('organisms', 0)} organismes. "
            f"Conservés : {kept} espèces Hydro-Québec."
        ))

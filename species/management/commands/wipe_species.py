"""
Vide les tables espèces (organismes) et toutes les tables liées.
Réservé au développement : supprime organismes, spécimens, semences, favoris, etc.
Ne touche pas aux utilisateurs, jardins (vides), amendements, fournisseurs.

Usage:
  python manage.py wipe_species
  python manage.py wipe_species --no-input
"""
from django.core.management.base import BaseCommand

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


class Command(BaseCommand):
    help = (
        "Vide les organismes (espèces) et toutes les données liées : spécimens, événements, "
        "rappels, photos (espèces), semences, favoris organismes, propriétés, usages, calendrier, "
        "compagnonnage. Pour le développement uniquement."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Ne pas demander de confirmation",
        )

    def handle(self, *args, **options):
        if not options["no_input"]:
            if input("Vider toutes les espèces et données liées (spécimens, semences, etc.) ? (oui/non): ").strip().lower() != "oui":
                self.stdout.write(self.style.WARNING("Annulé."))
                return

        # Ordre pour respecter les clés étrangères (PROTECT sur Organism depuis Specimen/SeedCollection)
        counts = {}

        self.stdout.write("Suppression des spécimens (et événements, rappels, photos spécimen, favoris spécimen)...")
        counts["specimens"] = Specimen.objects.count()
        Specimen.objects.all().delete()

        self.stdout.write("Suppression des semis et lots de semences...")
        counts["semis_batches"] = SemisBatch.objects.count()
        SemisBatch.objects.all().delete()
        counts["seed_collections"] = SeedCollection.objects.count()
        SeedCollection.objects.all().delete()

        self.stdout.write("Suppression des cultivars...")
        counts["cultivars"] = Cultivar.objects.count()
        Cultivar.objects.all().delete()

        self.stdout.write("Suppression des favoris espèces, recommandations, compagnonnage, propriétés, usages, calendrier...")
        counts["organism_favorites"] = OrganismFavorite.objects.count()
        OrganismFavorite.objects.all().delete()
        counts["organism_amendments"] = OrganismAmendment.objects.count()
        OrganismAmendment.objects.all().delete()
        counts["companion_relations"] = CompanionRelation.objects.count()
        CompanionRelation.objects.all().delete()
        counts["organism_propriete"] = OrganismPropriete.objects.count()
        OrganismPropriete.objects.all().delete()
        counts["organism_usage"] = OrganismUsage.objects.count()
        OrganismUsage.objects.all().delete()
        counts["organism_calendrier"] = OrganismCalendrier.objects.count()
        OrganismCalendrier.objects.all().delete()

        self.stdout.write("Suppression des organismes (et photos génériques espèces)...")
        counts["organisms"] = Organism.objects.count()
        Organism.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(
            f"Terminé. Supprimé : {counts.get('organisms', 0)} organismes, "
            f"{counts.get('specimens', 0)} spécimens, "
            f"{counts.get('seed_collections', 0)} lots de semences, "
            f"{counts.get('semis_batches', 0)} semis, etc."
        ))

"""
Migre les Organism dont le nom_latin contient un cultivar (ex. Vaccinium corymbosum 'Bluecrop')
vers le modèle espèce + Cultivar : trouve ou crée l'Organism espèce, crée le Cultivar,
réattribue les Specimens (organisme + cultivar), fusionne les autres relations, supprime l'Organism cultivar.

Usage:
  python manage.py migrate_cultivar_organisms --dry-run   # Affiche les organismes à migrer sans modifier
  python manage.py migrate_cultivar_organisms            # Migre après confirmation
  python manage.py migrate_cultivar_organisms --no-input # Migre sans demander confirmation
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from species.models import (
    Cultivar,
    Organism,
    OrganismAmendment,
    OrganismCalendrier,
    OrganismFavorite,
    OrganismPropriete,
    OrganismUsage,
    Photo,
    SeedCollection,
    Specimen,
)
from species.source_rules import (
    find_or_match_organism,
    get_unique_slug_cultivar,
    get_unique_slug_latin,
    parse_cultivar_from_latin,
)

# CompanionRelation import with lazy to avoid circular
def _get_companion_relation():
    from species.models import CompanionRelation
    return CompanionRelation


def migrate_one_cultivar_organism(org, stdout):
    """
    Pour un Organism dont nom_latin contient un cultivar :
    - Trouve ou crée l'Organism espèce (base_latin)
    - Crée le Cultivar sous l'espèce
    - Réattribue Specimens (organisme=espèce, cultivar=ce_cultivar)
    - Réattribue Photos, SeedCollection, OrganismPropriete, OrganismUsage, OrganismCalendrier,
      OrganismAmendment, CompanionRelation, OrganismFavorite vers l'espèce
    - Fusionne data_sources et zone_rusticite sur l'espèce
    - Supprime org
    """
    base_latin, nom_cultivar = parse_cultivar_from_latin(org.nom_latin or '')
    if not nom_cultivar or not base_latin:
        return None

    # Dériver nom_commun espèce (retirer le nom du cultivar en fin si présent)
    import re
    nom_commun_clean = (org.nom_commun or '').strip()
    nom_commun_espece = re.sub(
        r'\s+' + re.escape(nom_cultivar) + r'\s*$',
        '',
        nom_commun_clean,
        flags=re.IGNORECASE,
    ).strip() or nom_commun_clean

    # Trouver ou créer l'Organism espèce (éviter de matcher org lui-même via fuzzy)
    species = (
        Organism.objects.filter(nom_latin__iexact=base_latin)
        .exclude(pk=org.pk)
        .first()
    )
    if not species:
        species, _ = find_or_match_organism(
            Organism,
            nom_latin=base_latin,
            nom_commun=nom_commun_espece,
            defaults={
                'nom_commun': nom_commun_espece,
                'regne': getattr(org, 'regne', 'plante') or 'plante',
            },
        )
    if species.id == org.id:
        # Fuzzy a renvoyé org : créer une vraie espèce et y rattacher
        species = Organism.objects.create(
            nom_latin=base_latin,
            nom_commun=nom_commun_espece,
            slug_latin=get_unique_slug_latin(Organism, base_latin),
            regne=org.regne or 'plante',
            type_organisme=org.type_organisme or 'vivace',
            famille=org.famille or '',
        )

    # Créer le Cultivar sous l'espèce (slug unique)
    slug_cultivar = get_unique_slug_cultivar(Cultivar, species, nom_cultivar)
    cultivar, _ = Cultivar.objects.get_or_create(
        organism=species,
        slug_cultivar=slug_cultivar,
        defaults={'nom': nom_cultivar},
    )

    CompanionRelation = _get_companion_relation()

    # Specimens : réattribuer vers espèce + cultivar
    Specimen.objects.filter(organisme=org).update(organisme=species, cultivar=cultivar)

    # Photos
    Photo.objects.filter(organisme=org).update(organisme=species)

    # SeedCollection
    SeedCollection.objects.filter(organisme=org).update(organisme=species)

    # OrganismPropriete, OrganismUsage, OrganismCalendrier
    OrganismPropriete.objects.filter(organisme=org).update(organisme=species)
    OrganismUsage.objects.filter(organisme=org).update(organisme=species)
    OrganismCalendrier.objects.filter(organisme=org).update(organisme=species)

    # OrganismAmendment
    OrganismAmendment.objects.filter(organisme=org).update(organisme=species)

    # CompanionRelation
    for rel in CompanionRelation.objects.filter(organisme_source=org):
        if not CompanionRelation.objects.filter(
            organisme_source=species,
            organisme_cible=rel.organisme_cible,
            type_relation=rel.type_relation,
        ).exists():
            rel.organisme_source = species
            rel.save()
        else:
            rel.delete()
    for rel in CompanionRelation.objects.filter(organisme_cible=org):
        if not CompanionRelation.objects.filter(
            organisme_source=rel.organisme_source,
            organisme_cible=species,
            type_relation=rel.type_relation,
        ).exists():
            rel.organisme_cible = species
            rel.save()
        else:
            rel.delete()

    # OrganismFavorite : transférer vers l'espèce si pas déjà favori
    for fav in OrganismFavorite.objects.filter(organism=org):
        if not OrganismFavorite.objects.filter(user=fav.user, organism=species).exists():
            fav.organism = species
            fav.save()
        else:
            fav.delete()

    # Fusionner data_sources et zone_rusticite sur l'espèce
    merged_sources = dict(species.data_sources or {})
    for k, v in (org.data_sources or {}).items():
        if k not in merged_sources:
            merged_sources[k] = v
    species.data_sources = merged_sources

    kept_zones = list(species.zone_rusticite or [])
    for z in org.zone_rusticite or []:
        if isinstance(z, dict) and z.get('zone'):
            src = z.get('source', '')
            if not any(
                isinstance(x, dict) and x.get('source') == src for x in kept_zones
            ):
                kept_zones.append(z)
    species.zone_rusticite = kept_zones
    species.save()

    # Photo principale
    if not species.photo_principale_id and org.photo_principale_id:
        species.photo_principale = org.photo_principale
        species.save(update_fields=['photo_principale'])

    # Tags M2M
    species.mes_tags.add(*org.mes_tags.all())

    stdout.write(
        f"    Migré id={org.id} « {org.nom_commun } » ({org.nom_latin}) → espèce id={species.id} + cultivar « {nom_cultivar} »"
    )
    org.delete()
    return species


class Command(BaseCommand):
    help = (
        "Migre les Organism dont le nom latin contient un cultivar (ex. Species 'Cultivar') "
        "vers espèce + Cultivar : crée le Cultivar, réattribue les relations, supprime l'Organism."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher les organismes à migrer sans modifier la base.',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Ne pas demander de confirmation avant de migrer.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        no_input = options['no_input']

        to_migrate = []
        for org in Organism.objects.all().order_by('id'):
            base_latin, nom_cultivar = parse_cultivar_from_latin(org.nom_latin or '')
            if nom_cultivar and base_latin:
                to_migrate.append(org)

        if not to_migrate:
            self.stdout.write(self.style.SUCCESS('Aucun Organism à migrer (cultivar dans nom_latin).'))
            return

        self.stdout.write(
            self.style.WARNING(
                f'{len(to_migrate)} organisme(s) à migrer vers espèce + Cultivar.'
            )
        )
        for org in to_migrate:
            base_latin, nom_cultivar = parse_cultivar_from_latin(org.nom_latin or '')
            self.stdout.write(
                f"  id={org.id} « {org.nom_commun} » ({org.nom_latin}) → espèce « {base_latin} » + cultivar « {nom_cultivar} »"
            )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\nMode dry-run : aucune modification. Relancez sans --dry-run pour migrer.'
                )
            )
            return

        if not no_input:
            if input('\nMigrer ces organismes ? (oui/non): ').strip().lower() != 'oui':
                self.stdout.write('Annulé.')
                return

        migrated = 0
        with transaction.atomic():
            for org in to_migrate:
                # Re-fetch in case of ordering issues
                org = Organism.objects.filter(pk=org.pk).first()
                if not org:
                    continue
                result = migrate_one_cultivar_organism(org, self.stdout)
                if result is not None:
                    migrated += 1

        self.stdout.write(
            self.style.SUCCESS(f'\nTerminé : {migrated} organisme(s) migré(s).')
        )

"""
Compagnonnage par spécimen : deux directions (bénéficie de / aide à).
Réutilise species.utils.distance_metres_between_specimens pour les distances.
"""
from catalog.models import CompanionRelation
from .models import Specimen
from .utils import distance_metres_between_specimens


def _companion_status(specimen, other_specimens, distance_optimale_m):
    """
    Détermine le statut pour un ensemble de spécimens compagnons dans le même jardin.
    Retourne (status, distance_m, other_specimen) avec status in ('ACTIF', 'TROP_LOIN', 'MANQUANT').
    other_specimens: liste de spécimens du jardin (même organisme que le compagnon attendu).
    On choisit le plus proche si plusieurs (haversine).
    """
    if not other_specimens:
        return 'MANQUANT', None, None
    best = None
    best_dist = None
    for s in other_specimens:
        d = distance_metres_between_specimens(specimen, s)
        if best is None:
            best = s
            best_dist = d
            continue
        if d is None and best_dist is None:
            best = s
            continue
        if d is not None and (best_dist is None or d < best_dist):
            best = s
            best_dist = d
    if best is None:
        return 'MANQUANT', None, None
    dist = best_dist
    if dist is None:
        return 'ACTIF', None, best
    if distance_optimale_m is not None and dist > distance_optimale_m:
        return 'TROP_LOIN', dist, best
    return 'ACTIF', dist, best


def compute_specimen_companions(specimen_id):
    """
    Calcule les compagnons dans les deux sens pour un spécimen.

    - benefices_de: relations où organisme_cible = specimen.organisme (espèces dont la présence aide ce spécimen).
      Pour chaque relation, cherche un spécimen de organisme_source dans le même jardin; haversine si coords.
    - aide_a: relations où organisme_source = specimen.organisme (espèces que ce spécimen aide).
      Même logique avec organisme_cible.

    Returns:
        dict avec benefices_de: { actifs: [...], manquants: [...] }, aide_a: { actifs: [...], manquants: [...] }
        Chaque entrée: organisme_nom, type_relation, type_relation_display, force, distance_optimale,
        status ('ACTIF'|'TROP_LOIN'|'MANQUANT'), distance_metres (si calculée), specimen_id (compagnon si actif/trop_loin).
    """
    specimen = (
        Specimen.objects.filter(pk=specimen_id)
        .select_related('organisme', 'garden')
        .first()
    )
    if not specimen or not specimen.organisme_id or not specimen.garden_id:
        return {'benefices_de': {'actifs': [], 'manquants': []}, 'aide_a': {'actifs': [], 'manquants': []}}

    garden_id = specimen.garden_id
    organism_id = specimen.organisme_id

    def build_entry(rel, other_organism, status, distance_metres, other_specimen):
        type_display = rel.get_type_relation_display() if hasattr(rel, 'get_type_relation_display') else rel.type_relation
        entry = {
            'organisme_nom': other_organism.nom_commun or other_organism.nom_latin,
            'type_relation': rel.type_relation,
            'type_relation_display': type_display,
            'force': rel.force,
            'distance_optimale': rel.distance_optimale,
            'status': status,
            'distance_metres': round(distance_metres, 1) if distance_metres is not None else None,
        }
        if other_specimen:
            entry['specimen_id'] = other_specimen.id
            entry['specimen_nom'] = other_specimen.nom
        return entry

    benefices_actifs = []
    benefices_manquants = []
    # benefices_de: organisme_cible = notre espèce → on cherche organisme_source dans le jardin
    for rel in CompanionRelation.objects.filter(organisme_cible_id=organism_id).select_related('organisme_source'):
        others = list(
            Specimen.objects.filter(
                garden_id=garden_id,
                organisme_id=rel.organisme_source_id,
            ).exclude(statut__in=('mort', 'enleve'))
        )
        status, dist_m, other_spec = _companion_status(
            specimen, others, rel.distance_optimale
        )
        entry = build_entry(rel, rel.organisme_source, status, dist_m, other_spec)
        if status == 'ACTIF' or status == 'TROP_LOIN':
            benefices_actifs.append(entry)
        else:
            benefices_manquants.append(entry)

    aide_actifs = []
    aide_manquants = []
    # aide_a: organisme_source = notre espèce → on cherche organisme_cible dans le jardin
    for rel in CompanionRelation.objects.filter(organisme_source_id=organism_id).select_related('organisme_cible'):
        others = list(
            Specimen.objects.filter(
                garden_id=garden_id,
                organisme_id=rel.organisme_cible_id,
            ).exclude(statut__in=('mort', 'enleve'))
        )
        status, dist_m, other_spec = _companion_status(
            specimen, others, rel.distance_optimale
        )
        entry = build_entry(rel, rel.organisme_cible, status, dist_m, other_spec)
        if status == 'ACTIF' or status == 'TROP_LOIN':
            aide_actifs.append(entry)
        else:
            aide_manquants.append(entry)

    return {
        'benefices_de': {'actifs': benefices_actifs, 'manquants': benefices_manquants},
        'aide_a': {'actifs': aide_actifs, 'manquants': aide_manquants},
    }

"""
Warnings par jardin : rappels en retard, pollinisateurs manquants, alertes phénologiques.
"""
from datetime import date

from catalog.models import CultivarPollinator

from .models import Reminder, Specimen
from .phenology import compute_phenology_alerts


def compute_overdue_reminders(garden_id):
    """
    Rappels avec date_rappel < aujourd'hui pour les spécimens du jardin.
    Returns: list of { specimen_id, specimen_nom, type_rappel, date_rappel, jours_retard }.
    Limite 10, tri par jours_retard décroissant.
    """
    today = date.today()
    qs = (
        Reminder.objects.filter(
            specimen__garden_id=garden_id,
            date_rappel__lt=today,
        )
        .select_related('specimen')
        .order_by('date_rappel')[:10]
    )
    result = []
    for r in qs:
        jours_retard = (today - r.date_rappel).days
        result.append({
            'reminder_id': r.id,
            'specimen_id': r.specimen_id,
            'specimen_nom': r.specimen.nom,
            'type_rappel': r.type_rappel,
            'date_rappel': r.date_rappel.isoformat(),
            'jours_retard': jours_retard,
        })
    result.sort(key=lambda x: -x['jours_retard'])
    return result[:10]


def _pollinator_companion_name(poll):
    """Nom du compagnon pollinisateur (cultivar ou organisme)."""
    if poll.companion_cultivar_id:
        return poll.companion_cultivar.nom
    if poll.companion_organism_id:
        return poll.companion_organism.nom_commun or poll.companion_organism.nom_latin
    return ''


def compute_missing_pollinators(garden_id):
    """
    Pour chaque spécimen actif du jardin ayant un cultivar avec CultivarPollinator,
    vérifie si au moins un spécimen compatible (même cultivar ou même organisme) est
    présent dans le jardin. Sinon, alerte avec pollinisateurs_manquants.
    Returns: list of { specimen_id, specimen_nom, cultivar_nom, pollinisateurs_manquants: [nom, ...] }.
    Limite 10.
    """
    specimens = (
        Specimen.objects.filter(garden_id=garden_id)
        .exclude(statut__in=('mort', 'enleve'))
        .filter(cultivar_id__isnull=False)
        .select_related('cultivar', 'organisme')
        .prefetch_related('cultivar__pollinator_companions')
    )
    result = []
    for specimen in specimens:
        if not specimen.cultivar:
            continue
        companions = list(specimen.cultivar.pollinator_companions.select_related('companion_cultivar', 'companion_organism').all())
        if not companions:
            continue
        missing = []
        for poll in companions:
            # Compatible = un spécimen dans le même jardin avec cultivar=companion_cultivar ou organisme=companion_organism
            if poll.companion_cultivar_id:
                has_companion = Specimen.objects.filter(
                    garden_id=garden_id,
                    cultivar_id=poll.companion_cultivar_id,
                ).exclude(pk=specimen.pk).exists()
            else:
                has_companion = Specimen.objects.filter(
                    garden_id=garden_id,
                    organisme_id=poll.companion_organism_id,
                ).exclude(pk=specimen.pk).exists()
            if not has_companion:
                name = _pollinator_companion_name(poll)
                if name and name not in missing:
                    missing.append(name)
        if missing:
            result.append({
                'specimen_id': specimen.id,
                'specimen_nom': specimen.nom,
                'cultivar_nom': specimen.cultivar.nom,
                'pollinisateurs_manquants': missing,
            })
        if len(result) >= 10:
            break
    return result


def compute_garden_warnings(garden_id):
    """
    Agrège overdue_reminders, missing_pollinators et phenology_alerts pour un jardin.
    Returns: dict avec overdue_reminders, missing_pollinators, phenology_alerts, total_count.
    """
    overdue = compute_overdue_reminders(garden_id)
    missing = compute_missing_pollinators(garden_id)
    phenology = compute_phenology_alerts(garden_id)
    total = len(overdue) + len(missing) + len(phenology)
    return {
        'overdue_reminders': overdue,
        'missing_pollinators': missing,
        'phenology_alerts': phenology,
        'total_count': total,
    }

"""
Alertes phénologiques par jardin.

"commence" = date(today.year, mois_debut, 1) dans les 14 prochains jours.
Si cette date est < today (déjà passée dans l'année), on prend today.year + 1.

"déjà confirmé" = un Event du même type (floraison/fructification/recolte) avec
date >= today - 30 jours pour ce spécimen.
"""
from datetime import date, timedelta

from catalog.models import OrganismCalendrier
from .models import Event, Specimen


PHENOLOGY_EVENT_TYPES = ('floraison', 'fructification', 'recolte')


def compute_phenology_alerts(garden_id, reference_date=None):
    """
    Pour chaque spécimen actif du jardin, génère des alertes si un stade
    (floraison, fructification, récolte) commence dans les 14 prochains jours,
    sauf si déjà confirmé par un événement dans les 30 derniers jours.

    Returns:
        Liste de dicts: specimen_id, specimen_nom, organisme_nom, type_periode,
        mois_debut, jours_restants. Triée par jours_restants croissant.
    """
    if reference_date is None:
        reference_date = date.today()

    today = reference_date
    specimens = (
        Specimen.objects.filter(garden_id=garden_id)
        .exclude(statut__in=('mort', 'enleve'))
        .select_related('organisme')
        .prefetch_related('organisme__calendrier', 'evenements')
    )

    alerts = []
    for specimen in specimens:
        if not specimen.organisme_id:
            continue
        for cal in specimen.organisme.calendrier.all():
            if cal.type_periode not in PHENOLOGY_EVENT_TYPES:
                continue
            mois_debut = cal.mois_debut
            if not mois_debut or mois_debut < 1 or mois_debut > 12:
                continue
            # Premier jour du mois de début pour cette année
            start_this_year = date(today.year, mois_debut, 1)
            if start_this_year < today:
                start_this_year = date(today.year + 1, mois_debut, 1)
            days_until = (start_this_year - today).days
            if days_until < 0 or days_until > 14:
                continue
            # Déjà confirmé par un événement du même type dans les 30 derniers jours ?
            cutoff = today - timedelta(days=30)
            if Event.objects.filter(
                specimen=specimen,
                type_event=cal.type_periode,
                date__gte=cutoff,
            ).exists():
                continue
            alerts.append({
                'specimen_id': specimen.id,
                'specimen_nom': specimen.nom,
                'organisme_nom': specimen.organisme.nom_commun if specimen.organisme else '',
                'type_periode': cal.type_periode,
                'mois_debut': mois_debut,
                'jours_restants': days_until,
            })

    alerts.sort(key=lambda a: a['jours_restants'])
    return alerts

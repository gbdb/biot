"""
Utilitaires partagés (distance, seuils pollinisation).
"""
from math import radians, sin, cos, sqrt, atan2


def distance_metres_between_specimens(specimen_a, specimen_b):
    """
    Distance en mètres entre deux specimens (haversine) à partir de lat/long.
    Retourne None si l'un des deux n'a pas latitude et longitude.
    """
    lat1 = getattr(specimen_a, 'latitude', None)
    lon1 = getattr(specimen_a, 'longitude', None)
    lat2 = getattr(specimen_b, 'latitude', None)
    lon2 = getattr(specimen_b, 'longitude', None)
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    return _haversine_m(lat1, lon1, lat2, lon2)


def _haversine_m(lat1, lon1, lat2, lon2):
    """Haversine: distance en mètres entre deux points (lat, lon en degrés)."""
    R = 6371000  # rayon Terre en mètres
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlam = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlam / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def get_pollination_distance_max_m(organism, user):
    """
    Retourne la distance max de pollinisation en mètres pour un organisme.
    Priorité : Organism.distance_pollinisation_max > UserPreference > settings.
    """
    from django.conf import settings
    if organism and getattr(organism, 'distance_pollinisation_max', None) is not None:
        return float(organism.distance_pollinisation_max)
    if user and user.is_authenticated:
        from .models import UserPreference
        prefs = UserPreference.objects.filter(user=user).first()
        if prefs and prefs.pollination_distance_max_default_m is not None:
            return float(prefs.pollination_distance_max_default_m)
    return float(getattr(settings, 'POLLINATION_DISTANCE_MAX_DEFAULT_M', 50))

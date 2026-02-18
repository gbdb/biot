"""
Signaux pour Jardin bIOT.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Garden
from .weather_service import fetch_weather_for_garden

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Garden)
def fetch_weather_on_garden_create(sender, instance, created, **kwargs):
    """
    Récupère automatiquement la météo lorsqu'un jardin est créé avec des coordonnées,
    ou lorsqu'un jardin existant reçoit des coordonnées pour la première fois.
    """
    if not instance.a_coordonnees():
        return
    # Nouveau jardin OU jardin sans données météo (coords ajoutées récemment)
    has_records = instance.weather_records.exists()
    if created or not has_records:
        try:
            n = fetch_weather_for_garden(instance, days_back=14)
            logger.info(f"Météo auto-fetch pour jardin {instance}: {n} jours")
        except Exception as e:
            logger.warning(f"Météo auto-fetch échoué pour {instance}: {e}")

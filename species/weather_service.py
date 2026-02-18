"""
Service météo via Open-Meteo (gratuit, sans clé API).
Fournit températures, précipitations et géocodage pour les jardins.
"""
import logging
from datetime import date, timedelta

import requests

from .models import Garden, WeatherRecord

logger = logging.getLogger(__name__)

# Open-Meteo API (forecast with past_days for recent history)
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# Historical archive for older dates
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


def fetch_weather_for_garden(garden: Garden, days_back: int = 14) -> int:
    """
    Récupère les données météo pour un jardin et les enregistre.
    Utilise past_days du Forecast API pour les derniers jours.
    Retourne le nombre d'enregistrements créés/mis à jour.
    """
    if not garden.a_coordonnees():
        logger.warning(f"Jardin {garden} sans coordonnées, skip météo")
        return 0

    today = date.today()
    # Open-Meteo past_days: 0 = today only, 1 = today + yesterday, etc. Max 92
    past_days = min(max(0, days_back), 92)

    params = {
        "latitude": garden.latitude,
        "longitude": garden.longitude,
        "timezone": garden.timezone,
        "past_days": past_days,
        "forecast_days": 1,  # include today
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "precipitation_sum",
            "rain_sum",
            "snowfall_sum",
            "et0_fao_evapotranspiration",
        ],
    }

    try:
        resp = requests.get(FORECAST_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.exception(f"Erreur API météo pour {garden}: {e}")
        return 0

    daily = data.get("daily", {})
    times = daily.get("time", [])
    if not times:
        logger.warning(f"Pas de données daily pour {garden}")
        return 0

    created = 0
    for i, time_str in enumerate(times):
        try:
            day = date.fromisoformat(time_str)
        except (ValueError, TypeError):
            continue
        if day > today:  # skip forecast days
            continue

        temp_max = _safe_float(daily.get("temperature_2m_max"), i)
        temp_min = _safe_float(daily.get("temperature_2m_min"), i)
        temp_mean = _safe_float(daily.get("temperature_2m_mean"), i)
        precip = _safe_float(daily.get("precipitation_sum"), i) or 0.0
        rain = _safe_float(daily.get("rain_sum"), i)
        snow = _safe_float(daily.get("snowfall_sum"), i)
        et0 = _safe_float(daily.get("et0_fao_evapotranspiration"), i)

        wr, is_new = WeatherRecord.objects.update_or_create(
            garden=garden,
            date=day,
            defaults={
                "temp_max": temp_max,
                "temp_min": temp_min,
                "temp_mean": temp_mean,
                "precipitation_mm": precip,
                "rain_mm": rain,
                "snowfall_cm": snow,
                "et0_mm": et0,
            },
        )
        if is_new:
            created += 1

    return created


def _timezone_from_coords(lat: float, lon: float) -> str:
    """Estime le timezone depuis les coordonnées (règle simple pour Amérique du Nord)."""
    if lat and lon:
        if -55 < lat < 70 and -130 < lon < -50:  # Amérique du Nord
            return "America/Montreal"
        if -55 < lat < 70 and -10 < lon < 15:  # France
            return "Europe/Paris"
    return "America/Montreal"


def geocode_address(garden: Garden) -> dict | None:
    """
    Convertit l'adresse du jardin en coordonnées.
    Essaie d'abord Open-Meteo, puis Nominatim (OpenStreetMap) pour les adresses complètes.
    Retourne {"latitude": float, "longitude": float, "timezone": str} ou None.
    """
    parts = []
    if garden.adresse:
        parts.append(garden.adresse.strip())
    if garden.ville:
        parts.append(garden.ville.strip())
    if garden.code_postal:
        parts.append(garden.code_postal.strip())
    if garden.pays:
        parts.append(garden.pays.strip())

    query = ", ".join(p for p in parts if p)
    if len(query) < 3:
        return None

    country_map = {
        "Canada": "CA", "France": "FR", "Suisse": "CH", "Belgique": "BE",
        "Québec": "CA", "USA": "US", "États-Unis": "US",
    }
    country_code = ""
    if garden.pays:
        country_code = country_map.get(garden.pays.strip(), "")
        if not country_code and len(garden.pays) == 2:
            country_code = garden.pays.upper()

    # 1. Essai Open-Meteo (bon pour ville, code postal)
    queries_try = [query]
    # Variantes simplifiées
    if garden.ville and garden.pays:
        queries_try.append(f"{garden.ville.strip()}, {garden.pays.strip()}")
    if garden.code_postal and garden.pays:
        queries_try.append(f"{garden.code_postal.strip()}, {garden.pays.strip()}")
        # Code postal canadien avec espace (J0R 1H0) parfois mieux reconnu
        cp = garden.code_postal.strip().replace(" ", "")
        if len(cp) == 6 and cp[:1].isalpha() and cp[1:2].isdigit():
            queries_try.append(f"{cp[:3]} {cp[3:]}, {garden.pays.strip()}")

    seen = set()
    for q in queries_try:
        if not q or len(q) < 3 or q in seen:
            continue
        seen.add(q)
        result = _geocode_openmeteo(q, country_code)
        if result:
            return result

    # 2. Fallback Nominatim (meilleur pour adresses complètes)
    result = _geocode_nominatim(query, country_code)
    if result:
        return result

    return None


def _geocode_openmeteo(query: str, country_code: str = "") -> dict | None:
    """Géocodage via Open-Meteo (GeoNames)."""
    params = {"name": query, "count": 1, "language": "fr"}
    if country_code:
        params["country_code"] = country_code
    try:
        resp = requests.get(GEOCODING_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if results:
            r = results[0]
            return {
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude"),
                "timezone": r.get("timezone", _timezone_from_coords(r.get("latitude"), r.get("longitude"))),
            }
    except requests.RequestException as e:
        logger.debug(f"Open-Meteo geocode failed for '{query}': {e}")
    return None


def _geocode_nominatim(query: str, country_code: str = "") -> dict | None:
    """Géocodage via Nominatim (OpenStreetMap) — adapté aux adresses complètes."""
    params = {"q": query, "format": "json", "limit": 1}
    if country_code:
        params["countrycodes"] = country_code.lower()
    headers = {"User-Agent": "JardinBIOT/1.0 (permaculture garden app; https://github.com)"}
    try:
        resp = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list) and data:
            r = data[0]
            lat = float(r.get("lat", 0))
            lon = float(r.get("lon", 0))
            return {
                "latitude": lat,
                "longitude": lon,
                "timezone": _timezone_from_coords(lat, lon),
            }
    except (requests.RequestException, (ValueError, KeyError, TypeError)) as e:
        logger.debug(f"Nominatim geocode failed for '{query}': {e}")
    return None


def _safe_float(arr, index):
    if not arr or index >= len(arr):
        return None
    v = arr[index]
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def fetch_weather_all_gardens(days_back: int = 14) -> dict:
    """
    Récupère la météo pour tous les jardins avec coordonnées.
    Retourne {garden_id: nb_records_created}
    """
    gardens = Garden.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False,
    )
    result = {}
    for g in gardens:
        n = fetch_weather_for_garden(g, days_back=days_back)
        result[g.id] = n
    return result


def get_watering_alert(garden: Garden) -> dict | None:
    """
    Analyse les derniers jours météo et retourne une alerte si conditions
    chaud + sec détectées. Sinon retourne None.
    """
    if not garden.a_coordonnees():
        return None

    n_days = garden.jours_periode_analyse
    today = date.today()
    start = today - timedelta(days=n_days)

    records = list(
        WeatherRecord.objects.filter(
            garden=garden,
            date__gte=start,
            date__lte=today,
        ).order_by("date")
    )

    if len(records) < n_days - 1:  # tolérance si quelques jours manquants
        return None

    temp_seuil = garden.seuil_temp_chaud_c
    pluie_seuil = garden.seuil_pluie_faible_mm

    temps_chaud = 0
    pluie_totale = 0.0

    for r in records:
        if r.temp_mean is not None and r.temp_mean >= temp_seuil:
            temps_chaud += 1
        pluie_totale += (r.precipitation_mm or 0.0)

    if temps_chaud >= n_days - 1 and pluie_totale < pluie_seuil:
        return {
            "type": "watering_recommended",
            "message": (
                f"Chaud et sec depuis {n_days} jours : "
                f"température moyenne ≥ {temp_seuil}°C, "
                f"seulement {pluie_totale:.1f} mm de pluie. "
                "Arrosage conseillé."
            ),
            "days_hot": temps_chaud,
            "precipitation_mm": round(pluie_totale, 1),
            "threshold_temp": temp_seuil,
            "threshold_rain": pluie_seuil,
        }
    return None


def trigger_sprinkler(sprinkler_zone, duree_minutes: int | None = None) -> tuple[bool, str]:
    """
    Déclenche une zone sprinkler via son webhook.
    Retourne (success, message).
    """
    if not sprinkler_zone.actif:
        return False, "Zone désactivée"

    if sprinkler_zone.type_integration == "webhook" and sprinkler_zone.webhook_url:
        duree = duree_minutes or sprinkler_zone.duree_defaut_minutes
        try:
            resp = requests.post(
                sprinkler_zone.webhook_url,
                json={"duration_minutes": duree, "zone": sprinkler_zone.nom},
                timeout=10,
            )
            if resp.ok:
                return True, f"Arrosage déclenché ({duree} min)"
            return False, f"HTTP {resp.status_code}"
        except requests.RequestException as e:
            return False, str(e)
    return False, "Webhook non configuré"

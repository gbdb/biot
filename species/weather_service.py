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


def fetch_forecast(garden: Garden, days: int = 7) -> list[dict]:
    """
    Récupère la prévision météo (J+1 à J+N).
    Retourne une liste de dicts {date, temp_min, temp_max, temp_mean, precipitation_mm, rain_mm, snowfall_cm}.
    """
    if not garden.a_coordonnees():
        return []

    params = {
        "latitude": garden.latitude,
        "longitude": garden.longitude,
        "timezone": garden.timezone,
        "forecast_days": min(days, 16),
        "daily": [
            "temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
            "precipitation_sum", "rain_sum", "snowfall_sum",
        ],
    }

    try:
        resp = requests.get(FORECAST_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        logger.warning(f"Forecast API failed for {garden}: {e}")
        return []

    daily = data.get("daily", {})
    times = daily.get("time", [])
    today = date.today()
    result = []

    for i, time_str in enumerate(times):
        try:
            day = date.fromisoformat(time_str)
        except (ValueError, TypeError):
            continue
        if day <= today:
            continue  # only future days
        result.append({
            "date": day,
            "temp_min": _safe_float(daily.get("temperature_2m_min"), i),
            "temp_max": _safe_float(daily.get("temperature_2m_max"), i),
            "temp_mean": _safe_float(daily.get("temperature_2m_mean"), i),
            "precipitation_mm": _safe_float(daily.get("precipitation_sum"), i) or 0.0,
            "rain_mm": _safe_float(daily.get("rain_sum"), i) or 0.0,
            "snowfall_cm": _safe_float(daily.get("snowfall_sum"), i) or 0.0,
        })
    return result


def get_forecast_alerts(garden: Garden, forecast: list[dict]) -> list[dict]:
    """
    Analyse la prévision et retourne une liste d'alertes.
    Chaque alerte: {type, message, severity, ...}
    """
    if not forecast:
        return []

    alerts = []
    today = date.today()
    month = today.month

    # 1. Pas de pluie prévue les N prochains jours
    days_no_rain = 0
    for d in forecast:
        if (d.get("precipitation_mm") or 0) < 1.0:
            days_no_rain += 1
        else:
            break
    seuil = garden.jours_sans_pluie_prevision
    if days_no_rain >= seuil:
        alerts.append({
            "type": "no_rain_forecast",
            "severity": "info",
            "message": (
                f"Aucune pluie prévue dans les {days_no_rain} prochains jours. "
                "Pensez à arroser avant de partir en vacances."
            ),
            "days_no_rain": days_no_rain,
        })

    # 2. Risque de gel (printemps/tautomne uniquement, pas hiver)
    # Mois "végétatifs" : mars(3) à mai(5), sept(9) à nov(11)
    is_growing_season = month in (3, 4, 5, 9, 10, 11)
    if is_growing_season:
        gel_seuil = garden.seuil_gel_c
        for d in forecast:
            tmin = d.get("temp_min")
            if tmin is not None and tmin <= gel_seuil:
                alerts.append({
                    "type": "frost_risk",
                    "severity": "warning",
                    "message": (
                        f"Risque de gel : {tmin:.0f}°C prévu le {d['date'].strftime('%d/%m')}. "
                        "Protéger les arbres fruitiers et plantes sensibles."
                    ),
                    "date": d["date"],
                    "temp_min": tmin,
                })
                break

    # 3. Forte pluie prévue → annuler sprinklers
    pluie_seuil = garden.seuil_pluie_forte_mm
    for d in forecast[:3]:  # prochains 3 jours
        precip = d.get("precipitation_mm") or 0
        if precip >= pluie_seuil:
            alerts.append({
                "type": "heavy_rain_forecast",
                "severity": "info",
                "message": (
                    f"Fortes précipitations prévues ({precip:.0f} mm) le {d['date'].strftime('%d/%m')}. "
                    "Mieux vaut annuler l'arrosage automatique."
                ),
                "date": d["date"],
                "precipitation_mm": precip,
            })
            break

    # 4. Zone rusticité : jardin 4, espèce 5 → protection hivernale conseillée
    # Uniquement en hiver (nov à mars)
    if month in (11, 12, 1, 2, 3) and garden.zone_rusticite:
        from .models import Specimen
        from .source_rules import zone_rusticite_order

        jardin_zone = garden.zone_rusticite.strip().lower()
        if jardin_zone:
            at_risk = []
            for s in garden.specimens.select_related("organisme").filter(
                organisme__zone_rusticite__isnull=False
            ):
                org = s.organisme
                zones = [
                    z.get("zone") for z in (org.zone_rusticite or [])
                    if isinstance(z, dict) and z.get("zone")
                ]
                for z in zones:
                    try:
                        # zone_rusticite_order: plus bas = plus froid. 4a < 5b
                        if zone_rusticite_order(z) > zone_rusticite_order(jardin_zone):
                            at_risk.append(f"{org.nom_commun} (zone {z})")
                            break
                    except (TypeError, ValueError):
                        pass
            if at_risk:
                alerts.append({
                    "type": "zone_mismatch_winter",
                    "severity": "warning",
                    "message": (
                        f"Jardin en zone {jardin_zone.upper()}, espèces moins rustiques : "
                        f"{', '.join(at_risk[:5])}{'...' if len(at_risk) > 5 else ''}. "
                        "Protection hivernale conseillée."
                    ),
                    "specimens": at_risk,
                })

    return alerts


def should_pause_sprinkler(sprinkler_zone) -> tuple[bool, str]:
    """
    Vérifie si l'arrosage doit être annulé (forte pluie prévue).
    Retourne (pause_recommended, reason).
    """
    if not sprinkler_zone.annuler_si_pluie_prevue:
        return False, ""

    garden = sprinkler_zone.garden
    if not garden.a_coordonnees():
        return False, ""

    forecast = fetch_forecast(garden, days=3)
    pluie_seuil = garden.seuil_pluie_forte_mm
    for d in forecast[:2]:
        precip = d.get("precipitation_mm") or 0
        if precip >= pluie_seuil:
            return True, f"Pluie prévue ({precip:.0f} mm) le {d['date'].strftime('%d/%m')}"
    return False, ""


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


def trigger_sprinkler(
    sprinkler_zone, duree_minutes: int | None = None, force: bool = False
) -> tuple[bool, str, str | None]:
    """
    Déclenche une zone sprinkler via son webhook.
    Retourne (success, message, pause_reason).
    Si pause_reason non vide et force=False, ne pas déclencher (pluie prévue).
    """
    if not sprinkler_zone.actif:
        return False, "Zone désactivée", None

    if not force:
        pause, reason = should_pause_sprinkler(sprinkler_zone)
        if pause:
            return False, "", reason  # callant doit afficher la raison et proposer force

    if sprinkler_zone.type_integration == "webhook" and sprinkler_zone.webhook_url:
        duree = duree_minutes or sprinkler_zone.duree_defaut_minutes
        try:
            resp = requests.post(
                sprinkler_zone.webhook_url,
                json={"duration_minutes": duree, "zone": sprinkler_zone.nom},
                timeout=10,
            )
            if resp.ok:
                return True, f"Arrosage déclenché ({duree} min)", None
            return False, f"HTTP {resp.status_code}", None
        except requests.RequestException as e:
            return False, str(e), None
    return False, "Webhook non configuré", None

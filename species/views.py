"""
Vues pour Jardin bIOT.
"""
import json
from datetime import date, timedelta

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse

from .models import CompanionRelation, Garden, SprinklerZone
from .weather_service import fetch_weather_for_garden, geocode_address, get_watering_alert


@staff_member_required
def companion_network_view(request):
    """
    Visualisation graphique des réseaux de compagnonnage.
    Graphe interactif (vis-network) des relations entre organismes.
    """
    relations = CompanionRelation.objects.select_related(
        "organisme_source", "organisme_cible"
    ).all()

    # Construire les nœuds (organismes uniques)
    nodes_map = {}
    for rel in relations:
        for org in (rel.organisme_source, rel.organisme_cible):
            if org.id not in nodes_map:
                nodes_map[org.id] = {
                    "id": org.id,
                    "label": org.nom_commun,
                    "title": f"{org.nom_commun} ({org.nom_latin})" if org.nom_latin else org.nom_commun,
                    "color": "#2d5a27",  # Vert forêt
                }

    nodes = list(nodes_map.values())

    # Construire les arêtes (relations)
    edges = []
    for rel in relations:
        is_positive = any(
            w in rel.type_relation
            for w in ("positif", "fixateur", "attire", "mycorhize", "abri", "support", "accumulateur", "repousse", "coupe")
        )
        edges.append({
            "from": rel.organisme_source_id,
            "to": rel.organisme_cible_id,
            "label": rel.get_type_relation_display()[:30],
            "title": f"{rel.organisme_source.nom_commun} → {rel.organisme_cible.nom_commun}\n{rel.get_type_relation_display()}\nForce: {rel.force}" + (f"\n{rel.description}" if rel.description else ""),
            "color": {"color": "#2d5a27"} if is_positive else {"color": "#8b2500"},
            "width": max(1, rel.force // 2),
        })

    context = {
        "nodes_json": json.dumps(nodes),
        "edges_json": json.dumps(edges),
        "count_nodes": len(nodes),
        "count_edges": len(edges),
    }
    return render(request, "species/companion_network.html", context)


@staff_member_required
def weather_dashboard_view(request):
    """Tableau de bord météo : températures, pluie, alertes arrosage, zones sprinkler."""
    if request.GET.get("refresh"):
        for g in Garden.objects.filter(latitude__isnull=False, longitude__isnull=False):
            fetch_weather_for_garden(g, days_back=14)
        messages.success(request, "Données météo actualisées.")

    gardens = Garden.objects.prefetch_related("sprinkler_zones", "weather_records").all()
    today = date.today()
    start = today - timedelta(days=14)

    enriched = []
    for g in gardens:
        g.sprinkler_zones_actives = list(g.sprinkler_zones.filter(actif=True))
        g.alert = get_watering_alert(g)
        records = list(
            g.weather_records.filter(date__gte=start).order_by("-date")[:14]
        )
        g.weather_records_display = records  # nom distinct pour éviter d'écraser la relation

        # Agrégats : moyenne temp, total pluie, total neige
        temps = [r.temp_mean for r in records if r.temp_mean is not None]
        g.moyenne_temp = round(sum(temps) / len(temps), 1) if temps else None
        g.total_pluie_mm = round(sum(r.rain_mm or 0 for r in records), 1)
        g.total_neige_cm = round(sum(r.snowfall_cm or 0 for r in records), 1)

        enriched.append(g)

    return render(
        request,
        "species/weather_dashboard.html",
        {"gardens": enriched},
    )


@staff_member_required
def geocode_garden_view(request, garden_id):
    """Remplit lat/long/timezone depuis l'adresse du jardin (géocodage Open-Meteo)."""
    garden = get_object_or_404(Garden, pk=garden_id)
    if request.method != "POST":
        return redirect("admin:species_garden_change", garden_id)

    result = geocode_address(garden)
    if result:
        garden.latitude = result["latitude"]
        garden.longitude = result["longitude"]
        garden.timezone = result.get("timezone", garden.timezone) or "America/Montreal"
        garden.save()
        messages.success(request, f"Coordonnées mises à jour pour {garden.nom}.")
    else:
        messages.warning(
            request,
            "Impossible de géolocaliser. Vérifiez ville, code postal ou adresse (min. 3 caractères)."
        )
    return redirect("admin:species_garden_change", garden_id)


@staff_member_required
def fetch_garden_weather_view(request, garden_id):
    """Lance le fetch météo pour un jardin spécifique (depuis la fiche jardin)."""
    garden = get_object_or_404(Garden, pk=garden_id)
    if not garden.a_coordonnees():
        messages.warning(request, f"Le jardin {garden.nom} n'a pas de coordonnées (lat/long).")
    else:
        n = fetch_weather_for_garden(garden, days_back=14)
        messages.success(request, f"Météo récupérée pour {garden.nom} : {n} jours.")
    return redirect("admin:species_garden_change", garden_id)


@staff_member_required
def trigger_sprinkler_view(request, zone_id):
    """Déclenche une zone sprinkler (POST uniquement)."""
    from .weather_service import trigger_sprinkler

    zone = get_object_or_404(SprinklerZone, pk=zone_id)
    if request.method != "POST":
        return redirect("weather_dashboard")

    success, msg = trigger_sprinkler(zone)
    if success:
        messages.success(request, msg)
    else:
        messages.error(request, f"Erreur : {msg}")

    return redirect("weather_dashboard")

"""
Vues pour Jardin bIOT.
"""
import json
import os
import subprocess
import tempfile
from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
from pathlib import Path

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import authenticate, login, logout
from django.core.management import call_command
from django.conf import settings
from django.http import HttpResponse, JsonResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.db.models import Count, Q
from django.utils import timezone

from gardens.models import UserPreference
from .models import BaseEnrichmentStats, CompanionRelation, Cultivar, CultivarPorteGreffe, Garden, Organism, OrganismNom, Specimen, SprinklerZone, DataImportRun
from .weather_service import (
    fetch_forecast,
    fetch_weather_for_garden,
    geocode_address,
    get_forecast_alerts,
    get_watering_alert,
)


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

    if request.GET.get("clear_sprinkler_pause"):
        request.session.pop("sprinkler_force_zone_id", None)
        return redirect("weather_dashboard")

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

        # Prévision + alertes
        g.forecast = fetch_forecast(g, days=7)
        g.forecast_alerts = get_forecast_alerts(g, g.forecast)

        enriched.append(g)

    force_zone_id = request.session.get("sprinkler_force_zone_id")
    if force_zone_id and not SprinklerZone.objects.filter(pk=force_zone_id).exists():
        request.session.pop("sprinkler_force_zone_id", None)
        force_zone_id = None

    context = {
        "gardens": enriched,
        "sprinkler_force_zone_id": force_zone_id,
    }
    return render(request, "species/weather_dashboard.html", context)


@staff_member_required
def geocode_garden_view(request, garden_id):
    """Remplit lat/long/timezone depuis l'adresse du jardin (géocodage Open-Meteo)."""
    garden = get_object_or_404(Garden, pk=garden_id)
    if request.method != "POST":
        return redirect("admin:gardens_garden_change", garden_id)

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
    return redirect("admin:gardens_garden_change", garden_id)


@staff_member_required
def fetch_garden_weather_view(request, garden_id):
    """Lance le fetch météo pour un jardin spécifique (depuis la fiche jardin)."""
    garden = get_object_or_404(Garden, pk=garden_id)
    if not garden.a_coordonnees():
        messages.warning(request, f"Le jardin {garden.nom} n'a pas de coordonnées (lat/long).")
    else:
        n = fetch_weather_for_garden(garden, days_back=14)
        messages.success(request, f"Météo récupérée pour {garden.nom} : {n} jours.")
    return redirect("admin:gardens_garden_change", garden_id)


@staff_member_required
def trigger_sprinkler_view(request, zone_id):
    """Déclenche une zone sprinkler (POST uniquement)."""
    from .weather_service import trigger_sprinkler

    zone = get_object_or_404(SprinklerZone, pk=zone_id)
    if request.method != "POST":
        return redirect("weather_dashboard")

    force = request.POST.get("force") == "1"
    success, msg, pause_reason = trigger_sprinkler(zone, force=force)
    if success:
        request.session.pop("sprinkler_force_zone_id", None)
        messages.success(request, msg)
    elif pause_reason:
        request.session["sprinkler_force_zone_id"] = zone.id
        messages.warning(
            request,
            f"Arrosage non déclenché : {pause_reason}. "
            "Utilisez le bouton « Déclencher quand même » ci-dessous si nécessaire.",
        )
    else:
        messages.error(request, f"Erreur : {msg}")

    return redirect("weather_dashboard")


SESSION_LOG_KEY = "gestion_donnees_log"

# Tables incluses dans le backup PostgreSQL (espèces, catalog, zones)
BACKUP_PG_TABLES = [
    "species_espece",
    "species_organismcalendrier",
    "species_organismusage",
    "species_organismpropriete",
    "species_organismnom",
    "species_cultivar",
    "species_companionrelation",
    "species_organism_mes_tags",
    "species_usertag",
    "species_cultivar_pollinator",
    "species_cultivarportegreffe",
    "species_seedsupplier",
    "species_amendment",
    "species_seedcollection",
    "species_semisbatch",
    "species_organismamendment",
    "species_base_enrichment_stats",
    "gardens_zone",
]
SESSION_LOG_MAX = 20

# Liens vers les fiches complètes / téléchargements des sources utilisées par les commandes d'import
DATA_SOURCE_LINKS = [
    {
        "name": "VASCAN (Canadensys)",
        "description": "Plantes vasculaires du Canada — checklist et archive complète.",
        "links": [
            {"label": "Checklist & téléchargement", "url": "https://data.canadensys.net/vascan/checklist"},
            {"label": "Archive DwC-A complète (IPT)", "url": "https://data.canadensys.net/ipt/archive.do?r=vascan"},
        ],
    },
    {
        "name": "Hydro-Québec — Arbres et arbustes",
        "description": "Fiches détaillées des arbres et arbustes. Télécharger tout : python manage.py import_hydroquebec --limit 0 --output arbres_hq.json (ajouter --curl si SSL échoue). Puis importer : --file arbres_hq.json",
        "links": [
            {"label": "Site Arbres Hydro-Québec", "url": "https://arbres.hydroquebec.com/"},
            {"label": "Données ouvertes HQ (doc, API)", "url": "https://hydroquebec.com/documents-donnees/donnees-ouvertes/repertoire-arbres.html"},
        ],
    },
    {
        "name": "USDA PLANTS / ITIS",
        "description": "Bases USDA Plants et ITIS (TSN) — noms scientifiques, familles, répartition.",
        "links": [
            {"label": "USDA PLANTS Database", "url": "https://plants.usda.gov/home"},
            {"label": "Téléchargements ITIS", "url": "https://www.itis.gov/ftp_download.html"},
        ],
    },
    {
        "name": "Botanipedia",
        "description": "Encyclopédie des plantes (fiches par nom latin, API MediaWiki).",
        "links": [
            {"label": "Botanipedia.org", "url": "https://www.botanipedia.org/"},
        ],
    },
    {
        "name": "PFAF (Plants For A Future)",
        "description": "Plantes comestibles et utiles (~7400). Base payante : Standard Home 50 USD, Commercial 150 USD, Student 30 USD. Import manuel via admin avec un fichier acquis légalement.",
        "links": [
            {"label": "Recherche PFAF", "url": "https://www.pfaf.org/user/PlantSearch.aspx"},
            {"label": "Achat / téléchargement base PFAF", "url": "https://pfaf.org/user/cmspage.aspx?pageid=126"},
        ],
    },
]


def _append_log(request, command_label: str, output: str, success: bool):
    """Conserve les N derniers résultats dans la session."""
    log = request.session.get(SESSION_LOG_KEY, [])
    log.append({
        "command": command_label,
        "output": output or "(aucune sortie)",
        "success": success,
        "time": datetime.now().isoformat(),
    })
    request.session[SESSION_LOG_KEY] = log[-SESSION_LOG_MAX:]


@staff_member_required
def hq_file_stats_view(request):
    """
    Retourne le nombre d'entrées d'un fichier JSON Hydro-Québec (liste d'arbres).
    GET ?file=arbres_hq_2026-03-06.json → {"entries": 1700}
    """
    filename = (request.GET.get("file") or "").strip()
    if not filename or ".." in filename or filename.startswith("/") or not filename.endswith(".json"):
        return JsonResponse({"entries": None, "error": "Fichier invalide"}, status=400)
    base_dir = getattr(settings, "IMPORT_HYDROQUEBEC_DIR", Path(settings.BASE_DIR) / "data" / "hydroquebec")
    base_dir = Path(base_dir)
    full_path = (base_dir / filename).resolve()
    base_resolved = base_dir.resolve()
    if not full_path.is_file() or not str(full_path).startswith(str(base_resolved)):
        return JsonResponse({"entries": None, "error": "Fichier introuvable"}, status=404)
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        return JsonResponse({"entries": None, "error": str(e)}, status=400)
    n = len(data) if isinstance(data, list) else 0
    return JsonResponse({"entries": n, "error": None})


@staff_member_required
def gestion_donnees_view(request):
    """
    Page de gestion des données (espèces, imports, commandes).
    Upload fichier VASCAN, boutons pour lancer les commandes d'import/merge/peupler/wipe,
    et journal des sorties (type terminal).
    """
    from .api_views import ALLOWED_ADMIN_COMMANDS, _build_command_kwargs

    if request.method == "POST":
        # --- Backup base espèces (PostgreSQL uniquement) ---
        if request.POST.get("action") == "backup_species":
            db = settings.DATABASES["default"]
            if db.get("ENGINE") != "django.db.backends.postgresql":
                messages.error(request, "Le backup est disponible uniquement avec PostgreSQL.")
                return redirect("gestion_donnees")
            try:
                args = [
                    "pg_dump",
                    "-U", db.get("USER", ""),
                    "-h", db.get("HOST", "localhost"),
                    "-p", str(db.get("PORT", "5432")),
                    "-d", db.get("NAME", ""),
                    "--no-owner",
                    "--no-acl",
                    "--clean",
                    "--if-exists",
                ]
                for t in BACKUP_PG_TABLES:
                    args.extend(["-t", t])
                env = os.environ.copy()
                if db.get("PASSWORD"):
                    env["PGPASSWORD"] = str(db["PASSWORD"])
                result = subprocess.run(args, capture_output=True, env=env, timeout=300)
                if result.returncode != 0:
                    err = (result.stderr or b"").decode("utf-8", errors="replace")
                    messages.error(request, f"Erreur pg_dump : {err[:500]}")
                    return redirect("gestion_donnees")
                dump_bytes = result.stdout
                filename = f"backup_biot_{timezone.now().strftime('%Y-%m-%d_%H-%M')}.sql"
                response = HttpResponse(dump_bytes, content_type="application/sql")
                response["Content-Disposition"] = f'attachment; filename="{filename}"'
                response["Content-Length"] = len(dump_bytes)
                return response
            except subprocess.TimeoutExpired:
                messages.error(request, "Le backup a expiré (timeout).")
                return redirect("gestion_donnees")
            except FileNotFoundError:
                messages.error(request, "pg_dump introuvable. Vérifiez que PostgreSQL est installé.")
                return redirect("gestion_donnees")
            except Exception as e:
                messages.error(request, f"Erreur backup : {e}")
                return redirect("gestion_donnees")

        # --- Restore backup (PostgreSQL, confirmation obligatoire) ---
        if request.POST.get("action") == "restore_backup":
            db = settings.DATABASES["default"]
            if db.get("ENGINE") != "django.db.backends.postgresql":
                messages.error(request, "La restauration est disponible uniquement avec PostgreSQL.")
                return redirect("gestion_donnees")
            if request.POST.get("restore_confirm") not in ("1", "on", "true", "yes"):
                messages.error(
                    request,
                    "Vous devez cocher la case de confirmation : « Cette action va écraser les données actuelles ».",
                )
                return redirect("gestion_donnees")
            uploaded = request.FILES.get("restore_file")
            if not uploaded or not uploaded.name.lower().endswith(".sql"):
                messages.error(request, "Veuillez sélectionner un fichier .sql.")
                return redirect("gestion_donnees")
            run = DataImportRun.objects.create(
                source="backup_restore",
                status="running",
                trigger="gestion_donnees",
                user=request.user,
                stats={"action": "restore", "filename": uploaded.name},
            )
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(mode="wb", suffix=".sql", delete=False) as f:
                    for chunk in uploaded.chunks():
                        f.write(chunk)
                    tmp_path = f.name
                args = [
                    "psql",
                    "-U", db.get("USER", ""),
                    "-h", db.get("HOST", "localhost"),
                    "-p", str(db.get("PORT", "5432")),
                    "-d", db.get("NAME", ""),
                    "-f", tmp_path,
                ]
                env = os.environ.copy()
                if db.get("PASSWORD"):
                    env["PGPASSWORD"] = str(db["PASSWORD"])
                result = subprocess.run(args, capture_output=True, env=env, timeout=600, text=True)
                out = (result.stdout or "") + "\n" + (result.stderr or "")
                run.output_snippet = (out or "")[:2000]
                run.finished_at = timezone.now()
                if result.returncode == 0:
                    run.status = "success"
                    run.stats["restored"] = True
                    run.save()
                    messages.success(request, "Restauration terminée. Les données ont été rechargées.")
                else:
                    run.status = "failure"
                    run.stats["psql_returncode"] = result.returncode
                    run.save()
                    messages.error(request, f"Erreur lors de la restauration (psql). Voir l'historique des imports.")
            except subprocess.TimeoutExpired:
                run.status = "failure"
                run.finished_at = timezone.now()
                run.output_snippet = "Timeout (restauration trop longue)."
                run.save()
                messages.error(request, "La restauration a expiré (timeout).")
            except Exception as e:
                run.status = "failure"
                run.finished_at = timezone.now()
                run.output_snippet = str(e)[:2000]
                run.save()
                messages.error(request, f"Erreur : {e}")
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.unlink(tmp_path)
                    except OSError:
                        pass
            return redirect("gestion_donnees")

        # --- Upload fichier VASCAN (désactivé — Pass C : Radix Sylva + sync_radixsylva) ---
        if request.POST.get("action") == "upload_vascan":
            messages.warning(
                request,
                "Import VASCAN depuis cette page est désactivé. "
                "Exécuter import_vascan sur Radix Sylva, puis lancer « sync_radixsylva » ci-dessous ou en ligne de commande.",
            )
            return redirect("gestion_donnees")

        # --- Téléchargement complet Hydro-Québec (API → fichier local) ---
        if request.POST.get("action") == "download_hydroquebec_full":
            base_dir = getattr(settings, "IMPORT_HYDROQUEBEC_DIR", Path(settings.BASE_DIR) / "data" / "hydroquebec")
            base_dir = Path(base_dir)
            try:
                base_dir.mkdir(parents=True, exist_ok=True)
            except OSError as e:
                messages.error(request, f"Impossible de créer le répertoire : {e}")
                return redirect("gestion_donnees")
            # Nom du fichier avec date pour traçabilité (ex. arbres_hq_2026-03-06.json)
            date_suffix = timezone.now().strftime("%Y-%m-%d")
            output_path = (base_dir / f"arbres_hq_{date_suffix}.json").resolve()
            use_curl = request.POST.get("use_curl") in ("1", "on", "true", "yes")
            run = DataImportRun.objects.create(
                source="import_hydroquebec",
                status="running",
                trigger="gestion_donnees",
                user=request.user,
                stats={"action": "download"},
            )
            out, err = StringIO(), StringIO()
            try:
                call_command(
                    "import_hydroquebec",
                    limit=0,
                    output=str(output_path),
                    stdout=out,
                    stderr=err,
                    curl=use_curl,
                )
                output = (out.getvalue() + "\n" + err.getvalue()).strip()
                _append_log(request, f"Téléchargement complet Hydro-Québec (→ {output_path.name})", output, True)
                run.status = "success"
                run.finished_at = timezone.now()
                run.output_snippet = (output or "")[:2000]
                if output_path.exists():
                    run.stats["file_size_kb"] = output_path.stat().st_size // 1024
                    run.stats["file_name"] = output_path.name
                run.save()
                messages.success(
                    request,
                    f"Téléchargement terminé : {output_path.name} ({output_path.stat().st_size // 1024} Ko). "
                    "Utilisez le menu ci-dessous pour lancer l'importation locale.",
                )
            except Exception as e:
                output = (out.getvalue() + "\n" + err.getvalue()).strip() or str(e)
                _append_log(request, "Téléchargement complet Hydro-Québec", output, False)
                run.status = "failure"
                run.finished_at = timezone.now()
                run.output_snippet = (output or str(e))[:2000]
                run.save()
                messages.error(
                    request,
                    f"Erreur : {e}. En cas d'erreur SSL, cochez « Utiliser curl » et réessayez.",
                )
            return redirect("gestion_donnees")

        # --- Import Hydro-Québec depuis fichier local (serveur) ---
        if request.POST.get("action") == "import_hydroquebec_local":
            local_file = (request.POST.get("local_file") or "").strip()
            if local_file and not Path(local_file).is_absolute() and ".." not in local_file:
                base_dir = getattr(settings, "IMPORT_HYDROQUEBEC_DIR", Path(settings.BASE_DIR) / "data" / "hydroquebec")
                base_dir = Path(base_dir)
                full_path = (base_dir / local_file).resolve()
                base_resolved = base_dir.resolve()
                if full_path.is_file() and str(full_path).startswith(str(base_resolved)):
                    _eb = BaseEnrichmentStats.objects.first()
                    run = DataImportRun.objects.create(
                        source="import_hydroquebec",
                        status="running",
                        trigger="gestion_donnees",
                        user=request.user,
                        stats={"action": "import_local", "file": local_file, "global_score_before": _eb.global_score_pct if _eb else None},
                    )
                    out, err = StringIO(), StringIO()
                    try:
                        call_command(
                            "import_hydroquebec",
                            file=str(full_path),
                            limit=0,
                            stdout=out,
                            stderr=err,
                        )
                        output = (out.getvalue() + "\n" + err.getvalue()).strip()
                        _append_log(request, f"Import Hydro-Québec (fichier local: {local_file})", output, True)
                        run.status = "success"
                        run.finished_at = timezone.now()
                        run.output_snippet = (output or "")[:2000]
                        _ea = BaseEnrichmentStats.objects.first()
                        run.stats["global_score_after"] = _ea.global_score_pct if _ea else None
                        # Parser la sortie pour résumé : Créés / Mis à jour / Ignorés
                        import re
                        created = updated = skipped = 0
                        for pattern, var in [
                            (r"Créés:\s*(\d+)", "created"),
                            (r"Mis à jour:\s*(\d+)", "updated"),
                            (r"Ignorés:\s*(\d+)", "skipped"),
                        ]:
                            m = re.search(pattern, output)
                            if m:
                                run.stats[var] = int(m.group(1))
                                if var == "created": created = run.stats[var]
                                elif var == "updated": updated = run.stats[var]
                                else: skipped = run.stats[var]
                        run.stats["lines_processed"] = created + updated + skipped
                        run.stats["organisms_total"] = Organism.objects.count()
                        run.stats["cultivars_total"] = Cultivar.objects.count()
                        run.save()
                        lines = run.stats["lines_processed"]
                        n_org = run.stats["organisms_total"]
                        n_cult = run.stats["cultivars_total"]
                        msg = (
                            f"Import terminé : {lines} lignes traitées → "
                            f"{n_org} espèces → {n_cult} cultivars."
                        )
                        messages.success(request, msg)
                    except Exception as e:
                        output = (out.getvalue() + "\n" + err.getvalue()).strip() or str(e)
                        _append_log(request, f"Import Hydro-Québec (fichier local: {local_file})", output, False)
                        run.status = "failure"
                        run.finished_at = timezone.now()
                        run.output_snippet = (output or str(e))[:2000]
                        run.save()
                        messages.error(request, f"Erreur : {e}")
                else:
                    messages.error(request, "Fichier invalide ou hors du répertoire autorisé.")
            else:
                messages.warning(request, "Aucun fichier sélectionné.")
            return redirect("gestion_donnees")

        # --- Commande admin ---
        command = (request.POST.get("command") or "").strip()
        if command and command in ALLOWED_ADMIN_COMMANDS:
            options = {}
            for key in ALLOWED_ADMIN_COMMANDS[command]:
                val = request.POST.get(f"opt_{key}")
                if val is None:
                    continue
                if key in (
                    "enrich",
                    "curl",
                    "insecure",
                    "verbose",
                    "dry_run",
                    "no_input",
                    "full",
                    "no_rebuild_search",
                ):
                    options[key] = val in ("1", "on", "true", "yes")
                elif key == "limit":
                    try:
                        options[key] = int(val) if val != "" else 0
                    except ValueError:
                        pass
                elif key == "delay":
                    try:
                        options[key] = float(val) if val != "" else 0.5
                    except ValueError:
                        pass
                elif key == "file" and val:
                    options[key] = val.strip()
            cmd_kwargs = _build_command_kwargs(command, options)
            if command == "wipe_db_and_media":
                cmd_kwargs.setdefault("no_input", True)

            # Score global avant (pour alerte si baisse après import)
            _enrichment_before = BaseEnrichmentStats.objects.first()
            _global_before = _enrichment_before.global_score_pct if _enrichment_before else None
            _options_with_score = dict(options)
            _options_with_score["global_score_before"] = _global_before

            run = DataImportRun.objects.create(
                source=command,
                status="running",
                trigger="gestion_donnees",
                user=request.user,
                stats=_options_with_score,
            )
            out, err = StringIO(), StringIO()
            try:
                call_command(command, stdout=out, stderr=err, **cmd_kwargs)
                output = (out.getvalue() + "\n" + err.getvalue()).strip()
                _append_log(request, command, output, True)
                run.status = "success"
                run.finished_at = timezone.now()
                run.output_snippet = (output or "")[:2000]
                _enrichment_after = BaseEnrichmentStats.objects.first()
                run.stats["global_score_after"] = _enrichment_after.global_score_pct if _enrichment_after else None
                run.save()
                messages.success(request, f"Commande « {command} » exécutée.")
            except SystemExit:
                output = (out.getvalue() + "\n" + err.getvalue()).strip()
                _append_log(request, command, output, False)
                run.status = "failure"
                run.finished_at = timezone.now()
                run.output_snippet = (output or "Commande terminée avec erreur")[:2000]
                run.save()
                messages.error(request, "La commande a échoué (options manquantes ou erreur).")
            except Exception as e:
                output = (out.getvalue() + "\n" + err.getvalue()).strip() or str(e)
                _append_log(request, command, output, False)
                run.status = "failure"
                run.finished_at = timezone.now()
                run.output_snippet = (output or str(e))[:2000]
                run.save()
                messages.error(request, f"Erreur : {e}")
            return redirect("gestion_donnees")

        messages.warning(request, "Action non reconnue.")
        return redirect("gestion_donnees")

    # GET: afficher la page avec stats, couverture, dernieres executions et journal
    source_filter = request.GET.get("source_filter", "").strip() or None
    base_queryset = Organism.objects.all()
    if source_filter:
        base_queryset = base_queryset.filter(data_sources__has_key=source_filter)
    stats = {
        "organism_count": Organism.objects.count(),
        "specimen_count": Specimen.objects.count(),
    }
    # Couverture par source (data_sources + OrganismNom + ancestrale via CultivarPorteGreffe)
    data_source_keys = ["hydroquebec", "pfaf", "vascan", "usda", "botanipedia", "arbres_en_ligne", "ancestrale", "topic", "usda_plants", "wikidata"]
    coverage_by_source = {}
    for key in data_source_keys:
        try:
            if key == "arbres_en_ligne":
                coverage_by_source[key] = Organism.objects.filter(noms__source="arbres_en_ligne").distinct().count()
            elif key == "ancestrale":
                coverage_by_source[key] = Organism.objects.filter(
                    cultivars__porte_greffes__disponible_chez__contains=[{"source": "ancestrale"}]
                ).distinct().count()
            elif key in ("topic", "usda_plants", "wikidata"):
                coverage_by_source[key] = Organism.objects.filter(data_sources__has_key=key).count()
            else:
                coverage_by_source[key] = Organism.objects.filter(data_sources__has_key=key).count()
        except Exception:
            coverage_by_source[key] = 0

    # Dernière exécution par source (pour le bloc "Last runs")
    sources_for_last_run = [
        "pfaf",
        "seeds",
        "import_vascan",
        "import_usda",
        "import_hydroquebec",
        "import_botanipedia",
        "import_arbres_en_ligne",
        "import_ancestrale",
        "import_topic",
        "import_usda_chars",
        "import_wikidata",
        "merge_organism_duplicates",
        "populate_proprietes_usage_calendrier",
        "backup_restore",
        "clean_organisms_keep_hq",
        "sync_radixsylva",
        "rebuild_search_vectors",
    ]
    last_runs_by_source = {}
    for src in sources_for_last_run:
        run = DataImportRun.objects.filter(source=src).order_by("-started_at").first()
        if run:
            last_runs_by_source[src] = run

    # Historique des imports (50 derniers)
    import_history = list(DataImportRun.objects.all()[:50])

    log = request.session.get(SESSION_LOG_KEY, [])

    # Fichiers JSON Hydro-Québec disponibles localement (répertoire configuré)
    hydroquebec_local_files = []
    try:
        base_dir = getattr(settings, "IMPORT_HYDROQUEBEC_DIR", Path(settings.BASE_DIR) / "data" / "hydroquebec")
        base_dir = Path(base_dir)
        base_dir.mkdir(parents=True, exist_ok=True)
        for f in sorted(base_dir.iterdir(), key=lambda x: x.name, reverse=True):
            if f.is_file() and f.suffix.lower() == ".json":
                hydroquebec_local_files.append(f.name)
    except OSError:
        pass

    command_help = {
        "sync_radixsylva": "Met à jour le cache botanique depuis l’API Radix Sylva (sync/*). Cocher « full » pour tout retélécharger.",
        "rebuild_search_vectors": "Recalcule search_vector (PostgreSQL uniquement). Utile après un gros sync.",
        "wipe_db_and_media": "Vide la base et les médias (attention). no_input forcé.",
    }
    commands_with_opts = [
        {
            "name": cmd,
            "options": [(k, getattr(t, "__name__", str(t))) for k, t in opts.items()],
            "help_text": command_help.get(cmd, ""),
        }
        for cmd, opts in ALLOWED_ADMIN_COMMANDS.items()
    ]
    # Note d'enrichissement globale (singleton BaseEnrichmentStats)
    enrichment_stats = BaseEnrichmentStats.objects.first()
    global_enrichment_score_pct = enrichment_stats.global_score_pct if enrichment_stats else None

    # Analyse par champ (couverture) pour « manque le plus » / « mieux documenté »
    total_org = base_queryset.count()
    try:
        field_checks = [
            ("Famille", base_queryset.exclude(Q(famille="") | Q(famille__isnull=True)).count()),
            ("Genre (genus)", base_queryset.exclude(Q(genus="") | Q(genus__isnull=True)).count()),
            ("Description", base_queryset.exclude(Q(description="") | Q(description__isnull=True)).count()),
            ("Zone rusticité", base_queryset.filter(zone_rusticite__isnull=False).exclude(zone_rusticite=[]).count()),
            ("Besoin eau", base_queryset.exclude(Q(besoin_eau="") | Q(besoin_eau__isnull=True)).count()),
            ("Besoin soleil", base_queryset.exclude(Q(besoin_soleil="") | Q(besoin_soleil__isnull=True)).count()),
            ("Sol drainage", base_queryset.exclude(Q(sol_drainage="") | Q(sol_drainage__isnull=True)).count()),
            ("Hauteur max", base_queryset.filter(hauteur_max__isnull=False).count()),
            ("Largeur max", base_queryset.filter(largeur_max__isnull=False).count()),
            ("Parties comestibles", base_queryset.exclude(Q(parties_comestibles="") | Q(parties_comestibles__isnull=True)).count()),
            ("Usages autres", base_queryset.exclude(Q(usages_autres="") | Q(usages_autres__isnull=True)).count()),
            ("Indigène", base_queryset.filter(indigene=True).count()),
            ("Au moins 1 propriété (sol)", base_queryset.annotate(n=Count("proprietes")).filter(n__gt=0).count()),
            ("Au moins 1 usage", base_queryset.annotate(n=Count("usages")).filter(n__gt=0).count()),
            ("Au moins 1 calendrier", base_queryset.annotate(n=Count("calendrier")).filter(n__gt=0).count()),
            ("Photo principale ou galerie", base_queryset.annotate(n_photos=Count("photos")).filter(
                Q(photo_principale_id__isnull=False) | Q(n_photos__gt=0)
            ).count()),
        ]
    except Exception:
        field_checks = [
            ("Famille", base_queryset.exclude(Q(famille="") | Q(famille__isnull=True)).count()),
            ("Genre (genus)", base_queryset.exclude(Q(genus="") | Q(genus__isnull=True)).count()),
            ("Description", base_queryset.exclude(Q(description="") | Q(description__isnull=True)).count()),
            ("Zone rusticité", base_queryset.filter(zone_rusticite__isnull=False).exclude(zone_rusticite=[]).count()),
        ]
    if total_org > 0:
        field_coverage = [
            {"label": label, "count": c, "pct": round(100 * c / total_org)}
            for label, c in field_checks
        ]
        field_coverage_sorted_asc = sorted(field_coverage, key=lambda x: x["pct"])
        field_coverage_sorted_desc = sorted(field_coverage, key=lambda x: -x["pct"])
    else:
        field_coverage_sorted_asc = []
        field_coverage_sorted_desc = []

    # Genus et cultivars (top 25 genus par nombre d'espèces), sur le base_queryset
    genus_stats = (
        base_queryset.filter(genus__isnull=False)
        .exclude(genus="")
        .values("genus")
        .annotate(organism_count=Count("id"), cultivar_count=Count("cultivars"))
        .order_by("-organism_count")[:25]
    )
    genus_stats = list(genus_stats)
    distinct_genus_count = base_queryset.filter(genus__isnull=False).exclude(genus="").values("genus").distinct().count()

    total_cultivar_count = Cultivar.objects.count()
    species_with_cultivar_count = Organism.objects.annotate(nb=Count("cultivars")).filter(nb__gt=0).count()
    cultivars_with_porte_greffe_count = Cultivar.objects.annotate(nb=Count("porte_greffes")).filter(nb__gt=0).count()
    enrichment_computed_at = enrichment_stats.computed_at if enrichment_stats else None

    use_pg_backup_restore = settings.DATABASES["default"].get("ENGINE") == "django.db.backends.postgresql"

    context = {
        "stats": stats,
        "coverage_by_source": coverage_by_source,
        "global_enrichment_score_pct": global_enrichment_score_pct,
        "enrichment_computed_at": enrichment_computed_at,
        "total_cultivar_count": total_cultivar_count,
        "species_with_cultivar_count": species_with_cultivar_count,
        "cultivars_with_porte_greffe_count": cultivars_with_porte_greffe_count,
        "field_coverage_asc": field_coverage_sorted_asc,
        "field_coverage_desc": field_coverage_sorted_desc,
        "genus_stats": genus_stats,
        "distinct_genus_count": distinct_genus_count,
        "source_filter": source_filter,
        "data_source_keys": data_source_keys,
        "last_runs_by_source": last_runs_by_source,
        "import_history": import_history,
        "log": reversed(list(log)),  # plus récent en premier à l'affichage
        "commands_with_opts": commands_with_opts,
        "data_source_links": DATA_SOURCE_LINKS,
        "hydroquebec_local_files": hydroquebec_local_files,
        "use_pg_backup_restore": use_pg_backup_restore,
    }
    return render(request, "species/gestion_donnees.html", context)


def home_view(request):
    """
    Page racine : utilisateur authentifié → vue 3D (ou choix jardin) ; sinon → login.
    """
    if not request.user.is_authenticated:
        return redirect(settings.LOGIN_URL + "?next=" + request.get_full_path())
    prefs = UserPreference.objects.filter(user=request.user).first()
    default_garden_id = prefs.default_garden_id if prefs else None
    if default_garden_id:
        return redirect(reverse("cesium-terrain") + "?garden_id=" + str(default_garden_id))
    return redirect("choose-garden")


def login_view(request):
    """
    Page de connexion (session). Après succès, redirige vers next ou racine puis vue 3D.
    """
    if request.user.is_authenticated:
        return redirect("home")
    next_url = request.GET.get("next") or reverse("home")
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect(next_url)
        messages.error(request, "Identifiants incorrects.")
    return render(request, "species/login.html", {"next": next_url})


@require_http_methods(["GET", "POST"])
def logout_view(request):
    """Déconnexion puis redirection vers la racine."""
    logout(request)
    return redirect("home")


def choose_garden_view(request):
    """
    Choix du jardin (liste) quand l'utilisateur n'a pas de jardin par défaut.
    POST : enregistre le jardin par défaut et redirige vers la vue 3D.
    """
    if not request.user.is_authenticated:
        return redirect(settings.LOGIN_URL + "?next=" + reverse("choose-garden"))
    gardens = Garden.objects.order_by("nom")
    if request.method == "POST":
        garden_id = request.POST.get("garden_id")
        if garden_id:
            try:
                garden = get_object_or_404(Garden, pk=int(garden_id))
                prefs, _ = UserPreference.objects.get_or_create(user=request.user, defaults={})
                prefs.default_garden = garden
                prefs.save()
                return redirect(reverse("cesium-terrain") + "?garden_id=" + str(garden.id))
            except (ValueError, TypeError):
                pass
        messages.error(request, "Veuillez sélectionner un jardin.")
    return render(request, "species/choose_garden.html", {"gardens": gardens})


def cesium_terrain_view(request):
    """
    Page HTML Cesium 3D pour la vue terrain (app mobile WebView).
    Authentification : session (navigateur) ou JWT via ?access_token= (WebView mobile).
    Requiert ?garden_id=<id> pour charger les données du jardin (boundary, contours, terrain_stats).
    """
    access_token = request.GET.get("access_token")
    if access_token:
        request.META["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"
        auth = JWTAuthentication()
        try:
            result = auth.authenticate(request)
            if result:
                request.user = result[0]
        except Exception:
            pass
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return HttpResponseForbidden("Authentification requise.")

    garden_id = request.GET.get("garden_id")
    if not garden_id:
        return HttpResponseForbidden("Paramètre garden_id requis.")
    try:
        garden = get_object_or_404(Garden, pk=int(garden_id))
    except (ValueError, TypeError):
        return HttpResponseForbidden("garden_id invalide.")

    garden_data = {
        "id": garden.id,
        "nom": garden.nom,
        "adresse": garden.adresse or "",
        "zone_rusticite": garden.zone_rusticite or "",
        "latitude": getattr(garden, "latitude", None),
        "longitude": getattr(garden, "longitude", None),
        "boundary": garden.boundary,
        "contours_geojson": garden.contours_geojson,
        "terrain_stats": garden.terrain_stats,
        "distance_unit": getattr(garden, "distance_unit", "m") or "m",
    }
    garden_json = json.dumps(garden_data)

    # Spécimens du jardin pour la vue 3D (navigateur : pas de LOAD_SPECIMENS depuis l'app)
    from django.db.models import Prefetch

    specimens_qs = (
        Specimen.objects.filter(garden_id=garden.id)
        .select_related("organisme", "cultivar", "zone")
        .prefetch_related(
            Prefetch("cultivar__porte_greffes", queryset=CultivarPorteGreffe.objects.order_by("-hauteur_max_m"))
        )
        .order_by("nom")
    )
    statut_labels = dict(Specimen.STATUT_CHOICES)
    source_labels = dict(Specimen.SOURCE_CHOICES)
    specimens_list = []
    for s in specimens_qs:
        rayon = None
        porte_greffe_nom = None
        if getattr(s, "cultivar", None):
            for pg in s.cultivar.porte_greffes.all():
                if pg.hauteur_max_m and rayon is None:
                    rayon = round(float(pg.hauteur_max_m) * 0.60, 1)
                if pg.nom_porte_greffe:
                    porte_greffe_nom = pg.nom_porte_greffe
                break
        ot = getattr(s.organisme, "type_organisme", None) or ""
        fruits = ot in ("arbre_fruitier", "arbuste_fruitier", "arbuste_baies")
        noix = ot == "arbre_noix"
        specimens_list.append({
            "id": s.id,
            "nom": s.nom or "",
            "latitude": getattr(s, "latitude", None),
            "longitude": getattr(s, "longitude", None),
            "statut": s.statut or "",
            "statut_display": statut_labels.get(s.statut, s.statut or ""),
            "health": getattr(s, "sante", None),
            "sante": getattr(s, "sante", None),
            "organisme_nom_latin": s.organisme.nom_latin if s.organisme else "",
            "organisme_nom_commun": getattr(s.organisme, "nom_commun", "") if s.organisme else "",
            "cultivar_nom": s.cultivar.nom if s.cultivar else "",
            "porte_greffe_nom": porte_greffe_nom or "",
            "date_plantation": s.date_plantation.isoformat() if getattr(s, "date_plantation", None) else "",
            "zone_nom": s.zone.nom if getattr(s, "zone", None) and s.zone else "",
            "zone_jardin": getattr(s, "zone_jardin", "") or "",
            "code_identification": getattr(s, "code_identification", "") or "",
            "source": getattr(s, "source", "") or "",
            "source_display": source_labels.get(getattr(s, "source", ""), "") or "",
            "pepiniere_fournisseur": getattr(s, "pepiniere_fournisseur", "") or "",
            "notes": getattr(s, "notes", "") or "",
            "hauteur_actuelle": getattr(s, "hauteur_actuelle", None),
            "age_plantation": getattr(s, "age_plantation", None),
            "premiere_fructification": getattr(s, "premiere_fructification", None),
            "rayon_adulte_m": rayon,
            "emoji": "🌱",
            "fruits": fruits,
            "noix": noix,
        })
    specimens_json = json.dumps(specimens_list)

    cesium_token = getattr(settings, "CESIUM_ION_ACCESS_TOKEN", "") or ""
    lidar_asset_id = getattr(settings, "CESIUM_LIDAR_ASSET_ID", None)
    if lidar_asset_id is None or lidar_asset_id == "":
        lidar_asset_id = "null"
    return render(
        request,
        "cesium/terrain_view.html",
        {
            "cesium_token": cesium_token,
            "cesium_lidar_asset_id": lidar_asset_id,
            "garden_json": garden_json,
            "specimens_json": specimens_json,
            "terrain_user_is_staff": request.user.is_staff,
        },
    )

"""
Synchronise le cache botanique Jardin bIOT depuis l’API Radix Sylva (/api/v1/sync/...).

Ordre : amendements → organismes (+ enfants) → cultivars → compagnonnage.
Les photos principales BIOT (species.Photo) ne sont pas écrasées.

Usage:
  python manage.py sync_radixsylva
  python manage.py sync_radixsylva --full
  python manage.py sync_radixsylva --dry-run
  python manage.py sync_radixsylva --only organisms
  python manage.py sync_radixsylva --organism-id 123
"""
from __future__ import annotations

import threading
import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.db import transaction
from django.utils.dateparse import parse_datetime
from django.utils import timezone

from catalog.models import (
    Amendment,
    CompanionRelation,
    Cultivar,
    CultivarPollinator,
    CultivarPorteGreffe,
    Organism,
    OrganismAmendment,
    OrganismCalendrier,
    OrganismNom,
    OrganismPropriete,
    OrganismUsage,
    RadixSyncState,
)

# Aligné sur radixsylva/botanique/sync_payload.py (pas d’import cross-projet).
ORGANISM_SYNC_FIELDS = (
    'nom_commun',
    'nom_latin',
    'slug_latin',
    'tsn',
    'vascan_id',
    'famille',
    'genus',
    'regne',
    'type_organisme',
    'besoin_eau',
    'besoin_soleil',
    'zone_rusticite',
    'sol_textures',
    'sol_ph',
    'sol_drainage',
    'sol_richesse',
    'hauteur_max',
    'largeur_max',
    'vitesse_croissance',
    'comestible',
    'parties_comestibles',
    'toxicite',
    'type_noix',
    'age_fructification',
    'periode_recolte',
    'pollinisation',
    'distance_pollinisation_max',
    'production_annuelle',
    'fixateur_azote',
    'accumulateur_dynamique',
    'mellifere',
    'produit_juglone',
    'indigene',
    'description',
    'notes',
    'usages_autres',
    'data_sources',
    'enrichment_score_pct',
)

AMENDMENT_FIELDS = (
    'nom',
    'type_amendment',
    'azote_n',
    'phosphore_p',
    'potassium_k',
    'effet_ph',
    'bon_pour_sols',
    'bon_pour_types',
    'description',
    'dose_recommandee',
    'periode_application',
    'biologique',
)


def _parse_dt(s):
    if not s:
        return None
    dt = parse_datetime(s)
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.UTC)
    return dt


def _headers():
    h = {'Accept': 'application/json'}
    key = getattr(settings, 'RADIX_SYLVA_SYNC_API_KEY', '') or ''
    if key:
        h['X-Radix-Sync-Key'] = key
    return h


def _iter_sync_pages(base: str, subpath: str, since_iso: str | None):
    """DRF pagination: première requête avec ?since=, puis suit next."""
    base = base.rstrip('/')
    path = subpath.strip('/')
    url = f'{base}/{path}/'
    params = {}
    if since_iso:
        params['since'] = since_iso
    first = True
    while url:
        r = requests.get(url, headers=_headers(), params=params if first else None, timeout=180)
        if r.status_code != 200:
            raise CommandError(f'HTTP {r.status_code} {url}: {r.text[:500]}')
        first = False
        params = {}
        payload = r.json()
        yield payload
        url = payload.get('next')


def _iter_organism_id_pages(base: str, organism_id: int):
    """Pagination sync/organisms avec organism_id (Radix ignore since)."""
    url = f'{base.rstrip("/")}/sync/organisms/'
    params = {'organism_id': organism_id}
    first = True
    while url:
        r = requests.get(url, headers=_headers(), params=params if first else None, timeout=180)
        if r.status_code != 200:
            raise CommandError(f'HTTP {r.status_code} {url}: {r.text[:500]}')
        first = False
        params = {}
        payload = r.json()
        yield payload
        url = payload.get('next')


def fetch_and_apply_organism(
    organism_id: int,
    *,
    dry_run: bool = False,
    stdout=None,
) -> tuple[bool, str | None]:
    """
    Télécharge un seul organisme depuis Radix (GET sync/organisms/?organism_id=) et l’applique localement.
    Ne met pas à jour RadixSyncState. Retourne (True, None) ou (False, message d’erreur).
    """
    base = getattr(settings, 'RADIX_SYLVA_API_URL', '') or ''
    if not base:
        return False, 'RADIX_SYLVA_API_URL manquant dans les settings.'
    total_rows = 0
    try:
        for payload in _iter_organism_id_pages(base, organism_id):
            rows = payload.get('results') or []
            if not rows:
                continue
            try:
                with transaction.atomic():
                    for row in rows:
                        _apply_organism(row, dry_run)
                total_rows += len(rows)
            except Exception as e:
                return False, str(e)[:500]
            if stdout:
                stdout.write(f'  organismes +{len(rows)} (total {total_rows})')
    except CommandError as e:
        return False, str(e)

    if total_rows == 0:
        return False, f'Aucun organisme Radix pour organism_id={organism_id}.'
    return True, None


def schedule_rebuild_search_vectors_async() -> None:
    """Lance rebuild_search_vectors dans un thread daemon (ferme les connexions DB)."""

    def _run() -> None:
        from django.core.management import call_command
        from django.db import close_old_connections
        from io import StringIO

        close_old_connections()
        try:
            call_command('rebuild_search_vectors', stdout=StringIO())
        finally:
            close_old_connections()

    threading.Thread(target=_run, daemon=True).start()


def _apply_amendment(data: dict, dry_run: bool) -> None:
    if dry_run:
        return
    aid = data['id']
    defaults = {k: data[k] for k in AMENDMENT_FIELDS}
    Amendment.objects.update_or_create(id=aid, defaults=defaults)
    dt = _parse_dt(data.get('date_ajout'))
    if dt:
        Amendment.objects.filter(pk=aid).update(date_ajout=dt)


def _apply_organism(data: dict, dry_run: bool) -> None:
    if dry_run:
        return
    oid = data['id']
    defaults = {k: data[k] for k in ORGANISM_SYNC_FIELDS}
    Organism.objects.update_or_create(id=oid, defaults=defaults)
    da = _parse_dt(data.get('date_ajout'))
    dm = _parse_dt(data.get('date_modification'))
    upd = {}
    if da:
        upd['date_ajout'] = da
    if dm:
        upd['date_modification'] = dm
    if upd:
        Organism.objects.filter(pk=oid).update(**upd)

    OrganismNom.objects.filter(organism_id=oid).delete()
    OrganismNom.objects.bulk_create(
        [
            OrganismNom(
                organism_id=oid,
                nom=row['nom'],
                langue=row['langue'],
                source=row['source'],
                principal=row.get('principal', False),
            )
            for row in data.get('noms') or []
        ]
    )

    OrganismPropriete.objects.filter(organisme_id=oid).delete()
    OrganismPropriete.objects.bulk_create(
        [
            OrganismPropriete(
                organisme_id=oid,
                type_sol=row.get('type_sol') or [],
                ph_min=row.get('ph_min'),
                ph_max=row.get('ph_max'),
                tolerance_ombre=row.get('tolerance_ombre') or '',
                source=row.get('source') or '',
            )
            for row in data.get('proprietes') or []
        ]
    )

    OrganismUsage.objects.filter(organisme_id=oid).delete()
    OrganismUsage.objects.bulk_create(
        [
            OrganismUsage(
                organisme_id=oid,
                type_usage=row['type_usage'],
                parties=row.get('parties') or '',
                description=row.get('description') or '',
                source=row.get('source') or '',
            )
            for row in data.get('usages') or []
        ]
    )

    OrganismCalendrier.objects.filter(organisme_id=oid).delete()
    OrganismCalendrier.objects.bulk_create(
        [
            OrganismCalendrier(
                organisme_id=oid,
                type_periode=row['type_periode'],
                mois_debut=row.get('mois_debut'),
                mois_fin=row.get('mois_fin'),
                source=row.get('source') or '',
            )
            for row in data.get('calendrier') or []
        ]
    )

    OrganismAmendment.objects.filter(organisme_id=oid).delete()
    for row in data.get('amendements_recommandes') or []:
        OrganismAmendment.objects.create(
            organisme_id=oid,
            amendment_id=row['amendment_id'],
            priorite=row.get('priorite', 1),
            dose_specifique=row.get('dose_specifique') or '',
            moment_application=row.get('moment_application') or '',
            notes=row.get('notes') or '',
        )


def _apply_cultivar(data: dict, deferred_pollinators: list, dry_run: bool, stdout) -> None:
    if dry_run:
        return
    cid = data['id']
    CultivarPorteGreffe.objects.filter(cultivar_id=cid).delete()
    CultivarPollinator.objects.filter(cultivar_id=cid).delete()

    defaults = {
        'organism_id': data['organism_id'],
        'slug_cultivar': data['slug_cultivar'],
        'nom': data['nom'],
        'description': data.get('description') or '',
        'couleur_fruit': data.get('couleur_fruit') or '',
        'gout': data.get('gout') or '',
        'resistance_maladies': data.get('resistance_maladies') or '',
        'notes': data.get('notes') or '',
    }
    Cultivar.objects.update_or_create(id=cid, defaults=defaults)
    da = _parse_dt(data.get('date_ajout'))
    dm = _parse_dt(data.get('date_modification'))
    upd = {}
    if da:
        upd['date_ajout'] = da
    if dm:
        upd['date_modification'] = dm
    if upd:
        Cultivar.objects.filter(pk=cid).update(**upd)

    for pg in data.get('porte_greffes') or []:
        CultivarPorteGreffe.objects.create(
            cultivar_id=cid,
            nom_porte_greffe=pg['nom_porte_greffe'],
            vigueur=pg.get('vigueur') or '',
            hauteur_max_m=pg.get('hauteur_max_m'),
            notes=pg.get('notes') or '',
            source=pg.get('source') or '',
            disponible_chez=pg.get('disponible_chez') or [],
        )

    for p in data.get('pollinators') or []:
        cc = p.get('companion_cultivar_id')
        co = p.get('companion_organism_id')
        if cc and not Cultivar.objects.filter(pk=cc).exists():
            deferred_pollinators.append((cid, p))
            continue
        if not cc and not co:
            stdout.write(f'Pollinator ignoré (cultivar {cid}): pas de compagnon')
            continue
        CultivarPollinator.objects.create(
            cultivar_id=cid,
            companion_cultivar_id=cc,
            companion_organism_id=co,
            notes=p.get('notes') or '',
            source=p.get('source') or '',
        )


def _flush_deferred_pollinators(deferred: list, dry_run: bool, stdout) -> None:
    if dry_run or not deferred:
        return
    max_rounds = 15
    pending = list(deferred)
    deferred.clear()
    for _ in range(max_rounds):
        if not pending:
            return
        nxt = []
        for cid, p in pending:
            cc = p.get('companion_cultivar_id')
            co = p.get('companion_organism_id')
            if cc and not Cultivar.objects.filter(pk=cc).exists():
                nxt.append((cid, p))
                continue
            if not cc and not co:
                continue
            CultivarPollinator.objects.create(
                cultivar_id=cid,
                companion_cultivar_id=cc,
                companion_organism_id=co,
                notes=p.get('notes') or '',
                source=p.get('source') or '',
            )
        if len(nxt) == len(pending):
            stdout.write(
                f'Attention: {len(nxt)} pollinisateur(s) cultivar non résolus (FK cultivar manquante).'
            )
            return
        pending = nxt
    stdout.write('Attention: pollinisateurs cultivar — trop de passes, arrêt.')


def _apply_companion(data: dict, dry_run: bool) -> None:
    if dry_run:
        return
    rid = data['id']
    defaults = {
        'organisme_source_id': data['organisme_source_id'],
        'organisme_cible_id': data['organisme_cible_id'],
        'type_relation': data['type_relation'],
        'force': data.get('force', 5),
        'distance_optimale': data.get('distance_optimale'),
        'description': data.get('description') or '',
        'source_info': data.get('source_info') or '',
    }
    CompanionRelation.objects.update_or_create(id=rid, defaults=defaults)
    dt = _parse_dt(data.get('date_ajout'))
    if dt:
        CompanionRelation.objects.filter(pk=rid).update(date_ajout=dt)


class Command(BaseCommand):
    help = 'Synchronise catalog.* depuis Radix Sylva (API /sync/).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full',
            action='store_true',
            help='Ignorer le filigrane : tout retélécharger (since omis).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parcourir les pages sans écrire en base.',
        )
        parser.add_argument(
            '--no-rebuild-search',
            action='store_true',
            help='Ne pas lancer rebuild_search_vectors à la fin.',
        )
        parser.add_argument(
            '--only',
            choices=('amendments', 'organisms', 'cultivars', 'companions'),
            help='Ne traiter qu’une ressource (le filigrane n’est mis à jour que si tout le flux normal est respecté).',
        )
        parser.add_argument(
            '--organism-id',
            type=int,
            default=None,
            metavar='ID',
            help='Synchroniser un seul organisme (GET sync/organisms/?organism_id=). Ne met pas à jour le filigrane.',
        )

    def handle(self, *args, **options):
        base = getattr(settings, 'RADIX_SYLVA_API_URL', '') or ''
        if not base:
            raise CommandError('RADIX_SYLVA_API_URL manquant dans les settings.')

        organism_id = options.get('organism_id')
        if organism_id is not None:
            dry_run = options['dry_run']
            rebuild = not options['no_rebuild_search']
            self.stdout.write(f'--- organismes (ciblé id={organism_id}) ---')
            ok, err = fetch_and_apply_organism(organism_id, dry_run=dry_run, stdout=self.stdout)
            if not ok:
                raise CommandError(err)
            self.stdout.write(self.style.SUCCESS(f'Sync OK — organism {organism_id}'))
            if rebuild and not dry_run:
                self.stdout.write('rebuild_search_vectors (arrière-plan)…')
                schedule_rebuild_search_vectors_async()
            return

        dry_run = options['dry_run']
        full = options['full']
        only = options.get('only')
        rebuild = not options['no_rebuild_search']

        try:
            r = requests.get(
                f'{base.rstrip("/")}/sync/meta/',
                headers=_headers(),
                timeout=60,
            )
            r.raise_for_status()
            meta = r.json()
        except requests.RequestException as e:
            raise CommandError(f'Impossible de joindre Radix (/sync/meta/): {e}') from e

        server_time_raw = meta.get('server_time')
        server_time = _parse_dt(server_time_raw)
        if server_time is None:
            raise CommandError('Réponse /sync/meta/ invalide (server_time).')

        state, _ = RadixSyncState.objects.get_or_create(key='default')
        since_iso = None
        if not full and not only and state.last_server_time:
            since_iso = state.last_server_time.isoformat()

        self.stdout.write(f'Radix server_time={server_time_raw}  since={since_iso or "(aucun)"}')

        counts = {'amendments': 0, 'organisms': 0, 'cultivars': 0, 'companions': 0}
        deferred_pollinators: list = []

        def run_section(name: str, subpath: str, apply_fn):
            if only and only != name:
                return
            self.stdout.write(f'--- {name} ---')
            for payload in _iter_sync_pages(base, subpath, since_iso):
                rows = payload.get('results') or []
                for row in rows:
                    apply_fn(row)
                    counts[name] += 1
                self.stdout.write(f'  page +{len(rows)} (total {name}={counts[name]})')

        try:
            with transaction.atomic():
                run_section('amendments', 'sync/amendments', lambda row: _apply_amendment(row, dry_run))
                run_section('organisms', 'sync/organisms', lambda row: _apply_organism(row, dry_run))
                run_section(
                    'cultivars',
                    'sync/cultivars',
                    lambda row: _apply_cultivar(row, deferred_pollinators, dry_run, self.stdout),
                )
                _flush_deferred_pollinators(deferred_pollinators, dry_run, self.stdout)
                run_section('companions', 'sync/companions', lambda row: _apply_companion(row, dry_run))

                if dry_run:
                    raise DryRunRollback()

                if not only:
                    state.last_server_time = server_time
                    state.last_run_ok = True
                    state.last_error = ''
                    state.save(update_fields=['last_server_time', 'last_run_ok', 'last_error', 'last_run_at'])

        except DryRunRollback:
            self.stdout.write(self.style.SUCCESS(f'Dry-run terminé — {counts}'))
            return
        except Exception as e:
            if not dry_run:
                state.last_run_ok = False
                state.last_error = str(e)[:2000]
                state.save(update_fields=['last_run_ok', 'last_error', 'last_run_at'])
            raise

        self.stdout.write(self.style.SUCCESS(f'Sync OK — {counts}'))
        if rebuild and not dry_run:
            self.stdout.write('rebuild_search_vectors…')
            call_command('rebuild_search_vectors', stdout=self.stdout)


class DryRunRollback(Exception):
    """Utilisé pour annuler la transaction en dry-run."""

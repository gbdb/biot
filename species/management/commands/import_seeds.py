"""
Import de liste de semences (catalogues semenciers).

Formats supportés : JSON, CSV
Utilise species.seed_mapping pour le mapping flexible des colonnes.
Crée ou met à jour Organism + SeedCollection.
"""
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand

from species.models import Organism, SeedCollection, SeedSupplier
from species.seed_mapping import (
    SEED_FIELD_ALIASES,
    get_available_columns,
    get_row_value,
    load_seed_data,
    parse_bool,
    parse_float,
    parse_int,
    parse_int_or_range,
)
from species.source_rules import find_or_match_organism


class Command(BaseCommand):
    help = (
        'Importe des semences depuis un fichier CSV ou JSON. '
        'Crée ou met à jour les organismes et collections de semences.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            required=True,
            help='Fichier à importer: .json ou .csv',
        )
        parser.add_argument(
            '--supplier',
            type=int,
            default=None,
            help='ID du fournisseur SeedSupplier (optionnel)',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Nombre max à importer (0 = tout)',
        )
        parser.add_argument(
            '--update-existing',
            action='store_true',
            help='Mettre à jour les SeedCollection existantes (même organisme+variete+lot)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher ce qui serait fait sans écrire en base',
        )

    def handle(self, *args, **options):
        file_path = options['file']
        supplier_id = options['supplier']
        limit = options['limit']
        update_existing = options['update_existing']
        dry_run = options['dry_run']

        path = Path(file_path)

        try:
            data = load_seed_data(path)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'❌ Fichier introuvable: {path}'))
            return
        except ValueError as e:
            self.stdout.write(self.style.ERROR(f'❌ {e}'))
            return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Erreur de chargement: {e}'))
            return

        if not data:
            self.stdout.write(self.style.WARNING('⚠️ Aucune donnée trouvée dans le fichier.'))
            return

        if limit > 0:
            data = data[:limit]

        supplier = None
        if supplier_id:
            try:
                supplier = SeedSupplier.objects.get(pk=supplier_id)
            except SeedSupplier.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'❌ Fournisseur #{supplier_id} introuvable.'))
                return

        mode_str = '(DRY-RUN) ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'🌱 Import semences {mode_str}({len(data)} entrées)'
        ))
        if supplier:
            self.stdout.write(f'   Fournisseur: {supplier.nom}')

        available_cols = get_available_columns(data)
        self.stdout.write(f'\n🔍 Colonnes: {", ".join(available_cols[:15])}{"..." if len(available_cols) > 15 else ""}')

        first_row = data[0]
        nom_latin = get_row_value(first_row, SEED_FIELD_ALIASES['latin_name'], default=None)
        nom_commun = get_row_value(first_row, SEED_FIELD_ALIASES['common_name'], default=None)
        self.stdout.write(f'\n🔍 Test 1ère ligne: latin="{nom_latin or "-"}", commun="{nom_commun or "-"}"')

        if not nom_latin and not nom_commun:
            self.stdout.write(self.style.ERROR(
                '⚠️ ni nom_latin ni nom_commun trouvés. Vérifiez vos colonnes (voir docs/seed-supplier-mapping.md)'
            ))

        created_org = 0
        created_seed = 0
        updated_seed = 0
        skipped = 0
        errors = 0

        for idx, row in enumerate(data, 1):
            try:
                nom_latin = get_row_value(row, SEED_FIELD_ALIASES['latin_name'], default='')
                nom_commun = get_row_value(row, SEED_FIELD_ALIASES['common_name'], default='')

                if not nom_latin and not nom_commun:
                    skipped += 1
                    continue

                if dry_run:
                    created_seed += 1
                    self.stdout.write(f'  [DRY] {nom_commun or nom_latin}')
                    continue

                # Trouver ou créer l'organisme
                organisme, org_created = find_or_match_organism(
                    Organism,
                    nom_latin=nom_latin,
                    nom_commun=nom_commun or nom_latin,
                    defaults={
                        'nom_commun': nom_commun or nom_latin,
                        'famille': get_row_value(row, SEED_FIELD_ALIASES['family'], default=''),
                        'regne': 'plante',
                        'type_organisme': 'vivace',
                    }
                )
                if org_created:
                    created_org += 1

                variete = get_row_value(row, SEED_FIELD_ALIASES['variete'], default='').strip()
                lot = get_row_value(row, SEED_FIELD_ALIASES['lot_reference'], default='').strip()

                # Chercher SeedCollection existante (organisme + variété + lot)
                qs = SeedCollection.objects.filter(organisme=organisme)
                if variete:
                    qs = qs.filter(variete=variete)
                else:
                    qs = qs.filter(variete='')
                if lot:
                    qs = qs.filter(lot_reference=lot)
                else:
                    qs = qs.filter(lot_reference='')
                existing = qs.first()

                if existing and not update_existing:
                    skipped += 1
                    continue

                # Construire le payload pour création/mise à jour
                seed_data = {
                    'organisme': organisme,
                    'variete': variete,
                    'lot_reference': lot,
                    'fournisseur': supplier,
                    'quantite': parse_float(get_row_value(row, SEED_FIELD_ALIASES['quantite'], default=None, coerce_str=False)),
                    'unite': self._parse_unite(get_row_value(row, SEED_FIELD_ALIASES['unite'], default='graines')),
                    'date_recolte': self._parse_date(get_row_value(row, SEED_FIELD_ALIASES['date_recolte'], default='')),
                    'duree_vie_annees': parse_float(get_row_value(row, SEED_FIELD_ALIASES['duree_vie_annees'], default=None, coerce_str=False)),
                    'germination_lab_pct': parse_float(get_row_value(row, SEED_FIELD_ALIASES['germination_lab_pct'], default=None, coerce_str=False)),
                    'stratification_requise': parse_bool(get_row_value(row, SEED_FIELD_ALIASES['stratification_requise'], default='')),
                    'stratification_duree_jours': parse_int_or_range(get_row_value(row, SEED_FIELD_ALIASES['stratification_duree_jours'], default=None, coerce_str=False)),
                    'stratification_temp': self._parse_strat_temp(get_row_value(row, SEED_FIELD_ALIASES['stratification_temp'], default='')),
                    'stratification_notes': get_row_value(row, SEED_FIELD_ALIASES['stratification_notes'], default=''),
                    'temps_germination_jours_min': parse_int(get_row_value(row, SEED_FIELD_ALIASES['temps_germination_jours_min'], default=None, coerce_str=False)),
                    'temps_germination_jours_max': parse_int_or_range(get_row_value(row, SEED_FIELD_ALIASES['temps_germination_jours_max'], default=None, coerce_str=False)),
                    'temperature_optimal_min': parse_float(get_row_value(row, SEED_FIELD_ALIASES['temperature_optimal_min'], default=None, coerce_str=False)),
                    'temperature_optimal_max': parse_float(get_row_value(row, SEED_FIELD_ALIASES['temperature_optimal_max'], default=None, coerce_str=False)),
                    'pretraitement': get_row_value(row, SEED_FIELD_ALIASES['pretraitement'], default=''),
                    'data_sources': {'import': self._serializable_payload(row)},
                }

                if existing:
                    for k, v in seed_data.items():
                        if k == 'organisme':
                            continue
                        if k == 'data_sources':
                            existing.data_sources = dict(existing.data_sources or {})
                            existing.data_sources['import'] = v.get('import', v)
                            continue
                        setattr(existing, k, v)
                    existing.save()
                    updated_seed += 1
                    self.stdout.write(f'  🔄 {organisme.nom_commun} — {variete or "-"}')
                else:
                    SeedCollection.objects.create(**seed_data)
                    created_seed += 1
                    self.stdout.write(f'  ✅ {organisme.nom_commun} — {variete or "-"}')

            except Exception as e:
                errors += 1
                nom = get_row_value(row, SEED_FIELD_ALIASES['latin_name'], default='?')
                if errors <= 5:
                    self.stdout.write(self.style.WARNING(f'  ⚠️ Ligne {idx} ({nom}): {e}'))

        # Mettre à jour dernier_import du fournisseur
        if supplier and not dry_run and (created_seed + updated_seed) > 0:
            from django.utils import timezone
            supplier.dernier_import = timezone.now()
            supplier.save(update_fields=['dernier_import'])

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Import terminé.'))
        self.stdout.write(f'  Organismes créés: {created_org}')
        self.stdout.write(f'  Collections créées: {created_seed}')
        self.stdout.write(f'  Collections mises à jour: {updated_seed}')
        self.stdout.write(f'  Ignorés: {skipped}, Erreurs: {errors}')

    def _parse_unite(self, val: str) -> str:
        if not val:
            return 'graines'
        v = str(val).lower().strip()
        mapping = {'g': 'g', 'grammes': 'g', 'ml': 'ml', 'sachet': 'sachet', 's': 'sachet'}
        return mapping.get(v, 'graines')

    def _parse_date(self, val: str):
        if not val:
            return None
        s = str(val).strip()
        if not s:
            return None
        # Essayons année seule
        try:
            y = int(s[:4])
            if 1900 <= y <= 2100:
                from datetime import date
                return date(y, 1, 1)
        except (ValueError, IndexError):
            pass
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%Y'):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return None

    def _parse_strat_temp(self, val: str) -> str:
        if not val:
            return ''
        v = str(val).lower()
        if 'froid' in v or 'cold' in v:
            return 'froide'
        if 'chaud' in v or 'warm' in v or 'hot' in v:
            if 'puis' in v or 'then' in v or 'followed' in v:
                return 'chaude_puis_froide'
            return 'chaude'
        if 'chaude_puis' in v or 'warm_then_cold' in v:
            return 'chaude_puis_froide'
        return ''

    def _serializable_payload(self, row: dict) -> dict:
        out = {}
        for k, v in row.items():
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                out[k] = v
            else:
                out[k] = str(v)
        return out

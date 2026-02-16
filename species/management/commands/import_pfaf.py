"""
Import Plants For A Future (PFAF) — complément à Hydro-Québec.

Formats supportés (détection par extension) :
  - JSON  : liste d'objets (clés en anglais ou français, avec ou sans espaces)
  - CSV   : délimiteur auto (virgule, point-virgule, tab), en-têtes normalisés
  - SQLite: base pfaf-data (github.com/saulshanabrook/pfaf-data), table plant_data

Utilise species.pfaf_mapping pour unifier les noms de champs (Latin Name, latin_name,
nom_latin, etc.). Par défaut --merge=fill_gaps pour préserver Hydro-Québec.
Données brutes stockées dans Organism.data_sources['pfaf'].
"""
from pathlib import Path

from django.core.management.base import BaseCommand
from species.models import Organism
from species.pfaf_mapping import (
    PFAF_FIELD_ALIASES,
    get_row_value,
    load_pfaf_data,
)
from species.source_rules import (
    MERGE_FILL_GAPS,
    MERGE_OVERWRITE,
    SOURCE_PFAF,
    apply_fill_gaps,
)


class Command(BaseCommand):
    help = (
        'Importe des plantes depuis un fichier PFAF (JSON, CSV ou SQLite). '
        'Par défaut merge=fill_gaps pour préserver les données Hydro-Québec.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Fichier à importer: .json, .csv ou .sqlite/.db',
        )
        parser.add_argument(
            '--db',
            type=str,
            default=None,
            help='Alias pour --file (même chose). Base SQLite pfaf-data possible.',
        )
        parser.add_argument(
            '--table',
            type=str,
            default='plant_data',
            help='Nom de la table SQLite (défaut: plant_data).',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Nombre max à importer (0 = tout).',
        )
        parser.add_argument(
            '--merge',
            type=str,
            choices=[MERGE_OVERWRITE, MERGE_FILL_GAPS],
            default=MERGE_FILL_GAPS,
            help=f'{MERGE_OVERWRITE}: écraser. {MERGE_FILL_GAPS}: ne remplir que les vides (défaut).',
        )

    def handle(self, *args, **options):
        file_path = options.get('file') or options.get('db')
        if not file_path:
            self.stdout.write(
                self.style.ERROR('❌ Indiquez --file=chemin ou --db=chemin (ex: --file=pfaf.json)')
            )
            return

        limit = options['limit']
        merge_mode = options['merge']
        path = Path(file_path)

        try:
            data = load_pfaf_data(path, db_table=options['table'])
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'❌ Fichier introuvable: {path}'))
            return
        except ValueError as e:
            self.stdout.write(self.style.ERROR(f'❌ {e}'))
            return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Erreur de chargement: {e}'))
            return

        if limit > 0:
            data = data[:limit]

        self.stdout.write(self.style.SUCCESS(
            f'🌿 Import PFAF (merge={merge_mode}, {len(data)} entrées)'
        ))

        created = 0
        updated = 0
        skipped = 0

        for row in data:
            try:
                nom_latin = get_row_value(row, PFAF_FIELD_ALIASES['latin_name'], default='')
                if not nom_latin:
                    skipped += 1
                    continue

                nom_commun = get_row_value(row, PFAF_FIELD_ALIASES['common_name'], default='')
                if not nom_commun:
                    existing = Organism.objects.filter(nom_latin=nom_latin).first()
                    nom_commun = (existing.nom_commun if existing else '') or nom_latin

                famille = get_row_value(row, PFAF_FIELD_ALIASES['family'], default='')
                description = self._description_from_row(row)
                zone = self._zone_from_row(row)
                besoin_soleil = self._sun_from_row(row)
                besoin_eau = self._water_from_row(row)
                hauteur_raw = get_row_value(row, PFAF_FIELD_ALIASES['height'], default=None, coerce_str=False)
                hauteur_max = None
                if hauteur_raw is not None:
                    try:
                        if isinstance(hauteur_raw, str):
                            hauteur_raw = hauteur_raw.replace(',', '.')
                        hauteur_max = float(hauteur_raw)
                    except (TypeError, ValueError):
                        pass

                full_defaults = {
                    'nom_commun': nom_commun,
                    'famille': famille,
                    'regne': 'plante',
                    'type_organisme': self._type_from_row(row),
                    'zone_rusticite': zone,
                    'besoin_soleil': besoin_soleil,
                    'besoin_eau': besoin_eau,
                    'hauteur_max': hauteur_max,
                    'description': description,
                    'parties_comestibles': get_row_value(
                        row, PFAF_FIELD_ALIASES['edible_parts'], default=''
                    ),
                    'usages_autres': get_row_value(
                        row, PFAF_FIELD_ALIASES['uses'], default=''
                    ),
                    'toxicite': get_row_value(
                        row, PFAF_FIELD_ALIASES['toxicite'], default=''
                    ),
                }
                fixateur = get_row_value(
                    row, PFAF_FIELD_ALIASES['fixateur_azote'], default=''
                ).lower()
                if fixateur and ('y' in fixateur or 'yes' in fixateur or 'oui' in fixateur or '1' in fixateur):
                    full_defaults['fixateur_azote'] = True

                pfaf_payload = self._serializable_payload(row)

                existing = Organism.objects.filter(nom_latin=nom_latin).first()
                if merge_mode == MERGE_FILL_GAPS and existing:
                    current = {k: getattr(existing, k, None) for k in full_defaults}
                    full_defaults = apply_fill_gaps(current, full_defaults)
                    existing_sources = dict(existing.data_sources or {})
                    existing_sources[SOURCE_PFAF] = pfaf_payload
                    full_defaults['data_sources'] = existing_sources
                else:
                    existing_sources = dict(existing.data_sources or {}) if existing else {}
                    existing_sources[SOURCE_PFAF] = pfaf_payload
                    full_defaults['data_sources'] = existing_sources

                organism, est_nouveau = Organism.objects.update_or_create(
                    nom_latin=nom_latin,
                    defaults=full_defaults,
                )
                if est_nouveau:
                    created += 1
                    self.stdout.write(f'  ✅ Créé: {nom_commun}')
                else:
                    updated += 1
                    self.stdout.write(f'  🔄 Mis à jour: {nom_commun}')
            except Exception as e:
                skipped += 1
                nom_latin = get_row_value(row, PFAF_FIELD_ALIASES['latin_name'], default='?')
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️ Erreur: {nom_latin} - {e}')
                )

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Import PFAF terminé.'))
        self.stdout.write(f'  ✅ Créés: {created}')
        self.stdout.write(f'  🔄 Mis à jour: {updated}')
        self.stdout.write(f'  ⚠️ Ignorés: {skipped}')

    def _serializable_payload(self, row: dict) -> dict:
        """Construit un dict JSON-serialisable pour data_sources['pfaf']."""
        out = {}
        for k, v in row.items():
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                out[k] = v
            else:
                out[k] = str(v)
        return out

    def _description_from_row(self, row: dict) -> str:
        parts = []
        for key in PFAF_FIELD_ALIASES['description'] + PFAF_FIELD_ALIASES['habitat']:
            v = get_row_value(row, [key], default='')
            if v:
                parts.append(v)
        return '\n\n'.join(parts) if parts else ''

    def _zone_from_row(self, row: dict) -> str:
        z = get_row_value(row, PFAF_FIELD_ALIASES['zone_rusticite'], default='', coerce_str=False)
        if z is None:
            return ''
        if isinstance(z, (int, float)):
            return str(int(z))
        return str(z).strip() if z else ''

    def _sun_from_row(self, row: dict) -> str:
        sun = get_row_value(row, PFAF_FIELD_ALIASES['sun'], default='').lower()
        if not sun:
            return ''
        if 'shade' in sun and 'sun' not in sun and 'partial' not in sun:
            return 'ombre'
        if 'partial' in sun or 'semi' in sun or 'mi-ombre' in sun or 'light shade' in sun:
            return 'mi_ombre'
        if 'full' in sun or 'sun' in sun or 'soleil' in sun or 'no shade' in sun:
            return 'plein_soleil'
        return ''

    def _water_from_row(self, row: dict) -> str:
        w = get_row_value(row, PFAF_FIELD_ALIASES['water'], default='').lower()
        if not w:
            return ''
        if 'dry' in w or 'low' in w or 'faible' in w:
            return 'faible'
        if 'wet' in w or 'high' in w or 'eleve' in w or 'moist' in w:
            return 'eleve'
        return 'moyen'

    def _type_from_row(self, row: dict) -> str:
        t = get_row_value(row, PFAF_FIELD_ALIASES['habit'], default='').lower()
        if 'tree' in t or 'arbre' in t:
            return 'arbre_ornement'
        if 'shrub' in t or 'arbuste' in t:
            return 'arbuste'
        if 'perennial' in t or 'vivace' in t:
            return 'vivace'
        if 'annual' in t or 'annuelle' in t:
            return 'annuelle'
        if 'climber' in t or 'grimpant' in t or 'vine' in t:
            return 'grimpante'
        return 'vivace'

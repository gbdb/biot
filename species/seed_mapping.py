"""
Mapping flexible des champs catalogues semenciers vers SeedCollection / Organism.

Permet d'accepter JSON, CSV avec des noms de colonnes variés selon les fournisseurs.
Les clés sont normalisées en snake_case. Compatible avec le format pfaf_mapping.
"""
from pathlib import Path
from typing import Any, Dict, List, Optional

# Réutiliser les alias PFAF pour l'identification de l'organisme
from .pfaf_mapping import (
    PFAF_FIELD_ALIASES,
    rows_from_json,
    rows_from_csv,
    get_row_value as pfaf_get_row_value,
    get_available_columns as pfaf_get_available_columns,
)

# Alias spécifiques aux semences (en plus des champs organisme)
SEED_FIELD_ALIASES: Dict[str, List[str]] = {
    # Identification (partagés avec PFAF)
    'latin_name': PFAF_FIELD_ALIASES['latin_name'],
    'common_name': PFAF_FIELD_ALIASES['common_name'],
    'family': PFAF_FIELD_ALIASES['family'],
    # Champs SeedCollection
    'variete': [
        'variete', 'variety', 'cultivar', 'cultivar_name', 'variety_name',
        'nom_variete', 'nom_cultivar'
    ],
    'lot_reference': [
        'lot_reference', 'lot_number', 'lot', 'batch', 'numero_lot',
        'reference', 'lot_no', 'batch_number'
    ],
    'quantite': [
        'quantite', 'quantity', 'count', 'nombre', 'seeds_count',
        'seed_count', 'amount'
    ],
    'unite': ['unite', 'unit', 'units', 'uom'],
    'date_recolte': [
        'date_recolte', 'date_recolte_seeds', 'harvest_date', 'test_date',
        'date_test', 'year', 'annee', 'packed_for'
    ],
    'duree_vie_annees': [
        'duree_vie_annees', 'viability_years', 'seed_life', 'storage_life',
        'shelf_life', 'durable_vie', 'viability', 'years_viable'
    ],
    'germination_lab_pct': [
        'germination_lab_pct', 'germination', 'germination_pct',
        'germination_rate', 'germ_pct', 'germination_percent'
    ],
    # Stratification
    'stratification_requise': [
        'stratification_requise', 'stratification', 'stratification_required',
        'cold_stratification', 'needs_stratification', 'stratification_yes'
    ],
    'stratification_duree_jours': [
        'stratification_duree_jours', 'stratification_days', 'cold_strat_days',
        'strat_days', 'stratification_period', 'duree_stratification'
    ],
    'stratification_temp': [
        'stratification_temp', 'stratification_type', 'strat_type',
        'cold_warm', 'temp_stratification'
    ],
    'stratification_notes': [
        'stratification_notes', 'stratification_notes', 'strat_notes'
    ],
    # Germination
    'temps_germination_jours_min': [
        'temps_germination_jours_min', 'germination_days_min',
        'days_to_germinate_min', 'duree_germination_min', 'germ_days_min'
    ],
    'temps_germination_jours_max': [
        'temps_germination_jours_max', 'germination_days', 'germination_days_max',
        'days_to_germinate', 'duree_germination', 'germ_days', 'germ_days_max'
    ],
    'temperature_optimal_min': [
        'temperature_optimal_min', 'temp_min', 'germ_temp_min', 'soil_temp_min'
    ],
    'temperature_optimal_max': [
        'temperature_optimal_max', 'temp_max', 'germ_temp_max', 'soil_temp_max'
    ],
    # Pré traitement
    'pretraitement': [
        'pretraitement', 'pretreatment', 'scarification', 'trempage',
        'soak', 'soaking', 'special_treatment'
    ],
}


def get_row_value(
    row: Dict[str, Any],
    aliases: List[str],
    default: Any = '',
    coerce_str: bool = True,
) -> Any:
    """Prend la première valeur non vide trouvée parmi les alias."""
    return pfaf_get_row_value(row, aliases, default=default, coerce_str=coerce_str)


def get_available_columns(data: List[Dict[str, Any]]) -> List[str]:
    """Retourne la liste des colonnes disponibles."""
    return pfaf_get_available_columns(data)


def parse_float(value: Any) -> Optional[float]:
    """Parse une valeur en float, tolérant virgule et pourcentages."""
    if value is None or value == '':
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(',', '.')
    # Enlever % en fin
    if s.endswith('%'):
        s = s[:-1].strip()
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def parse_int_or_range(value: Any) -> Optional[int]:
    """Parse int ou plage (ex: '7-14' → 14)."""
    if value is None or value == '':
        return None
    s = str(value).strip()
    if '-' in s and not s.startswith('-'):
        parts = s.split('-', 1)
        try:
            a, b = int(parts[0].strip()), int(parts[1].strip())
            return max(a, b)
        except (ValueError, IndexError):
            pass
    return parse_int(value)


def parse_int(value: Any) -> Optional[int]:
    """Parse une valeur en int."""
    if value is None or value == '':
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    s = str(value).strip()
    try:
        return int(float(s.replace(',', '.')))
    except (ValueError, TypeError):
        return None


def parse_bool(value: Any) -> bool:
    """Parse une valeur en bool (oui/non, y/n, 1/0, etc.)."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    s = str(value).lower().strip()
    if s in ('y', 'yes', 'oui', 'o', '1', 'true', 'x', 'required', 'yes'):
        return True
    if s in ('n', 'no', 'non', '0', 'false', ''):
        return False
    # Si contient un nombre > 0
    try:
        return int(s) > 0
    except ValueError:
        pass
    return bool(s)


def load_seed_data(
    path: Path,
    encoding: str = 'utf-8',
) -> List[Dict[str, Any]]:
    """
    Charge des données de semences depuis un fichier.
    Format détecté par extension : .json, .csv
    """
    path = path.expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(str(path))
    suffix = path.suffix.lower()
    if suffix == '.json':
        return rows_from_json(path)
    if suffix in ('.csv', '.txt'):
        return rows_from_csv(path, encoding=encoding)
    raise ValueError(
        f'Format non supporté: {suffix}. Utilisez .json ou .csv'
    )

"""
Règles de fusion des données multi-sources (Hydro-Québec, PFAF, etc.).

Stratégie #3/#4 :
- Chaque source stocke son bloc brut dans Organism.data_sources[source_id].
- Les champs "principaux" du modèle = une seule valeur, selon priorité ou merge.
- Mode "fill_gaps" : ne remplir que les champs actuellement vides (ne pas écraser).
- Règles par type de champ (ex. zone = plus conservative) pour conflits futurs.
"""
import re
from typing import Any, Dict, Optional

# Identifiants des sources (clés dans data_sources)
SOURCE_HYDROQUEBEC = 'hydroquebec'
SOURCE_PFAF = 'pfaf'

# Mode de fusion pour un import
MERGE_OVERWRITE = 'overwrite'   # Écraser les champs avec les valeurs de la source
MERGE_FILL_GAPS = 'fill_gaps'   # Ne remplir que les champs actuellement vides

# Priorité d'affichage par champ (quelle source est préférée quand les deux ont une valeur)
# Contexte Québec : HQ prioritaire pour rusticité/sol; PFAF pour description/usages.
FIELD_PRIMARY_SOURCE: Dict[str, str] = {
    # Contexte québécois prioritaire
    'zone_rusticite': SOURCE_HYDROQUEBEC,
    'besoin_eau': SOURCE_HYDROQUEBEC,
    'besoin_soleil': SOURCE_HYDROQUEBEC,
    'sol_textures': SOURCE_HYDROQUEBEC,
    'sol_ph': SOURCE_HYDROQUEBEC,
    'famille': SOURCE_HYDROQUEBEC,
    # PFAF souvent plus riche sur le reste
    'description': SOURCE_PFAF,
    'usages_autres': SOURCE_PFAF,
    'parties_comestibles': SOURCE_PFAF,
    'toxicite': SOURCE_PFAF,
}
# Champs non listés : première source qui remplit gagne (ou fill_gaps).


def is_empty_value(value: Any) -> bool:
    """Indique si une valeur est considérée comme vide (à remplir par une autre source)."""
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, dict)):
        return len(value) == 0
    if isinstance(value, (int, float)):
        # 0 pourrait être valide pour hauteur; on ne considère pas numérique comme "vide" ici
        return False
    return False


def apply_fill_gaps(current: Optional[Dict[str, Any]], defaults: Dict[str, Any]) -> Dict[str, Any]:
    """
    Filtre `defaults` pour ne garder que les champs où `current` est vide.
    Si `current` est None (nouvel enregistrement), retourne tous les defaults.
    """
    if current is None:
        return dict(defaults)
    merged = {}
    for key, new_val in defaults.items():
        if key not in current:
            merged[key] = new_val
            continue
        cur_val = current.get(key)
        if is_empty_value(cur_val):
            merged[key] = new_val
    return merged


# Regex pour zone USDA (ex. 4a, 5b, 10)
_ZONE_PATTERN = re.compile(r'^(\d+)([ab])?$', re.IGNORECASE)


def zone_rusticite_order(zone: str) -> tuple:
    """
    Clé de tri pour zones USDA : plus le nombre est petit, plus la zone est froide.
    Utilisé pour prendre la zone la plus conservative (plante plus rustique).
    """
    if not zone or not zone.strip():
        return (99, 0)
    m = _ZONE_PATTERN.match(zone.strip())
    if not m:
        return (99, 0)
    num = int(m.group(1))
    sub = (0 if (m.group(2) or '').lower() == 'a' else 1)
    return (num, sub)


def merge_zone_rusticite(current: Optional[str], new: Optional[str]) -> str:
    """
    Retourne la zone la plus conservative (la plus froide = plus petit numéro).
    Ex. 4a et 5b → 4a.
    """
    if is_empty_value(new):
        return (current or '').strip()
    if is_empty_value(current):
        return (new or '').strip()
    cur = (current or '').strip()
    neu = (new or '').strip()
    if not cur:
        return neu
    if not neu:
        return cur
    return cur if zone_rusticite_order(cur) <= zone_rusticite_order(neu) else neu

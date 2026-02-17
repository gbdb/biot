"""
Règles de fusion des données multi-sources (Hydro-Québec, PFAF, etc.).

Stratégie #3/#4 :
- Chaque source stocke son bloc brut dans Organism.data_sources[source_id].
- Les champs "principaux" du modèle = une seule valeur, selon priorité ou merge.
- Mode "fill_gaps" : ne remplir que les champs actuellement vides (ne pas écraser).
- Règles par type de champ (ex. zone = plus conservative) pour conflits futurs.
"""
import re
import unicodedata
from typing import Any, Dict, Optional, Tuple

from django.db.models import Q

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
    DEPRECATED: Utiliser merge_zones_rusticite() pour le nouveau format JSONField.
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


def normalize_latin_name(name: str) -> str:
    """
    Normalise un nom latin pour matching fuzzy.
    - Lowercase
    - Suppression accents (é → e, à → a)
    - Normalisation espaces/punctuation
    """
    if not name:
        return ''
    # Lowercase
    normalized = name.lower().strip()
    # Supprimer accents (é → e, à → a)
    normalized = unicodedata.normalize('NFD', normalized)
    normalized = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    # Normaliser espaces/punctuation
    normalized = re.sub(r'[^\w\s]', '', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.strip()


def merge_zones_rusticite(current_zones: list, new_zone: str, source: str) -> list:
    """
    Ajoute ou met à jour une zone pour une source donnée.
    
    Args:
        current_zones: Liste existante [{"zone": "4a", "source": "hydroquebec"}, ...]
        new_zone: Nouvelle zone à ajouter/mettre à jour (ex. "5b")
        source: Source de la zone (ex. "pfaf")
    
    Returns:
        Liste mise à jour avec la nouvelle zone pour cette source.
    """
    if not new_zone or not new_zone.strip():
        return current_zones or []
    
    zones = list(current_zones or [])
    new_zone_clean = new_zone.strip()
    
    # Chercher si cette source a déjà une zone
    found = False
    for i, z in enumerate(zones):
        if isinstance(z, dict) and z.get('source') == source:
            zones[i] = {"zone": new_zone_clean, "source": source}
            found = True
            break
    
    if not found:
        zones.append({"zone": new_zone_clean, "source": source})
    
    return zones


def find_organism_by_latin_fuzzy(Organism, nom_latin: str):
    """
    Cherche un organisme par nom_latin avec matching fuzzy (normalisation).
    Retourne le premier match trouvé ou None.
    """
    if not nom_latin or not nom_latin.strip():
        return None
    
    # Essai 1: Exact match (case-insensitive)
    exact = Organism.objects.filter(nom_latin__iexact=nom_latin.strip()).first()
    if exact:
        return exact
    
    # Essai 2: Fuzzy - normaliser et chercher avec regex
    norm = normalize_latin_name(nom_latin)
    if norm:
        # Chercher avec regex flexible (espaces → .*)
        pattern = norm.replace(' ', '.*')
        fuzzy = Organism.objects.filter(nom_latin__iregex=pattern).first()
        if fuzzy:
            return fuzzy
        
        # Essai 3: Chercher par mots-clés (si plusieurs mots)
        words = norm.split()
        if len(words) > 1:
            # Chercher où tous les mots sont présents
            q = Q()
            for word in words:
                q &= Q(nom_latin__icontains=word)
            fuzzy = Organism.objects.filter(q).first()
            if fuzzy:
                return fuzzy
    
    return None


def find_organism_by_common_name(Organism, nom_commun: str):
    """
    Cherche un organisme par nom_commun (exact match case-insensitive).
    Retourne le premier match trouvé ou None.
    """
    if not nom_commun or not nom_commun.strip():
        return None
    
    return Organism.objects.filter(nom_commun__iexact=nom_commun.strip()).first()


def find_or_match_organism(
    Organism,
    nom_latin: str,
    nom_commun: str,
    defaults: Optional[Dict[str, Any]] = None,
) -> Tuple[Any, bool]:
    """
    Trouve ou crée un organisme avec matching intelligent.
    
    Stratégie:
    1. Si nom_latin fourni: chercher par nom_latin (exact puis fuzzy)
    2. Si nom_latin manque mais nom_commun fourni: chercher par nom_commun
    3. Si trouvé: compléter les champs manquants (ex. ajouter nom_latin si manquant)
    4. Si rien trouvé: créer nouveau (nom_latin requis, utiliser nom_commun comme fallback)
    
    Args:
        Organism: Classe modèle Organism
        nom_latin: Nom scientifique latin
        nom_commun: Nom commun
        defaults: Dict de valeurs par défaut pour création/mise à jour
    
    Returns:
        Tuple (organism, was_created) où was_created est True si nouvel organisme créé.
    """
    defaults = defaults or {}
    was_created = False
    
    # 1. Si nom_latin fourni, chercher par nom_latin (exact puis fuzzy)
    if nom_latin and nom_latin.strip():
        nom_latin_clean = nom_latin.strip()
        
        # Exact match
        exact = Organism.objects.filter(nom_latin__iexact=nom_latin_clean).first()
        if exact:
            # Compléter nom_latin si manquant dans l'existant (ne devrait pas arriver mais sécurité)
            if not exact.nom_latin:
                exact.nom_latin = nom_latin_clean
                exact.save(update_fields=['nom_latin'])
            return exact, False
        
        # Fuzzy matching
        fuzzy = find_organism_by_latin_fuzzy(Organism, nom_latin_clean)
        if fuzzy:
            # Compléter nom_latin si différent mais proche
            if not fuzzy.nom_latin or normalize_latin_name(fuzzy.nom_latin) != normalize_latin_name(nom_latin_clean):
                fuzzy.nom_latin = nom_latin_clean
                fuzzy.save(update_fields=['nom_latin'])
            return fuzzy, False
    
    # 2. Si nom_latin manque mais nom_commun fourni, chercher par nom_commun
    if (not nom_latin or not nom_latin.strip()) and nom_commun and nom_commun.strip():
        by_common = find_organism_by_common_name(Organism, nom_commun)
        if by_common:
            # Ajouter nom_latin si fourni maintenant
            if nom_latin and nom_latin.strip() and not by_common.nom_latin:
                by_common.nom_latin = nom_latin.strip()
                by_common.save(update_fields=['nom_latin'])
            return by_common, False
    
    # 3. Créer nouveau si rien trouvé
    # nom_latin est requis pour créer, utiliser nom_commun comme fallback si nécessaire
    create_data = dict(defaults)
    if not create_data.get('nom_latin'):
        if nom_latin and nom_latin.strip():
            create_data['nom_latin'] = nom_latin.strip()
        elif nom_commun and nom_commun.strip():
            create_data['nom_latin'] = nom_commun.strip()
        else:
            raise ValueError("Impossible de créer un organisme sans nom_latin ni nom_commun")
    
    if not create_data.get('nom_commun') and nom_commun and nom_commun.strip():
        create_data['nom_commun'] = nom_commun.strip()
    
    organism = Organism.objects.create(**create_data)
    return organism, True

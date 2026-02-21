import json
import ssl
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context
from django.core.management.base import BaseCommand
from species.models import Organism
from species.source_rules import (
    MERGE_FILL_GAPS,
    MERGE_OVERWRITE,
    SOURCE_HYDROQUEBEC,
    apply_fill_gaps,
    find_or_match_organism,
    merge_zones_rusticite,
)


class TLS12Adapter(HTTPAdapter):
    """Adaptateur forçant TLS 1.2+ pour éviter SSLV3_ALERT_HANDSHAKE_FAILURE."""
    def init_poolmanager(self, *args, **kwargs):
        ctx = create_urllib3_context()
        ctx.load_default_certs()
        if hasattr(ssl, 'TLSVersion'):
            ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        kwargs['ssl_context'] = ctx
        return super().init_poolmanager(*args, **kwargs)


class Command(BaseCommand):
    help = (
        'Importe les arbres et arbustes depuis Hydro-Québec. '
        'Si l\'API bloque Python (SSL), utilisez --file avec un JSON enregistré depuis le navigateur.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Nombre max d\'arbres à importer (défaut: 50). Mettre 0 pour tout importer.'
        )
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help=(
                'Fichier JSON local. Avec --enrich-from-api: fusionne les données complètes. '
                'Préférez l\'URL partiel pour des fruits/feuilles/fleurs: '
                '.../rechercher/partiel/0/500'
            )
        )
        parser.add_argument(
            '--merge',
            type=str,
            choices=[MERGE_OVERWRITE, MERGE_FILL_GAPS],
            default=MERGE_OVERWRITE,
            help=(
                f'{MERGE_OVERWRITE}: écraser les champs (défaut). '
                f'{MERGE_FILL_GAPS}: ne remplir que les champs vides (préserve PFAF/manuel).'
            )
        )
        parser.add_argument(
            '--fetch-details',
            action='store_true',
            help=(
                'Pour les fiches où fruits/feuilles/fleurs sont vides, récupérer la fiche détail '
                'via l\'API pour compléter. Plus lent (1 requête par fiche incomplète).'
            )
        )
        parser.add_argument(
            '--enrich-from-api',
            action='store_true',
            help=(
                'Avec --file : récupérer les données complètes via l\'API partiel et fusionner. '
                'Résout les champs vides (fruits, feuilles, fleurs) présents dans le JSON "tous".'
            )
        )

    def handle(self, *args, **options):
        limit = options['limit']
        file_path = options.get('file')
        merge_mode = options.get('merge', MERGE_OVERWRITE)
        fetch_details = options.get('fetch_details', False)
        enrich_from_api = options.get('enrich_from_api', False)
        
        if limit == 0:
            self.stdout.write(self.style.SUCCESS('🌳 Début de l\'import Hydro-Québec (tout)...'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'🌳 Début de l\'import Hydro-Québec (max {limit} arbres)...'
            ))
        
        # Charger les données : fichier local ou API
        if file_path:
            arbres = self._charger_fichier(file_path)
            # Enrichir avec l'API partiel si demandé (données complètes vs "tous" qui a des nulls)
            if arbres and enrich_from_api:
                arbres = self._enrich_from_partiel(arbres)
        else:
            arbres = self._charger_api(limit)
            if arbres is None:
                return  # Erreur déjà affichée
        
        if not arbres:
            self.stdout.write(self.style.WARNING('Aucun arbre à importer.'))
            return
        
        # Limiter le nombre (0 = tout importer)
        if limit > 0:
            arbres = arbres[:limit]
        self.stdout.write(self.style.SUCCESS(f'✅ {len(arbres)} arbres à traiter.'))

        session = None
        if fetch_details:
            session = requests.Session()
            session.mount('https://', TLS12Adapter())
            session.headers.update({
                'User-Agent': (
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ),
                'Accept': 'application/json',
            })

        created = 0
        updated = 0
        skipped = 0

        for arbre in arbres:
            try:
                # .strip() sur None plante si l'API envoie null
                nom_latin = (arbre.get('nomLatin') or '').strip()
                nom_francais = (arbre.get('nomFrancais') or '').strip()

                if not nom_latin or not nom_francais:
                    skipped += 1
                    continue

                # Compléter avec la fiche détail si champs descriptifs manquants
                numero_fiche = arbre.get('numeroFiche')
                if fetch_details and numero_fiche and self._manque_donnees_descriptives(arbre):
                    detail = self._fetch_fiche_detail(session, numero_fiche)
                    if detail:
                        arbre = self._fusionner_fiche_detail(arbre, detail)
                        if detail.get('fruitsDescription'):
                            self.stdout.write(f'     📥 Fiche {numero_fiche}: fruits récupérés')

                formes = arbre.get('formes', [])
                type_organisme = self._determiner_type(formes)

                # L'API peut renvoyer null: on force listes/chaînes vides pour éviter NOT NULL en base
                famille = arbre.get('famille') or ''
                zone_rusticite_raw = arbre.get('zoneRusticite') or ''
                description = self._creer_description(arbre) or ''
                sol_textures = arbre.get('solTextures') if arbre.get('solTextures') is not None else []
                sol_ph = arbre.get('solPhs') if arbre.get('solPhs') is not None else []
                toxicite = self._extraire_toxicite_fruits(arbre.get('fruitsDescription'))
                parties_comestibles = self._deriver_parties_comestibles(
                    arbre.get('fruitsDescription'), toxicite
                )
                hq_payload = {
                    'numeroFiche': arbre.get('numeroFiche'),
                    'plantationDistanceMinimum': arbre.get('plantationDistanceMinimum'),
                    'remarques': arbre.get('remarquesFicheDeBase') or '',
                    'usages': arbre.get('usages') or '',
                    'maladies': arbre.get('maladies') or '',
                    'insectes': arbre.get('insectes') or '',
                    'feuillesDescription': arbre.get('feuillesDescription') or '',
                    'fleursDescription': arbre.get('fleursDescription') or '',
                    'fruitsDescription': arbre.get('fruitsDescription') or '',
                }
                
                # Chercher ou créer l'organisme avec matching intelligent
                defaults = {
                    'nom_commun': nom_francais,
                    'famille': famille,
                    'regne': 'plante',
                    'type_organisme': type_organisme,
                    'besoin_eau': self._convertir_humidite(
                        arbre.get('solHumidites') or []
                    ),
                    'besoin_soleil': self._convertir_exposition(
                        arbre.get('expositionsLumiere') or []
                    ),
                    'sol_textures': sol_textures,
                    'sol_ph': sol_ph,
                    'hauteur_max': arbre.get('hauteur'),
                    'largeur_max': arbre.get('largeur'),
                    'vitesse_croissance': self._convertir_croissance(
                        arbre.get('croissance') or ''
                    ),
                    'description': description,
                }
                usages_hq = arbre.get('usages') or ''
                if usages_hq:
                    defaults['usages_autres'] = usages_hq
                if toxicite:
                    defaults['toxicite'] = toxicite
                if parties_comestibles:
                    defaults['parties_comestibles'] = parties_comestibles
                organism, est_nouveau = find_or_match_organism(
                    Organism,
                    nom_latin=nom_latin,
                    nom_commun=nom_francais,
                    defaults=defaults
                )
                
                # Gérer les zones de rusticité (format JSONField avec source)
                current_zones = list(organism.zone_rusticite or [])
                if zone_rusticite_raw:
                    updated_zones = merge_zones_rusticite(
                        current_zones,
                        zone_rusticite_raw,
                        SOURCE_HYDROQUEBEC
                    )
                else:
                    updated_zones = current_zones
                
                # Préparer les mises à jour selon le mode de merge
                update_fields = {}
                
                if merge_mode == MERGE_FILL_GAPS:
                    # Ne mettre à jour que les champs vides
                    current = {k: getattr(organism, k, None) for k in [
                        'famille', 'besoin_eau', 'besoin_soleil', 'sol_textures',
                        'sol_ph', 'hauteur_max', 'largeur_max', 'vitesse_croissance',
                        'description', 'toxicite', 'parties_comestibles', 'usages_autres'
                    ]}
                    defaults_to_apply = {
                        'famille': famille,
                        'besoin_eau': self._convertir_humidite(arbre.get('solHumidites') or []),
                        'besoin_soleil': self._convertir_exposition(arbre.get('expositionsLumiere') or []),
                        'sol_textures': sol_textures,
                        'sol_ph': sol_ph,
                        'hauteur_max': arbre.get('hauteur'),
                        'largeur_max': arbre.get('largeur'),
                        'vitesse_croissance': self._convertir_croissance(arbre.get('croissance') or ''),
                        'description': description,
                    }
                    if usages_hq:
                        defaults_to_apply['usages_autres'] = usages_hq
                    if toxicite:
                        defaults_to_apply['toxicite'] = toxicite
                    if parties_comestibles:
                        defaults_to_apply['parties_comestibles'] = parties_comestibles
                    filtered = apply_fill_gaps(current, defaults_to_apply)
                    update_fields.update(filtered)
                else:
                    # Mode overwrite: mettre à jour tous les champs
                    update_fields.update({
                        'famille': famille,
                        'besoin_eau': self._convertir_humidite(arbre.get('solHumidites') or []),
                        'besoin_soleil': self._convertir_exposition(arbre.get('expositionsLumiere') or []),
                        'sol_textures': sol_textures,
                        'sol_ph': sol_ph,
                        'hauteur_max': arbre.get('hauteur'),
                        'largeur_max': arbre.get('largeur'),
                        'vitesse_croissance': self._convertir_croissance(arbre.get('croissance') or ''),
                        'description': description,
                        'toxicite': toxicite or '',
                        'parties_comestibles': parties_comestibles or '',
                        'usages_autres': usages_hq or '',
                    })
                
                # Toujours mettre à jour les zones (merge intelligent)
                update_fields['zone_rusticite'] = updated_zones
                
                # Fusionner data_sources
                existing_sources = dict(organism.data_sources or {})
                existing_sources[SOURCE_HYDROQUEBEC] = hq_payload
                update_fields['data_sources'] = existing_sources
                
                # Appliquer les mises à jour
                for key, value in update_fields.items():
                    setattr(organism, key, value)
                organism.save()

                if est_nouveau:
                    created += 1
                    self.stdout.write(f'  ✅ Créé: {nom_francais}')
                else:
                    updated += 1
                    self.stdout.write(f'  🔄 Mis à jour: {nom_francais}')

            except Exception as e:
                skipped += 1
                nom_francais = arbre.get('nomFrancais', '?')
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️ Erreur: {nom_francais} - {str(e)}')
                )

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Import terminé!'))
        self.stdout.write(f'  ✅ Créés: {created}')
        self.stdout.write(f'  🔄 Mis à jour: {updated}')
        self.stdout.write(f'  ⚠️ Ignorés: {skipped}')

    def _enrich_from_partiel(self, arbres):
        """
        Fusionne les données de l'API partiel (complètes) dans arbres chargé depuis --file.
        Construit un lookup par numeroFiche puis remplit les champs vides.
        """
        lookup = {}
        try:
            session = requests.Session()
            session.mount('https://', TLS12Adapter())
            session.headers.update({
                'User-Agent': (
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ),
                'Accept': 'application/json',
            })
            chunk_size = 200
            index = 0
            while True:
                url = f'https://arbres.hydroquebec.com/public/api/v1.0.0/arbres/fr/rechercher/partiel/{index}/{chunk_size}'
                response = session.get(url, timeout=60)
                response.raise_for_status()
                chunk = response.json()
                if not chunk:
                    break
                for a in chunk:
                    nf = a.get('numeroFiche')
                    if nf:
                        lookup[str(nf)] = a
                if len(chunk) < chunk_size:
                    break
                index += chunk_size
        except Exception:
            self.stdout.write(self.style.WARNING('⚠️ Enrichissement API échoué, utilisation du fichier seul.'))
            return arbres

        merged_count = 0
        # Index par espèce de base (ex. "Cotoneaster dammeri") pour héritage cultivar → espèce
        species_lookup = {}
        for nf, a in lookup.items():
            if a.get('feuillesDescription') or a.get('fruitsDescription'):
                lat = (a.get('nomLatin') or '')
                base = lat.split("'")[0].split('(')[0].strip()
                if base and base not in species_lookup:
                    species_lookup[base] = a

        for arbre in arbres:
            nf = arbre.get('numeroFiche')
            full = lookup.get(str(nf)) if nf else None
            if not full:
                # Fallback : hériter d'un cultivar de la même espèce (ex. dammeri ← Coral Beauty)
                lat = (arbre.get('nomLatin') or '')
                base = lat.split("'")[0].split('(')[0].strip()
                full = species_lookup.get(base)
            if not full:
                continue
            for key in ('feuillesDescription', 'fleursDescription', 'fruitsDescription'):
                if not arbre.get(key) and full.get(key):
                    arbre[key] = full[key]
                    merged_count += 1
            # Autres champs utiles
            for key in ('famille', 'hauteur', 'largeur', 'croissance', 'solTextures', 'solPhs',
                       'expositionsLumiere', 'solHumidites', 'formes', 'usages'):
                if not arbre.get(key) and full.get(key):
                    arbre[key] = full[key]

        if merged_count:
            self.stdout.write(self.style.SUCCESS(f'✅ Enrichi {merged_count} champs depuis l\'API partiel.'))
        return arbres

    def _charger_fichier(self, file_path):
        """Charge la liste d'arbres depuis un fichier JSON (enregistré depuis le navigateur)."""
        path = Path(file_path)
        if not path.exists():
            self.stdout.write(self.style.ERROR(f'❌ Fichier introuvable: {path}'))
            return []
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'❌ Fichier JSON invalide: {e}'))
            return []
        if not isinstance(data, list):
            self.stdout.write(self.style.ERROR('❌ Le JSON doit être une liste d\'objets (arbres).'))
            return []
        return data

    def _charger_api(self, limit):
        """
        Charge les arbres depuis l'API partiel (données complètes).
        L'endpoint /tous retourne des nulls ; /partiel fournit fruits/feuilles/fleurs.
        """
        try:
            self.stdout.write('📡 Connexion à l\'API Hydro-Québec (partiel)...')
            session = requests.Session()
            session.mount('https://', TLS12Adapter())
            session.headers.update({
                'User-Agent': (
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ),
                'Accept': 'application/json',
            })
            arbres = []
            chunk_size = 200
            index = 0
            while True:
                url = f'https://arbres.hydroquebec.com/public/api/v1.0.0/arbres/fr/rechercher/partiel/{index}/{chunk_size}'
                response = session.get(url, timeout=60)
                response.raise_for_status()
                chunk = response.json()
                if not chunk:
                    break
                arbres.extend(chunk)
                if limit > 0 and len(arbres) >= limit:
                    arbres = arbres[:limit]
                    break
                if len(chunk) < chunk_size:
                    break
                index += chunk_size
            return arbres
        except requests.exceptions.SSLError:
            self.stdout.write(self.style.ERROR(
                '❌ Erreur SSL. Utilisez --file=arbres.json --enrich-from-api\n'
                '   Ou enregistrez depuis: .../rechercher/partiel/0/500'
            ))
            return None
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'❌ Erreur de connexion à l\'API: {e}'))
            return None

    def _determiner_type(self, formes):
        """Détermine le type d'organisme selon les formes (choix Organism.TYPE_CHOICES)."""
        if not formes:
            return 'arbre_ornement'
        
        forme_str = ' '.join(f if isinstance(f, str) else '' for f in formes).lower()
        
        if 'grand arbre' in forme_str or 'moyen arbre' in forme_str:
            return 'arbre_ornement'
        elif 'petit arbre' in forme_str or 'arbrisseau' in forme_str:
            return 'arbuste'
        elif 'arbuste' in forme_str:
            return 'arbuste'
        elif 'grimpant' in forme_str:
            return 'grimpante'
        else:
            return 'arbre_ornement'
    
    def _convertir_humidite(self, humidites):
        """Convertit les humidités HQ en besoin eau"""
        if not humidites:
            return 'moyen'
        
        humidite_str = ' '.join(humidites).lower()
        
        if 'élevée' in humidite_str or 'humide' in humidite_str:
            return 'eleve'
        elif 'faible' in humidite_str or 'sec' in humidite_str:
            return 'faible'
        else:
            return 'moyen'
    
    def _convertir_exposition(self, expositions):
        """Convertit les expositions HQ en besoin soleil"""
        if not expositions:
            return 'plein_soleil'
        
        expo_str = ' '.join(expositions).lower()
        
        if 'soleil' in expo_str:
            return 'plein_soleil'
        elif 'mi-ombre' in expo_str:
            return 'mi_ombre'
        elif 'ombre' in expo_str:
            return 'ombre'
        else:
            return 'plein_soleil'
    
    def _convertir_croissance(self, croissance):
        """Convertit la vitesse de croissance"""
        if not croissance:
            return ''
        
        croissance = croissance.lower()
        
        if 'lente' in croissance:
            return 'lente'
        elif 'rapide' in croissance:
            return 'rapide'
        elif 'moyenne' in croissance:
            return 'moyenne'
        else:
            return ''
    
    def _manque_donnees_descriptives(self, arbre):
        """Vérifie si la fiche manque de données descriptives (fruits, feuilles, fleurs)."""
        return not (
            arbre.get('fruitsDescription')
            and arbre.get('feuillesDescription')
            and arbre.get('fleursDescription')
        )

    def _fetch_fiche_detail(self, session, numero_fiche):
        """Récupère la fiche détail via l'API (/rechercher/arbre/{id}). Retourne None en cas d'erreur."""
        if not session or not numero_fiche:
            return None
        # Doc officielle: https://donnees.hydroquebec.com/explore/dataset/repertoire-arbres/
        url = f'https://arbres.hydroquebec.com/public/api/v1.0.0/arbres/fr/rechercher/arbre/{numero_fiche}'
        try:
            response = session.get(url, timeout=15)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

    def _fusionner_fiche_detail(self, arbre, detail):
        """Fusionne les données de la fiche détail dans arbre (ne remplit que les champs vides)."""
        merged = dict(arbre)
        for key in ('feuillesDescription', 'fleursDescription', 'fruitsDescription'):
            if not merged.get(key) and detail.get(key):
                merged[key] = detail[key]
        return merged

    def _deriver_parties_comestibles(self, fruits_description, toxicite):
        """
        Dérive parties_comestibles à partir de fruitsDescription.
        Pour les fruits toxiques : indique leur présence tout en renvoyant vers toxicité.
        """
        if not fruits_description or not isinstance(fruits_description, str):
            return ''
        fd = fruits_description.lower()
        if 'baie' in fd or 'fruit' in fd or 'drupe' in fd or 'cône' in fd:
            if toxicite:
                return 'Fruits (baies) — non comestibles, toxiques. Voir toxicité.'
            return 'Fruits (baies)'
        return ''

    def _extraire_toxicite_fruits(self, fruits_description):
        """Extrait une notice de toxicité si fruitsDescription mentionne des fruits toxiques."""
        if not fruits_description or not isinstance(fruits_description, str):
            return ''
        fd = fruits_description.lower()
        if 'toxique' in fd or 'potentiellement toxique' in fd:
            # Extraire la phrase pertinente (ex. "baies potentiellement toxiques")
            parts = []
            for seg in fruits_description.split('\n\n'):
                seg = seg.strip()
                if seg and ('toxique' in seg.lower() or 'potentiellement' in seg.lower()):
                    parts.append(seg)
            return ' '.join(parts) if parts else ''
        return ''

    def _creer_description(self, arbre):
        """Crée une description à partir des données HQ"""
        parts = []
        
        if arbre.get('feuillesDescription'):
            parts.append(f"Feuilles: {arbre['feuillesDescription']}")
        
        if arbre.get('fleursDescription'):
            parts.append(f"Fleurs: {arbre['fleursDescription']}")
        
        if arbre.get('fruitsDescription'):
            parts.append(f"Fruits: {arbre['fruitsDescription']}")
        
        if arbre.get('remarquesFicheComplete'):
            parts.append(f"Remarques: {arbre['remarquesFicheComplete']}")
        
        return '\n\n'.join(parts)
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
                'Fichier JSON local (liste d\'arbres). '
                'Ouvrez https://arbres.hydroquebec.com/public/api/v1.0.0/arbres/fr/rechercher/tous '
                'dans le navigateur, enregistrez la page en .json, puis: --file=arbres.json'
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

    def handle(self, *args, **options):
        limit = options['limit']
        file_path = options.get('file')
        merge_mode = options.get('merge', MERGE_OVERWRITE)
        
        if limit == 0:
            self.stdout.write(self.style.SUCCESS('🌳 Début de l\'import Hydro-Québec (tout)...'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'🌳 Début de l\'import Hydro-Québec (max {limit} arbres)...'
            ))
        
        # Charger les données : fichier local ou API
        if file_path:
            arbres = self._charger_fichier(file_path)
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

                formes = arbre.get('formes', [])
                type_organisme = self._determiner_type(formes)

                # L'API peut renvoyer null: on force listes/chaînes vides pour éviter NOT NULL en base
                famille = arbre.get('famille') or ''
                zone_rusticite_raw = arbre.get('zoneRusticite') or ''
                description = self._creer_description(arbre) or ''
                sol_textures = arbre.get('solTextures') if arbre.get('solTextures') is not None else []
                sol_ph = arbre.get('solPhs') if arbre.get('solPhs') is not None else []
                hq_payload = {
                    'numeroFiche': arbre.get('numeroFiche'),
                    'plantationDistanceMinimum': arbre.get('plantationDistanceMinimum'),
                    'remarques': arbre.get('remarquesFicheDeBase') or '',
                    'usages': arbre.get('usages') or '',
                    'maladies': arbre.get('maladies') or '',
                    'insectes': arbre.get('insectes') or '',
                }
                
                # Chercher ou créer l'organisme avec matching intelligent
                organism, est_nouveau = find_or_match_organism(
                    Organism,
                    nom_latin=nom_latin,
                    nom_commun=nom_francais,
                    defaults={
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
                        'sol_ph', 'hauteur_max', 'largeur_max', 'vitesse_croissance', 'description'
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
        """Tente de récupérer les arbres depuis l'API. Retourne None en cas d'erreur."""
        url = 'https://arbres.hydroquebec.com/public/api/v1.0.0/arbres/fr/rechercher/tous'
        try:
            self.stdout.write('📡 Connexion à l\'API Hydro-Québec...')
            session = requests.Session()
            session.mount('https://', TLS12Adapter())
            session.headers.update({
                'User-Agent': (
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ),
                'Accept': 'application/json',
            })
            response = session.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.SSLError as e:
            self.stdout.write(self.style.ERROR(
                f'❌ Erreur SSL (l\'API bloque souvent les clients non-navigateur).\n'
                f'   Solution: ouvrez cette URL dans votre navigateur:\n'
                f'   {url}\n'
                f'   Enregistrez la page en "arbres.json", puis lancez:\n'
                f'   python manage.py import_hydroquebec --file=arbres.json --limit=500'
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
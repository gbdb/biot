import requests
import urllib3
from django.core.management.base import BaseCommand
from species.models import Organism

# Désactive les warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class Command(BaseCommand):
    help = 'Importe les arbres et arbustes depuis Hydro-Québec'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Nombre maximum d\'arbres à importer (défaut: 50)'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        
        self.stdout.write(self.style.SUCCESS(
            f'🌳 Début de l\'import Hydro-Québec (max {limit} arbres)...'
        ))
        
        # URL de l'API Hydro-Québec
        url = 'https://arbres.hydroquebec.com/public/api/v1.0.0/arbres/fr/rechercher/tous'
        
        try:
            # Requête à l'API avec SSL désactivé
            self.stdout.write('📡 Connexion à l\'API Hydro-Québec...')
            
            #session = requests.Session()
            #session.verify = False
            import ssl
            ssl._create_default_https_context = ssl._create_unverified_context
            response = requests.get(url, timeout=30, verify=False)
            response.raise_for_status()
            
            arbres = response.json()
            self.stdout.write(self.style.SUCCESS(
                f'✅ {len(arbres)} arbres récupérés de l\'API'
            ))
            
            # Limiter le nombre
            arbres = arbres[:limit]
            
            # Compteurs
            created = 0
            updated = 0
            skipped = 0
            
            for arbre in arbres:
                try:
                    # Extraire les données
                    nom_latin = arbre.get('nomLatin', '').strip()
                    nom_francais = arbre.get('nomFrancais', '').strip()
                    
                    if not nom_latin or not nom_francais:
                        skipped += 1
                        continue
                    
                    # Déterminer le type
                    formes = arbre.get('formes', [])
                    type_organisme = self._determiner_type(formes)
                    
                    # Créer ou mettre à jour
                    organism, est_nouveau = Organism.objects.update_or_create(
                        nom_latin=nom_latin,
                        defaults={
                            'nom_commun': nom_francais,
                            'famille': arbre.get('famille', ''),
                            'regne': 'plante',
                            'type_organisme': type_organisme,
                            
                            # Besoins
                            'besoin_eau': self._convertir_humidite(
                                arbre.get('solHumidites', [])
                            ),
                            'besoin_soleil': self._convertir_exposition(
                                arbre.get('expositionsLumiere', [])
                            ),
                            'zone_rusticite': arbre.get('zoneRusticite', ''),
                            
                            # Sol
                            'sol_textures': arbre.get('solTextures', []),
                            'sol_ph': arbre.get('solPhs', []),
                            
                            # Taille
                            'hauteur_max': arbre.get('hauteur'),
                            'largeur_max': arbre.get('largeur'),
                            'vitesse_croissance': self._convertir_croissance(
                                arbre.get('croissance', '')
                            ),
                            
                            # Données sources
                            'data_sources': {
                                'hydroquebec': {
                                    'numeroFiche': arbre.get('numeroFiche'),
                                    'plantationDistanceMinimum': arbre.get('plantationDistanceMinimum'),
                                    'remarques': arbre.get('remarquesFicheDeBase', ''),
                                    'usages': arbre.get('usages', ''),
                                    'maladies': arbre.get('maladies', ''),
                                    'insectes': arbre.get('insectes', ''),
                                }
                            },
                            
                            'description': self._creer_description(arbre),
                        }
                    )
                    
                    if est_nouveau:
                        created += 1
                        self.stdout.write(f'  ✅ Créé: {nom_francais}')
                    else:
                        updated += 1
                        self.stdout.write(f'  🔄 Mis à jour: {nom_francais}')
                        
                except Exception as e:
                    skipped += 1
                    self.stdout.write(
                        self.style.WARNING(f'  ⚠️ Erreur: {nom_francais} - {str(e)}')
                    )
            
            # Résumé
            self.stdout.write(self.style.SUCCESS(
                f'\n🎉 Import terminé!'
            ))
            self.stdout.write(f'  ✅ Créés: {created}')
            self.stdout.write(f'  🔄 Mis à jour: {updated}')
            self.stdout.write(f'  ⚠️ Ignorés: {skipped}')
            
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(
                f'❌ Erreur de connexion à l\'API: {str(e)}'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'❌ Erreur: {str(e)}'
            ))
    
    def _determiner_type(self, formes):
        """Détermine le type d'organisme selon les formes"""
        if not formes:
            return 'arbre'
        
        forme_str = ' '.join(formes).lower()
        
        if 'grand arbre' in forme_str or 'moyen arbre' in forme_str:
            return 'arbre'
        elif 'petit arbre' in forme_str or 'arbrisseau' in forme_str:
            return 'arbuste'
        elif 'arbuste' in forme_str:
            return 'arbuste'
        elif 'grimpant' in forme_str:
            return 'grimpante'
        else:
            return 'arbre'
    
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
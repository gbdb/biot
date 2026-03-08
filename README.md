# 🌳 Jardin bIOT

> **Plateforme open-source de design et gestion de forêts comestibles et écosystèmes permacoles!**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.0+-092E20.svg)](https://www.djangoproject.com/)
[![Status](https://img.shields.io/badge/Status-Alpha-yellow.svg)]()

**Jardin bIOT** = **b**oulay + b**IO**logique + **IOT** (Internet of Things)

De la gestion de votre potager urbain à la conception de forêts comestibles multi-strates, Jardin bIOT vous accompagne dans la création d'écosystèmes nourriciers résilients et autonomes.

---

## 🌲 Né d'une Vision Réelle

Ce projet est développé activement pour gérer **Les Jardins Comestibles du Mont Caprice** à Morin-Heights, Québec - 3 acres (≈12,000 m²) de forêt comestible en **zone 4a** comprenant:

🌳 **Arbres fruitiers** - Pommiers (Dolgo, Purple Passion), Poiriers de Mandchourie, Cerisiers  
🌰 **Arbres à noix** - Noisetiers américains  
🫐 **Arbustes à baies** - Argousiers (Tatjana, Pollmix), Gadelier, Pimbina, Framboises, Rosiers  
🌿 **Vivaces** - Lobélie cardinale, Thé des bois, Clématite de Virginie  
🍄 **Champignons** - Mycorhizes partenaires  
💧 **Écosystème aquatique** - Ruisseau naturel traversant le terrain  
⛰️ **Terrain** - Pente exposée Est, beaucoup d'ombre, sol forestier

**La vision :** Un outil qui pense comme un permaculteur - pas juste une base de données de plantes, mais un système qui comprend les **relations écologiques**, les **guildes symbiotiques**, et l'**évolution des écosystèmes** dans le temps.

---

## 🎯 Vision du Projet

Dans un contexte de changements climatiques, d'érosion de la biodiversité et de souveraineté alimentaire, **Jardin bIOT** vise à démocratiser l'accès à des outils de **design permaculturel intelligent** pour créer des écosystèmes nourriciers durables.

### Au-delà du Simple Tracker de Plantes

Jardin bIOT ne se contente pas de suivre vos plantations - il vous aide à :

🌳 **Concevoir des guildes écologiques** - Comprendre comment le pommier, le trèfle fixateur d'azote, les mycorhizes et le couvre-sol travaillent ensemble

🍄 **Intégrer tous les règnes** - Plantes, champignons, mousses, et même la faune bénéfique dans votre design

💧 **Optimiser les ressources** - Captation d'eau, cycles de nutriments, gestion des microclimats

🔄 **Planifier la succession écologique** - De l'annuelle pionnière à la forêt comestible mature

🤝 **Partager la connaissance** - Base de données collaborative adaptée aux climats locaux (Québec, zones froides)

---

## 🌿 Philosophie Permaculture

Jardin bIOT s'inspire des principes fondamentaux de la permaculture de David Holmgren et Bill Mollison :

### 1. Observer et Interagir 👁️
L'outil vous aide à **documenter** vos observations (croissance, maladies, interactions faune/flore) pour prendre des décisions éclairées basées sur **votre contexte unique** - pas sur des conseils génériques.

### 2. Chaque Élément Remplit Plusieurs Fonctions 🔄
Une même plante peut : nourrir (fruits), enrichir (fixation d'azote), protéger (coupe-vent), attirer (pollinisateurs), soigner (médicinale), abriter (faune). Jardin bIOT capture cette **multifonctionnalité**.

### 3. Chaque Fonction est Assurée par Plusieurs Éléments 🛡️
Pour l'azote : légumineuses + compost + paillis + champignons mycorhiziens. Pour l'eau : swale + bassin + paillis + plantes économes. La **redondance = résilience**.

### 4. Travailler Avec la Nature, Pas Contre Elle 🦋
Plantes indigènes, associations naturelles, prédateurs bénéfiques. Pas de lutte - des **écosystèmes équilibrés** qui se régulent.

### 5. Produire Sans Gaspiller, Accepter le Feedback 📊
Chaque donnée (succès, échec, observation) enrichit le système pour vous et la communauté. **L'apprentissage continu** par l'expérimentation.

### 6. Utiliser et Valoriser la Diversité 🌈
Plus de diversité = plus de stabilité = moins de maladies = meilleure résilience climatique. Jardin bIOT encourage les **polycultures**, pas les monocultures.

---

## 🌟 Fonctionnalités par Niveau d'Évolution

### 🌱 NIVEAU 1 : Fondations Écologiques (En cours - Hiver/Printemps 2026)

**Gestion des Organismes Vivants**
- [x] Base de données **Organism** (pas juste "plantes" mais tous les organismes!)
  - Plantes (arbres, arbustes, vivaces, annuelles, herbes, grimpantes, couvre-sol)
  - Champignons (comestibles, mycorhiziens)
  - Mousses et bryophytes
- [x] Types spécialisés : arbres fruitiers, arbres à noix (noyers, noisetiers, etc.)
- [x] Caractéristiques culturales complètes :
  - Besoins : eau, soleil, type de sol, pH, drainage, rusticité (zone climatique)
  - Physiques : hauteur/largeur max, croissance
  - Fruitiers : âge fructification, période récolte, pollinisation
  - Comestibilité : parties comestibles (fruits, feuilles, racines, fleurs, écorce)
- [x] **Spécimens individuels** - Vos plants réels avec :
  - Géolocalisation sur le terrain
  - Photos et timeline complète
  - Historique de santé et d'événements
  - Lien vers collection de semences (pour semis maison)
- [x] **Événements** - Journal de bord (inline sur fiche spécimen) :
  - Plantation, arrosage, taille, fertilisation
  - Observations (floraison, fructification, maladies)
  - Récoltes avec quantités

**Relations Écologiques** 🔗
- [x] **Compagnonnage** - Relations entre organismes :
  - **Positives** : compagnon bénéfique, fixateur azote, attire pollinisateurs, repousse nuisibles
  - **Négatives** : allélopathie (ex: noyer produit juglone toxique pour tomates)
  - **Structurelles** : abri, ombre, coupe-vent, support physique (tuteur vivant)
  - **Symbiotiques** : mycorhizes (champignons ↔ racines)
- [x] Force et description détaillée des interactions
- [x] Visualisation graphique des réseaux de relations

**Cultivars et pollinisation** 🌸
- [x] **Variétés / cultivars** par espèce (couleur fruit, goût, résistances) — voir [Pollinisation et groupes](docs/pollinisation-cultivars-groupes-specimens.md)
- [x] **Pollinisateurs recommandés** au niveau cultivar (CultivarPollinator : variété compagne ou espèce compagne)
- [x] **Regroupement de spécimens** : deux types — (1) mâle/femelle (un pollinisateur, jusqu’à 6 principaux), (2) pollinisation croisée (au moins 2 cultivars d’une même espèce) ; rôles par specimen
- [x] **Distance de pollinisation** : paramètre utilisateur configurable (Paramètres) pour la distance par défaut (m) ; valeur de repli globale (settings) ; option par espèce (`distance_pollinisation_max`)
- [x] **Alerte « zone trop loin »** : si distance entre partenaires > seuil (haversine), affichée sur la fiche specimen
- [ ] Rappel début de saison de planification (commander un plant si pollinisateur mort) et rappel à la floraison

**Sols & Amendements** 🌱
- [x] Base de données d'amendements :
  - Compost, fumiers, engrais verts
  - Amendements minéraux (chaux, soufre, roches)
  - Paillis organiques (BRF, feuilles, paille)
- [x] Composition NPK et oligo-éléments
- [x] Recommandations Organisme ↔ Amendement (modèle OrganismAmendment)
- [ ] Recommandations intelligentes avancées (par type de sol, problématique)

**Gestion des Semences** 🌱
- [x] **Inventaire de graines** - Collections de semences avec :
  - Fournisseurs (semenciers, échanges, récolte perso)
  - Stratification (froide/chaude, durée), germination (temps, température)
  - Viabilité (durée de vie, date récolte, taux germination labo)
  - Batches de semis (suivi taux de succès, plants obtenus)
- [x] **Import de catalogues** - Commande `import_seeds` (CSV, JSON) avec mapping flexible
- [x] **Documentation pour semenciers** - [Guide de mapping](docs/seed-supplier-mapping.md) pour préparer vos exports

**Interface & Données** 💻
- [x] Interface admin Django complète avec recherche et filtres avancés
- [x] **Tags personnels** - Système de tags colorés pour organiser votre collection :
  - Tags personnalisables avec couleurs et descriptions
  - Filtrage par tags dans l'admin
  - Interface de sélection intuitive (filter_horizontal)
- [x] Import automatique depuis sources ouvertes :
  - ✅ Hydro-Québec (arbres zone Québec)
  - ✅ Plants For A Future (PFAF) - plantes comestibles permaculture (base payante : 50–150 USD, voir pfaf.org)
  - ✅ **Semences** - Catalogues semenciers (CSV/JSON) via `python manage.py import_seeds`
  - ⏳ OpenFarm - légumes et cultures maraîchères
  - ⏳ USDA Plants Database - données botaniques
- [x] Stockage flexible (JSONField) pour données de sources multiples
- [x] Upload et galerie de photos par spécimen (inline sur fiche spécimen)
- [x] Export de données (CSV, PDF)
- [x] **Jardins et météo** :
  - Jardins avec adresses et coordonnées
  - Géocodage automatique : adresse → coordonnées via Open-Meteo + Nominatim
  - Suivi météo via Open-Meteo (gratuit, sans clé API) :
    - Températures (min, max, moyenne)
    - Précipitations (pluie, neige en cm), évapotranspiration FAO (ET0) pour irrigation
  - Récupération météo auto à la création d'un jardin (signal post_save)
  - Alertes arrosage : détection « chaud + sec » sur N jours → conseil d'arrosage
  - Zones sprinkler pour domotique (webhook, MQTT, Home Assistant, IFTTT)
  - Commande : `python manage.py fetch_weather` (à planifier en cron)

---

### 🌳 NIVEAU 2 : Design Permaculture (Printemps/Été 2026)

**Guildes Écologiques** 🏕️
- [ ] Création et gestion de guildes (ex: guilde du pommier, guilde des 3 sœurs)
- [ ] **Stratification par couches** :
  - Canopée (grands arbres)
  - Sous-canopée (petits arbres)
  - Arbustes
  - Herbacées
  - Couvre-sol
  - Rhizosphère (racines)
  - Verticale (grimpantes)
- [ ] Modèles de guildes pré-configurées pour :
  - Climat québécois (zones 3-5)
  - Terrain ombragé vs ensoleillé
  - Sol humide vs sec
- [ ] Visualisation 3D des strates
- [ ] Suggestions intelligentes de plantes compagnes

**Zones & Microclimats** 🗺️
- [ ] **Cartographie 3D du terrain** (priorité : terrains en pente) :
  - Vue 3D dès la conception — le relief est central pour pentes, drainage, exposition
  - **Cesium** (open source, Apache 2.0) pour visualisation 3D dans le navigateur
  - Relief via LiDAR/MNT (Données Québec, données ouvertes)
  - Placement des espèces/spécimens aux emplacements voulus sur la carte 3D
- [ ] Définition de zones avec caractéristiques :
  - Ensoleillement (ombre, mi-ombre, plein soleil)
  - Humidité (sec, normal, humide, détrempé)
  - Pente et drainage
  - Exposition (N, S, E, O)
  - Type de sol et pH
- [ ] **Recommandations par zone** :
  - Organismes les plus adaptés
  - Score de compatibilité (0-100)
  - Explications des recommandations
- [ ] Gestion des éléments d'eau :
  - Ruisseaux, mares, bassins
  - Swales (fossés absorbants)
  - Systèmes de récupération d'eau
  - Jardins de pluie

**Planification Spatiale** 📐
- [ ] Plan de jardin interactif sur fond 3D (placement des espèces par clic/drag)
- [ ] Espacement automatique selon taille mature
- [ ] Visualisation de l'ombrage au fil des saisons
- [ ] Zones de pollinisation (rayon efficace)
- [ ] Calcul automatique de densités de plantation

---

### 🔄 NIVEAU 3 : Succession & Évolution (Automne 2026)

**Succession Écologique** ⏳
- [ ] Modélisation des stades de succession :
  - Stade 1 (0-2 ans) : Pionnières, annuelles, légumes
  - Stade 2 (2-5 ans) : Vivaces, petits arbustes
  - Stade 3 (5-10 ans) : Arbustes matures, jeunes arbres
  - Stade 4 (10-20 ans) : Arbres dominants
  - Stade 5 (20+ ans) : Forêt comestible climax
- [ ] Planification temporelle de votre jardin
- [ ] Suggestions de plantes pionnières vs permanentes
- [ ] Simulation de l'évolution sur 10-20 ans

**Timeline & Calendrier** 📅
- [ ] Calendrier des tâches par zone climatique
- [ ] Rappels intelligents basés sur :
  - Dates de dernière gelée / première gelée
  - Besoins spécifiques des organismes
  - Événements passés (espacer les tailles, etc.)
- [ ] Prédictions de récolte
- [ ] Suivi phénologique (débourrement, floraison, fructification)

---

### 🐝 NIVEAU 4 : Écosystème Complet (2027)

**Faune Bénéfique** 🦋
- [ ] Base de données de faune utile :
  - Pollinisateurs (abeilles, papillons, bourdons)
  - Prédateurs (coccinelles, chrysopes, carabes)
  - Décomposeurs (vers de terre, cloportes)
  - Oiseaux insectivores
  - Amphibiens (grenouilles, crapauds)
- [ ] Liens plantes ↔ faune :
  - Quelles plantes attirent quels pollinisateurs
  - Plantes hôtes pour papillons
  - Abris et nichoirs requis
- [ ] Gestion de la biodiversité :
  - Corridors écologiques
  - Habitats (tas de bois, pierres, eau)
  - Stratégies anti-nuisibles sans pesticides

**Cycles de Nutriments** ♻️
- [ ] Modélisation des flux :
  - Fixation d'azote (légumineuses)
  - Accumulateurs dynamiques (consoude, ortie)
  - Décomposition (champignons, bactéries)
  - Litière et BRF
- [ ] Fermeture des boucles :
  - Compostage intégré
  - Paillage permanent
  - Valorisation des "déchets"

---

### 🤖 NIVEAU 5 : Intelligence & Automation (2027-2028)

**Capteurs IoT & Home Assistant** 📡
- [ ] Intégration capteurs :
  - Humidité du sol (par zone/spécimen)
  - Température air et sol
  - Luminosité / PAR
  - pH et NPK du sol
- [ ] Automation :
  - Déclenchement irrigation automatique
  - Alertes si conditions anormales
  - Logging automatique des données environnementales
- [ ] Tags RFID sur spécimens :
  - Scan rapide pour identifier le plant
  - Ajout d'événements ultra-rapide au jardin

**IA & Recommandations** 🧠
- [ ] Assistant IA (via Claude API) :
  - Analyse de photos (maladies, carences, identification)
  - Suggestions de guildes optimales
  - Réponses à questions contextuelles
  - Génération de plans de jardin
- [ ] Apprentissage des patterns :
  - Dates optimales selon **votre micro-climat**
  - Prédiction de maladies
  - Optimisation des récoltes

**PWA & Mobile** 📱
- [ ] Progressive Web App installable
- [ ] Mode offline complet
- [ ] Prise de photo et ajout instantané
- [ ] Géolocalisation automatique des spécimens
- [ ] Voix (dictée d'observations)

---

## 📱 Jardin Biot Mobile App

> Application mobile native pour usage terrain : ajout de spécimens, scan NFC, journal rapide. Conçue pour être utilisée **en extérieur, en plein soleil, avec des gants** — boutons larges, minimum de taps.

L'app mobile complète l'interface web/admin pour le travail au jardin : identification instantanée via NFC, saisie rapide d'événements, galerie photo chronologique.

### Priorités v1

| # | Fonctionnalité | État backend |
|---|----------------|--------------|
| 1 | Ajouter un spécimen avec photo | Specimen + Photo ✓ |
| 2 | Associer un tag NFC à un spécimen | `code_identification` ou `nfc_tag_uid` |
| 3 | Scanner un tag NFC → fiche instantanée | API lookup par UID |
| 4 | Logger un événement en 2 taps max | Event model ✓ |
| 5 | Liste des spécimens avec statut visuel | Specimen.statut ✓ |
| 6 | Zones et sous-zones | zone_jardin (v1) → modèle Zone (Niveau 2) |
| 7 | Filtres par zone et statut | API query params |
| 8 | Journal chronologique par spécimen | Event per specimen ✓ |
| 9 | Galerie photo chronologique | Photo model ✓ |
| 10 | Rappels / tâches récurrentes | À venir (Niveau 3) |

### UX critique

- **Usage mobile dehors** : lisible en plein soleil (contraste élevé, tailles de police généreuses)
- **Utilisable avec des gants** : boutons larges (min 44×44 pt), espacement généreux
- **Minimum de taps** : workflows courts, actions rapides (ex: scan NFC → 1 tap = fiche)

### Stack technique

- **Frontend mobile** : React Native / Expo
- **API** : Django REST Framework (JSON)
- **Auth** : JWT (simplejwt) pour session mobile
- **NFC** : expo-nfc-provider ou react-native-nfc-manager
- **Photos** : expo-camera / expo-image-picker
- **Offline** : AsyncStorage + sync (v1.1)

### Structure du projet

```
biot/
├── jardinbiot/     # Backend Django
├── species/        # App Django + API
├── mobile/         # App Expo (Jardin Biot Mobile)
│   ├── app/
│   ├── package.json
│   └── ...
└── README.md
```

### Démarrage (développement)

```bash
# Backend (API)
cd biot && python manage.py runserver

# Mobile
cd mobile && npx expo start
```

---

### 🤝 NIVEAU 6 : Communauté & Partage (2028+)

**Réseau Social Permacole** 👥
- [ ] Profils utilisateurs et jardins publics
- [ ] Partage de fiches d'organismes personnalisées
- [ ] Success stories et échecs (apprendre ensemble)
- [ ] Questions/Réponses communautaires
- [ ] Système de réputation et badges

**Échanges & Grainothèques** 🌱
- [x] Fondations : inventaire semences, fournisseurs, import catalogues (voir Niveau 1)
- [ ] Plateforme d'échange de semences
- [ ] Échange de plants et boutures
- [ ] Greffons pour arbres fruitiers
- [ ] Géolocalisation des échanges locaux
- [ ] Ratings et commentaires

**Base de Connaissances Collaborative** 📚
- [ ] Wiki communautaire :
  - Fiches d'organismes enrichies par utilisateurs
  - Maladies et solutions
  - Techniques de culture locales
  - Recettes et transformations
- [ ] Données climatiques par région
- [ ] Adaptation au changement climatique

---

## 🏗️ Architecture Technique

### Stack Technologique

- **Backend** : Django 5.0+ (Python 3.11+)
- **Base de données** : PostgreSQL 15+
- **Frontend** : Django Templates + Alpine.js / HTMX (léger et progressif) — Cesium prévu pour cartographie 3D (Niveau 2)
- **API** : Django REST Framework
- **Déploiement** : Docker + Docker Compose
- **Infrastructure** : Auto-hébergeable (Proxmox, Raspberry Pi, VPS) ou SaaS

### Modèles de Données Principaux

```
┌─────────────────┐
│   Organism      │  ← Plantes, champignons, mousses
│                 │     (avec JSONField flexible pour données externes)
└────────┬────────┘
         │
         ├─ Specimen        (plants individuels avec géoloc)
         ├─ Event           (timeline : plantation, arrosage, observations)
         ├─ SeedSupplier    (fournisseurs de semences)
         ├─ SeedCollection  (inventaire graines : stratification, germination, viabilité)
         │   └─ SemisBatch  (sessions de semis, taux de succès)
         ├─ CompanionRelation  (qui aide qui, comment)
         ├─ OrganismAmendment  (quel engrais pour qui)
         │
         └─ [Niveau 2+]
             ├─ Guild       (guildes écologiques)
             ├─ Zone        (zones du terrain)
             ├─ Succession  (stades temporels)
             └─ Wildlife    (faune partenaire)
```

**Pourquoi cette architecture :**
- ✅ **Flexible** : JSONField pour données évolutives
- ✅ **Relationnelle** : Liens clairs entre entités
- ✅ **Extensible** : Facile d'ajouter nouveaux modèles
- ✅ **Performante** : PostgreSQL optimisé pour recherches complexes
- ✅ **Future-proof** : Pense déjà aux niveaux 2-6

---

## 🌍 Sources de Données

**Jardin bIOT** agrège des données provenant de sources ouvertes et libres pour offrir un catalogue riche adapté à différents contextes.

### Sources Intégrées/Planifiées

**1. Hydro-Québec - Répertoire d'arbres et arbustes** ✅
- 📋 **Licence** : Creative Commons CC-BY 4.0
- 🌲 **Contenu** : 1700+ espèces adaptées au climat québécois
- 📍 **Spécificités** : Zones de rusticité, distances plantation sécuritaire, caractéristiques hivernales
- 🔗 **API** : [donnees.hydroquebec.com](https://donnees.hydroquebec.com/explore/dataset/repertoire-arbres/)
- ⭐ **Priorité** : Source primaire pour arbres et arbustes (contexte québécois)

**2. Plants For A Future (PFAF)** ⏳
- 📋 **Licence** : **Payante** — Standard Home 50 USD (usage privé), Commercial 150 USD, Student 30 USD (~7400 plantes tempérées)
- 🌿 **Contenu** : Plantes comestibles, médicinales, utilitaires
- 📍 **Spécificités** : Excellent pour permaculture, plantes sauvages, usages multiples
- 🔗 **Site** : [pfaf.org](https://pfaf.org) (achat et téléchargement)
- ⭐ **Priorité** : Plantes comestibles sauvages, vivaces, permaculture — n’importer que des fichiers acquis légalement

**3. OpenFarm** ⏳
- 📋 **Licence** : Domaine public (CC0)
- 🥕 **Contenu** : Base collaborative sur cultures maraîchères
- 📍 **Spécificités** : Guides de culture, calendriers, expériences communautaires
- 🔗 **GitHub** : [github.com/openfarmcc/OpenFarm](https://github.com/openfarmcc/OpenFarm)
- ⭐ **Priorité** : Légumes annuels, cultures potagères
- ⚠️ **Note** : Projet fermé mais données disponibles

**4. USDA Plants Database** ⏳
- 📋 **Licence** : Domaine public (US Government)
- 🔬 **Contenu** : Base scientifique avec traits botaniques
- 📍 **Spécificités** : Données fiables, caractéristiques, histoire de vie
- 🔗 **API** : [plantsdb.xyz](https://plantsdb.xyz)
- ⭐ **Priorité** : Validation scientifique, données botaniques

### Stratégie d'Intégration

- **Agréger** plusieurs sources pour une même espèce
- **Prioriser** selon contexte (Hydro-Québec pour Québec, PFAF pour permaculture)
- **Valider** par recoupement
- **Enrichir** avec contributions communautaires locales
- **Adapter** selon zones climatiques

**Format de stockage :** JSONField flexible permettant d'ajouter facilement de nouvelles sources sans modifier la structure de base.

---

## 🚀 Installation

### Prérequis

- Python 3.11 ou supérieur
- PostgreSQL 15+ (ou Docker)
- Git

### Installation Locale (Développement)

```bash
# Cloner le repository
git clone https://github.com/gbdb/biot.git
cd biot

# Créer un environnement virtuel
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configuration de la base de données
cp .env.example .env
# Éditer .env avec vos paramètres PostgreSQL

# Migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Lancer le serveur de développement
python manage.py runserver
```

Accédez à l'application : `http://localhost:8000`

**Import de données :**
```bash
# Import PFAF (plantes comestibles — base payante, n'utiliser que des fichiers acquis via pfaf.org)
python manage.py import_pfaf --file=votre_fichier.csv

# Import catalogues de semences (CSV ou JSON)
python manage.py import_seeds --file=catalogue_semences.csv [--supplier=ID]
```

Admin : `http://localhost:8000/admin`

### Installation avec Docker (Production)

```bash
# Cloner le repository
git clone https://github.com/gbdb/biot.git
cd biot

# Configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Lancer les containers
docker-compose up -d

# Migrations
docker-compose exec web python manage.py migrate

# Créer un superutilisateur
docker-compose exec web python manage.py createsuperuser
```

Accédez à l'application : `http://localhost` (ou votre domaine configuré)

---

## 📖 Documentation

*(En construction - contributions bienvenues!)*

- [x] [Import des espèces : purification, fusion, enrichissement](docs/import-especes-et-fusion-sources.md) - Pipeline espèces, choix techniques, référence des champs, gestion des données
- [x] [Sources de données (espèces)](docs/sources-donnees.md) - Hydro-Québec, PFAF, VASCAN, USDA, commandes d'import
- [x] [Guide de mapping semenciers](docs/seed-supplier-mapping.md) - Préparer vos catalogues CSV/JSON pour l'import
- [x] [Pollinisation, cultivars et groupes de spécimens](docs/pollinisation-cultivars-groupes-specimens.md)
- [x] [Guide de déploiement](DEPLOYMENT.md) - Proxmox, Gunicorn, Nginx, PostgreSQL
- [ ] Guide d'utilisation
- [ ] Guide de contribution
- [ ] Documentation API
- [ ] Tutoriels vidéo

---

## 🤝 Contribuer

**Jardin bIOT** est un projet open-source communautaire. Toutes les contributions sont les bienvenues!

### Comment Contribuer

1. **Fork** le projet
2. Créez une **branche** pour votre feature (`git checkout -b feature/AmazingFeature`)
3. **Committez** vos changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une **Pull Request**

### Types de Contributions Recherchées

- 🐛 Correction de bugs
- ✨ Nouvelles fonctionnalités (voir roadmap par niveaux)
- 📝 Documentation et tutoriels
- 🌍 Traductions (anglais, espagnol, autres langues)
- 🎨 Améliorations UI/UX
- 🌱 Données d'organismes (ajout/correction de fiches)
- 🧪 Tests et qualité du code
- 📸 Photos et illustrations
- 🎓 Contenu éducatif (permaculture, guildes, techniques)

### Domaines d'Expertise Recherchés

- 🌳 **Permaculteurs** : Validation des concepts écologiques, design de guildes
- 🔬 **Botanistes/Agronomes** : Validation scientifique des données
- 💻 **Développeurs Django/Python** : Features, optimisations, architecture
- 🎨 **Designers UI/UX** : Amélioration interface, visualisations
- 📊 **Data Scientists** : Analyses, IA, recommandations intelligentes
- 🇫🇷🇬🇧🇪🇸 **Traducteurs** : Internationalisation du projet

### Code de Conduite

Ce projet adhère à un code de conduite respectueux et inclusif. En participant, vous vous engagez à maintenir un environnement accueillant pour tous. Respect, bienveillance, collaboration.

---

## 📜 Licence

Ce projet est sous licence **AGPL-3.0** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

### Pourquoi AGPL-3.0?

L'AGPL garantit que le code reste libre et open-source, même si quelqu'un héberge une version modifiée comme service. Cela protège la communauté et assure que les améliorations bénéficient à tous.

**En bref :**
- ✅ Usage personnel gratuit
- ✅ Modifications permises (doivent rester open-source)
- ✅ Usage commercial éthique autorisé
- ❌ Impossible de créer une version fermée/propriétaire
- ✅ Partage des améliorations obligatoire

**Philosophie :** Les connaissances sur la culture vivrière et la permaculture doivent rester **libres et accessibles à tous**. C'est un bien commun.

---

## 🌍 Communauté & Support

- **GitHub Discussions** : [github.com/gbdb/biot/discussions](https://github.com/gbdb/biot/discussions)
- **Issues** : [github.com/gbdb/biot/issues](https://github.com/gbdb/biot/issues)
- **Discord** : *(à venir)*
- **Email** : *(à définir)*
- **Facebook** : [Les Jardins Comestibles du Mont Caprice](https://facebook.com) (exemple de cas d'usage réel)

---

## 🙏 Remerciements

- **Hydro-Québec** pour leur répertoire d'arbres en données ouvertes (CC-BY 4.0)
- **Plants For A Future (PFAF)** pour leur travail colossal de documentation des plantes comestibles (base désormais sous licence payante)
- **OpenFarm** pour leur base de données communautaire de cultures potagères
- **USDA Plants Database** pour leurs données botaniques scientifiques
- La communauté **permaculture** mondiale pour leur inspiration et connaissances partagées
- **David Holmgren** et **Bill Mollison** pour les principes de permaculture
- **Sepp Holzer**, **Geoff Lawton**, **Martin Crawford** pour leurs enseignements sur les forêts comestibles
- Tous les contributeurs passés, présents et futurs
- Le mouvement **open-source** pour rendre la technologie accessible à tous
- La **Terre-Mère** et tous les organismes qui nous nourrissent 🌍💚

---

## 📊 Statut du Projet

**Phase actuelle** : Développement actif (Alpha) - Niveau 1 en construction

Le projet est en reconstruction active depuis février 2026, basé sur des expérimentations antérieures (2017) avec jardinage hydroponique et capteurs IoT sur balcon.

### Historique

- **2017** : Premiers prototypes IoT pour jardin hydroponique urbain (capteurs, pompes automatiques, contrôle Arduino)
- **2026** : Relance complète avec vision permaculture, architecture Django moderne, focus forêt comestible

### Roadmap 2026-2028

- **Q1 2026** (Hiver) : Niveau 1 - Fondations (Organism, Relations, Amendements, Specimens)
- **Q2 2026** (Printemps) : Niveau 1 finalisé + début Niveau 2 (Guildes, Zones)
- **Q3 2026** (Été) : Niveau 2 complet, tests terrain aux Jardins du Mont Caprice
- **Q4 2026** (Automne) : Niveau 3 (Succession, Calendriers), API REST, début mobile
- **2027** : Niveaux 4-5 (Faune, IoT, IA)
- **2028** : Niveau 6 (Communauté, réseau social permacole)

**Mise à jour :** Février 2026 - Modèle Organism créé, architecture de base en place, gestion des semences (SeedCollection, import catalogues), jardins et météo (Open-Meteo : températures, pluie, neige, ET0, géocodage, alertes arrosage, zones sprinkler)

---

## 💚 Philosophie du Projet

**Jardin bIOT** croit fermement que :

1. **La souveraineté alimentaire** est un droit fondamental et une nécessité de résilience
2. **La biodiversité** n'est pas optionnelle - c'est la base de la vie
3. **La technologie** doit servir la nature et les humains, pas les dominer
4. **Le partage de connaissances** enrichit toute la communauté - pas de secrets commerciaux sur comment nourrir les gens
5. **L'open-source** est essentiel pour des outils durables, équitables et inspectables
6. **La permaculture** et les forêts comestibles sont une réponse concrète aux crises climatique et alimentaire
7. **Chaque jardin** est unique - pas de solutions universelles, mais des principes adaptables
8. **La nature** est la meilleure enseignante - observons-la et imitons-la

---

## 🌱 Cultivons ensemble l'avenir!

Si vous croyez en l'importance des forêts comestibles, de la permaculture, de la biodiversité et de l'accès libre aux outils pour cultiver notre nourriture, **rejoignez-nous!**

⭐ **Star** ce projet pour montrer votre intérêt  
👁️ **Watch** pour suivre les développements  
🍴 **Fork** pour contribuer  
💬 **Discutez** de vos idées dans les Discussions  
🌳 **Partagez** vos expériences de terrain

---

*"Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment est maintenant."* - Proverbe chinois

*"Observez, n'intervenez pas. Travaillez avec la nature, pas contre elle."* - Bill Mollison

**Codons pour un avenir nourricier, résilient et vivant! 🌍🌳🍄💻**

---

**Note :** Ce projet est développé avec passion par un permaculteur qui code, pour des permaculteurs qui jardinent. Le code peut avoir des bugs, mais la vision est claire : des outils libres pour nourrir le monde. 🌱
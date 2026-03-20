# Analyse comparative : Tisanji, GrowVeg, Gardenize, Planta vs BIOT

> Document produit le 2026-03-19.
> Complément de [analyse-openfarm-vs-biot.md](analyse-openfarm-vs-biot.md).
> Objectif : analyser 4 plateformes de jardinage, les comparer a BIOT, identifier les inspirations et produire un backlog produit consolide.

---

## Table des matieres

1. [Tisanji](#1-tisanji)
2. [GrowVeg](#2-growveg)
3. [Gardenize](#3-gardenize)
4. [Planta](#4-planta)
5. [Matrice comparative globale (5 plateformes + BIOT)](#5-matrice-comparative-globale)
6. [Fonctionnalites differenciantes de BIOT](#6-fonctionnalites-differenciantes-de-biot)
7. [Backlog produit consolide](#7-backlog-produit-consolide)

---

## 1. Tisanji

### 1.1 Profil

| Critere | Detail |
|---------|--------|
| **Origine** | Quebec, Canada |
| **Type** | App web (SPA dans navigateur) |
| **Modele economique** | Freemium : gratuit illimite + licences payantes des 4 $/mois |
| **Base de plantes** | ~2 000+ plantes et cultivars (wiki contributif) |
| **Cible** | Jardinier amateur, herboriste, paysagiste, educateur |
| **Open source** | Non |
| **API publique** | Non |
| **Donnees exportables** | Import CSV experimental |
| **Statut** | Actif |

### 1.2 Fonctionnalites principales

- **Planification graphique du jardin** : dessin 2D sur fond Google Maps ou photo aerienne, placement de plantes avec espacement
- **Fiches plantes** : description, culture, usages, proprietes (wiki public), filtrage par zone de rusticite (zones Canada 0a-9b)
- **Calendrier de taches** : genere automatiquement selon le climat local, taches repetitives, partage
- **Journal d'observation** : notes au niveau journal, surface ou plan, transformables en taches
- **Inventaire de plantes** : suivi de ce qui pousse dans le jardin
- **Notes graphiques** : annotations visibles directement sur le plan du jardin
- **Communaute** : groupe Facebook, capsules video integrees, cours prives

### 1.3 Comparatif Tisanji vs BIOT

| Fonctionnalite | Tisanji | BIOT | Verdict |
|---------------|---------|------|---------|
| Planification graphique 2D | Oui (plan dessinable) | Non (vue 3D Cesium prevue, zones GeoJSON) | Tisanji superieur (2D utilisable aujourd'hui) |
| Fiches plantes (description) | Wiki basique (~2000 plantes) | Organism (1700+ HQ + pipeline multi-sources) | BIOT superieur (donnees structurees, multi-sources) |
| Zone de rusticite | Filtrage par zone Canada | JSON multi-sources par organisme + zone jardin | BIOT superieur |
| Calendrier taches/climat | Genere par climat local | OrganismCalendrier + WeatherRecord + Reminder | BIOT superieur (donnees meteo reelles) |
| Journal d'observation | Notes texte + photos | Event (17 types, quantites, conditions, amendment) | BIOT superieur |
| Compagnonnage | Non | CompanionRelation (15 types, force, distance) | BIOT tres superieur |
| Cultivars | Inclus dans base de plantes | Table dediee Cultivar + CultivarPollinator + PorteGreffe | BIOT tres superieur |
| Semences | Non | SeedCollection + SemisBatch | BIOT superieur |
| Amendements | Non | Amendment + OrganismAmendment | BIOT superieur |
| Specimen individuel | Inventaire basique | Specimen (GPS, NFC, cultivar, statut, sante, timeline) | BIOT tres superieur |
| Meteo integration | Non (calendrier theorique) | WeatherRecord + Open-Meteo + alertes | BIOT superieur |
| Vue plan 2D editable | Oui (force principale) | Non (prevu via Cesium 3D) | **Tisanji superieur** |
| Import CSV plantes | Experimental | 10+ commandes d'import | BIOT superieur |
| Prix | Gratuit + 4 $/mois | Self-hosted (gratuit) | Equivalent |

### 1.4 Ce que BIOT devrait s'inspirer de Tisanji

1. **Plan 2D editable simplifie** : avant la vue 3D Cesium, une vue plan 2D legere (placement de specimens sur fond photo/carte) serait un gain UX enorme. Tisanji montre que c'est la fonctionnalite la plus utilisee.

2. **Calendrier de taches genere par climat** : Tisanji genere automatiquement des taches hebdomadaires selon le climat. BIOT a les donnees (OrganismCalendrier + WeatherRecord) mais pas encore la vue "cette semaine, faites X".

3. **Notes graphiques sur plan** : annoter un point sur la carte (photo du jardin ou vue terrain) avec une note liee a un specimen ou un evenement.

### 1.5 Ce que BIOT fait deja mieux

- Base de plantes structuree multi-sources (vs wiki basique)
- Compagnonnage detaille (15 types vs aucun)
- Specimens individuels geolocalises avec NFC
- Pipeline d'import et fusion multi-sources
- Meteo reelle integree
- Cultivars, pollinisation, porte-greffes
- Semences et semis

---

## 2. GrowVeg

### 2.1 Profil

| Critere | Detail |
|---------|--------|
| **Origine** | Royaume-Uni |
| **Type** | App web + mobile |
| **Modele economique** | Abonnement : 35 USD/an (auto-renouvellement), 50 USD (1 an), 85 USD (2 ans) |
| **Base de plantes** | 21 657 varietes de 408 especes (legumes, herbes, fruits, fleurs) |
| **Cible** | Jardinier potagiste |
| **Open source** | Non |
| **API publique** | Non |
| **Donnees exportables** | Plans de jardin uniquement |
| **Statut** | Actif, commercial |

### 2.2 Fonctionnalites principales

- **Planificateur de jardin 2D** : drag-and-drop de plantes, containers, rangees, jardins en carres, photo satellite en fond
- **Calendrier de plantation localise** : 5 000+ stations meteo, dates de gel automatiques, alertes par email
- **Rotation des cultures** : suivi annee apres annee, alertes si meme famille au meme endroit
- **Plantation successive** : vue mois par mois pour maximiser l'espace
- **Compagnonnage** : base sur preuves scientifiques, filtrage multi-criteres
- **Guides de culture** : 408 fiches detaillees avec germination, taille mature, resistance aux maladies
- **Ravageurs et maladies** : identification + solutions biologiques
- **441 videos pratiques** + conseils saisonniers hebdomadaires par experts
- **Journal de jardin** : notes, photos, rappels, tags
- **Support expert** : chat en direct 7j/7

### 2.3 Comparatif GrowVeg vs BIOT

| Fonctionnalite | GrowVeg | BIOT | Verdict |
|---------------|---------|------|---------|
| Base de plantes | 21 657 varietes / 408 especes | 1700+ especes (extensible a 33 000+ via VASCAN) | GrowVeg superieur en varietes, BIOT superieur en extensibilite |
| Planificateur 2D | Oui (drag-and-drop, tres mature) | Non (prevu 3D) | **GrowVeg tres superieur** |
| Calendrier localise | 5 000+ stations, dates de gel | WeatherRecord + Open-Meteo | Approches equivalentes |
| Rotation des cultures | Suivi multi-annees + alertes famille | Non | **GrowVeg superieur** |
| Plantation successive | Vue mois par mois | Non | **GrowVeg superieur** |
| Compagnonnage | Base scientifique, filtrage | CompanionRelation (15 types, force, distance) | BIOT superieur (plus structure) |
| Fiches de culture | Germination, taille, maladies | OrganismCalendrier + OrganismPropriete + description | Comparable, approches differentes |
| Ravageurs et maladies | Identification + solutions bio | Non | **GrowVeg superieur** |
| Journal | Notes, photos, rappels, tags | Event (17 types) + Reminder + Photo | BIOT superieur (plus structure) |
| Specimen individuel | Non (placement sur plan) | Oui (GPS, NFC, cultivar, sante) | BIOT tres superieur |
| Cultivars | 21 657 varietes dans la base | Table Cultivar + pollinisation + porte-greffe | BIOT superieur (pollinisation modelisee) |
| Semences | Non | SeedCollection + SemisBatch | BIOT superieur |
| Amendements | Non | Amendment + OrganismAmendment | BIOT superieur |
| Import multi-sources | Non | 10+ sources + pipeline fusion | BIOT tres superieur |
| Videos/contenu editorial | 441 videos + articles | Non | GrowVeg superieur |
| Meteo | Dates de gel auto | WeatherRecord temps reel + alertes arrosage/gel | BIOT superieur |
| Prix | 35-50 USD/an | Self-hosted gratuit | BIOT superieur |

### 2.4 Ce que BIOT devrait s'inspirer de GrowVeg

1. **Rotation des cultures** : table de suivi annee par annee liant Zone/Specimen + famille botanique + alertes. BIOT a les zones et specimens, il manque le tracking multi-annees et les alertes de famille.

2. **Plantation successive / vue mois par mois** : afficher mois par mois quels espaces du jardin sont libres et suggerer quoi y planter. Derivable de `OrganismCalendrier` + `Specimen.statut`.

3. **Ravageurs et maladies** : base de donnees de problemes phytosanitaires avec identification et solutions biologiques. Identifie comme piste dans le doc BIOT existant (source MAPAQ/Espace pour la vie).

4. **Contenu editorial saisonnier** : conseils hebdomadaires derives des donnees (OrganismCalendrier + WeatherRecord) plutot que rediges manuellement.

### 2.5 Ce que BIOT fait deja mieux

- Specimens individuels avec timeline complete
- Compagnonnage modelise (15 types, distance, force)
- Pipeline multi-sources pour alimenter la base
- Cultivars + pollinisation + porte-greffes
- Semences et semis
- Meteo temps reel + alertes
- Self-hosted et open source (AGPL-3.0)

---

## 3. Gardenize

### 3.1 Profil

| Critere | Detail |
|---------|--------|
| **Origine** | Suede |
| **Type** | App mobile + web |
| **Modele economique** | Freemium : gratuit basique, Basic 1.90 $/mois, Plus 4.40 $/mois (44 $/an) |
| **Base de plantes** | 45 000+ especes |
| **Cible** | Jardinier amateur, collectionneur |
| **Open source** | Non |
| **API publique** | Non |
| **Donnees exportables** | Oui (PDF, tableur, galerie photo) |
| **Statut** | Actif, commercial |

### 3.2 Fonctionnalites principales

- **Identification de plantes par photo** (PlantID)
- **Bibliotheque de plantes personnelle** : fiches illimitees, photos, notes, instructions de soin
- **Zones de jardin** : regroupement par plates-bandes, bacs, bordures
- **Journal de jardin** : evenements (plantation, arrosage, fertilisation, recolte), types personnalisables
- **Calendrier** : vue d'evenements planifies et historiques
- **Rappels intelligents** : arrosage, fertilisation, taille, rempotage (recurrents)
- **Instructions de soin** par zone de rusticite
- **Dessin sur photos** : marquer ou se trouvent les plantes, annoter
- **Export de donnees** : PDF, tableur, galerie photo
- **Communaute** : fil d'inspiration, jardins publics, connexion entre jardiniers
- **GPS** (plan Plus) : position des plantes
- **Filtrage avance** (plan Plus) : quelles plantes ou, quand, quoi fait

### 3.3 Comparatif Gardenize vs BIOT

| Fonctionnalite | Gardenize | BIOT | Verdict |
|---------------|-----------|------|---------|
| Base de plantes | 45 000+ especes | 1700+ (extensible 33 000+ VASCAN) | Gardenize superieur en volume brut |
| Identification par photo | Oui (PlantID) | Non | **Gardenize superieur** |
| Bibliotheque personnelle | Fiches plantes personnelles | Organism + OrganismNom + data_sources | BIOT superieur (multi-sources structurees) |
| Zones de jardin | Nommees (texte) | Zone (GeoJSON polygon, surface m2, types, couleur) | BIOT tres superieur |
| Journal evenements | Types personnalisables | Event (17 types structures, quantites, amendment) | BIOT superieur |
| Calendrier | Vue historique + planifie | OrganismCalendrier + Reminder | Comparable |
| Rappels | Arrosage, fertilisation, taille, rempotage | Reminder (5 types, recurrence) | Comparable |
| Instructions de soin/zone | Par zone de rusticite | OrganismPropriete + besoin_soleil/eau/sol par source | BIOT superieur (par source) |
| Dessin sur photos | Oui (annotation visuelle) | Non | **Gardenize superieur** |
| Export | PDF, tableur, galerie | Non (prevu) | **Gardenize superieur** |
| Communaute | Fil inspiration, jardins publics | Non | Gardenize superieur |
| GPS plantes | Oui (plan Plus) | Oui (latitude/longitude sur Specimen) | Comparable |
| Compagnonnage | Non | CompanionRelation (15 types) | BIOT tres superieur |
| Cultivars/pollinisation | Non | Cultivar + CultivarPollinator + PorteGreffe | BIOT tres superieur |
| Semences | Non | SeedCollection + SemisBatch | BIOT superieur |
| Meteo | Non | WeatherRecord + alertes | BIOT superieur |
| Import multi-sources | Non | 10+ sources | BIOT tres superieur |
| NFC/QR code | Non | nfc_tag_uid + code_identification | BIOT superieur |
| Prix | 0-44 $/an | Self-hosted gratuit | BIOT superieur |

### 3.4 Ce que BIOT devrait s'inspirer de Gardenize

1. **Identification de plantes par photo (AI)** : snap photo → identification espece → creation de fiche. Fonctionnalite a forte valeur UX pour l'app mobile BIOT. APIs tierces disponibles (PlantNet, Plant.id).

2. **Annotation sur photos** : dessiner sur une photo de specimen pour montrer ou tailler, quoi observer, localiser un probleme. Utile pour le suivi de sante.

3. **Export PDF / tableur** : generer un rapport de jardin, un inventaire de specimens, un calendrier imprimable. Fonctionnalite identifiee comme prevue dans BIOT.

4. **Communaute / jardins publics** : partager son jardin en mode lecture. Prevu dans BIOT Niveau 6 (2028+).

### 3.5 Ce que BIOT fait deja mieux

- Zones de jardin avec GeoJSON et surface calculee
- Compagnonnage detaille
- Cultivars, pollinisation, porte-greffes
- Semences et semis
- Meteo integree
- NFC/QR code sur specimens
- Pipeline multi-sources
- Evenements structures (17 types vs types libres)

---

## 4. Planta

### 4.1 Profil

| Critere | Detail |
|---------|--------|
| **Origine** | Suede |
| **Type** | App mobile native (iOS + Android) |
| **Modele economique** | Freemium : gratuit basique, Premium ~7.50 USD/mois |
| **Base de plantes** | 25 000+ especes (dont cultivars) |
| **Utilisateurs** | 7+ millions |
| **Cible** | Proprietaire de plantes d'interieur (principalement) |
| **Open source** | Non |
| **API publique** | Non |
| **Donnees exportables** | Non |
| **Statut** | Actif, commercial, forte croissance |

### 4.2 Fonctionnalites principales

- **Identification AI par photo** : scan instantane + plan de soin personnalise
- **Algorithme d'arrosage intelligent** : 30+ parametres (espece, pot, sol, lumiere, meteo locale, saison, temperature, humidite, chauffage/clim)
- **Rappels intelligents** : arrosage, fertilisation, brumisation, rempotage, nettoyage, taille
- **Dr. Planta** : diagnostic de maladies par photo (feuilles jaunes, taches, parasites) + plan de traitement
- **Capteur de lumiere** (Light Meter) : mesure des conditions lumineuses en temps reel
- **Journal de plantes** : suivi de croissance, historique de soins
- **Care Share** : partage de calendrier de soins avec famille/amis
- **Integration meteo** : ajustement dynamique des soins selon conditions locales
- **Toxicite** : alertes si plante toxique pour enfants ou animaux

### 4.3 Comparatif Planta vs BIOT

| Fonctionnalite | Planta | BIOT | Verdict |
|---------------|--------|------|---------|
| Base de plantes | 25 000+ especes | 1700+ (extensible 33 000+) | Planta superieur en volume brut |
| Identification AI | Oui (excellente UX) | Non | **Planta tres superieur** |
| Algorithme arrosage | 30+ parametres, dynamique | Alertes basees sur WeatherRecord + seuils | **Planta tres superieur** |
| Diagnostic maladies AI | Dr. Planta (photo → traitement) | Non | **Planta tres superieur** |
| Capteur lumiere | Light Meter (camera) | Non | **Planta superieur** |
| Rappels soins | 6 types, dynamiques selon meteo | Reminder (5 types, recurrence fixe) | Planta superieur (dynamiques) |
| Journal | Suivi croissance + soins | Event (17 types, quantites, conditions) | BIOT superieur (plus structure) |
| Compagnonnage | Non | CompanionRelation (15 types) | BIOT tres superieur |
| Cultivars/pollinisation | Non | Cultivar + CultivarPollinator + PorteGreffe | BIOT tres superieur |
| Plantes exterieures/potager | Support basique | Specialise (specimens, zones, fruitiers) | BIOT tres superieur |
| Semences | Non | SeedCollection + SemisBatch | BIOT superieur |
| Amendements | Non | Amendment + OrganismAmendment | BIOT superieur |
| Meteo | Integree (ajustement dynamique) | WeatherRecord + Open-Meteo + alertes | Comparable |
| Import multi-sources | Non | 10+ sources | BIOT tres superieur |
| Toxicite | Alertes proactives | Champ `toxicite` (texte) | Planta superieur (UX) |
| NFC/specimens | Non | nfc_tag_uid + GPS + statut + sante | BIOT superieur |
| Cible | Plantes d'interieur | Jardin exterieur / permaculture / fruitiers | Marches differents |
| Prix | ~7.50 USD/mois (~90 USD/an) | Self-hosted gratuit | BIOT superieur |

### 4.4 Ce que BIOT devrait s'inspirer de Planta

1. **Identification AI par photo** : meme inspiration que Gardenize, mais Planta va plus loin avec un plan de soin automatique post-identification. A integrer dans le flow "ajouter un specimen" de l'app mobile.

2. **Rappels dynamiques bases sur la meteo** : BIOT a deja WeatherRecord + alertes seuil, mais les rappels de soins (arrosage, protection gel) pourraient etre automatiquement ajustes. Exemple : si T > seuil_temp_chaud_c pendant N jours ET pluie < seuil_pluie_faible_mm → creer automatiquement un rappel arrosage pour les specimens concernes.

3. **Diagnostic de maladies par photo (AI)** : snap une feuille → identification du probleme + suggestions de traitement. Forte valeur pour le suivi de sante des specimens. APIs tierces existantes (PlantNet diagnosis, Kindwise).

4. **Alertes toxicite proactives** : BIOT a le champ `toxicite`, mais pas d'alerte UX active (ex: banniere rouge sur la fiche si toxique pour animaux/enfants).

5. **Light Meter (capteur lumiere mobile)** : utiliser la camera du telephone pour mesurer les conditions lumineuses d'un emplacement et les comparer au `besoin_soleil` de l'organisme.

### 4.5 Ce que BIOT fait deja mieux

- Jardin exterieur / permaculture / fruitiers (vs interieur)
- Compagnonnage modelise
- Cultivars, pollinisation, porte-greffes
- Semences et semis
- Amendements et recommandations sol
- Pipeline multi-sources
- Specimens geolocalises avec NFC et timeline
- Evenements structures (17 types)
- Zones GeoJSON avec surface calculee

---

## 5. Matrice comparative globale

### 5.1 Couverture fonctionnelle (toutes plateformes)

| Fonctionnalite | OpenFarm | Tisanji | GrowVeg | Gardenize | Planta | **BIOT** |
|---------------|----------|---------|---------|-----------|--------|----------|
| **Base plantes structuree** | Faible | Basique | Bonne (21K var.) | Bonne (45K) | Bonne (25K) | **Bonne** (multi-sources, extensible 33K+) |
| **Fiches detaillees** | Basique | Wiki | Expertes | Basiques | Bonnes (soins) | **Bonnes** (structurees, multi-sources) |
| **Planificateur 2D** | Non | **Oui** | **Oui (ref.)** | Non | Non | Non |
| **Vue 3D terrain** | Non | Non | Non | Non | Non | **Prevu (Cesium)** |
| **Identification AI** | Non | Non | Non | **Oui** | **Oui (ref.)** | Non |
| **Diagnostic maladies AI** | Non | Non | Non | Non | **Oui (ref.)** | Non |
| **Compagnonnage** | Basique | Non | Bon | Non | Non | **Excellent** (15 types, force, distance) |
| **Cultivars + pollinisation** | Non | Non | Non | Non | Non | **Oui (ref.)** |
| **Porte-greffes** | Non | Non | Non | Non | Non | **Oui (unique)** |
| **Specimen individuel** | Non | Basique | Non | Oui (GPS) | Non | **Oui (ref.)** (GPS, NFC, sante, statut) |
| **Journal/evenements** | Non | Basique | Bon | Bon | Basique | **Excellent** (17 types structures) |
| **Semences + semis** | Non | Non | Non | Non | Non | **Oui (unique)** |
| **Amendements** | Non | Non | Non | Non | Non | **Oui (unique)** |
| **Meteo integree** | Non | Non | Dates gel | Non | **Oui** (dynamique) | **Oui** (WeatherRecord + alertes) |
| **Rotation cultures** | Non | Non | **Oui (ref.)** | Non | Non | Non |
| **Ravageurs/maladies DB** | Non | Non | **Oui** | Non | AI seul. | Non |
| **Rappels dynamiques** | Non | Basique | Basique | Oui | **Oui (ref.)** (30 params) | Oui (recurrence fixe) |
| **Calendrier localise** | Non | Oui | **Oui (ref.)** | Oui | Oui | Oui (OrganismCalendrier + WeatherRecord) |
| **Export PDF/tableur** | Non | Non | Non | **Oui** | Non | Prevu |
| **NFC/QR code** | Non | Non | Non | Non | Non | **Oui (unique)** |
| **Multi-sources import** | Basique | Non | Non | Non | Non | **Oui (ref.)** (10+ sources) |
| **Open source** | Oui (archive) | Non | Non | Non | Non | **Oui** (AGPL-3.0) |
| **Guide de culture (etapes)** | **Oui (ref.)** | Non | **Oui** | Non | Non | Non (prevu) |
| **Score compatibilite** | **Oui** | Non | Non | Non | Non | Non (prevu) |
| **Communaute** | Oui (archive) | Facebook | Non | Oui | Oui | Prevu (Niveau 6) |
| **Light Meter** | Non | Non | Non | Non | **Oui (unique)** | Non |
| **Videos/contenu** | Non | Capsules | **441 videos** | Fil inspiration | Non | Non |

Legende : **(ref.)** = reference du marche sur ce point, **Oui** = present, **Prevu** = dans la roadmap BIOT.

### 5.2 Positionnement unique de chaque plateforme

| Plateforme | Niche / force | Faiblesse principale |
|-----------|--------------|---------------------|
| **OpenFarm** | Guide de culture communautaire par etapes | Mort, donnees degradees |
| **Tisanji** | Plan 2D editable, calendrier climat Quebec | Base de plantes petite, pas de compagnonnage |
| **GrowVeg** | Planificateur potager complet, rotation, 21K varietes | Pas de specimens individuels, pas de semences |
| **Gardenize** | Journal photos, identification AI, 45K especes | Pas de compagnonnage, pas de meteo, pas de semences |
| **Planta** | Soins intelligents AI (arrosage 30 params, diagnostic), 7M users | Oriente interieur, pas de potager/permaculture |
| **BIOT** | Permaculture, compagnonnage, pollinisation, semences, NFC, multi-sources | Pas de planificateur 2D, pas d'AI, pas de rotation |

---

## 6. Fonctionnalites differenciantes de BIOT

Ces fonctionnalites ne sont presentes dans **aucune** des 5 plateformes analysees :

| # | Fonctionnalite unique BIOT | Detail |
|---|---------------------------|--------|
| 1 | **Compagnonnage modelise (15 types)** | Relations typees (allelopathie, mycorhize, coupe-vent, fixateur azote, competition…) avec force et distance optimale. Aucun concurrent ne va au-dela d'un simple "bon/mauvais voisin". |
| 2 | **Pollinisation modelisee** | CultivarPollinator + SpecimenGroup + distance pollinisation + alertes "trop loin". Unique sur le marche. |
| 3 | **Porte-greffes** | CultivarPorteGreffe (vigueur, hauteur, disponibilite par source). N'existe nulle part ailleurs. |
| 4 | **Gestion de semences + semis** | SeedCollection (stratification, germination, viabilite) + SemisBatch (taux reel, plants obtenus). Absent de toutes les plateformes. |
| 5 | **Amendements recommandes par espece** | Amendment (NPK, effet pH) + OrganismAmendment (priorite, dose specifique). Absent partout. |
| 6 | **Tags NFC sur specimens** | Scan physique → fiche specimen. Aucun concurrent. |
| 7 | **Pipeline import multi-sources (10+)** | Fusion normalisation VASCAN/USDA/HQ/PFAF/etc. avec cle de liaison. Aucune plateforme ne fait d'agregation de sources ouvertes. |
| 8 | **Meteo temps reel + alertes d'arrosage automatiques** | WeatherRecord + seuils configurables + SprinklerZone. GrowVeg et Planta ont de la meteo, mais pas d'automatisation arrosage. |
| 9 | **Vue terrain 3D (prevue)** | Cesium Ion, GeoJSON boundary, contours, GCP drone. Unique si realise. |
| 10 | **Open source permaculture** | AGPL-3.0 : seul outil open source couvrant permaculture + fruitiers + semences + compagnonnage. |

---

## 7. Backlog produit consolide

Ce backlog integre les inspirations de toutes les plateformes analysees (OpenFarm + Tisanji + GrowVeg + Gardenize + Planta) et les priorise pour BIOT.

### Lot A — Fonctionnalites manquantes a forte valeur (inspire par le marche)

| # | Fonctionnalite | Inspiree de | Priorite | Effort | Notes |
|---|---------------|------------|----------|--------|-------|
| A.1 | **Vue plan 2D simple** : placement de specimens sur fond carte/photo, avec espacement | Tisanji, GrowVeg | Haute | Eleve | Premiere etape avant 3D Cesium ; valeur UX immediate |
| A.2 | **Score compatibilite Organism x Garden** | OpenFarm | Haute | Eleve | Croisement sol/lumiere/zone/eau ; deja les donnees |
| A.3 | **Guide de culture derive (etapes de vie)** | OpenFarm, GrowVeg | Haute | Eleve | Generer depuis OrganismCalendrier + OrganismPropriete |
| A.4 | **Rappels dynamiques bases sur meteo** | Planta | Haute | Moyen | WeatherRecord + seuils → rappels arrosage auto |
| A.5 | **Rotation des cultures** : suivi famille x zone x annee + alertes | GrowVeg | Haute | Moyen | Ajouter famille sur Specimen/Zone, tracker par annee |
| A.6 | **Identification AI par photo** : snap → espece → plan de soin | Planta, Gardenize | Moyenne | Moyen | API tierce (PlantNet, Plant.id) dans l'app mobile |
| A.7 | **Diagnostic maladies par photo** | Planta | Moyenne | Moyen | API tierce (Kindwise, PlantNet) ; lier a Event type maladie |
| A.8 | **Ravageurs et maladies (base de donnees)** | GrowVeg | Moyenne | Eleve | Source MAPAQ / Espace pour la vie ; nouvelle table |
| A.9 | **Export PDF / tableur** | Gardenize | Moyenne | Moyen | Inventaire specimens, calendrier, fiches |
| A.10 | **Alertes toxicite proactives** | Planta | Moyenne | Faible | Banniere UX si `toxicite` non vide ; ajout flag `toxique_animaux` |
| A.11 | **Actions suggerees par saison** | OpenFarm, GrowVeg | Moyenne | Eleve | "Ce mois-ci" derive de OrganismCalendrier + WeatherRecord |
| A.12 | **Plantation successive** : vue mois par mois des espaces libres | GrowVeg | Basse | Moyen | Necessite plan 2D (A.1) |
| A.13 | **Light Meter** (capteur lumiere camera) | Planta | Basse | Moyen | Comparer mesure vs besoin_soleil de l'organisme |
| A.14 | **Annotation sur photos** | Gardenize | Basse | Faible | Dessin sur photo specimen/event |

### Lot B — Enrichissement des fiches espece (inspire analyse OpenFarm + comparatifs)

Repris de l'analyse OpenFarm, confirme par l'analyse des concurrents.

| # | Amelioration | Confirme par | Priorite | Effort |
|---|-------------|-------------|----------|--------|
| B.1 | Structurer **description feuilles** | GrowVeg (fiches experts) | Haute | Moyen |
| B.2 | Structurer **description fleurs** | GrowVeg, Gardenize | Haute | Moyen |
| B.3 | Structurer **description fruits** | GrowVeg | Haute | Moyen |
| B.4 | `port_silhouette` (enum) | Tisanji (fiches wiki) | Haute | Faible |
| B.5 | Bloc **multiplication** (bouture, semis, greffe, marcottage, division) | GrowVeg (guides), Tisanji | Haute | Moyen |
| B.6 | Bloc **entretien** (taille, protection hivernale, frequence) | GrowVeg, Planta | Haute | Moyen |
| B.7 | `methode_semis` (enum) | OpenFarm, GrowVeg | Moyenne | Faible |
| B.8 | `jours_maturite` (int) | OpenFarm, GrowVeg | Moyenne | Faible |
| B.9 | `espacement_rang_cm` + `espacement_plant_cm` | OpenFarm, GrowVeg, Tisanji | Moyenne | Faible |
| B.10 | `precautions` (texte, distinct de `toxicite`) | Planta (alertes), GrowVeg | Moyenne | Faible |
| B.11 | `pratiques_recommandees` (JSON : bio, permaculture…) | OpenFarm | Basse | Faible |
| B.12 | `degres_jours_croissance` (int) | OpenFarm | Basse | Faible |

### Lot C — Pipeline et referentiels

| # | Amelioration | Inspire de | Priorite | Effort |
|---|-------------|-----------|----------|--------|
| C.1 | Vocabulaire controle d'actions culturales | OpenFarm (StageActionOption) | Moyenne | Faible |
| C.2 | Enrichir `Event.TYPE_CHOICES` (stratification, greffe, tuteur, biocontrole…) | OpenFarm | Moyenne | Faible |
| C.3 | Table **Ravageur/Maladie** (nom, symptomes, solutions bio, especes touchees) | GrowVeg | Moyenne | Eleve |
| C.4 | Table **RotationLog** (zone, famille, annee, organisme) | GrowVeg | Haute | Moyen |

### Priorisation consolidee

```
PRIORITE HAUTE (printemps-ete 2026) :
  A.1  Vue plan 2D simple (Tisanji, GrowVeg)
  A.2  Score compatibilite Organism x Garden (OpenFarm)
  A.3  Guide de culture derive (OpenFarm, GrowVeg)
  A.4  Rappels dynamiques meteo (Planta)
  A.5  Rotation des cultures (GrowVeg)
  B.1-B.6  Structuration fiches (feuilles, fleurs, fruits, port, multiplication, entretien)
  C.4  Table RotationLog

PRIORITE MOYENNE (ete-automne 2026) :
  A.6  Identification AI par photo (Planta, Gardenize)
  A.7  Diagnostic maladies AI (Planta)
  A.8  Ravageurs et maladies DB (GrowVeg)
  A.9  Export PDF/tableur (Gardenize)
  A.10 Alertes toxicite (Planta)
  A.11 Actions suggerees par saison (OpenFarm, GrowVeg)
  B.7-B.10  Champs complementaires (semis, maturite, espacement, precautions)
  C.1-C.3  Referentiels actions + ravageurs

PRIORITE BASSE (2027+) :
  A.12 Plantation successive (GrowVeg)
  A.13 Light Meter (Planta)
  A.14 Annotation photos (Gardenize)
  B.11-B.12  Champs basse priorite
```

---

## Resume executif

### Position de BIOT sur le marche

BIOT occupe une niche unique : **outil open source de permaculture et gestion de verger** avec une modelisation ecologique sans equivalent (compagnonnage 15 types, pollinisation modelisee, porte-greffes, semences, amendements, NFC). Aucune des 5 plateformes analysees ne couvre cette combinaison.

### Axes de progression (inspires du marche)

1. **Planification visuelle** (Tisanji, GrowVeg) : la vue plan 2D est la fonctionnalite la plus demandee sur le marche. Priorite haute avant la 3D.
2. **Intelligence AI** (Planta, Gardenize) : identification de plantes et diagnostic de maladies par photo. Forte valeur UX mobile.
3. **Rotation et succession** (GrowVeg) : suivi agronomique multi-annees. Coherent avec la vision permaculture de BIOT.
4. **Rappels intelligents** (Planta) : passer de rappels a recurrence fixe a des rappels dynamiques bases sur la meteo reelle.

### Forces a proteger

Ne pas diluer les differenciateurs BIOT (compagnonnage, pollinisation, semences, amendements, NFC, multi-sources) en cherchant a copier les concurrents. Ces fonctionnalites sont uniques et constituent le positionnement permaculture de BIOT.

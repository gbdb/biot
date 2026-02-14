# 🌱 Jardin bIOT v2

> **Plateforme open-source pour la gestion intelligente de jardins nourriciers et permaculture**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.0+-092E20.svg)](https://www.djangoproject.com/)
[![Status](https://img.shields.io/badge/Status-En%20D%C3%A9veloppement-yellow.svg)]()

**Jardin bIOT** = **b**oulay + b**IO**logique + **IOT** (Internet of Things)

Gérez votre jardin comestible, suivez vos cultures, partagez vos connaissances et cultivez la résilience alimentaire locale.

---

## 🎯 Vision du Projet

Dans un contexte de changements climatiques et de souveraineté alimentaire, **Jardin bIOT** vise à démocratiser l'accès à des outils technologiques pour optimiser la culture de jardins nourriciers. Que vous soyez permaculteur amateur, jardinier urbain ou membre d'un jardin communautaire, cette plateforme vous aide à :

- 📊 **Suivre** vos espèces et spécimens avec précision
- 📸 **Documenter** la croissance et l'évolution de vos plantes
- 🏷️ **Identifier** chaque plant avec tags RFID
- 📅 **Logger** tous vos événements (plantation, arrosage, taille, récolte)
- 🤝 **Partager** vos expériences avec une communauté de jardiniers
- 🌍 **Collaborer** sur une base de connaissances locale et adaptée au climat

---

## 🌟 Fonctionnalités Principales

### Version Actuelle (En Développement)

- [ ] **Gestion d'espèces** - Catalogue d'espèces comestibles avec données riches (besoins, calendrier, compagnonnage)
- [ ] **Suivi de spécimens** - Chaque plant individuel avec historique complet
- [ ] **Timeline d'événements** - Journal de bord par spécimen (plantation, soins, observations)
- [ ] **Upload de photos** - Documentation visuelle de l'évolution
- [ ] **Import de données** - Intégration automatique depuis plusieurs sources ouvertes (planifiée - voir section Sources de Données)
- [ ] **Interface responsive** - Optimisée mobile pour utilisation au jardin

### Roadmap Future

- [ ] **Tags RFID** - Scan rapide pour logger événements sur le terrain
- [ ] **Progressive Web App (PWA)** - Installable sur mobile, mode offline
- [ ] **API REST** - Intégration avec Home Assistant et autres systèmes domotiques
- [ ] **Multi-utilisateurs** - Partage de jardins, permissions granulaires
- [ ] **Communauté** - Partage de fiches, symptômes, solutions, success stories
- [ ] **Base de connaissances collaborative** - Wiki de maladies, parasites, remèdes
- [ ] **Capteurs IoT** - Intégration humidité sol, température, ensoleillement
- [ ] **Calendrier intelligent** - Rappels basés sur zone climatique et espèce

---

## 📚 Sources de Données Ouvertes

**Jardin bIOT** a pour plan d'intégrer plusieurs bases de données ouvertes afin d'offrir un catalogue riche et diversifié d'espèces comestibles, adaptées au climat québécois et aux principes de permaculture. Ces intégrations seront développées progressivement au cours du projet.

### Sources Principales Planifiées

**1. Hydro-Québec - Répertoire des arbres et arbustes** 🍁
- **Licence** : [Creative Commons CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Contenu** : 1700+ espèces d'arbres et arbustes adaptés au climat québécois
- **Données** : Zone de rusticité, besoins (lumière, sol, humidité), distances de plantation, hauteur/largeur à maturité
- **API** : REST gratuite et publique ([documentation](https://donnees.hydroquebec.com/explore/dataset/repertoire-arbres/))
- **Statut** : ✅ Licence vérifiée, utilisation légale confirmée
- **Utilité** : Base primaire pour arbres fruitiers et arbustes comestibles du Québec

**2. Plants For A Future (PFAF)** 🌿
- **Licence** : Données gratuites, projet fonctionnant sur dons
- **Site** : [pfaf.org](https://pfaf.org)
- **Contenu** : 7000+ plantes comestibles, médicinales et utilitaires
- **Données** : Usages comestibles/médicinaux, zones climatiques, habitat, méthodes de culture
- **Statut** : 📋 Intégration planifiée
- **Utilité** : Plantes comestibles sauvages, permaculture, plantes vivaces et moins connues

**3. OpenFarm** 🥬
- **Licence** : Domaine public (CC0) - totalement libre
- **Données** : Disponibles sur [GitHub](https://github.com/openfarmcc/OpenFarm)
- **Contenu** : Guides de culture pour légumes et plantes potagères
- **Données** : Calendriers de plantation/récolte, conditions de croissance, expériences communautaires
- **Statut** : 📋 Intégration planifiée
- **Utilité** : Cultures maraîchères annuelles, légumes du potager

**4. USDA Plants Database** 🔬
- **Licence** : Domaine public (US Government)
- **API** : [plantsdb.xyz](https://plantsdb.xyz)
- **Contenu** : Caractéristiques botaniques détaillées, traits biologiques, cycle de vie
- **Données** : Taxonomie scientifique validée, distribution géographique native
- **Statut** : 📋 Intégration planifiée
- **Utilité** : Validation scientifique, données botaniques de référence, nomenclature standardisée

### Stratégie d'Intégration

L'architecture de données de Jardin bIOT est conçue pour agréger intelligemment plusieurs sources :

- **Priorité géographique** : Hydro-Québec pour espèces locales québécoises, PFAF pour permaculture globale
- **Champs flexibles (JSONField)** : Stocker les données de chaque source sans perte d'information
- **Validation croisée** : Confirmer et enrichir les informations entre plusieurs sources
- **Attribution claire** : Chaque fiche d'espèce identifie et crédite ses sources de données
- **Enrichissement communautaire** : Les utilisateurs pourront contribuer observations locales et retours d'expérience

### Conformité Légale et Attribution

**Jardin bIOT** s'engage à respecter scrupuleusement les licences de toutes les sources de données :

- ✅ **Attribution systématique** : Chaque source sera créditée sur les fiches d'espèces
- ✅ **Respect des conditions spécifiques** : 
  - Pour Hydro-Québec : Affichage des distances de plantation avec lien vers leur [guide de mesure](https://www.hydroquebec.com/safety/distribution-lines/how-measure-safe-planting-distance.html)
- ✅ **Licences ouvertes** : Seules des sources à licences permissives (CC-BY, CC0, domaine public) seront utilisées
- ✅ **Transparence** : La provenance de chaque donnée sera traçable et visible

---

## 🏗️ Architecture Technique

### Stack Technologique

- **Backend** : Django 5.0+ (Python 3.11+)
- **Base de données** : PostgreSQL 15+
- **Frontend** : Django Templates + Bootstrap/Tailwind CSS
- **API** : Django REST Framework (à venir)
- **Déploiement** : Docker + Docker Compose
- **Infrastructure** : Auto-hébergeable (Proxmox, serveur local) ou cloud

### Modèle de Données Principal

```
Species (Espèce)
├─ Nom scientifique / commun
├─ Famille botanique
├─ Besoins (eau, soleil, sol, température)
├─ Calendrier (plantation, récolte)
└─ Données externes (JSON flexible)

Specimen (Plant individuel)
├─ Référence vers Species
├─ ID RFID unique
├─ Emplacement (zone du jardin)
├─ Date de plantation
├─ Photos
└─ Statut de santé

Event (Événement)
├─ Référence vers Specimen
├─ Type (arrosage, taille, fertilisation, observation, maladie, récolte)
├─ Date/heure
├─ Notes
├─ Photos
└─ Données capteurs (optionnel)

Garden Zone (Zone de jardin)
├─ Caractéristiques (ensoleillement, type de sol, pH)
└─ Spécimens présents
```

---

## 🚀 Installation

### Prérequis

- Python 3.11 ou supérieur
- PostgreSQL 15+ (ou Docker)
- Git

### Installation Locale (Développement)

```bash
# Cloner le repository
git clone https://github.com/[ton-username]/jardinbiot.git
cd jardinbiot

# Créer un environnement virtuel
python -m venv venv
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

### Installation avec Docker (Production)

```bash
# Cloner le repository
git clone https://github.com/[ton-username]/jardinbiot.git
cd jardinbiot

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

*(À venir)*

- Guide d'utilisation
- Guide de contribution
- Documentation API
- Guide de déploiement complet

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
- ✨ Nouvelles fonctionnalités
- 📝 Documentation
- 🌍 Traductions (anglais, espagnol, autres langues)
- 🎨 Améliorations UI/UX
- 🌱 Données d'espèces (ajout de plantes comestibles)
- 🧪 Tests et qualité du code

### Code de Conduite

Ce projet adhère à un code de conduite respectueux et inclusif. En participant, vous vous engagez à maintenir un environnement accueillant pour tous.

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

---

## 🌍 Communauté & Support

- **Discussions** : [GitHub Discussions](https://github.com/[ton-username]/jardinbiot/discussions)
- **Issues** : [GitHub Issues](https://github.com/[ton-username]/jardinbiot/issues)
- **Discord** : *(à venir)*
- **Email** : [ton-email]

---

## 🙏 Remerciements

- **Hydro-Québec** pour leurs données ouvertes (CC-BY 4.0) sur les arbres et arbustes adaptés au climat québécois
- **Plants For A Future (PFAF)** pour leur travail colossal de documentation des plantes comestibles
- **OpenFarm** pour leur base de données communautaire de cultures potagères
- **USDA Plants Database** pour leurs données botaniques scientifiques
- La communauté **permaculture** pour leur inspiration et leurs connaissances
- Tous les contributeurs passés et futurs
- Le mouvement **open-source** pour rendre la technologie accessible à tous

---

## 📊 Statut du Projet

**Phase actuelle** : Développement actif (Alpha)

Le projet est en reconstruction active depuis février 2026, basé sur des expérimentations antérieures (2017) avec jardinage hydroponique et capteurs IoT.

### Historique

- **2017** : Premiers prototypes IoT pour jardin hydroponique (capteurs, pompes automatiques)
- **2026** : Relance complète avec architecture Django moderne et vision communautaire

### Roadmap 2026

- **Q1 2026** (Hiver) : Architecture de base, modèles de données, Django setup
- **Q2 2026** (Printemps) : Interface web fonctionnelle, import de données
- **Q3 2026** (Été) : Tests réels au jardin, itérations UX, API REST
- **Q4 2026** (Automne) : Multi-utilisateurs, fonctionnalités communautaires, RFID

---

## 💚 Philosophie du Projet

**Jardin bIOT** croit que :

1. **La souveraineté alimentaire** est un droit fondamental
2. **La technologie** doit servir la nature, pas la dominer
3. **Le partage de connaissances** enrichit toute la communauté
4. **L'open-source** est essentiel pour des outils durables et équitables
5. **La permaculture** et le jardinage nourricier contribuent à la résilience climatique

---

## 🌱 Cultivons ensemble!

Si vous croyez en l'importance des jardins nourriciers, de la permaculture et de l'accès libre aux outils technologiques pour tous, **rejoignez-nous!**

⭐ **Star** ce projet si il vous intéresse  
👁️ **Watch** pour suivre les développements  
🍴 **Fork** pour contribuer  
💬 **Discutez** de vos idées dans les Discussions

---

*"Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment est maintenant."* - Proverbe chinois

**Codons pour un avenir nourricier et résilient! 🌍🌱💻**

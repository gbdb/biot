# Moteur de recherche et filtres — espèces et spécimens

## 1. Introduction

Ce document décrit le **contexte** (jardin, espèce, spécimen), les **méthodes de création de spécimen**, l’**état actuel** de la recherche et des filtres dans l’application, et la **vision « filtres sur stéroïdes »** pour faciliter la recherche et le filtrage d’une espèce à l’ajout au jardin.

Objectifs principaux :

- Faciliter le filtre et la recherche d’une espèce au moment d’ajouter au jardin (ex. l’utilisateur tape « mélèze larcin » après un achat en pépinière).
- Poser les bases pour des évolutions UX/API (modal de choix d’espèce enrichi, composant de recherche partagé, cohérence avec la bibliothèque d’espèces).

---

## 2. Contexte : jardin, espèce, spécimen

- **Avoir un jardin** : prérequis pour un usage cohérent. Les onglets Espèces et Spécimens sont filtrés par jardin par défaut. Un jardin peut être créé depuis l’onglet Jardins ou depuis les paramètres.

- **« Ajouter une espèce au jardin »** = **créer un spécimen**. Le spécimen lie une espèce (organisme), optionnellement un cultivar, à un jardin (et une zone, un nom, etc.). Il n’existe pas de notion « espèce dans le jardin » sans au moins un spécimen.

- Enchaînement logique : **Jardin → (choisir ou créer une espèce) → Créer un spécimen** (espèce + jardin + nom, zone, tag NFC optionnel, etc.).

Voir aussi [Navigation, présentation des données et gestion du jardin](navigation-presentation-des-donnees-et-gestion-du-jardin.md) (sections 2–4).

---

## 3. Méthodes de création de spécimen

| Méthode                    | Entrée                                                    | Espèce pré-remplie                 | Remarque                                                                            |
| -------------------------- | --------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| **Via formulaire**         | Onglet Spécimens → + ou Accueil → « Ajouter un spécimen » | Non                                | Modal « Choisir l’espèce » avec **recherche texte uniquement** (nom commun / latin) |
| **Via bibliothèque**       | Onglet Espèces → + → Bibliothèque                         | Oui (espèce + jardin par défaut)   | Filtres riches (type, soleil, zone USDA, favoris, fruits, noix, vigueur)            |
| **Via fiche espèce**       | Espèces ou Bibliothèque → clic espèce → « Ajouter »        | Oui                                | Même flux que bibliothèque                                                          |
| **Via scan NFC**           | Scan → « Créer un spécimen avec ce tag »                  | Non                                | UID NFC pré-rempli ; espèce choisie dans le formulaire                              |
| **Via observation rapide** | Observation rapide (espèce « Inconnue »)                   | Oui (organisme « Inconnu »)        | Création sans recherche d’espèce                                                    |
| **Via création d’espèce**  | Espèces → « Créer une espèce » (species/create)           | Après création ou espèce similaire | Si doublon/similarité → proposition « Créer un spécimen » avec espèce existante     |
| **Via terrain (bibliothèque)** | Bibliothèque ou Fiche espèce → « Placer sur le terrain » | Oui (espèce + jardin)              | Choix du jardin (ou jardin par défaut) → vue terrain 3D en mode placement → **tap sur la carte** pour définir les coordonnées → création du spécimen (lat/lng du tap, espèce et jardin pré-remplis).     |

Le **formulaire** (specimen/create) et le **scan NFC** sont les seuls parcours où l’utilisateur doit chercher l’espèce dans un modal sans filtres (recherche texte seule). La **bibliothèque** offre des filtres puissants mais sert à « parcourir puis ajouter », pas à « ouvrir la création puis chercher » — d’où l’intérêt d’enrichir le modal de choix d’espèce. Un **7ᵉ parcours** est disponible avec la vue terrain : depuis la bibliothèque ou la fiche espèce, « Placer sur le terrain » ouvre la vue 3D du jardin en mode placement ; l’utilisateur tape sur la carte pour fixer les coordonnées, puis crée le spécimen avec espèce et jardin déjà renseignés.

---

## 4. État actuel : recherche et filtres

### 4.1 Espèces (organismes)

- **Backend** ([species/api_views.py](species/api_views.py) — `OrganismViewSet.get_queryset`) :
  - **Recherche** : paramètre `search` — full-text PostgreSQL (`search_vector` + SearchRank) si disponible, sinon `icontains` sur `nom_commun` et `nom_latin`. Le `search_vector` inclut nom_commun, nom_latin, description, usages_autres et noms alternatifs (OrganismNom).
  - **Filtres** : `type`, `favoris`, `soleil`, `zone_usda`, `fruits`, `noix`, `vigueur`, `has_specimen`, `garden`.

- **Bibliothèque** ([mobile/app/species/library.tsx](mobile/app/species/library.tsx)) : utilise `getOrganismsPaginated` avec tous ces filtres, pagination et regroupement par genre.

- **Onglet Espèces** ([mobile/app/(tabs)/species.tsx](mobile/app/(tabs)/species.tsx)) : mêmes filtres + `has_specimen=true` et `garden=defaultGardenId` pour n’afficher que les espèces déjà présentes dans le jardin par défaut.

- **Modal « Choisir l’espèce »** ([mobile/app/specimen/create.tsx](mobile/app/specimen/create.tsx) — `OrganismPickerModal`) : appelle `getOrganisms({ search })` uniquement. **Aucun filtre** (type, soleil, zone, favoris, fruits, noix), pas de pagination, pas de debounce explicite sur la recherche.

**Conclusion** : la recherche d’espèce **à l’ajout au jardin** (modal du formulaire de création de spécimen) est le maillon faible — recherche texte seule, sans réutilisation de l’UX « bibliothèque ».

### 4.2 Spécimens

- **Backend** : filtres par jardin, favoris, zone, statut, santé, `include_enleve`.
- **Onglet Spécimens** ([mobile/app/(tabs)/specimens.tsx](mobile/app/(tabs)/specimens.tsx)) : barre de filtres (tous, favoris, zone, santé/statut), option « Inclure les enlevés ».

---

## 5. Vision : filtres et recherche renforcés

- **Objectif** : faciliter la recherche et le filtre d’une espèce au moment d’ajouter au jardin (notamment depuis formulaire et scan), et renforcer le filtre des spécimens si pertinent.

- **Pistes à documenter** (sans les implémenter dans cette étape) :
  - **Modal « Choisir l’espèce » enrichi** : mêmes filtres que la bibliothèque (type, soleil, zone USDA, favoris, fruits, noix, etc.), pagination ou infinite scroll, debounce sur la recherche.
  - **Composant de recherche d’espèces partagé** : réutilisable entre bibliothèque, modal de création de spécimen et éventuellement d’autres écrans.
  - **API** : le backend expose déjà les paramètres ; le client `getOrganisms` / modal n’utilise que `search`. Étendre l’appel du modal pour passer les mêmes paramètres que `getOrganismsPaginated` (ou un sous-ensemble).
  - **Spécimens** : garder la cohérence (filtres jardin, zone, statut, santé) et envisager une recherche par nom d’espèce ou nom de spécimen si besoin.

---

## 6. Références

- [Navigation, présentation des données et gestion du jardin](navigation-presentation-des-donnees-et-gestion-du-jardin.md)
- [Fiches spécimens et outils de suivi](fiches-specimens-et-outils-de-suivi.md)
- Fichiers clés :
  - [mobile/app/specimen/create.tsx](mobile/app/specimen/create.tsx) — formulaire de création de spécimen et `OrganismPickerModal`
  - [mobile/app/species/library.tsx](mobile/app/species/library.tsx) — bibliothèque d’espèces
  - [mobile/app/(tabs)/species.tsx](mobile/app/(tabs)/species.tsx) — onglet Espèces
  - [species/api_views.py](species/api_views.py) — `OrganismViewSet`, filtres et recherche

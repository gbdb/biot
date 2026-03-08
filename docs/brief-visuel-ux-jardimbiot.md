# Brief visuel et UX — Jardin bIOT

## 6. Visualisation terrain

**Implémenté** — Vue terrain 3D Cesium dans l’onglet 3D du jardin (ordre des onglets : Spécimens | Infos | 3D).

- **Fichiers** : `mobile/app/garden/[id]/terrain.tsx` (écran React Native avec WebView), `species/templates/cesium/terrain_view.html`, et fichiers statiques `species/static/cesium/` (terrain_view.css, terrain_bridge.js, terrain_cesium.js, terrain_ui.js).
- **Fonctionnalités** : terrain 3D (LiDAR Ion ou World Terrain), boundary et courbes de niveau si renseignés, spécimens (pins avec emoji, couleur selon santé), cercles d’emprise adulte et GCP toggleables, panneau droit (recherche et filtres pour visibilité sur la carte), warnings, popup fiche, toolbar (Accueil, Rayons, GCP, Nouveau GCP, Export CSV, Vol drone), légende altitude, boussole. Tap sur un spécimen → fiche `/specimen/[id]`. Parcours **Placer sur le terrain** depuis la bibliothèque ou la fiche espèce : mode placement, tap sur la carte → création de spécimen avec coordonnées pré-remplies.

**Palette et typo (overlay terrain)** : fond nuit #0d1008 / #141a0f, verts #3d5c2e / #5a8a3f / #7ab85a, crème #ede8dc, ambre #c4832a, rouge #b83a3a, eau #2a6e8a / #4a9ec4. Panneaux glass (noir 82 % + blur 16px), toolbar (65 % + blur 10px). **Playfair Display** (logo, titres fiches), **Outfit** 300/400/500/600 (interface). Pas d’Inter, Roboto, Arial.

**Modes terrain :**

- **Par défaut** : fallback **Cesium World Terrain** (terrain mondial Cesium, résolution ~30 m). Actif lorsque `CESIUM_LIDAR_ASSET_ID` n’est pas défini dans `.env`.
- **Optionnel** : terrain **LiDAR MRNF Québec** (MNT 1 m). Actif lorsque `CESIUM_LIDAR_ASSET_ID` est défini dans `.env` après upload des tuiles LiDAR sur Cesium Ion.
- **Pills de vue** (top bar) : 2D, 3D LiDAR (actif), Drone, LiDAR+Drone (désactivés en attente d’imagerie drone).

Variables d’environnement backend : `CESIUM_ION_ACCESS_TOKEN` (obligatoire pour Cesium Ion), `CESIUM_LIDAR_ASSET_ID` (optionnel). Le token n’est jamais inclus dans le bundle mobile ; il est injecté uniquement par le template Django.

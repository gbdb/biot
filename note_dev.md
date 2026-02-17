# Notes de Développement - Jardin bIOT

## Contexte du Projet
- Projet pour Les Jardins Comestibles du Mont Caprice (3 acres, zone 4a)
- Focus: arbres fruitiers, vivaces comestibles, permaculture
- Dev: Guillaume, 3-5h/semaine disponibles
- Objectif: App utilisable printemps 2026

## Architecture
- Niveau 1 (95% fait): Organism, Specimen, Event, Photos, Relations, Amendments, UserTags
- Prochains: Interface utilisateur, recherche espèces intelligente
- Puis Niveau 2: Guildes, Zones du terrain

## Décisions Importantes
- JSONField pour données flexibles (multi-sources)
- Organism (pas Plant) pour inclure champignons/mousses
- AGPL-3.0 pour garder open-source
- Zone rusticité, sol, besoins eau = critères essentiels


## Prochaines Features Planifiées
1. Recherche d'espèces intelligente (GBIF, Wikipedia)
2. Interface mobile-friendly
3. Upload photos depuis terrain
4. Import Hydro-Québec quand API revient

## Features Récemment Ajoutées
- ✅ **Gestion des semences** : SeedSupplier, SeedCollection, SemisBatch. Inventaire de graines avec stratification, germination, viabilité. Lien Specimen → seed_collection pour semis maison. Import `import_seeds` (CSV/JSON). Doc mapping semenciers: `docs/seed-supplier-mapping.md`
- ✅ Galerie photos par organisme: champ `type_photo` (tronc, feuillage, reproduction, etc.) + inline sur fiche Organisme pour plusieurs photos
- ✅ Système de tags personnels (UserTag) avec couleurs et filtrage
- ✅ Import PFAF avec matching intelligent et zones multiples
- ✅ Zones de rusticité multiples (JSONField) avec sources

## Idées Futures

### Cartographie 3D du Terrain (Niveau 2)
**Objectif:** Vue 3D du terrain dès le début — terrain en pente prioritaire (Mont Caprice)

**Choix technique:** Cesium (open source, Apache 2.0)
- Visualisation 3D terrain dans le navigateur
- Relief via données LiDAR / MNT (Données Québec)
- Placement des espèces aux emplacements voulus sur la carte 3D

**Note:** Pas d'implémentation immédiate — pas encore de frontend. Idée intégrée au plan Niveau 2.

### Galerie Photos Éducative (Priorité Haute) — En cours
**Objectif:** Permettre identification et diagnostic santé

**Types de photos par organisme:** (implémentés via `Photo.type_photo`)
- Tronc: juvénile, mature, malade, écorce détail
- Feuillage: printemps, été, automne, jeune, sain, malade
- Branches: juvénile, mature, bourgeons
- Reproduction: fleurs, fruits (immature/mûr), graines
- Port général et silhouette hiver
- Problèmes courants (maladies, parasites)

**Cas d'usage:**
1. Identification d'arbres sauvages par comparaison visuelle
2. Diagnostic de santé (comparer symptômes)
3. Éducation (apprendre à reconnaître par stade)
4. Documentation saisonnière

**Implémentation:** ✅ Champ `type_photo` ajouté au modèle Photo. ✅ Inline "Photos de l'espèce" sur la fiche Organisme pour ajouter plusieurs photos par organisme. Filtrage par type_photo dans l’admin Photos.
# Notes de Développement - Jardin bIOT

## Contexte du Projet
- Projet pour Les Jardins Comestibles du Mont Caprice (3 acres, zone 4a)
- Focus: arbres fruitiers, vivaces comestibles, permaculture
- Dev: Guillaume, 3-5h/semaine disponibles
- Objectif: App utilisable printemps 2026

## Architecture
- Niveau 1 (95% fait): Organism, Specimen, Event, Photos, Relations, Amendments
- Prochains: Interface utilisateur, recherche espèces intelligente
- Puis Niveau 2: Guildes, Zones du terrain

## Décisions Importantes
- JSONField pour données flexibles (multi-sources)
- Organism (pas Plant) pour inclure champignons/mousses
- AGPL-3.0 pour garder open-source
- Zone rusticité, sol, besoins eau = critères essentiels

## Problèmes Connus
- API Hydro-Québec bloquée par SSL (serveur down?)
- Utiliser import_hydroquebec_local en attendant

## Prochaines Features Planifiées
1. Recherche d'espèces intelligente (GBIF, Wikipedia)
2. Interface mobile-friendly
3. Upload photos depuis terrain
4. Import Hydro-Québec quand API revient

## Idées Futures

### Galerie Photos Éducative (Priorité Haute)
**Objectif:** Permettre identification et diagnostic santé

**Types de photos par organisme:**
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

**Implémentation:** Ajouter champ `type_photo` au modèle Photo existant
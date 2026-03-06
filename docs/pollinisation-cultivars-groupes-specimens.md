# Pollinisation, cultivars et regroupement de spécimens

Ce document décrit les modèles et règles métier pour les **cultivars**, les **compagnons pollinisation** au niveau variété, et le **regroupement de spécimens** (mâle/femelle ou pollinisation croisée) avec distance et alertes.

---

## 1. Distance de pollinisation

- **Valeur par défaut globale** : `POLLINATION_DISTANCE_MAX_DEFAULT_M` (settings / `.env`, ex. 50 m). Référence : fiches techniques fruitiers (30–50 m pour pommiers).
- **Paramètre utilisateur** : `UserPreference.pollination_distance_max_default_m` (mètres). Configurable dans l’écran **Paramètres** de l’app (distance par défaut pour les plants).
- **Par espèce** : `Organism.distance_pollinisation_max` (mètres, optionnel). Prioritaire sur la préférence utilisateur et la config globale.

**Ordre de priorité** pour le seuil d’alerte « zone trop loin » :
1. `Organism.distance_pollinisation_max` (si défini pour l’espèce)
2. `UserPreference.pollination_distance_max_default_m` (utilisateur connecté)
3. `settings.POLLINATION_DISTANCE_MAX_DEFAULT_M`

---

## 2. Cultivars et pollinisateurs recommandés

- **Cultivar** : variété d’une espèce (nom, couleur fruit, goût, résistances). Déjà en base ; exposé dans le détail organisme (`GET /api/organisms/:id/`) sous la forme d’une liste `cultivars` avec `pollinateurs_recommandes`.
- **CultivarPollinator** : lien « ce cultivar a besoin de ce pollinisateur » :
  - `cultivar` (FK) = variété qui a besoin d’un pollinisateur
  - `companion_cultivar` (FK, null) = variété compagne précise (ex. Liberty pour Dolgo)
  - `companion_organism` (FK, null) = espèce compagne (n’importe quelle variété de cette espèce)
  - Au moins un des deux (companion_cultivar ou companion_organism) doit être renseigné.

---

## 3. Groupes de spécimens (pollinisation)

Deux types d’association :

| Type | Rôle | Règle |
|------|------|--------|
| **male_female** | 1 `pollinisateur` (mâle), jusqu’à 6 `principal` (femelles) | One-to-many |
| **cross_pollination_cultivar** | Tous `partenaire` (ou rôle vide) | Au moins 2 specimens dans le groupe |

- **SpecimenGroup** : `type_groupe` (male_female | cross_pollination_cultivar), `organisme` (FK optionnel, pour cross_pollination).
- **SpecimenGroupMember** : `group`, `specimen`, `role` (pollinisateur | principal | partenaire). Unique (group, specimen).

Validations : un seul pollinisateur et au plus 6 principaux pour male_female ; au moins 2 membres pour cross_pollination_cultivar.

---

## 4. Calcul de distance et alerte « trop loin »

- Utilisation de `Specimen.latitude` / `longitude` et calcul haversine (voir `species/utils.py` : `distance_metres_between_specimens`, `get_pollination_distance_max_m`).
- Pour chaque paire de specimens dans un même groupe : si distance > seuil (voir §1) → alerte « Zone trop loin : risque de non-floraison ».
- Exposé dans le détail specimen (`GET /api/specimens/:id/`) : `pollination_associations` avec pour chaque autre membre `distance_metres` et `alerte_distance`.

---

## 5. API

- **Préférences** : `GET/PATCH /api/me/preferences/` avec `pollination_distance_max_default_m`.
- **Organismes** : détail inclut `cultivars` (avec `pollinateurs_recommandes`), `distance_pollinisation_max`.
- **Spécimens** : détail inclut `pollination_associations` (group_id, type_groupe, role, other_members avec distance_metres, alerte_distance).
- **Groupes** : `GET/POST /api/specimen-groups/`, `GET/PATCH/DELETE /api/specimen-groups/:id/`, `POST /api/specimen-groups/:id/members/`, `DELETE /api/specimen-groups/:id/members/:member_pk/`.

---

## 6. UX (app mobile)

- **Paramètres** : champ « Distance de pollinisation » (m) pour la valeur par défaut.
- **Fiche espèce** : section « Variétés / cultivars » avec différences et pollinisateurs recommandés.
- **Fiche specimen** : section « Associé à (pollinisation) » avec liste des partenaires, distance et alerte « Zone trop loin » si applicable ; lien vers l’autre specimen.

---

## 7. Alertes calendrier (à venir)

- **Début de saison de planification** (ex. janvier–février) : rappel « Remplacer le plant pollinisateur / ajouter un partenaire » si le pollinisateur est mort ou le groupe cross_pollination n’a plus qu’un specimen.
- **À la floraison** : rappel optionnel « Vérifier floraison / pollinisation ».

Ces rappels pourront s’appuyer sur le modèle `Reminder` et sur `OrganismCalendrier` (floraison).

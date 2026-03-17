# Plan Vue 3D — Décisions Guillaume (mise à jour du plan)

Ce document enregistre les réponses aux points laissés ouverts dans le plan d’amélioration de la page Vue 3D. Il remplace la section « Points à trancher » et précise les choix d’implémentation.

---

## 1. Racine sans jardin par défaut (premier usage)

**Décision :** Ce cas n’arrive qu’une seule fois en pratique. Mettre en place une **belle séquence de pages d’onboarding** :

1. **Création d’un utilisateur** (inscription) — cet utilisateur est **automatiquement administrateur** (au moins pour son propre contexte).
2. **Création du jardin** et sa **configuration** (nom, adresse, etc.).
3. **Sélection du jardin** pour **définir le jardin par défaut** (UserPreference.default_garden).

À l’issue de cette séquence, l’utilisateur arrive sur la vue 3D avec un jardin par défaut déjà défini. Les visites suivantes à la racine redirigent directement vers `/cesium-view/?garden_id=<default>`.

**Implémentation à prévoir :**  
- Flow dédié « premier usage » (détection : pas de jardin / pas de default_garden).  
- Pages ou étapes : Register (avec attribution is_staff ou rôle admin si souhaité) → Create Garden → Configure Garden → Choose default garden → Redirect to 3D view.

---

## 2. Fiche spécimen dans l’onglet Jardin

**Décision :** Ouverture **dans le panneau** par défaut, avec une **option / icône claire** pour ouvrir en **popup modal** (overlay **3/4 écran**) sur la vue 3D, **sans rafraîchissement**.

**Implémentation :**  
- Contenu fiche spécimen chargé en JS dans le panneau (détail + événements + rappels + édition).  
- Bouton ou icône « Agrandir » / « Ouvrir en overlay » qui ouvre la même fiche dans un modal en overlay (largeur ~75 % écran), au-dessus de la scène 3D, sans recharger la page.

---

## 3. Partenaires (onglet)

**Décision :** Faire évoluer plus tard ; pour l’instant **modèle Partner éditable en admin**.  
Préférence pour le **nom « Fournisseurs / catalogue préféré »** (avec possibilité d’évoluer vers du **sponsorship** plus tard).

**Implémentation :**  
- Modèle `Partner` (ou nom de modèle cohérent avec « fournisseurs / catalogue ») : nom, URL, ordre, éventuellement champ pour sponsorship.  
- Éditable dans l’admin Django.  
- Onglet « Partenaires » (ou « Fournisseurs ») dans le panneau 3D : liste des partenaires avec liens (ouverture externe).

---

## 4. Admin Cesium (token, asset ID)

**Décision :** **Lecture seule** pour l’instant, avec **ouverture pour une configuration plus tard** (ex. ajout de **nouveaux modèles 3D** après une **prise d’image drone**).

**Implémentation :**  
- Dans l’onglet Administrateur : token Cesium et ID asset affichés en **lecture seule** (depuis la config serveur ou des champs existants).  
- Prévoir dans l’architecture / les modèles une évolution future (ex. liaison jardin ↔ assets 3D / modèles drone) sans casser l’affichage actuel.

---

## Récapitulatif (décisions initiales)

| Point | Choix |
|-------|--------|
| Racine (accès site) | Si non authentifié → page de connexion ; après login → redirect vers 3D (ou choix jardin) |
| Premier usage (pas de jardin) | Séquence onboarding : création utilisateur (auto admin) → création jardin → config → sélection jardin par défaut |
| Fiche spécimen | Dans le panneau + icône pour modal overlay 3/4 écran, sans rafraîchissement |
| Partenaires | Modèle Partner éditable en admin ; nom « fournisseurs / catalogue préféré », évolution sponsorship possible |
| Cesium (token, asset) | Lecture seule ; prévoir évolution (ex. modèles 3D post-drone) |

Ce document doit être pris en compte lors de l’exécution du plan « Vue 3D page improvements ».

---

## Décisions supplémentaires (validations Guillaume)

### 1. Login web (racine)

**Décision :** Oui, à ajouter. Si la page racine est accédée, l’utilisateur doit pouvoir **se connecter**. Mettre en place une page de connexion (session ou token) et redirection vers `/` après succès ; la vue racine redirige les non‑authentifiés vers cette page de login.

### 2. Changer de jardin

**Décision :** Oui, bonne idée. Ajouter un **sélecteur de jardin** dans l’app (top bar ou onglet Administrateur) pour basculer de jardin sans repasser par la racine (rechargement de la vue 3D avec le nouveau `garden_id`).

### 3. Panneau sur mobile

**Décision :** Oui, bien vu. Prévoir un **comportement spécifique au mobile** (pleine largeur ou bottom sheet) et **tester en profondeur en 2ᵉ étape** — vue dédiée mobile à valider après la première version du panneau.

### 4. Unité de mesure (mètre / pied)

**Décision :** Le **jardin a une unité par défaut** (stockée sur le modèle Garden). La **vue permet de passer temporairement** d’une unité à l’autre (m ↔ ft). **Lors de la prochaine visite**, l’app revient à l’unité par défaut du jardin (pas de persistance du choix temporaire).

**Implémentation :** Champ sur Garden (ex. `distance_unit` = `'m'` | `'ft'`). Override temporaire en session ou localStorage pour la session courante uniquement ; au prochain chargement, reprendre la valeur du jardin.

### 5. API Partenaires

**Décision :** Oui, il faut l’endpoint **GET /api/partners/** pour alimenter l’onglet Partenaires (liste ordonnée, modèle Partner éditable en admin).

### 6. Performance et fluidité

**Décision :** Bonne idée. **Toute nouvelle fonction ou visuel doit prendre en compte la fluidité** : chargement des onglets à la demande (lazy), pagination ou virtualisation de la liste des spécimens si besoin.

### 7. Gantt (Rappels et calendrier)

**Décision :** Oui. Permettre de **voir la saison complète et le cycle de vie de la plante** : plage 7 j, 30 j, **configurable** (ex. sélection de période ou saison). Vérifier si les APIs existantes (`reminders/upcoming/`, `expected-events/`) suffisent ou s’il faut un endpoint dédié timeline.

### 8. Accessibilité (panneau et modal)

**Décision :** Oui (focus trap, Escape pour fermer, retour du focus). **Ajouter une note dans la doc** pour **revoir en détail en phase 2** (audit accessibilité dédié).

### 9. Deep linking

**Décision :** Oui, ouverture directe. Prévoir **lien partageable** (ex. `?garden_id=1&specimen_id=42`) pour rouvrir directement la fiche spécimen après refresh ou partage.

### 10. Onboarding (mobile + scan TAG)

**Décision :** Sur **mobile**, prévoir une **page dédiée** dans le flow d’onboarding avec **icônes pour scanner le TAG** (NFC). Permettre d’associer un tag au jardin ou aux spécimens pendant la configuration. Clarifier en implémentation : « administrateur » = `is_staff` ou rôle métier ; après inscription, utilisateur déjà connecté → enchaîner sur « Créer un jardin » puis scan TAG si besoin.

### 11. Tests

**Décision :** Conservée. Au minimum **tests backend** : vue racine (redirect avec/sans jardin, redirect si non authentifié), flow onboarding (création jardin, default_garden). Optionnel : E2E « ouvrir 3D → panneau → spécimen → overlay ».

---

## Récapitulatif des décisions supplémentaires

| Point | Décision |
|-------|----------|
| Login web | Page de connexion obligatoire si accès à la racine ; redirection après login vers `/` |
| Changer de jardin | Sélecteur dans la top bar ou onglet Admin, sans repasser par la racine |
| Mobile (panneau) | Vue spécifique mobile, tests en profondeur en 2ᵉ étape |
| Unité m/ft | Unité par défaut sur le jardin ; bascule temporaire m ↔ ft dans la vue ; retour au défaut à la prochaine visite |
| API Partenaires | GET /api/partners/ à mettre en place |
| Performance | Toute nouvelle fonction/visuel doit privilégier la fluidité (lazy, pagination, virtualisation) |
| Gantt | Plage configurable pour voir saison complète et cycle de vie (7 j, 30 j, etc.) |
| Accessibilité | Oui ; note doc pour revue détaillée en phase 2 |
| Deep linking | Oui ; ouverture directe via ?garden_id=…&specimen_id=… |
| Onboarding mobile | Page avec icônes pour scanner TAG (NFC) |
| Tests | Tests backend sur racine et onboarding au minimum |

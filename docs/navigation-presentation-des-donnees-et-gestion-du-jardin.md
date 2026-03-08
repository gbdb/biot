# Navigation, présentation des données et gestion du jardin

Ce document décrit comment l’application **Jardin bIOT** présente l’information à l’utilisateur : espèces et cultivars, recherche pour ajouter au jardin, spécimens, rappels, événements, favoris, pollinisation, et autres aspects. Il sert de guide pour expliquer l’application en détail et pour rester aligné avec le concept du jardin (forêt comestible, écosystème, suivi des plants).

---

## 1. Vision et concept du jardin

**Jardin bIOT** est pensé pour la conception et la gestion de **forêts comestibles** et d’écosystèmes permacoles. L’information est structurée pour refléter :

- **L’espèce** (organisme) : la fiche de référence partagée (nom commun, latin, besoins, usages, cultivars).
- **Le spécimen** : l’individu concret dans *votre* jardin (un plant, un arbre, une zone), avec son historique (événements, rappels, photos, statut).
- **Le jardin** : le lieu (un ou plusieurs jardins), avec des zones optionnelles pour organiser les spécimens.

La présentation des données vise à garder une frontière claire entre **connaissance partagée** (espèces) et **données personnelles / contextuelles** (spécimens, jardins, rappels, événements).

---

## 2. Navigation globale (onglets)

L’app mobile est organisée en **4 onglets principaux** :

| Onglet    | Rôle |
|----------|------|
| **Accueil** | Tableau de bord : rappels à venir, spécimens à proximité (GPS), favoris, événements récents, alertes météo. Accès rapide au scan, ajout de spécimen, observation. |
| **Espèces** | Espèces *déjà présentes dans le jardin par défaut* : liste filtrée (recherche, type, soleil, zone USDA, favoris, fruits, noix). Bouton **+** → Bibliothèque d’espèces pour en ajouter. |
| **Spécimens** | Tous les spécimens du jardin par défaut : liste ou grille, filtres (tous, favoris, zone, santé/statut), option « Inclure les enlevés ». Bouton **+** → Créer un spécimen ; icône scan → scan NFC. |
| **Jardins** | Liste des jardins de l’utilisateur ; création d’un nouveau jardin (bouton **+**). |

**Jardin par défaut** : les listes « Espèces » et « Spécimens » sont filtrées selon le **jardin par défaut** (paramètre utilisateur). Si aucun jardin par défaut n’est choisi, l’onglet Espèces peut afficher un message invitant à en sélectionner un.

---

## 3. Espèces : concept et présentation

### 3.1 Espèce (organisme) vs cultivar

- **Organisme (espèce)** : entité de référence avec nom commun, nom latin, type (arbre fruitier, vivace, etc.), besoins (soleil, eau, zone USDA), sol, usages, calendrier (floraison, récolte), cultivars, companions, etc.
- **Cultivar** : variété *rattachée* à une espèce (ex. pommier ‘Dolgo’). Chaque cultivar peut avoir des infos (couleur fruit, goût, résistances), des **pollinisateurs recommandés** (autre cultivar ou autre espèce) et des **porte-greffes disponibles** (nom, vigueur, hauteur max, disponibilité par source pépinière).

En base, les cultivars sont des enregistrements liés à l’organisme ; ils sont exposés dans la **fiche espèce** (détail) sous la section « Variétés / cultivars », avec pour chaque variété les pollinisateurs recommandés et la liste des porte-greffes (vigueur, hauteur max, badge « Disponible chez Ancestrale » ou « Arbres en Ligne » selon les sources).

### 3.2 Où voit-on les espèces ?

- **Onglet Espèces** : liste paginée des espèces qui ont *au moins un spécimen* dans le jardin par défaut. Chaque ligne affiche : photo (si disponible), nom commun, nom latin, type (avec libellé lisible, ex. « Arbre fruitier »), étoile favori, bouton **+** pour ajouter un spécimen de cette espèce au jardin.
- **Bibliothèque d’espèces** (`/species/library`) : catalogue complet, ouvert par le bouton **+** de l’onglet Espèces. Liste paginée avec les filtres : recherche, type, soleil, zone USDA, favoris, fruits, noix, **Taille (vigueur porte-greffe)** (Nain, Semi-nain, etc.). Pas de filtre « avoir un spécimen dans le jardin ». Les résultats sont regroupés par **genre** (sections par genre, ex. *Amelanchier*). Un badge **« Disponible en pépinière »** (ou « Disponible chez [source] » sur la fiche espèce) signale les espèces dont au moins un cultivar a des porte-greffes avec disponibilité renseignée. Depuis la bibliothèque, « Ajouter au jardin » envoie vers la création de spécimen avec l’espèce pré-remplie et le jardin par défaut si défini.

Choix de conception : l’onglet Espèces montre uniquement ce qui est *déjà dans le jardin* pour un accès rapide ; la bibliothèque permet d’explorer tout le catalogue et d’ajouter de nouvelles espèces.

---

## 4. Comment on cherche l’information pour ajouter au jardin

### 4.1 Flux « Ajouter un spécimen au jardin »

1. **Depuis l’onglet Espèces** : soit on choisit une espèce déjà présente (bouton **+** sur une ligne) → création de spécimen avec espèce et jardin par défaut pré-remplis.
2. **Depuis la Bibliothèque** : on parcourt ou filtre les espèces, on appuie sur « Ajouter » → même flux avec espèce + jardin par défaut.
3. **Depuis l’onglet Spécimens** : bouton **+** en en-tête → écran **Créer un spécimen** sans espèce pré-remplie.

### 4.2 Recherche d’espèce à l’ajout (création de spécimen)

Sur l’écran **Créer un spécimen** :

- **Choix de l’espèce** : ouverture d’un modal « Choisir l’espèce » avec un champ de **recherche texte** (nom commun ou nom latin). La recherche est envoyée au backend à chaque saisie ; les résultats sont affichés en liste (nom commun + nom latin). L’utilisateur sélectionne une espèce.
- **Choix du cultivar (optionnel)** : une fois l’espèce choisie, on peut ouvrir un modal « Variété (optionnel) » qui charge les cultivars de cette espèce (API paginée). Liste : « Aucune variété » + les cultivars ; sélection optionnelle.

Côté API, la recherche d’organismes pour la liste (et donc pour ce modal) utilise une recherche **search_vector (SearchQuery + SearchRank)** : full-text sur nom_commun, nom_latin, description, usages_autres et noms alternatifs (OrganismNom) ; tri par pertinence ; fallback icontains si non PostgreSQL ou search_vector indisponible.

### 4.3 Choix du jardin et autres champs

- **Jardin** : modal « Choisir le jardin » avec liste des jardins de l’utilisateur, option « Aucun jardin », et possibilité « Créer un jardin ».
- Ensuite : nom du spécimen, zone dans le jardin, statut (planifié, en place, etc.), étiquette NFC (optionnel), notes.

Résumé : pour ajouter au jardin, on part soit d’une espèce déjà vue (onglet Espèces / Bibliothèque), soit d’une recherche par nom dans le modal de création de spécimen ; le cultivar est un choix optionnel après l’espèce, cohérent avec le modèle « espèce + variété ».

---

## 5. Présentation des spécimens

### 5.1 Liste des spécimens (onglet Spécimens)

- **Modes d’affichage** : **Liste** (ligne par spécimen) ou **Grille** (cartes avec image).
- **Contenu d’une ligne / carte** :
  - **Liste** : nom du spécimen, nom de l’organisme (espèce), statut (planifié, en place, mort, enlevé), bouton favori (étoile).
  - **Grille** : photo principale (ou placeholder), favori, nom du spécimen, nom de l’organisme, statut.
- **En-tête** : compteur (nombre affiché / total si disponible), bouton pour basculer liste/grille, **barre de filtres** :
  - **Tous** : tous les spécimens du jardin par défaut.
  - **Favoris** : uniquement les spécimens marqués favoris.
  - **Zones** : filtre par zone du jardin (modal de choix de zone).
  - **Filtres avancés** : santé (ex. malade) et/ou statut (ex. en place, mort).
- **Option « Inclure les enlevés »** : permet d’afficher aussi les spécimens au statut « enlevé », pour garder une trace sans les mélanger au quotidien.

Les spécimens sont chargés selon le **jardin par défaut** ; le filtre favoris et les filtres zone/santé/statut affinent la liste.

### 5.2 Fiche détail d’un spécimen

La fiche spécimen (`/specimen/[id]`) est le cœur du suivi individuel. Structure typique :

- **En-tête** : photo principale (carrousel), nom du spécimen, nom de l’espèce (organisme), statut, bouton favori, actions (éditer, dupliquer, etc.).
- **Infos de base** : jardin, zone, étiquette NFC, notes.
- **Associé à (pollinisation)** : groupes de pollinisation auxquels appartient le spécimen ; pour chaque groupe, rôle et liste des autres membres avec **distance** (m) et **alerte « Zone trop loin »** si la distance dépasse le seuil (espèce / préférence utilisateur / config globale). Lien vers chaque autre spécimen.
- **Photos** : carrousel des photos du spécimen, avec possibilité de définir la photo par défaut, d’ajouter des photos (seules ou liées à un événement), de supprimer. Les photos peuvent être rattachées à un événement (badge type d’événement).
- **Rappels** : liste des rappels (type, date, type d’alerte, titre). Clic pour ouvrir le modal d’action (marquer fait, reporter, ouvrir le spécimen) ; appui long pour supprimer.
- **Événements récents** : liste ou vignettes par événement (type, date, titre). Clic pour voir le détail de l’événement (et ses photos). Possibilité d’ajouter un événement ou un rappel via un bouton/modal commun (onglet « Événement » ou « Rappel »).

Cette organisation met en avant : **identité du plant** (nom, espèce, statut), **contexte spatial** (jardin, zone, distance de pollinisation), **historique** (événements, photos), **prochaines actions** (rappels).

---

## 6. Vue terrain 3D (onglet 3D du jardin)

Depuis un jardin, l’onglet **3D** charge la vue terrain (carte Cesium 3D) avec les données de ce jardin.

- **Accès** : dans la vue Jardin, onglets **Spécimens | Infos | 3D**. L’onglet 3D ouvre la carte 3D (WebView) avec le terrain (LiDAR Ion si configuré, sinon Cesium World Terrain), les limites et courbes de niveau si renseignées, les spécimens (pins avec emoji et couleur selon la santé), les cercles d’emprise adulte (toggleables), et les points de contrôle (GCP) pour la calibration drone.
- **Panneau droit** : onglets **Spécimens**, **Journal**, **Rappels**. Dans l’onglet Spécimens : **barre de recherche** (nom, espèce, cultivar) et **filtres** (par espèce, statut, zone, « en alerte »). Les filtres et la recherche déterminent **quels spécimens sont visibles sur la carte** : seuls les spécimens correspondants restent affichés (synchro liste ↔ carte).
- **Popup fiche** : au clic sur un pin, un panneau affiche un résumé du spécimen et un bouton « Ouvrir la fiche complète » qui ouvre la fiche specimen dans l’app.
- **Parcours Bibliothèque → Placer sur le terrain** (7ᵉ méthode de création) : depuis la **Bibliothèque d’espèces** ou la **fiche espèce**, l’action **« Placer sur le terrain »** ouvre la vue terrain du jardin (par défaut si défini) en **mode placement**. Un **tap sur la carte** fixe les coordonnées du nouveau spécimen ; l’utilisateur est redirigé vers l’écran de création de spécimen avec espèce, jardin et coordonnées déjà renseignés.
- **GCP (points de contrôle)** : depuis la toolbar de la vue terrain, **Nouveau GCP** ouvre l’écran mobile de création (capture GPS, photo du piquet, label, notes). La **liste des GCP** et le bouton **Exporter pour OpenDroneMap** permettent de télécharger un CSV au format attendu par OpenDroneMap.
- **Warnings** : rappels en retard, pollinisateurs manquants, alertes phénologiques sont affichés en bandeau (rouge / ambre / vert) et peuvent ouvrir la fiche du spécimen concerné.
- **Métriques terrain** (altitude, pente, cours d’eau, surface) et **légende altitude** : affichées si les données du jardin (`terrain_stats`) sont renseignées ; sinon « — » et bloc grisé.

---

## 7. Pollinisation, cultivars et cohérence avec le concept

- **Fiche espèce** : section « Variétés / cultivars » avec pour chaque cultivar les pollinisateurs recommandés (nom du cultivar ou de l’espèce compagne). Cela guide le choix de variétés et de partenaires dans le jardin.
- **Fiche spécimen** : section « Associé à (pollinisation) » avec les groupes (mâle/femelle ou pollinisation croisée), les rôles, les distances et l’alerte « Zone trop loin » pour inciter à vérifier la disposition des plants.

La **distance max de pollinisation** est déterminée par : espèce (si renseignée) > préférence utilisateur (Paramètres) > valeur globale. Cette hiérarchie reste la même partout (détail specimen, calculs d’alerte).  
Documentation détaillée : `docs/pollinisation-cultivars-groupes-specimens.md`.

---

## 8. Rappels

- **Types** : arrosage, suivi maladie, taille, suivi général, cueillette (libellés définis dans l’app).
- **Paramètres** : date, type d’alerte (email, popup, son), titre/description optionnels, règle de récurrence (aucune, quotidien, hebdo, etc.).

**Où ils sont présentés :**

- **Accueil** : bloc « Rappels » avec les prochains rappels (vignettes : photo du spécimen, date, nom du spécimen ; badge « en retard » si date passée). Clic → modal d’action (marquer fait, reporter, aller au spécimen).
- **Écran Rappels** : liste complète des rappels à venir (accessible depuis un lien depuis l’accueil ou la navigation). Même modal d’action au clic.
- **Fiche spécimen** : section « Rappels » avec liste de tous les rappels de ce spécimen ; ajout, édition (via modal), suppression (appui long).

Les rappels sont toujours **liés à un spécimen** : on planifie une action sur un plant précis, ce qui reste aligné avec le concept « suivi par individu dans le jardin ».

---

## 9. Événements

- **Types** : observation, arrosage, plantation, récolte, taille, floraison, fructification, paillage, fertilisation, amendement, maladie, traitement, transplantation, protection, mort, enlèvement, autre.
- Les événements peuvent avoir des **photos** attachées ; une photo de spécimen peut être associée à un événement (affichage par badge dans le carrousel).

**Où ils sont présentés :**

- **Accueil** : section « Événements récents » (vignettes par événement : photo ou icône type, nom du spécimen, type + date). Lien « Voir tout » vers la liste complète.
- **Écran Événements récents** : liste des derniers événements ; clic → fiche du spécimen concerné.
- **Fiche spécimen** : section « Événements récents » en liste ou en vignettes (avec première photo de l’événement) ; détail au clic (modal avec infos + photos). Création d’événement (et option « mort / enlèvement ») depuis un modal commun avec les rappels.

Le flux « mort / enlèvement » propose après enregistrement de la mort de créer un rappel pour enlever le spécimen plus tard, puis d’enregistrer l’événement d’enlèvement : le cycle de vie du plant reste tracé sur la fiche specimen.

---

## 10. Favoris

- **Favoris espèces** : dans l’onglet Espèces et dans la Bibliothèque, chaque carte espèce a une étoile. Marquer en favori permet de filtrer la liste (filtre « Favoris ») et de retrouver rapidement les espèces préférées.
- **Favoris spécimens** : dans la liste/grille des spécimens et sur la fiche détail, étoile pour marquer/démarquer. Utilisé pour le filtre « Favoris » dans l’onglet Spécimens et pour les blocs **Favoris** et **Rappels** de l’accueil (les rappels affichés concernent les spécimens favoris ou tous les rappels selon l’API).

Les favoris servent à personnaliser les vues sans changer les données : on met en avant ce qu’on suit le plus (espèces ou plants).

---

## 11. Jardins, zones et jardin par défaut

- **Jardins** : l’utilisateur peut avoir plusieurs jardins (nom, adresse, ville). Le **jardin par défaut** est défini dans **Paramètres** et pilote :
  - l’onglet Espèces (espèces ayant au moins un spécimen dans ce jardin),
  - l’onglet Spécimens (spécimens de ce jardin),
  - la valeur pré-remplie lors de la création d’un spécimen depuis la Bibliothèque ou depuis l’onglet Espèces.
- **Zones** : un spécimen peut avoir une **zone** (texte libre) dans le jardin. Les zones permettent de filtrer les spécimens (filtre « Zones » dans l’onglet Spécimens) et d’afficher la zone sur la fiche specimen et dans les listes (ex. « Spécimens de cette espèce » sur la fiche espèce).

Présentation des données : tout ce qui est « dans le jardin » (espèces vues, spécimens, ajout) est cohérent avec un seul jardin à la fois (le jardin par défaut), tout en permettant de changer de jardin ou de créer un nouveau jardin.

---

## 12. Autres aspects de présentation

- **À proximité** (GPS) : sur l’accueil, bloc « À proximité » avec des spécimens dont les coordonnées sont proches de la position actuelle (rayon et limite configurables). Affichage de la distance (m ou km). Lien « Voir tout » vers l’écran « À proximité » pour une liste complète. Aligne l’app avec l’usage sur le terrain (identifier les plants autour de soi).
- **Alertes météo** : sur l’accueil, affichage d’alertes (gel, neige, etc.) quand le service météo les fournit.
- **Scan NFC** : depuis l’onglet Spécimens (icône scan) ou la barre d’actions de l’accueil, scan d’une étiquette NFC pour ouvrir directement le spécimen associé (ou créer un spécimen avec l’UID pré-rempli).
- **Création d’espèce** : formulaire dédié (nom commun, nom latin, type) avec recherche de similaires (suggestions) pour éviter les doublons avant création.
- **Paramètres** : préférences utilisateur (jardin par défaut, distance de pollinisation par défaut, etc.) ; gestion des comptes utilisateurs selon les écrans prévus.

---

## 13. Synthèse des choix de conception

| Aspect | Choix | Raison |
|--------|--------|--------|
| Espèces vs spécimens | Espèce = fiche référence ; Spécimen = individu dans un jardin | Séparation claire entre connaissance partagée et suivi personnel. |
| Onglet Espèces filtré par jardin | Afficher seulement les espèces qui ont un spécimen dans le jardin par défaut | Vue « mon jardin » sans mélanger avec tout le catalogue. |
| Bibliothèque séparée | Catalogue complet, par genre, sans filtre « has_specimen » | Explorer et ajouter de nouvelles espèces sans encombrer l’onglet Espèces. |
| Recherche à l’ajout | Modal espèce avec recherche ; API search_vector (SearchQuery + SearchRank) + noms alternatifs (OrganismNom), fallback icontains | Trouver rapidement l’espèce (y compris par noms alternatifs) au moment de créer un spécimen. |
| Cultivar optionnel | Choix après l’espèce, liste déroulante « Aucune variété » + cultivars | Couvre les cas sans variété et les fruitiers avec variétés. |
| Liste / grille spécimens | Deux modes + filtres (tous, favoris, zone, santé/statut) | Adapter la vue au nombre de spécimens et au besoin (liste dense vs visuelle). |
| Fiche specimen | Infos de base → Pollinisation → Photos → Rappels → Événements | Ordre logique : qui c’est, avec qui (pollinisation), traces (photos, rappels, événements). |
| Rappels liés au spécimen | Toujours attachés à un specimen | Actions concrètes sur un plant, cohérent avec le concept jardin. |
| Événements + photos | Types nombreux, photos attachées, section dédiée sur la fiche | Historique riche et traçable (plantation, taille, récolte, mort, etc.). |
| Favoris espèces et spécimens | Même pattern étoile, filtres dédiés | Accès rapide à ce qu’on suit le plus. |
| Jardin par défaut | Pilote Espèces, Spécimens et pré-remplissage à l’ajout | Expérience cohérente « un jardin à la fois » sans changer de contexte à chaque action. |
| Filtre Taille (bibliothèque) | Vigueur porte-greffe : Nain, Semi-nain, Semi-vigoureux, Vigoureux, Standard | Filtrer les espèces qui ont au moins un cultivar avec un porte-greffe de cette vigueur. |
| Badge Disponible chez | has_availability (annotation API) en liste ; sources dérivées des cultivars sur la fiche espèce | Signal discret qu'une espèce est disponible en pépinière (Ancestrale, Arbres en Ligne, etc.). |

Ce document est mis à jour au fur et à mesure des évolutions de l’app (nouveaux écrans, nouveaux filtres, etc.).

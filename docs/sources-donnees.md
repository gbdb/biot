# Sources de données (espèces)

Ce document liste les **sources** utilisées pour alimenter la base espèces (tableaux, liens, licences) et rappelle les **commandes d’import** et l’ordre recommandé. Pour le pipeline complet (purification, fusion multi-sources, choix techniques, référence des champs), voir [Import des espèces : purification, spécialisation et enrichissement](import-especes-et-fusion-sources.md).

| Source | Contenu principal | Conditions / Licence | Lien |
|--------|-------------------|----------------------|------|
| **Hydro-Québec** | Arbres et arbustes : dimensions, sécurité (distance lignes), rusticité, sol, exposition, descriptions (feuilles, fleurs, fruits) | Données ouvertes, usage raisonnable | [arbres.hydroquebec.com](https://arbres.hydroquebec.com), [Données Québec – Répertoire arbres](https://donnees.hydroquebec.com/explore/dataset/repertoire-arbres/) |
| **PFAF** (Plants For A Future) | Comestibilité, usages (médicinal, artisanat), toxicité, zones de rusticité, culture | **Base payante** : Standard Home 50 USD (usage privé), Commercial 150 USD, Student 30 USD. ~7400 plantes tempérées. | [pfaf.org](https://pfaf.org) ; achat et téléchargement sur le site |
| **VASCAN** (Canadensys) | Flore vasculaire du Canada : noms scientifiques, noms vernaculaires (FR/EN), statut indigène, distribution par province | Données ouvertes, Canadensys | [data.canadensys.net/vascan](https://data.canadensys.net/vascan), [API](https://data.canadensys.net/vascan/api) |
| **USDA / ITIS** | TSN (Taxonomic Serial Number), noms scientifiques acceptés, royaume (Plantae) | Domaine public (US Govt) | [itis.gov](https://www.itis.gov), [API ITIS](https://www.itis.gov/web_service.html) |
| **Ville de Québec** | Inventaire « Arbres répertoriés » : NOM_LATIN, NOM_FRANCAIS, présence en inventaire | Données ouvertes Québec | [Données Québec – Arbres répertoriés (vque_26)](https://donneesquebec.ca/recherche/dataset/vque_26) |
| **Ville de Montréal** | Inventaire « Arbres publics » : essences (genre/espèce), présence en inventaire | Données ouvertes Montréal | [donnees.montreal.ca – Arbres](https://donnees.montreal.ca/dataset/arbres) |

## Clés de liaison (éviter les doublons)

- **vascan_id** : identifiant taxon VASCAN (ex. 20142 pour *Malus domestica*).
- **tsn** : Taxonomic Serial Number ITIS/USDA (ex. 516655 pour *Malus domestica*).

Les commandes d'import (`import_vascan`, `import_usda`, `import_hydroquebec`, etc.) utilisent `find_or_match_organism()` qui priorise le match par `vascan_id`, puis `tsn`, puis par nom latin / nom commun.

Pour le détail du pipeline d'import (purification des noms, séparation espèce/cultivar, fusion multi-sources), voir [Import des espèces : purification, spécialisation et enrichissement](import-especes-et-fusion-sources.md).

## Ordre des imports

**Tu peux lancer les imports dans n'importe quel ordre.** Les données s'accumulent : chaque import fait un match (par identifiant ou par nom) puis ajoute ou met à jour les champs de sa source. Refaire un import ne casse rien, ça complète ou met à jour.

Recommandations pratiques :

1. **Aucun ordre obligatoire** – VASCAN, USDA, Hydro-Québec, PFAF, etc. peuvent être faits dans l'ordre que tu veux. Les organismes sont trouvés ou créés, puis enrichis avec la source courante.

2. **Fusion des doublons à la fin** – Après avoir fait plusieurs imports, lance **Merge doublons** (ou d'abord **Merge doublons (simulation)** pour vérifier). Cela fusionne les lignes qui correspondent à la même espèce (même nom latin normalisé + nom commun), ce qui peut apparaître quand plusieurs sources ont créé des entrées légèrement différentes.

3. **Propriétés / usages / calendrier** – La commande `populate_proprietes_usage_calendrier` remplit les tables dérivées à partir des organismes et de `data_sources`. Tu peux la lancer après les imports (et éventuellement après le merge), puis la relancer si tu ajoutes de nouvelles sources.

En résumé : ordre libre pour les imports ; terminer par un merge des doublons si tu as fait plusieurs sources.

## Création vs enrichissement : avoir plus que ~1700 espèces

- **Qui crée des organismes ?** Seules certaines commandes **créent** de nouveaux organismes : **Hydro-Québec** (≈ 1700 arbres/arbustes), **import_vascan --file** (liste de noms), **import_pfaf --file**, **import_arbres_quebec** / **import_arbres_montreal** (avec fichier).
- **Enrichissement uniquement :** Les boutons « Import VASCAN » et « Import USDA » dans l’app utilisent le mode **--enrich** : ils ne font qu’ajouter `vascan_id` / `tsn` aux organismes **déjà en base**. Ils ne créent pas de nouvelles espèces. Donc si tu n’as que des espèces créées par Hydro-Québec, tu restes à environ 1700.

**Pour avoir plus d’espèces (ex. toute la flore vasculaire du Canada, ~33 000 noms dans VASCAN) :**

1. Va sur le **Checklist builder VASCAN** : [data.canadensys.net/vascan/checklist](https://data.canadensys.net/vascan/checklist).
2. Choisis tes critères (rangs : espèces, sous-espèces, variétés ; province, statut, etc.) puis génère la liste.
3. Télécharge l’export en **fichier texte tab-delimited**.
4. En ligne de commande :  
   `python manage.py import_vascan --file chemin/vers/fichier_telecharge.txt`  
   (La commande accepte un nom par ligne ou un fichier tab-delimited ; la première colonne est utilisée comme nom scientifique.)
5. Ensuite tu peux lancer **Import USDA** (enrichissement) pour ajouter le TSN à ces organismes.

Tu peux aussi combiner : d’abord Hydro-Québec (1700), puis import_vascan --file avec une grosse liste VASCAN pour ajouter des milliers d’espèces supplémentaires (les doublons seront fusionnés par nom).

## Commandes d'import

- `python manage.py import_vascan --enrich --limit 50` : enrichit les organismes existants avec VASCAN.
- `python manage.py import_vascan --file noms.txt` : **crée** des organismes à partir d’un fichier (un nom latin par ligne, ou export tab-delimited VASCAN). Permet de dépasser les ~1700 espèces d’Hydro-Québec.
- `python manage.py import_usda --enrich --limit 50` : enrichit avec le TSN ITIS/USDA.
- `python manage.py import_hydroquebec --limit 50` ou `--file arbres.json` : import Hydro-Québec.
- `python manage.py import_pfaf --file pfaf.csv` : import PFAF (CSV/JSON/SQLite).
- `python manage.py import_arbres_quebec --file arbres_quebec.csv` : associe les espèces à l'inventaire Québec.
- `python manage.py import_arbres_montreal --file arbres_montreal.csv` : associe les espèces à l'inventaire Montréal.
- `python manage.py populate_proprietes_usage_calendrier` : remplit Propriétés, Usages, Calendrier depuis les champs Organism et data_sources.

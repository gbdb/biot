# Prochaines étapes possibles

> **Données botaniques** : les imports de masse se font sur **Radix Sylva** ; BIOT synchronise avec **`sync_radixsylva`** — pas de contradiction avec les pistes ci‑dessous (qualité des fiches, champs, etc.), qui concernent surtout le **contenu** après sync.

Liste optionnelle d’enrichissements et d’évolutions, dérivée du doc [Import des espèces](import-especes-et-fusion-sources.md) (§8.4 et §9). Aucune n’est obligatoire ; à prioriser selon les besoins et la disponibilité des données.

---

## Qualité des fiches espèces

- [ ] **Fiches complètes** : viser zones, sol, usages, calendrier, compagnonnage bien renseignés pour permettre rappels et événements attendus côté app (ex. « Floraison attendue : mai–juin » pour un pommier).

---

## Champs manquants par rapport à une fiche type

| Piste | Statut actuel en BIOT | Action possible |
|-------|------------------------|------------------|
| **Description structurée : feuilles** (forme, couleur, disposition) | Texte libre dans `description` ou `data_sources` | Champ ou structure dédiée si source disponible |
| **Description structurée : fleurs** (couleur, période, forme) | Idem ; période partiellement dans OrganismCalendrier (floraison) | Idem |
| **Description structurée : fruits** (aspect, maturation) | `parties_comestibles`, `periode_recolte` ; pas d’« aspect fruit » | Champ dédié optionnel |
| **Port / silhouette** | Possible dans `description` | Champ dédié ou laisser en texte libre |
| **Multiplication** (bouture, semis, division, greffe) | Aucun champ ou table dédiée | Table ou champ selon besoins |
| **Entretien** (taille, soins) | Partiel via OrganismCalendrier (taille) | Champ « entretien » ou étendre le calendrier |
| **Précautions dédiées** (contre-indications) | `toxicite` couvre une partie seulement | Champ « précautions » ou « contre-indications » |

---

## Côté app / expérience utilisateur

- [ ] **Événements attendus et rappels suggérés** : à partir de `OrganismCalendrier` (floraison, récolte, semis, taille) et des spécimens du jardin (ou favoris), afficher « Ce mois-ci : floraison attendue (Pommier, Lilas…), récolte attendue… » et proposer de créer un rappel ou un événement avec une date par défaut. Couche dérivée « expected events » (API ou vue), sans modifier les modèles `Event` ou `Reminder`.

---

## Nouvelles sources de données

- [ ] **Maladies et ravageurs** : source potentielle Espace pour la vie / MAPAQ ; stockage dans `data_sources` ou table dédiée, à définir.

---

*Référence : [import-especes-et-fusion-sources.md](import-especes-et-fusion-sources.md) §8.4 et §9.*

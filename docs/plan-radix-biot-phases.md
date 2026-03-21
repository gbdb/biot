# Plan global — Radix Sylva ↔ Jardin bIOT

Ordre recommandé des phases (mis à jour quand une étape est terminée).

## Domaine public Radix (décision actuelle)

- **Pas** `radixsylva.org` pour l’instant.
- Hébergement public prévu sous un **sous-domaine de `jardinbiot.ca`** (ex. `radix.jardinbiot.ca` ou `botanique.jardinbiot.ca` — à choisir).
- Cela simplifie DNS, certificats TLS et la relation « même famille » de services.

---

## Phase 0 — Infra DigitalOcean (nouvelle, **avant** migration données / prod Radix)

Objectif : disposer d’un environnement **stable en ligne** pour PostgreSQL (et plus tard l’app Radix), sans mélanger avec le déploiement applicatif détaillé des phases suivantes.

Voir le guide détaillé : **[hebergement-radix-digitalocean.md](hebergement-radix-digitalocean.md)**.

En bref :

1. Compte DigitalOcean, projet, région (ex. `tor1` ou `nyc3`).
2. **Droplet** Ubuntu LTS (taille selon charge ; PostgreSQL + Django plus tard sur le même droplet *ou* séparation plus tard).
3. **PostgreSQL** : soit **Managed Database** DO (recommandé pour backups / HA simples), soit Postgres installé sur le droplet (moins cher, plus d’ops).
4. **Pare-feu** : SSH restreint, ports 80/443 quand Nginx sera en place ; Postgres **non exposé sur Internet** (accès depuis le droplet app uniquement, ou réseau privé DO si Managed DB + App sur VPC).
5. **DNS** chez le registrar de `jardinbiot.ca` : enregistrement **A** (ou CNAME) du sous-domaine choisi → IP du droplet (ou du load balancer).
6. **Sauvegardes** : snapshots droplet et/ou backups DO Managed DB ; noter où sont les secrets (`DATABASE_URL`, `RADIX_SYLVA_SYNC_API_KEYS`).

*Livrable phase 0 :* base Radix accessible depuis une machine de confiance (tunnel SSH ou réseau privé), schéma prêt pour `migrate`, **sans** obligation d’avoir déjà l’API publique en HTTPS.

---

## Phase 1.5 — Migration / données Radix prod

- Stratégie dump / import ou ré-import depuis sources sur l’instance Postgres **phase 0**.
- Première sync vers BIOT prod quand les deux existent (`sync_radixsylva --full`, `RadixSyncState`).

---

## Phase 1.6 — Radix « en ligne » (app Django + API)

- Déployer le code `radixsylva/` sur le droplet (Gunicorn + Nginx, ou équivalent).
- HTTPS (Let’s Encrypt) sur le **sous-domaine `*.jardinbiot.ca`**.
- Variables : `ALLOWED_HOSTS`, `DATABASE_URL`, `RADIX_SYLVA_SYNC_API_KEYS`, `SECRET_KEY`, etc.
- Tests smoke : `/api/v1/organisms/`, `/api/v1/sync/meta/` (avec clé si activée).

---

## Phase 3 — BIOT : catalogue read-only, nettoyage

- Moins de duplication avec Radix ; retrait progressif des chemins d’import côté BIOT.
- Doc README / mobile / admin alignés.

---

## Phase 4 — E2E, déploiement BIOT, mobile prod, hors-ligne (optionnel)

---

## Références

- **Deux dépôts GitHub + une fenêtre Cursor** : [github-repos-separation.md](github-repos-separation.md)
- État fonctionnel actuel (Pass C) : [radix-biot-pass-c.md](radix-biot-pass-c.md)
- Postgres dev BIOT : [dev-postgres-etapes-3-4.md](dev-postgres-etapes-3-4.md)
- Déploiement BIOT (Proxmox / autre) : [../DEPLOYMENT.md](../DEPLOYMENT.md)

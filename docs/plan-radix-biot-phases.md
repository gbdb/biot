# Plan global — Radix Sylva ↔ Jardin bIOT

Ordre recommandé des phases (mis à jour quand une étape est terminée).

## État (résumé)

| Phase | Statut | Notes |
|-------|--------|--------|
| **0** — Infra DO | **Fait** | Droplet Toronto, Postgres sur serveur, DNS `radix.jardinbiot.ca`, TLS |
| **1.6** — Radix en ligne | **Fait** | Gunicorn, Nginx, HTTPS ; voir `radixsylva/CONTEXT.md` |
| **1.5** — Données Radix + sync BIOT | **Fait** | Données prod sur Radix ; `sync_radixsylva --full` depuis BIOT vers `https://radix.jardinbiot.ca/api/v1` validé (**559 organismes**, **1010 cultivars**) ; search vectors reconstruits |
| **3** — Sync catalogue BIOT ← Radix | **Fait** | Boucle opérationnelle : `RADIX_SYLVA_API_URL` + `sync_radixsylva` / `--full` — voir [`sync_radixsylva.py`](../species/management/commands/sync_radixsylva.py) |
| **3 suite** — BIOT read-only / nettoyage code & doc | **Fait** | Doc + inventaire + UI `/admin/gestion-donnees/` (bandeau Radix prod) — [checklist-phase-3-nettoyage-biot.md](checklist-phase-3-nettoyage-biot.md) |
| **4** — E2E, déploiement BIOT, mobile prod, hors-ligne | **Fait (cœur prod)** | BIOT sur **`https://jardinbiot.ca`** ; DO + Gunicorn + Nginx + TLS ; GitHub Actions (`main` → `/srv/jardinbiot/`) ; sync Radix validée — [deploy-production-digitalocean-github.md](deploy-production-digitalocean-github.md) |

**Suite (optionnel)** : tests E2E automatisés, builds mobile release, stratégie hors-ligne — [checklist-phase-4-biot-prod.md](checklist-phase-4-biot-prod.md).

## Domaine public Radix (décision actuelle)

- **Pas** `radixsylva.org` pour l’instant.
- Hébergement public prévu sous un **sous-domaine de `jardinbiot.ca`** (ex. `radix.jardinbiot.ca` ou `botanique.jardinbiot.ca` — à choisir).
- Cela simplifie DNS, certificats TLS et la relation « même famille » de services.

---

## Phase 0 — Infra DigitalOcean (nouvelle, **avant** migration données / prod Radix)

Objectif : disposer d’un environnement **stable en ligne** pour PostgreSQL (et plus tard l’app Radix), sans mélanger avec le déploiement applicatif détaillé des phases suivantes.

Voir le guide détaillé : **[hebergement-radix-digitalocean.md](hebergement-radix-digitalocean.md)**.  
**Exécution concrète (ordre des étapes, systemd, HTTPS)** : **[deploy-radix-digitalocean-runbook.md](deploy-radix-digitalocean-runbook.md)**.

En bref :

1. Compte DigitalOcean, projet, région (ex. `tor1` ou `nyc3`).
2. **Droplet** Ubuntu LTS (taille selon charge ; PostgreSQL + Django plus tard sur le même droplet *ou* séparation plus tard).
3. **PostgreSQL** : soit **Managed Database** DO (recommandé pour backups / HA simples), soit Postgres installé sur le droplet (moins cher, plus d’ops).
4. **Pare-feu** : SSH restreint, ports 80/443 quand Nginx sera en place ; Postgres **non exposé sur Internet** (accès depuis le droplet app uniquement, ou réseau privé DO si Managed DB + App sur VPC).
5. **DNS** chez le registrar de `jardinbiot.ca` : enregistrement **A** (ou CNAME) du sous-domaine choisi → IP du droplet (ou du load balancer).
6. **Sauvegardes** : snapshots droplet et/ou backups DO Managed DB ; noter où sont les secrets (`DATABASE_URL`, `RADIX_SYLVA_SYNC_API_KEYS`).

*Livrable phase 0 :* base Radix accessible depuis une machine de confiance (tunnel SSH ou réseau privé), schéma prêt pour `migrate`, **sans** obligation d’avoir déjà l’API publique en HTTPS.

**Statut : livré** (voir `radixsylva/CONTEXT.md`, `radixsylva/docs/env-et-deploiement.md`).

---

## Phase 1.5 — Migration / données Radix prod

**Guide pas à pas (pg_dump Mac → `radix_staging` DO)** : **[migration-donnees-radix-phase-1-5.md](migration-donnees-radix-phase-1-5.md)**.

- Stratégie dump / import ou ré-import depuis sources sur l’instance Postgres **phase 0** (cible : base **`radix_prod`** sur le droplet).
- Ordre conseillé : tester sur **`radix_staging`** (import / `migrate` / smoke API), puis copie ou bascule vers **`radix_prod`** quand le jeu de données est validé.
- Première sync vers BIOT quand les deux existent : `sync_radixsylva --full` côté Jardin bIOT, `RadixSyncState` à jour ; pointer `RADIX_SYLVA_API_URL` vers `https://radix.jardinbiot.ca/api/v1`.
- Détail technique (tables `species_*`, photos, `photo_principale`) : README Radix + [import-especes-et-fusion-sources.md](import-especes-et-fusion-sources.md) selon la stratégie retenue.

**Statut : livré** — sync complète validée (ex. **559 organismes**, **1010 cultivars** depuis l’API prod ; `rebuild_search_vectors` effectué).

---

## Phase 1.6 — Radix « en ligne » (app Django + API)

- Déployer le code `radixsylva/` sur le droplet (Gunicorn + Nginx, ou équivalent).
- HTTPS (Let’s Encrypt) sur le **sous-domaine `*.jardinbiot.ca`**.
- Variables : `ALLOWED_HOSTS`, `DATABASE_URL`, `RADIX_SYLVA_SYNC_API_KEYS`, `SECRET_KEY`, etc.
- Tests smoke : `/api/v1/organisms/`, `/api/v1/sync/meta/` (avec clé si activée).

**Statut : livré** (`https://radix.jardinbiot.ca/` — admin et API).

---

## Phase 3 — BIOT : catalogue read-only, nettoyage

### Sync BIOT ← Radix (boucle données)

- **Statut : livré.** La commande **`sync_radixsylva`** / **`--full`** consomme `https://radix.jardinbiot.ca/api/v1` ; cache local aligné (ex. **559 organismes**, **1010 cultivars**) ; search vectors reconstruits.

### Suite — read-only strict & nettoyage (toujours « phase 3 »)

- Moins de duplication avec Radix ; **retrait progressif** des chemins d’import / commandes redondantes côté BIOT (cf. [radix-biot-pass-c.md](radix-biot-pass-c.md)).
- Doc README / mobile / admin alignés sur le flux Radix + sync.
- Lenteur au démarrage de `manage.py` : **[performance-django-startup.md](performance-django-startup.md)**.

**Statut : livré** (mars 2026) — bandeau Radix + lien API prod sur `/admin/gestion-donnees/` ; doc et inventaire à jour.

---

## Phase 4 — E2E, déploiement BIOT, mobile prod, hors-ligne (optionnel)

Objectif : même niveau de **maturité prod** pour **Jardin bIOT** que pour Radix (ou proche), avec une app mobile utilisable en conditions réelles.

### Livré (mars 2026)

- **Jardin bIOT en production** : `https://jardinbiot.ca` (DigitalOcean, même droplet que Radix : `137.184.169.255`).
- **Radix Sylva** : déjà en prod `https://radix.jardinbiot.ca` ; PostgreSQL local sur le droplet ; Gunicorn + Nginx + Let’s Encrypt pour **les deux** apps.
- **GitHub Actions** : push **`main`** → déploiement SSH vers `/srv/jardinbiot/` (BIOT) et `/srv/radixsylva/` (Radix) ; secrets `DROPLET_IP`, `SSH_PRIVATE_KEY`.
- **Config Django** : `STATIC_ROOT = BASE_DIR / 'staticfiles'` dans le dépôt ; **pas** de modification manuelle de `settings.py` sur le serveur — tout passe par Git.
- **Serveur** : `git config --global --add safe.directory` pour `/srv/jardinbiot` et `/srv/radixsylva` si nécessaire (ownership Git).
- **Sync** : `sync_radixsylva --full` validé (**559** organismes, **1010** cultivars).

Document consolidé : **[deploy-production-digitalocean-github.md](deploy-production-digitalocean-github.md)**.

### Optionnel (à poursuivre)

1. **Tests E2E automatisés** — Playwright / autre si tu l’ajoutes.
2. **Mobile prod** — `EXPO_PUBLIC_API_URL` vers `https://jardinbiot.ca` ; builds release ; tests appareil.
3. **Hors-ligne** — stratégie cache / file d’attente.

Checklist détaillée : **[checklist-phase-4-biot-prod.md](checklist-phase-4-biot-prod.md)**.

---

## Références

- **Prod DigitalOcean + GitHub Actions (BIOT + Radix)** : [deploy-production-digitalocean-github.md](deploy-production-digitalocean-github.md)
- **Checklist phase 4 (prod BIOT, mobile, tests)** : [checklist-phase-4-biot-prod.md](checklist-phase-4-biot-prod.md)
- **Checklist phase 3 suite** : [checklist-phase-3-nettoyage-biot.md](checklist-phase-3-nettoyage-biot.md)
- **Inventaire commandes `species/management/commands/`** : [species-management-commands-inventory.md](species-management-commands-inventory.md)
- **Phase 1.5 — migration données** : [migration-donnees-radix-phase-1-5.md](migration-donnees-radix-phase-1-5.md)
- **Deux dépôts GitHub + une fenêtre Cursor** : [github-repos-separation.md](github-repos-separation.md)
- État fonctionnel actuel (Pass C) : [radix-biot-pass-c.md](radix-biot-pass-c.md)
- Postgres dev BIOT : [dev-postgres-etapes-3-4.md](dev-postgres-etapes-3-4.md)
- Déploiement BIOT (Proxmox / autre) : [../DEPLOYMENT.md](../DEPLOYMENT.md)
- Démarrage Django / `manage.py` lent : [performance-django-startup.md](performance-django-startup.md)

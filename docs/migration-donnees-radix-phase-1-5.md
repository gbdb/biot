# Phase 1.5 — Migrer les données Radix (Mac → DigitalOcean)

Objectif : charger **`radix_staging`** sur le droplet avec un jeu de données **réaliste** (souvent une copie de ton Postgres Radix local), valider l’API, puis **optionnellement** copier vers **`radix_prod`** ou basculer `DATABASE_URL` de l’app.

Références : [plan-radix-biot-phases.md](plan-radix-biot-phases.md), [radixsylva/CONTEXT.md](../../radixsylva/CONTEXT.md).

---

## Prérequis

| Élément | Détail |
|--------|--------|
| Code | Même **branche / tag** Radix sur le Mac et sur `/srv/radixsylva/` (évite décalage de migrations). |
| Cible DO | Bases **`radix_staging`** et **`radix_prod`** existantes ; utilisateur `radix` avec droits. |
| Accès | **SSH** vers le droplet ; `psql` / `pg_dump` / `pg_restore` installés (Mac : Postgres.app ou `brew install libpq`). |
| Données source | De préférence la base **Radix** locale (Docker `radixsylva` sur le port **5433**, ou équivalent). |

Si ta vérité locale est encore surtout dans **Jardin bIOT** (tables `species_*` sous l’app `species`), l’export est plus délicat (FK, `photo_principale`) — privilégier d’abord une base **Radix** à jour en local, ou un ré-import sur Radix via `import_*` puis dump.

---

## Scénario recommandé — `pg_dump` de la base Radix locale → `radix_staging`

### 1. Sur le Mac : variables d’export

Adapte utilisateur, mot de passe, port (5433 = Docker Radix dans ce repo).

```bash
export SRC_URL="postgres://radixsylva:radixsylva@127.0.0.1:5433/radixsylva"
export DUMP_FILE="$HOME/radix_staging_$(date +%Y%m%d).dump"
```

### 2. Dump au format custom (compressé, pratique pour `pg_restore`)

Inclure **`--no-owner`** et **`--no-privileges`** pour éviter d’exporter des rôles / droits qui n’existent pas sur le serveur DigitalOcean (sinon erreurs au `pg_restore`).

```bash
pg_dump "$SRC_URL" --format=custom --no-owner --no-privileges --file="$DUMP_FILE"
```

### 3. Copier le fichier sur le droplet

```bash
scp "$DUMP_FILE" root@137.184.169.255:/tmp/
```

(ou utilisateur SSH habituel si ce n’est pas `root`).

### 4. Sur le droplet : vider et restaurer `radix_staging`

**Attention** : cela **remplace** le contenu actuel de `radix_staging`.

```bash
# Connexion (exemple — adapte host/mot de passe)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS radix_staging;"
sudo -u postgres psql -c "CREATE DATABASE radix_staging OWNER radix;"
```

Puis restauration (le propriétaire des objets doit rester cohérent ; **`--no-owner --no-privileges`** recommandés) :

```bash
sudo -u postgres pg_restore --dbname=radix_staging --verbose --no-owner --no-privileges --exit-on-error /tmp/radix_staging_*.dump
```

Si des erreurs liées aux extensions ou permissions apparaissent, vérifier que le rôle `radix` existe et que les extensions PostgreSQL nécessaires sont activées sur le serveur (souvent `CREATE EXTENSION IF NOT EXISTS ...`).

### 5. Nettoyer le dump sur le serveur

```bash
rm /tmp/radix_staging_*.dump
```

---

## Après restauration

1. **Vérifier** que Django voit le schéma attendu (sur le serveur, avec `DATABASE_URL` pointant vers **`radix_staging`** le temps du test) :

   ```bash
   cd /srv/radixsylva && source .venv/bin/activate
   export DATABASE_URL="postgres://radix:MOT_DE_PASSE@127.0.0.1:5432/radix_staging"
   python manage.py migrate --plan
   ```

   Si des migrations sont à appliquer, les appliquer **ou** s’assurer que le schéma dumpé correspond déjà au code déployé.

2. **Smoke API** (en pointant l’app Gunicorn vers staging, ou via `runserver` local sur le serveur avec cette URL) :

   - `GET /api/v1/organisms/`
   - `GET /api/v1/sync/meta/`

3. **BIOT** (Mac) : dans `.env`, `RADIX_SYLVA_API_URL=https://radix.jardinbiot.ca/api/v1` puis :

   ```bash
   python manage.py sync_radixsylva --full
   ```

   Tant que l’API publique lit **`radix_prod`**, la sync ne récupérera les données de **staging** que si tu **bascules** le `DATABASE_URL` de l’app Radix vers `radix_staging` (tests) ou si tu **copies** staging → prod (voir ci‑dessous).

---

## Passer de staging à prod

Quand le contenu de **`radix_staging`** est validé :

- **Option A** : `pg_dump radix_staging` + `pg_restore` vers **`radix_prod`** (ou `DROP`/`CREATE` + restore comme pour staging).  
- **Option B** : `DATABASE_URL` de l’app en production pointant déjà vers **`radix_prod`** — tu restaures directement dans `radix_prod` une fois prêt (sans passer par staging).

En production, l’URL du site reste la même ; seul le **contenu** de la base change.

---

## Alternative — pas de dump : ré-import sur le serveur

Si tu préfères un jeu **neuf** (ex. Hydro uniquement) :

```bash
cd /srv/radixsylva && source .venv/bin/activate
# DATABASE_URL=... radix_staging
python manage.py import_hydroquebec ...
```

Plus long, mais **pas de dépendance** à une base Mac.

---

## Pièges connus

- **Photos** : `species_espece.photo_principale_id` pointe vers `species_organismphoto` sur Radix ; un dump depuis une vieille base BIOT peut nécessiter des ajustements (voir README Radix).  
- **Secrets** : ne pas commiter les fichiers `.dump` ni les mots de passe dans la doc.  
- **Migrations** : même code Git sur le Mac et le serveur avant de comparer dump et `migrate`.  
- **Mots de passe `.env`** : éviter **`#`** et **`!`** dans les mots de passe utilisés dans `DATABASE_URL` (parsing `.env` / shell) — voir `radixsylva/docs/env-et-deploiement.md`.  
- **Staging → prod** : procédure serveur documentée dans **`radixsylva/docs/env-et-deploiement.md`** (§7).

---

## Suite du plan (après phase 1.5 stable)

- Marquer la phase 1.5 comme **terminée** côté données **prod** (`radix_prod` + API validée).  
- Enchaîner : **phase 3** (BIOT catalogue read-only, nettoyage des doublons d’import) — [plan-radix-biot-phases.md](plan-radix-biot-phases.md).

# Runbook — Radix Sylva sur DigitalOcean (exécution)

Ce document est la **checklist opérationnelle** pour héberger Radix : Postgres managé + droplet + HTTPS.  
Contexte : [hebergement-radix-digitalocean.md](hebergement-radix-digitalocean.md) et [plan-radix-biot-phases.md](plan-radix-biot-phases.md).

**Principe** : une base **staging** (dev / migrations / tests) et une base **prod** (données réelles) — même cluster Managed DB possible, **deux databases** distinctes.

---

## Ordre recommandé (résumé)

1. Projet + région DigitalOcean  
2. **Droplet** Ubuntu (noter l’IP) — ou créer la DB avant et ajouter les *trusted sources* après  
3. **Managed PostgreSQL** : créer **deux** bases (`radix_staging`, `radix_prod` par ex.) + utilisateur(s)  
4. **Trusted sources** : IP du **droplet** (obligatoire pour Gunicorn → Postgres) ; optionnellement ton **IP maison** pour `psql` / Django depuis le Mac (sinon tunnel SSH)  
5. **DNS** : `A` `radix` → IP du droplet  
6. **Déployer l’app** sur le droplet (§ [Déploiement app sur le droplet](#déploiement-app-sur-le-droplet))  
7. **Certbot** HTTPS  
8. Côté **Jardin bIOT** (Mac) : `RADIX_SYLVA_API_URL=https://radix.<domaine>/api/v1` + clé sync si activée  

---

## 1. DigitalOcean — projet et région

- [ ] Créer un **Project** (ex. « Jardin Biot / Radix »).  
- [ ] Choisir une **région** (ex. `tor1`, `nyc3`) et **s’y tenir** pour la DB et le droplet (latence + facturation VPC si tu l’utilises plus tard).

---

## 2. Droplet (application)

- [ ] **Create** → Droplets → **Ubuntu 24.04 LTS**.  
- [ ] Taille : **2 Go RAM** minimum confortable pour Gunicorn + Nginx (1 Go = tests serrés).  
- [ ] Auth : **clé SSH** uniquement.  
- [ ] Noter l’**IPv4** publique : `________________`

**Firewall cloud (DigitalOcean)** — à ajuster une fois la DB créée :

- [ ] **22/tcp** : ta plage IP (ou `/32` maison) — pas `0.0.0.0/0` si possible.  
- [ ] **80/tcp** et **443/tcp** : `0.0.0.0/0` (HTTP/HTTPS publics pour l’API).  

---

## 3. Managed PostgreSQL

- [ ] **Databases** → Create → **PostgreSQL** (v16+), **même région** que le droplet.  
- [ ] Créer **deux databases** dans l’UI (onglet *Users & Databases*), par exemple :  
  - `radix_staging` — développement, migrations risquées, imports de test  
  - `radix_prod` — données réelles, migrations validées  
- [ ] Noter **host**, **port**, **user**, **password** (DO les affiche une fois ; garde-les dans un gestionnaire de secrets).

### Trusted sources (Managed DB)

- [ ] Ajouter l’**IP du droplet** (le serveur qui héberge Gunicorn doit joindre Postgres).  
- [ ] Option A — **IP de ton Mac** : pour `manage.py migrate` / dev direct contre staging (simple, IP dynamique = à mettre à jour).  
- [ ] Option B — **Pas d’IP Mac** : utiliser un **tunnel SSH** depuis le Mac vers le droplet, puis `psql`/`DATABASE_URL` via localhost (voir [env-et-deploiement.md](../../radixsylva/docs/env-et-deploiement.md) dans le repo Radix).

**URL type** (à adapter user/pass/host/db) :

```text
postgres://USER:PASSWORD@HOST:PORT/radix_staging?sslmode=require
postgres://USER:PASSWORD@HOST:PORT/radix_prod?sslmode=require
```

---

## 4. DNS (`jardinbiot.ca`)

- [ ] Chez le registrar DNS : enregistrement **A**  
  - **Nom** : `radix` (ou le préfixe choisi)  
  - **Valeur** : **IP du droplet**  
- [ ] Attendre la propagation (souvent quelques minutes ; TTL bas = tests plus rapides).

---

## 5. Déploiement app sur le droplet

Remplace `radix.jardinbiot.ca` par ton **vrai** sous-domaine.

### 5.1 Paquets système

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.12-venv python3-pip nginx git
# Certificat TLS
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Utilisateur dédié (recommandé)

```bash
sudo adduser --disabled-password --gecos "" radix
sudo mkdir -p /srv/radixsylva
sudo chown radix:radix /srv/radixsylva
```

### 5.3 Code (depuis GitHub)

En tant que `radix` (ou `sudo -u radix bash`) :

```bash
cd /srv/radixsylva
git clone https://github.com/gbdb/Radix-Sylva.git .
# ou SSH : git@github.com:gbdb/Radix-Sylva.git
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
```

### 5.4 Fichier `.env` sur le serveur

Créer `/srv/radixsylva/.env` (permissions `600`) — **ne pas commiter**.

| Variable | Exemple / note |
|----------|----------------|
| `SECRET_KEY` | Générer une clé dédiée serveur (`get_random_secret_key`) |
| `DEBUG` | `False` en prod |
| `ALLOWED_HOSTS` | `radix.jardinbiot.ca,localhost,127.0.0.1` |
| `DATABASE_URL` | URL **prod** (`radix_prod`) pour l’instance publique |
| `CORS_ALLOW_ALL_ORIGINS` | `False` en prod si tu restreins les origines plus tard |
| `RADIX_SYLVA_SYNC_API_KEYS` | Clé(s) longue(s), aléatoire(s) ; même valeur côté BIOT `RADIX_SYLVA_SYNC_API_KEY` |

```bash
cd /srv/radixsylva
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 5.5 Gunicorn (systemd)

Fichier `/etc/systemd/system/radix-gunicorn.service` :

```ini
[Unit]
Description=Radix Sylva Gunicorn
After=network.target

[Service]
User=radix
Group=radix
WorkingDirectory=/srv/radixsylva
Environment="PATH=/srv/radixsylva/.venv/bin"
ExecStart=/srv/radixsylva/.venv/bin/gunicorn \
  --bind 127.0.0.1:8001 \
  --workers 3 \
  radixsylva.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now radix-gunicorn
sudo systemctl status radix-gunicorn
```

### 5.6 Nginx (reverse proxy)

Fichier `/etc/nginx/sites-available/radix` :

```nginx
server {
    listen 80;
    server_name radix.jardinbiot.ca;

    location /static/ {
        alias /srv/radixsylva/staticfiles/;
    }

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 25M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/radix /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5.7 HTTPS (Let’s Encrypt)

```bash
sudo certbot --nginx -d radix.jardinbiot.ca
```

Renouvellement automatique : `certbot` installe en général un timer systemd.

---

## 6. Smoke tests (après HTTPS)

- [ ] `https://radix.jardinbiot.ca/api/v1/organisms/` (JSON)  
- [ ] `https://radix.jardinbiot.ca/api/v1/sync/meta/`  
- [ ] Si clés sync activées : en-tête `X-Radix-Sync-Key` sur `/api/v1/sync/...`  

---

## 7. Jardin bIOT (ton Mac)

Dans **`biot/.env`** :

```env
RADIX_SYLVA_API_URL=https://radix.jardinbiot.ca/api/v1
RADIX_SYLVA_SYNC_API_KEY=<même clé que RADIX_SYLVA_SYNC_API_KEYS côté Radix>
```

Puis :

```bash
python manage.py sync_radixsylva
```

---

## 8. Staging uniquement (migrations / imports risqués)

- Utiliser `DATABASE_URL` pointant vers **`radix_staging`** sur une session (autre `.env` ou export) — **jamais** les imports massifs d’essai sur `radix_prod` sans validation.  
- L’URL publique peut rester branchée sur **prod** ; le staging sert aux opérations lourdes depuis le droplet ou le Mac (avec IP trustée ou tunnel).

---

## 9. Sauvegardes

- [ ] Backups Managed PostgreSQL activés (panneau DO).  
- [ ] Snapshots droplet avant grosses mises à jour (optionnel mais utile).

---

## Références croisées

- Repo Radix : `radixsylva/docs/env-et-deploiement.md`  
- Deux Postgres locaux (Mac) : [dev-env-local-biot-radix.md](dev-env-local-biot-radix.md)

# Hébergement Radix — DigitalOcean (phase 0)

**Runbook pas à pas (checklist, Nginx, Gunicorn, Certbot)** : **[deploy-radix-digitalocean-runbook.md](deploy-radix-digitalocean-runbook.md)**.

Guide pour préparer **PostgreSQL Radix en ligne** et un **droplet** sur DigitalOcean, *avant* de finaliser la migration des données et le déploiement public de l’API.  
URL visée : un **sous-domaine de `jardinbiot.ca`** (ex. `radix.jardinbiot.ca`), pas `radixsylva.org` pour le moment.

---

## 1. Prérequis

- Compte [DigitalOcean](https://www.digitalocean.com/)
- Accès DNS du domaine **`jardinbiot.ca`** (chez ton registrar)
- Choix du sous-domaine : ex. `radix` → `radix.jardinbiot.ca`

---

## 2. Créer le projet et la région

1. **Projects** → Create project (ex. « Jardin Biot / Radix »).
2. Choisir une **région** proche des utilisateurs (ex. Toronto `tor1`, New York `nyc3`).

---

## 3. PostgreSQL pour Radix

Deux approches :

### Option A — Managed Database (recommandé si budget OK)

1. **Databases** → Create → PostgreSQL.
2. Version récente (16+), même région que le futur droplet app.
3. Noter : **host**, **port**, **user**, **mot de passe**, **database** (créer une DB dédiée `radixsylva` si l’UI le permet, ou une seule DB avec utilisateur dédié).
4. **Trusted sources** : au début, *ne pas* ouvrir à `0.0.0.0/0`. Ajouter uniquement :
   - l’IP du **droplet** app (une fois créé), ou
   - le **VPC** si tu relies droplet + DB sur le même réseau privé DO.

`DATABASE_URL` typique :

```text
postgres://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### Option B — PostgreSQL sur le droplet (économique)

1. Créer d’abord le droplet (§4).
2. SSH sur le serveur, installer PostgreSQL (paquets Ubuntu ou Docker local au serveur).
3. Créer utilisateur + DB `radixsylva`, écouter sur `127.0.0.1` seulement (pas d’exposition publique du port 5432).

---

## 4. Droplet (serveur application)

1. **Droplets** → Create → **Ubuntu 24.04 LTS**.
2. **Plan** : au minimum 1 Go RAM pour tests ; viser **2 Go+** si Postgres + Gunicorn + Nginx sur la même machine (option B).
3. **Authentication** : clés SSH uniquement (pas de mot de passe root).
4. **Hostname** : ex. `radix-jardinbiot`.
5. Après création : noter l’**IPv4** publique.

**Firewall DO (cloud)** :

- Autoriser **22/tcp** depuis *ton IP* (ou bastion), pas le monde entier si possible.
- Plus tard : **80/tcp** et **443/tcp** pour le web (Let’s Encrypt + Nginx).

**UFW sur le serveur** (en complément) : miroiter les mêmes règles ; garder **5432 fermé** depuis Internet si Postgres est local.

---

## 5. DNS (`jardinbiot.ca`)

Chez ton hébergeur DNS :

1. Créer un enregistrement **A** :  
   `radix` (ou le préfixe choisi) → **IP du droplet** (ou IP du load balancer si tu en ajoutes un plus tard).
2. TTL : 300–3600 s selon habitude.

Tu pourras émettre un certificat TLS une fois Nginx en place sur ce nom.

---

## 6. Premier accès à la base (sans API publique encore)

- **Option Managed DB** : depuis le droplet, `psql` ou tunnel SSH depuis ton Mac vers le droplet puis vers la DB si les trusted sources le permettent.
- **Option B** : `psql` en local sur le droplet.

Ensuite, sur une machine avec le code `radixsylva/` et le bon `DATABASE_URL` :

```bash
python manage.py migrate
# puis imports / superuser selon ton flux
```

---

## 7. Secrets à préparer (pour la phase 1.6)

| Variable | Rôle |
|----------|------|
| `SECRET_KEY` | Django Radix |
| `DATABASE_URL` | Connexion Postgres |
| `ALLOWED_HOSTS` | Inclure le sous-domaine final |
| `RADIX_SYLVA_SYNC_API_KEYS` | Clés pour `X-Radix-Sync-Key` (sync BIOT → Radix en lecture) ; vide = dev seulement |

Côté **Jardin bIOT** (prod ou staging) : `RADIX_SYLVA_API_URL=https://radix.jardinbiot.ca/api/v1` (exemple) + même clé si tu en actives.

---

## 8. Sauvegardes

- **Droplet** : activer **Backups** DO (payant) ou snapshots manuels avant grosses opérations.
- **Managed PostgreSQL** : backups automatiques DO — vérifier la rétention dans le panneau.

---

## 9. Lien avec le plan global

Cette étape correspond à la **phase 0** dans [plan-radix-biot-phases.md](plan-radix-biot-phases.md). Les phases **1.5** (données) et **1.6** (Django + HTTPS public) s’appuient sur cette fondation.

# Checklist — Phase 4 (suite) : mobile, tests, exploitation

**Déploiement serveur (DO + GitHub Actions + HTTPS)** : déjà fait — voir **[deploy-production-digitalocean-github.md](deploy-production-digitalocean-github.md)** et le bloc « Réalisé » ci‑dessous.

**Plan global** : [plan-radix-biot-phases.md](plan-radix-biot-phases.md)

---

## Ta liste rapide (à cocher de ton côté)

Coche au fur et à mesure ; rien d’obligatoire sauf ce que **toi** tu veux pour « prod complète » (mobile, durcissement, sauvegardes).

### Vérifications prod (une fois)

- [ ] **`.env` sur le serveur** (`/srv/jardinbiot/.env`) : `DEBUG=False`, `SECRET_KEY` unique, `ALLOWED_HOSTS` contient `jardinbiot.ca`, `DATABASE_URL` correct, `RADIX_SYLVA_API_URL=https://radix.jardinbiot.ca/api/v1`.
- [ ] **`CORS`** : adapté à l’app mobile / domaines réels (pas `CORS_ALLOW_ALL_ORIGINS=True` en prod si tu peux éviter).
- [ ] **Pare-feu / Postgres** : port 5432 **non** exposé sur Internet (localhost sur le droplet).
- [ ] **`sync_radixsylva`** lancé **sur le serveur BIOT** après un gros changement Radix (ou cron plus tard) — pas seulement depuis ton Mac.

### Application mobile (Expo)

- [ ] **`mobile/.env`** (local) : `EXPO_PUBLIC_API_URL=https://jardinbiot.ca` (ou sans slash final selon ton `config.ts`).
- [ ] Test **sur téléphone** (4G ou WiFi) : login, liste jardins, une requête API qui touche le catalogue espèces.
- [ ] **Build** preview ou production (EAS ou autre) si tu distribues hors Expo Go.
- [ ] (Optionnel) **Stores** — fiches App Store / Play Store.

### Tests manuels « fumée » sur `https://jardinbiot.ca`

- [ ] Auth (login / JWT).
- [ ] Jardins + spécimens (parcours utilisateur).
- [ ] Recherche / fiche espèce (cache Radix).
- [ ] **Staff** : `/admin/`, `/admin/gestion-donnees/` — sync Radix si besoin.

### Exploitation

- [ ] **Sauvegardes** : `pg_dump` planifié ou snapshot DO ; sauvegarde **médias** si critique.
- [ ] **Logs** : où lire les erreurs (Nginx + journal systemd `jardinbiot-gunicorn`).
- [ ] **Comptes** : peu de comptes staff ; accès GitHub / DO sécurisés.

### Optionnel plus tard

- [ ] **Tests E2E automatisés** (Playwright, etc.).
- [ ] **Mode hors-ligne** mobile — périmètre à définir.
- [ ] **Mises à jour** dépendances Python / `requirements.txt` — créneau prévu.

---

## Réalisé (mars 2026) — rappel

- [x] DigitalOcean — droplet `137.184.169.255`, PostgreSQL local (`jardinbiot`, `radixsylva` + staging selon config).
- [x] URLs — `https://jardinbiot.ca`, `https://radix.jardinbiot.ca` ; Gunicorn + Nginx + Let’s Encrypt.
- [x] GitHub Actions — `main` → `/srv/jardinbiot/` et `/srv/radixsylva/` ; secrets `DROPLET_IP`, `SSH_PRIVATE_KEY`.
- [x] `STATIC_ROOT` + `collectstatic` ; pas de `settings.py` édité à la main sur le serveur.
- [x] `git safe.directory` si nécessaire.
- [x] `sync_radixsylva --full` validé (559 organismes, 1010 cultivars).

---

## Détail (référence — si tu veux plus de granularité)

### 1. Backend Django (production)

**Si tout est déjà en place sur le serveur, tu peux cocher d’un coup « vérifié ».**

- [ ] `SECRET_KEY` unique, pas dans Git.
- [ ] `DEBUG=False` en prod.
- [ ] `ALLOWED_HOSTS` inclut `jardinbiot.ca`.
- [ ] `DATABASE_URL` → base prod sur le droplet.
- [ ] `RADIX_SYLVA_API_URL=https://radix.jardinbiot.ca/api/v1`.
- [ ] `RADIX_SYLVA_SYNC_API_KEY` si clés activées côté Radix.
- [ ] `CORS` aligné mobile + web.

### 2. TLS & réseau

- [ ] HTTPS partout pour l’API utilisée par l’app.
- [ ] Pare-feu : 80/443 publics ; SSH restreint ; Postgres non exposé.

### 3. Processus & static

- [ ] Gunicorn + Nginx + `collectstatic` + systemd (déjà en place si tu déploies comme documenté).

### 4. Déploiement & sauvegardes

- [ ] GitHub Actions : `pull` → `pip` → `migrate` → `collectstatic` → restart (déjà en place).
- [ ] Sauvegardes DB + médias selon criticité.

### 5. Tests API / web (fumée)

Voir la **liste rapide** en haut.

### 6. Mobile (Expo)

Voir la **liste rapide** en haut. Référence : [mobile/README.md](../mobile/README.md).

### 7. Documentation

- [x] URL prod documentée — README + [deploy-production-digitalocean-github.md](deploy-production-digitalocean-github.md).
- [ ] (Optionnel) Noter pour ton équipe **où** sont les secrets et qui a accès au droplet.

---

## Fichiers utiles

| Sujet | Fichier |
|--------|---------|
| Prod DO + GitHub Actions | [deploy-production-digitalocean-github.md](deploy-production-digitalocean-github.md) |
| Déploiement Proxmox (autre cible) | [DEPLOYMENT.md](../DEPLOYMENT.md) |
| Radix prod | `radixsylva/docs/env-et-deploiement.md` |
| Sync catalogue | [radix-biot-pass-c.md](radix-biot-pass-c.md) |
| Perf dev local | [performance-django-startup.md](performance-django-startup.md) |

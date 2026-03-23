# Checklist — Phase 4 (Jardin bIOT : prod, mobile, tests)

À cocher au fur et à mesure. **Prérequis** : Radix en prod (`https://radix.jardinbiot.ca`) et sync BIOT validés (phases 1.5 + 3).

**Plan global** : [plan-radix-biot-phases.md](plan-radix-biot-phases.md)

---

## 0. Cible d’hébergement BIOT

Choisir et noter ici (une ligne suffit) :

- [ ] **Où** : ex. VM Proxmox locale · DigitalOcean · autre : _______________
- [ ] **URL publique prévue** (HTTPS) : `https://________________/`
- [ ] **Nom DNS** (sous-domaine `jardinbiot.ca` ou autre) : _______________

Guide détaillé (ex. Proxmox) : **[DEPLOYMENT.md](../DEPLOYMENT.md)**.

---

## 1. Backend Django (production)

### 1.1 Secrets & configuration

- [ ] **`SECRET_KEY`** : unique, jamais celle du dev ; pas dans Git.
- [ ] **`DEBUG=False`** en prod.
- [ ] **`ALLOWED_HOSTS`** : inclut le domaine public (et éventuellement l’IP interne si besoin).
- [ ] **`DATABASE_URL`** : PostgreSQL prod (même logique qu’en dev, instance dédiée).
- [ ] **`RADIX_SYLVA_API_URL=https://radix.jardinbiot.ca/api/v1`** (cache espèces aligné sur Radix prod).
- [ ] **`RADIX_SYLVA_SYNC_API_KEY`** : si tu actives les clés côté Radix, même valeur côté BIOT.
- [ ] **`CORS_ALLOW_ALL_ORIGINS`** : `False` en prod si tu listes les origines ; sinon configurer les origines autorisées pour l’app mobile et le web.

### 1.2 TLS & réseau

- [ ] **HTTPS** (Let’s Encrypt ou certificat géré) — pas d’API mobile en clair contre prod si évitable.
- [ ] **Pare-feu** : 80/443 ouverts vers le monde ; SSH restreint ; Postgres **non** exposé sur Internet (localhost ou réseau privé).

### 1.3 Processus & static

- [ ] **Gunicorn** (ou uwsgi) + **Nginx** (reverse proxy) — voir patterns dans [DEPLOYMENT.md](../DEPLOYMENT.md) / runbook Radix pour analogie.
- [ ] **`collectstatic`** + fichiers statiques servis par Nginx ou WhiteNoise selon ton choix.
- [ ] **`systemd`** (ou équivalent) pour redémarrage auto du worker Django.

### 1.4 Déploiement & migrations

- [ ] Script ou procédure : `git pull` → `pip install -r requirements.txt` → `migrate` → `collectstatic` → **restart** service.
- [ ] **Sauvegardes** : DB (dump planifié ou outil hyperviseur) + médias (`MEDIA_ROOT`) si critique.

---

## 2. Tests de validation (avant ou juste après mise en ligne)

À adapter à ton usage ; cocher ce qui est critique pour toi.

### 2.1 API / web

- [ ] **Auth** : login, JWT refresh, inscription si ouverte.
- [ ] **Jardins** : liste, détail, création, terrain si utilisé.
- [ ] **Spécimens** : CRUD basique, scan NFC si matériel dispo.
- [ ] **Espèces** : recherche / fiche (données issues du cache post–`sync_radixsylva`).
- [ ] **Staff** : `/admin/` et éventuellement `/admin/gestion-donnees/` (sync Radix en prod).

### 2.2 Intégration Radix

- [ ] **`sync_radixsylva`** sur le serveur BIOT (ou depuis ta machine contre l’API BIOT si exposée aux staff) — pas d’erreur réseau vers `https://radix.jardinbiot.ca`.

---

## 3. Application mobile (Expo)

### 3.1 Configuration

- [ ] **`mobile/.env`** (ou variables EAS) : **`EXPO_PUBLIC_API_URL=https://<ton-domaine-biot>`** (URL HTTPS du backend déployé).
- [ ] Test sur **appareil physique** : même WiFi ou réseau accessible ; CORS / HTTPS OK.

### 3.2 Build & distribution

- [ ] Build **preview** / **production** (EAS Build ou pipeline maison).
- [ ] Tests sur **iOS** et **Android** (au moins un parcours login + liste jardins).
- [ ] (Optionnel) Soumission **App Store** / **Play Store** — hors scope technique minimal.

Référence : [mobile/README.md](../mobile/README.md).

---

## 4. Sécurité & exploitation (minimum)

- [ ] Comptes **staff** : peu d’utilisateurs ; MFA sur l’hébergeur si possible.
- [ ] **Logs** : accès Nginx + journal applicatif pour diagnostiquer les 500.
- [ ] **Mises à jour** : Django / dépendances — prévoir un créneau (voir `requirements.txt`).

---

## 5. Hors-ligne (optionnel — plus tard)

- [ ] Définir le périmètre (lecture cache ? file d’attente d’actions ?).
- [ ] Pas bloquant pour une première prod « en ligne requise ».

---

## 6. Fin de phase 4

- [ ] Documenter l’**URL prod BIOT** dans le README ou un `docs/` interne (sans secrets).
- [ ] Mettre à jour **[plan-radix-biot-phases.md](plan-radix-biot-phases.md)** : phase **4** → **Fait** (ou **Partiel** si mobile build reporté).

---

## Fichiers utiles

| Sujet | Fichier |
|--------|---------|
| Déploiement serveur (Proxmox) | [DEPLOYMENT.md](../DEPLOYMENT.md) |
| Radix prod (référence TLS / DO) | `radixsylva/docs/env-et-deploiement.md` (repo Radix) |
| Sync catalogue | [radix-biot-pass-c.md](radix-biot-pass-c.md) |
| Perf dev | [performance-django-startup.md](performance-django-startup.md) |

# Production — DigitalOcean + GitHub Actions (Jardin bIOT + Radix Sylva)

État de référence (mars 2026). Même **droplet** pour les deux applications Django.

---

## URLs publiques

| Application | URL |
|-------------|-----|
| **Jardin bIOT** | `https://jardinbiot.ca` |
| **Radix Sylva** | `https://radix.jardinbiot.ca` (API : `/api/v1/`) |

---

## Infra

| Élément | Valeur |
|---------|--------|
| **Fournisseur** | DigitalOcean |
| **Droplet** | Ubuntu 24.04 LTS, Toronto |
| **IP publique** | `137.184.169.255` |
| **TLS** | Let’s Encrypt (Certbot + Nginx) |
| **PostgreSQL** | Installé sur le droplet (bases **`jardinbiot`** et **`radixsylva`**, avec variantes **prod** / **staging** selon ta convention) |
| **Stack** | Gunicorn (socket local) + Nginx reverse proxy |

Chemins sur le serveur :

| Projet | Répertoire code |
|--------|-----------------|
| Jardin bIOT | `/srv/jardinbiot/` |
| Radix Sylva | `/srv/radixsylva/` |

---

## Déploiement automatique (GitHub Actions)

Push sur **`main`** déclenche le déploiement SSH.

**Secrets GitHub** (à configurer sur **chaque** dépôt concerné) :

| Secret | Rôle |
|--------|------|
| `DROPLET_IP` | IP du droplet (ex. `137.184.169.255`) |
| `SSH_PRIVATE_KEY` | Clé privée **sans passphrase** (ex. `~/.ssh/deploy_key`) autorisée sur le serveur pour `root` |

Workflows :

- **BIOT** : `.github/workflows/deploy.yml` — `git pull` → `pip` → `migrate` → `collectstatic` → `systemctl restart jardinbiot-gunicorn`
- **Radix** (repo `Radix-Sylva`) : idem vers `/srv/radixsylva/` → `systemctl restart radix-gunicorn`

---

## Bonnes pratiques (serveur)

1. **Ne pas modifier `settings.py` à la main sur le serveur** — tout changement de config passe par Git + déploiement.
2. **`STATIC_ROOT`** : défini dans le dépôt (`STATIC_ROOT = BASE_DIR / 'staticfiles'`) pour que `collectstatic` alimente le bon répertoire servi par Nginx.
3. **`git safe.directory`** : si Git refuse les dépôts « dubious ownership » (souvent quand `git pull` tourne en root sur `/srv/...`), une fois sur le serveur :
   ```bash
   git config --global --add safe.directory /srv/jardinbiot
   git config --global --add safe.directory /srv/radixsylva
   ```

---

## Sync botanique (BIOT ← Radix)

Sur l’instance BIOT en prod, `.env` doit inclure notamment :

```env
RADIX_SYLVA_API_URL=https://radix.jardinbiot.ca/api/v1
```

Puis (SSH ou tâche manuelle) :

```bash
sudo -u jardinbiot /srv/jardinbiot/.venv/bin/python manage.py sync_radixsylva --full
```

Référence : [radix-biot-pass-c.md](radix-biot-pass-c.md), [env-et-deploiement.md](../../radixsylva/docs/env-et-deploiement.md) (Radix).

---

## Voir aussi

- Plan global : [plan-radix-biot-phases.md](plan-radix-biot-phases.md)
- Runbook Radix (Nginx, systemd) : [deploy-radix-digitalocean-runbook.md](deploy-radix-digitalocean-runbook.md)
- Déploiement Proxmox (autre cible) : [../DEPLOYMENT.md](../DEPLOYMENT.md)

# 🌳 Guide de déploiement Jardin bIOT — Serveur Proxmox (Production locale)

> **Objectif** : Déployer Jardin bIOT sur une machine virtuelle Proxmox dans un environnement local, pour une instance de production toujours disponible et les tests de l'été 2026.

---

## Vue d'ensemble

| Composant | Choix |
|-----------|-------|
| **Hyperviseur** | Proxmox VE |
| **OS invité** | Ubuntu Server 24.04 LTS |
| **Stack** | Nginx + Gunicorn + PostgreSQL + Python 3.11 |
| **Chemin app** | `/opt/jardinbiot` |
| **Mise à jour** | Script `update.sh` : `git pull` → migrations → redémarrage |

---

# Partie 1 — Créer la VM sur Proxmox

## 1.1 Télécharger Ubuntu Server

1. Va sur [ubuntu.com/download/server](https://ubuntu.com/download/server)
2. Télécharge **Ubuntu Server 24.04 LTS** (ISO)
3. Dans Proxmox : **Datacenter** → **proxmox (local)** → **Storage** → **local**
4. Clique **Content** → **Upload**
5. Uploade le fichier ISO (ex. `ubuntu-24.04.3-live-server-amd64.iso`)

## 1.2 Créer la VM

1. Clic droit sur le nœud Proxmox (ou ton Datacenter) → **Create VM**
2. **General** :
   - Node : (ton nœud)
   - VM ID : (laisser auto ou choisir, ex. `110`)
   - Name : `jardinbiot`
   - Resource pool : (vide)
3. **OS** :
   - Use CD/DVD disc image file : **Enabled**
   - Storage : `local`
   - ISO image : sélectionne l’ISO Ubuntu 24.04
   - Guest OS : **Linux**
   - Version : **6.x - 2.6 Kernel**
4. **System** :
   - Graphic card : **Default**
   - Machine : **Default (i440fx)** ou **q35** (selon ta version Proxmox)
   - SCSI controller : **VirtIO SCSI single**
   - SCSI controller : **VirtIO SCSI**
   - Qemu Agent : **Enabled**
   - BIOS : **Default**
5. **Disks** :
   - Bus/Device : **SCSI**
   - Storage : `local-lvm` (ou ton storage)
   - Disk size (GiB) : **32**
   - Cache : **Write back**
   - Discard : **Enabled** (optionnel, TRIM)
6. **CPU** :
   - Sockets : **1**
   - Cores : **2**
   - Type : **host** (ou default)
7. **Memory** :
   - Memory (MiB) : **2048**
   - Minimum memory : **512** (optionnel)
   - Ballooning device : **Enabled** (optionnel)
8. **Network** :
   - Bridge : **vmbr0** (ton bridge principal)
   - VLAN Tag : (vide si pas de VLAN)
   - Model : **VirtIO (paravirtualized)**
   - Firewall : (désactivé par défaut)
9. **Confirm** : vérifier et cliquer **Finish**

## 1.3 Démarrer et installer Ubuntu

1. Sélectionne la VM `jardinbiot`
2. Clic **Start**
3. Clic **Console** (ou noVNC dans le navigateur)
4. Suivre l’installateur Ubuntu Server :

   **Language**  
   - English (ou Français)

   **Keyboard**  
   - Layout : French (Canada) ou autre selon besoin

   **Installer type**  
   - Ubuntu Server (plain)

   **Network**  
   - DHCP par défaut (ou configurer une IP fixe si souhaité)

   **Storage**  
   - Use entire disk (ou personnaliser si plusieurs disques)

   **Profile setup**  
   - Your name : ex. `deploy`
   - Server name : `jardinbiot` (ou autre)
   - Username : `deploy` (ou ton utilisateur)
   - Password : (mot de passe fort)

   **SSH Setup**  
   - ☑ **Install OpenSSH server**

   **Featured Server Snaps**  
   - Aucun requis, tu peux décocher tout

5. Cliquer **Done** puis attendre la fin de l’installation
6. Quand demandé : **Reboot Now**
7. Après redémarrage, déconnecte le CD : VM → **Hardware** → **CD/DVD Drive** → **Remove**

---

# Partie 2 — Accès initial et mise à jour du système

## 2.1 Se connecter en SSH

Depuis ton laptop :

```bash
ssh deploy@IP_DE_TA_VM
```

L’IP est visible dans Proxmox (VM → Summary) ou via ton routeur/DHCP.

## 2.2 Mise à jour des paquets

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```

(Reconnecte-toi après le reboot.)

---

# Partie 3 — Installer les dépendances système

## 3.1 Python 3.11, PostgreSQL, Nginx, Git

```bash
sudo apt update
sudo apt install -y \
  python3.11 \
  python3.11-venv \
  python3-pip \
  postgresql \
  postgresql-contrib \
  nginx \
  git \
  curl
```

## 3.2 Vérifications

```bash
python3.11 --version   # Python 3.11.x
psql --version         # psql 16.x
nginx -v                # nginx 1.x
```

---

# Partie 4 — Configuration PostgreSQL

## 4.1 Créer l’utilisateur et la base

```bash
sudo -u postgres psql
```

Dans le shell `psql` :

```sql
CREATE USER jardinbiot WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE jardinbiot OWNER jardinbiot;
\q
```

Remplace `CHANGE_ME_STRONG_PASSWORD` par un mot de passe robuste.

## 4.2 Tester la connexion (optionnel)

```bash
psql -h localhost -U jardinbiot -d jardinbiot -c "SELECT 1;"
# (entrer le mot de passe)
```

---

# Partie 5 — Déployer l’application

## 5.1 Créer le répertoire et cloner le projet

```bash
sudo mkdir -p /opt/jardinbiot
sudo chown $USER:$USER /opt/jardinbiot
cd /opt/jardinbiot

# Repo public
git clone https://github.com/gbdb/biot.git .

# Repo privé (avec clé SSH sur la VM)
# git clone git@github.com:gbdb/biot.git .
```

## 5.2 Environnement virtuel Python

```bash
cd /opt/jardinbiot
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install psycopg2-binary gunicorn
```

## 5.3 Variables d’environnement

```bash
cp .env.example .env
nano .env
```

Exemple de `.env` :

```env
# Obligatoire en production
SECRET_KEY=GENERER_AVEC_COMMANDE_CI_DESSOUS
DEBUG=False

# Hôtes autorisés : IP de la VM, nom de domaine si tu en as un
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.XX,jardinbiot.local

# Base PostgreSQL
DATABASE_URL=postgres://jardinbiot:CHANGE_ME_STRONG_PASSWORD@localhost:5432/jardinbiot

# CORS : False en prod si l’app mobile pointe vers ce serveur
CORS_ALLOW_ALL_ORIGINS=False
```

Générer une clé secrète :

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copier la sortie dans `SECRET_KEY=` dans `.env`.

## 5.4 Migrations, statiques, superuser

```bash
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

(Choisir un email et mot de passe admin.)

---

# Partie 6 — Gunicorn (service systemd)

## 6.1 Créer le fichier de service

```bash
sudo nano /etc/systemd/system/jardinbiot.service
```

Contenu (adapter `User` et `Group` si différent de `deploy`) :

```ini
[Unit]
Description=Jardin bIOT Gunicorn
After=network.target postgresql.service

[Service]
User=deploy
Group=deploy
WorkingDirectory=/opt/jardinbiot
ExecStart=/opt/jardinbiot/venv/bin/gunicorn \
    --bind 127.0.0.1:8000 \
    --workers 2 \
    --timeout 120 \
    jardinbiot.wsgi:application
Restart=always
RestartSec=5
Environment="PATH=/opt/jardinbiot/venv/bin"
EnvironmentFile=/opt/jardinbiot/.env

[Install]
WantedBy=multi-user.target
```

## 6.2 Activer et démarrer

```bash
sudo systemctl daemon-reload
sudo systemctl enable jardinbiot
sudo systemctl start jardinbiot
sudo systemctl status jardinbiot
```

Tu dois voir `active (running)`.

---

# Partie 7 — Nginx (reverse proxy)

## 7.1 Créer la config Nginx

```bash
sudo nano /etc/nginx/sites-available/jardinbiot
```

Contenu :

```nginx
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    location /static/ {
        alias /opt/jardinbiot/staticfiles/;
    }

    location /media/ {
        alias /opt/jardinbiot/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 120;
        proxy_send_timeout 120;
        proxy_read_timeout 120;
    }
}
```

## 7.2 Activer le site et recharger Nginx

```bash
sudo ln -s /etc/nginx/sites-available/jardinbiot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

# Partie 8 — Script de mise à jour

## 8.1 Créer le script

```bash
nano /opt/jardinbiot/update.sh
```

Contenu :

```bash
#!/bin/bash
set -e
cd /opt/jardinbiot

echo "=== Pull latest ==="
git pull origin main || git pull origin master

echo "=== Activate venv ==="
source venv/bin/activate

echo "=== Install deps ==="
pip install -r requirements.txt
pip install psycopg2-binary gunicorn

echo "=== Migrate ==="
python manage.py migrate

echo "=== Collect static ==="
python manage.py collectstatic --noinput

echo "=== Restart ==="
sudo systemctl restart jardinbiot

echo "=== Done ==="
```

## 8.2 Rendre le script exécutable

```bash
chmod +x /opt/jardinbiot/update.sh
```

## 8.3 Sudoers pour le restart sans mot de passe (optionnel)

Pour que `update.sh` redémarre le service sans demander de mot de passe :

```bash
sudo visudo
```

Ajouter à la fin (remplacer `deploy` par ton user) :

```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart jardinbiot
```

---

# Partie 9 — Vérification et tests

## 9.1 Test local sur la VM

```bash
curl -I http://localhost
# Doit retourner HTTP/1.1 302 ou 200
```

## 9.2 Depuis le réseau local

Depuis un autre appareil du même réseau :

```
http://IP_DE_TA_VM/
```

Admin : `http://IP_DE_TA_VM/admin/`

## 9.3 App mobile Expo

Dans `mobile/.env` :

```
EXPO_PUBLIC_API_URL=http://IP_DE_TA_VM
EXPO_PUBLIC_USE_LOCALHOST=false
```

---

# Partie 10 — Mise à jour de la production

## 10.1 Depuis le serveur

```bash
ssh deploy@IP_DE_TA_VM
cd /opt/jardinbiot && ./update.sh
```

## 10.2 Depuis le laptop (via SSH)

```bash
ssh deploy@IP_DE_TA_VM "cd /opt/jardinbiot && ./update.sh"
```

## 10.3 Avec accès Cursor au serveur

Si Cursor a accès SSH à la VM, tu peux dire : *« mets à jour la VM avec la dernière version »* et Cursor exécutera :

```bash
ssh deploy@IP_DE_TA_VM "cd /opt/jardinbiot && ./update.sh"
```

---

# Partie 11 — Commandes utiles

| Action | Commande |
|--------|----------|
| Mettre à jour l’app | `cd /opt/jardinbiot && ./update.sh` |
| Redémarrer l’app | `sudo systemctl restart jardinbiot` |
| Voir les logs en direct | `sudo journalctl -u jardinbiot -f` |
| Voir les dernières lignes | `sudo journalctl -u jardinbiot -n 100` |
| Créer un superuser | `cd /opt/jardinbiot && source venv/bin/activate && python manage.py createsuperuser` |
| Vérifier Nginx | `sudo nginx -t` |
| Recharger Nginx | `sudo systemctl reload nginx` |
| Statut PostgreSQL | `sudo systemctl status postgresql` |

---

# Partie 12 — Optionnel : HTTPS avec Let’s Encrypt

Si tu exposes le serveur sur internet avec un nom de domaine :

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ton-domaine.com
```

Renouvellement automatique : Certbot configure un cron par défaut.

---

# Partie 13 — Optionnel : IP fixe sur la VM

1. Sur la VM : `ip a` pour voir l’interface (ex. `enp0s3`)
2. Éditer le netplan :

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

Exemple (adapter selon ton réseau) :

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

3. Appliquer :

```bash
sudo netplan apply
```

---

# Partie 14 — Sauvegardes Proxmox

1. VM → **Backup** → **Backup now**
2. Choisir le storage, mode **Snapshot**, compression (optionnel)
3. Pour une tâche planifiée : **Datacenter** → **Backup** → **Add** (backup job)

---

# Checklist finale

- [ ] VM créée et Ubuntu installé
- [ ] PostgreSQL configuré (user + DB)
- [ ] App clonée dans `/opt/jardinbiot`
- [ ] `.env` configuré (SECRET_KEY, DATABASE_URL, ALLOWED_HOSTS)
- [ ] Migrations exécutées
- [ ] Superuser créé
- [ ] Service Gunicorn activé et démarré
- [ ] Nginx configuré et rechargé
- [ ] `update.sh` créé et testé
- [ ] Accès depuis le réseau local vérifié
- [ ] (Optionnel) HTTPS, IP fixe, backup planifié

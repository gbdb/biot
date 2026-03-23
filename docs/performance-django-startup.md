# Performance — démarrage de `manage.py` / Django (Jardin bIOT)

Si `python manage.py …` ou `runserver` semble **long à démarrer**, les causes les plus fréquentes sont ci‑dessous (ordre à vérifier).

---

## 1. Connexion PostgreSQL

Django charge les settings puis ouvre souvent une connexion (commandes qui touchent à l’ORM, `migrate`, `check` avec DB, etc.).

| Cause | Piste |
|--------|--------|
| **Docker Postgres arrêté** | `docker compose up -d` — sinon attente jusqu’au timeout TCP (très long). |
| **`DATABASE_URL` vers une IP lente / injoignable** | Vérifier que le host répond vite (`127.0.0.1:5434` pour BIOT local). |
| **Résolution DNS** | Préférer `127.0.0.1` à `localhost` si IPv6 ou résolution bizarre sur macOS. |

Test rapide :

```bash
psql "$DATABASE_URL" -c "SELECT 1"
```

(avec la même URL que dans `.env`.)

---

## 2. Mode développement (`DEBUG=True`)

- **`debug_toolbar`** : si le package est installé et activé dans `settings.py`, il ajoute du middleware et des imports au démarrage. Sans besoin du toolbar : désinstaller ou ne pas l’installer en dev.
- **`django_extensions`** : chargé si disponible — coût modéré.

---

## 3. `runserver` et rechargement automatique

Le serveur de dev **surveille** les fichiers et **relance** un processus enfant : le premier démarrage + chaque sauvegarde peuvent sembler lents.

```bash
python manage.py runserver 0.0.0.0:8000 --noreload
```

Utile pour mesurer le temps « nu » ou quand le reload agace (au prix de recharger à la main).

---

## 4. Taille normale du projet

Jardin bIOT charge **beaucoup de modèles** et un **admin** volumineux (`species/admin.py`, etc.). Un délai de **quelques secondes** au premier `django.setup()` sur un Mac est courant, surtout avec SSD froid ou antivirus qui scanne les `.py` / `.pyc`.

---

## 5. Profiler précisément (optionnel)

Temps d’import des modules (Python 3) :

```bash
cd /chemin/vers/biot
source .venv/bin/activate
python -X importtime manage.py check 2>&1 | tee /tmp/importtime.txt
```

Les lignes les plus coûteuses apparaissent en bas (cumuls). Chercher des paquets inattendus ou des imports circulaires.

---

## 6. Ce qui n’est en général **pas** la cause

- **`sync_radixsylva`** : ce n’est exécuté que si tu lances **cette** commande ; il ne ralentit pas les autres commandes ni le simple chargement de Django.
- **`RADIX_SYLVA_API_URL`** : utilisée par la commande de sync et le code qui appelle Radix — **pas** au démarrage global de Django.

---

## Références

- Settings : `jardinbiot/settings.py` (`DEBUG`, `debug_toolbar`, `django_extensions`).

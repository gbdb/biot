# Checklist dev – App mobile + Django

Pour que l'app mobile (Expo) sur votre iPhone/Android fonctionne avec Django sur votre Mac.

## Cues pour l'agent Cursor

| Dire à l'agent | Action |
|----------------|--------|
| **lance le simulateur** | Config + lance Expo (pense à Django dans un autre terminal) |
| **lance le simulateur sur mon cellulaire** | Config + lance Expo pour appareil physique |
| **update git** | git add, commit, push (l'agent demande le message) |
| **prepare app native** | Config pour build natif → pointe vers VM |

## 0. Script rapide (recommandé)

```bash
# Simulateur (config seulement)
./scripts/dev-mobile.sh sim

# Simulateur + lance Expo
./scripts/dev-mobile.sh sim launch

# Appareil physique
./scripts/dev-mobile.sh device
./scripts/dev-mobile.sh device launch   # + lance Expo

# Build natif (app → VM)
./scripts/dev-mobile.sh build

# Git (demande message si pas fourni)
./scripts/dev-mobile.sh git "mon message"
```

Le script met à jour `mobile/.env` automatiquement.

| Mode | Fichier config | Exemple |
|------|----------------|---------|
| device | `mobile/.dev-ip` | `echo '192.168.0.154' > mobile/.dev-ip` |
| build | `mobile/.dev-vm-url` | `echo 'https://jardinbiot.example.com' > mobile/.dev-vm-url` |

Puis lance Django et Expo selon les instructions affichées (ou build avec Xcode).

---

## 1. Django – fichier `.env` à la racine (biot/.env)

Vérifier que le fichier contient :

```env
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.0.154
CORS_ALLOW_ALL_ORIGINS=True
```

- **Simulateur** : `localhost,127.0.0.1` suffit.
- **Appareil physique** : ajoute l'IP de ton Mac (ex: `192.168.0.154`).

Sans l'IP dans `ALLOWED_HOSTS`, Django rejette les requêtes (400 Bad Request).

## 2. Lancer Django

| Cible | Commande |
|-------|----------|
| **Simulateur** | `python manage.py runserver` |
| **Appareil physique** | `python manage.py runserver 0.0.0.0:8000` |

## 3. Lancer Expo

```bash
cd mobile
npx expo start --clear
```

Important : redémarrer Expo après un changement de `EXPO_PUBLIC_API_URL` (la variable est chargée au démarrage).

## 4. Vérifier la connexion

Sur le Mac, dans un autre terminal (remplace IP si appareil physique) :

```bash
# Simulateur: localhost. Appareil: ton IP Mac
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"VOTRE_USER","password":"VOTRE_PASS"}'
```

Vous devez recevoir `{"access":"...","refresh":"..."}`. Si vous obtenez une erreur, Django ou l’auth pose problème.

## 5. Quand vous supprimez / ajoutez une photo

Regarder la console Django. Vous devriez voir des lignes du type :

```
"DELETE /api/specimens/123/events/456/ HTTP/1.1" 204
"POST /api/specimens/123/events/456/photos/ HTTP/1.1" 201
```

- Si vous ne voyez **rien** → la requête n’atteint pas Django (mauvaise URL, ou mauvais `EXPO_PUBLIC_API_URL`).
- Si vous voyez **401** → token expiré ou invalide → déconnectez-vous puis reconnectez-vous dans l’app.
- Si vous voyez **404** → spécimen ou événement introuvable. Vérifier que specimen_id et event_id existent et que l’événement appartient au spécimen. Voir section 6.

## 6. Débug 404 sur DELETE ou POST photo

**Important** : L’endpoint photos exige un **événement existant**. Si vous ajoutez une photo juste après avoir créé un événement, l’événement doit être créé avec succès avant d’ajouter la photo.

Obtenir des IDs valides depuis Django :

```bash
source venv/bin/activate
python manage.py shell -c "
from species.models import Specimen, Event
for s in Specimen.objects.all()[:3]:
    evts = list(s.evenements.all()[:2])
    print(f'Specimen {s.id} ({s.nom}): events {[e.id for e in evts]}')
"
```

Puis tester avec curl (en adaptant les IDs) :

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"guillaume","password":"roulezenaudi"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")
curl -X DELETE "http://localhost:8000/api/specimens/1/events/1/" \
  -H "Authorization: Bearer $TOKEN" -v
```

Si curl renvoie 204 → l’API fonctionne, le problème vient des IDs envoyés par l’app. Si curl renvoie 404 → l’événement ou le spécimen n’existe pas (ou pas pour ce jardin/utilisateur).

### Test upload photo

Créer d’abord un événement si nécessaire, puis :

```bash
# Créer une image test (ou utiliser une photo existante)
echo "test" > /tmp/test.txt  # pour tester, une image réelle est préférable

# Avec une vraie image (ex: test.jpg dans le projet)
./test_photo_upload.sh 1 2 ./test.jpg
```

Ou avec curl manuellement (remplacez 1, 2 et le chemin de l’image) :

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"guillaume","password":"roulezenaudi"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")

curl -X POST "http://127.0.0.1:8000/api/specimens/1/events/2/photos/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/chemin/vers/image.jpg" \
  -F "type_photo=avant" -F "titre=Test" -w "\nHTTP: %{http_code}\n"
```

Si vous obtenez 201 → l’API photo fonctionne.
- Si vous voyez **400** et "Invalid HTTP_HOST" → ajouter l’IP dans `ALLOWED_HOSTS`.

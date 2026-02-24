# Checklist dev – App mobile + Django

Pour que l'app mobile (Expo) sur votre iPhone/Android fonctionne avec Django sur votre Mac.

## 1. Django – fichier `.env` à la racine (biot/.env)

Vérifier que le fichier contient :

```env
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.0.143
CORS_ALLOW_ALL_ORIGINS=True
```

Sans `192.168.0.143` dans `ALLOWED_HOSTS`, Django rejette les requêtes (400 Bad Request).

## 2. Lancer Django

```bash
cd /chemin/vers/biot
python manage.py runserver 0.0.0.0:8000
```

## 3. Lancer Expo avec la bonne URL

```bash
cd mobile
EXPO_PUBLIC_API_URL=http://192.168.0.143:8000 npx expo start
```

Important : redémarrer Expo après un changement de `EXPO_PUBLIC_API_URL` (la variable est chargée au démarrage).

## 4. Vérifier la connexion

Sur le Mac, dans un autre terminal :

```bash
# Test token (remplacez USER et PASS par un compte valide)
curl -X POST http://192.168.0.143:8000/api/auth/token/ \
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
TOKEN=$(curl -s -X POST http://192.168.0.143:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"guillaume","password":"roulezenaudi"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")
curl -X DELETE "http://192.168.0.143:8000/api/specimens/1/events/1/" \
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

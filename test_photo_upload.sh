#!/bin/bash
# Test d'upload de photo via l'API
# Usage: ./test_photo_upload.sh <specimen_id> <event_id> <chemin_image>
# Exemple: ./test_photo_upload.sh 1 2 ./test.jpg

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  echo "Usage: $0 <specimen_id> <event_id> <chemin_image>"
  echo "Exemple: $0 1 2 ./test.jpg"
  exit 1
fi

SPECIMEN_ID=$1
EVENT_ID=$2
IMAGE_PATH=$3
BASE="http://127.0.0.1:8000"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Erreur: le fichier $IMAGE_PATH n'existe pas."
  echo "Créez une image test ou utilisez une photo existante."
  exit 1
fi

echo "1. Obtention du token..."
TOKEN=$(curl -s -X POST "$BASE/api/auth/token/" \
  -H "Content-Type: application/json" \
  -d '{"username":"guillaume","password":"roulezenaudi"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access',''))")

if [ -z "$TOKEN" ]; then
  echo "Erreur: impossible d'obtenir le token"
  exit 1
fi
echo "Token OK"

echo ""
echo "2. POST $BASE/api/specimens/$SPECIMEN_ID/events/$EVENT_ID/photos/"
HTTP=$(curl -s -w "%{http_code}" -o /tmp/photo_out.txt -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$IMAGE_PATH" \
  -F "type_photo=avant" \
  -F "titre=Test" \
  "$BASE/api/specimens/$SPECIMEN_ID/events/$EVENT_ID/photos/")

echo "HTTP status: $HTTP"
echo "Réponse:"
cat /tmp/photo_out.txt | python3 -m json.tool 2>/dev/null || cat /tmp/photo_out.txt

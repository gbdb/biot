#!/bin/bash
# Test de suppression d'événement via l'API
# Usage: ./test_api_delete.sh <specimen_id> <event_id>
# Exemple: ./test_api_delete.sh 1 2

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <specimen_id> <event_id>"
  echo "Exemple: $0 1 2"
  exit 1
fi

SPECIMEN_ID=$1
EVENT_ID=$2
BASE="http://192.168.0.143:8000"

echo "1. Obtention du token..."
TOKEN=$(curl -s -X POST "$BASE/api/auth/token/" \
  -H "Content-Type: application/json" \
  -d '{"username":"guillaume","password":"roulezenaudi"}' | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Erreur: impossible d'obtenir le token"
  exit 1
fi
echo "Token OK"

echo ""
echo "2. Liste des événements du spécimen $SPECIMEN_ID..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/specimens/$SPECIMEN_ID/events/" | python3 -m json.tool 2>/dev/null || echo "(réponse brute ci-dessus)"

echo ""
echo "3. Tentative DELETE /api/specimens/$SPECIMEN_ID/events/$EVENT_ID/"
HTTP=$(curl -s -w "%{http_code}" -o /tmp/out.json -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/specimens/$SPECIMEN_ID/events/$EVENT_ID/")
echo "HTTP status: $HTTP"
if [ "$HTTP" != "204" ]; then
  echo "Réponse:"
  cat /tmp/out.json | python3 -m json.tool 2>/dev/null || cat /tmp/out.json
fi

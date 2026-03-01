#!/bin/bash
# Jardin Biot — Configurer et lancer le dev mobile
#
# Cues (à dire à l'agent Cursor) :
#   1) "lance le simulateur"                    → sim launch
#   2) "lance le simulateur sur mon cellulaire"  → device launch
#   3) "update git"                             → git (demande le message avant push)
#   4) "prepare app native"                     → build (config VM pour build natif)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$PROJECT_ROOT/mobile"
DEV_IP_FILE="$MOBILE_DIR/.dev-ip"
DEV_VM_URL_FILE="$MOBILE_DIR/.dev-vm-url"

usage() {
  echo "Usage: $0 [sim|device|build|git] [options]"
  echo ""
  echo "  sim [launch]        — Config simulateur (+ lance Expo si 'launch')"
  echo "  device [launch] [IP] — Config appareil physique (+ lance Expo si 'launch')"
  echo "  build [URL]         — Config build natif → pointe vers VM"
  echo "  git [message]       — git add, commit, push (demande message si absent)"
  echo ""
  echo "Cues pour l'agent Cursor:"
  echo "  « lance le simulateur »                    → $0 sim launch"
  echo "  « lance le simulateur sur mon cellulaire » → $0 device launch"
  echo "  « update git »                            → $0 git"
  echo "  « prepare app native »                    → $0 build"
  echo ""
  echo "Fichiers config: mobile/.dev-ip, mobile/.dev-vm-url"
}

write_mobile_env() {
  local api_url="$1"
  cat > "$MOBILE_DIR/.env" << EOF
# Généré par dev-mobile.sh — $(date +%Y-%m-%d)
# Ne pas modifier manuellement si tu utilises ce script

EXPO_PUBLIC_API_URL=$api_url
EXPO_PUBLIC_USE_LOCALHOST=false
EOF
  echo "  → mobile/.env mis à jour: EXPO_PUBLIC_API_URL=$api_url"
}

# --- Mode simulateur ---
mode_simulator() {
  local do_launch="${1:-}"
  echo "📱 Mode: simulateur (localhost)"
  write_mobile_env "http://localhost:8000"
  echo ""
  if [ "$do_launch" = "launch" ]; then
    echo "Lancement d'Expo..."
    (cd "$MOBILE_DIR" && npx expo start --clear --ios) &
    echo ""
    echo "Expo démarre. Pense à lancer Django dans un autre terminal:"
    echo "  cd $PROJECT_ROOT && source venv/bin/activate && python manage.py runserver"
  else
    echo "Django:  python manage.py runserver"
    echo "Expo:   cd mobile && npx expo start --clear --ios"
    echo ""
    echo "Django écoute sur 127.0.0.1:8000, pas besoin de 0.0.0.0."
  fi
}

# --- Mode appareil physique ---
mode_device() {
  local arg1="$1"
  local arg2="$2"
  local do_launch=""
  local ip=""
  if [ "$arg1" = "launch" ]; then
    do_launch="launch"
    ip="$arg2"
  else
    ip="$arg1"
  fi
  if [ -z "$ip" ]; then
    if [ -f "$DEV_IP_FILE" ]; then
      ip=$(cat "$DEV_IP_FILE" | tr -d '[:space:]')
    fi
  fi
  if [ -z "$ip" ]; then
    echo "❌ IP manquante. Utilise: $0 device 192.168.0.154"
    echo "   Ou crée $DEV_IP_FILE avec ton IP Mac (ex: echo '192.168.0.154' > mobile/.dev-ip)"
    exit 1
  fi
  echo "📱 Mode: appareil physique ($ip)"
  write_mobile_env "http://${ip}:8000"
  echo ""
  if [ "$do_launch" = "launch" ]; then
    echo "Lancement d'Expo..."
    (cd "$MOBILE_DIR" && npx expo start --clear) &
    echo ""
    echo "Expo démarre. Scanne le QR avec ton téléphone. Pense à lancer Django:"
    echo "  cd $PROJECT_ROOT && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000"
    echo ""
    echo "⚠️  Vérifie que biot/.env contient: ALLOWED_HOSTS=localhost,127.0.0.1,$ip"
  else
    echo "Django:  python manage.py runserver 0.0.0.0:8000"
    echo "Expo:    cd mobile && npx expo start --clear"
    echo ""
    echo "⚠️  Vérifie que biot/.env contient: ALLOWED_HOSTS=localhost,127.0.0.1,$ip"
  fi
}

# --- Mode build natif (pointe vers VM) ---
mode_build() {
  local url="$1"
  if [ -z "$url" ]; then
    if [ -f "$DEV_VM_URL_FILE" ]; then
      url=$(cat "$DEV_VM_URL_FILE" | tr -d '[:space:]')
    fi
  fi
  if [ -z "$url" ]; then
    echo "❌ URL VM manquante. Utilise: $0 build https://jardinbiot.example.com"
    echo "   Ou crée mobile/.dev-vm-url avec l'URL de ta VM"
    echo "   Ex: echo 'https://jardinbiot.example.com' > mobile/.dev-vm-url"
    exit 1
  fi
  # Enlever trailing slash
  url="${url%/}"
  echo "📦 Mode: build natif → $url"
  write_mobile_env "$url"
  echo ""
  echo "Build iOS (Xcode):"
  echo "  cd mobile && npx expo run:ios --device"
  echo "  Ou ouvre mobile/ios/JardinBiot.xcworkspace dans Xcode"
  echo ""
  echo "Build Android:"
  echo "  cd mobile && npx expo run:android --device"
  echo ""
  echo "L'app compilée utilisera cette URL pour l'API."
}

# --- Mode git (add, commit, push) ---
mode_git() {
  local msg="$1"
  cd "$PROJECT_ROOT"
  if [ -n "$(git status --porcelain)" ]; then
    git add .
    if [ -z "$msg" ]; then
      echo "Message de commit (obligatoire pour push):"
      read -r msg
    fi
    if [ -n "$msg" ]; then
      git commit -m "$msg"
      git push origin main 2>/dev/null || git push origin master 2>/dev/null || git push
    else
      echo "❌ Message vide, commit annulé."
      exit 1
    fi
  else
    echo "Rien à committer (working tree clean)."
  fi
}

# --- Main ---
cmd="${1:-}"
arg2="${2:-}"
arg3="${3:-}"

case "$cmd" in
  sim|simulator)
    mode_simulator "$arg2"
    ;;
  device)
    if [ "$arg2" = "launch" ]; then
      mode_device "launch" "$arg3"
    else
      mode_device "$arg2" ""
    fi
    ;;
  build|prepare|native)
    mode_build "$arg2"
    ;;
  git|update)
    mode_git "$arg2"
    ;;
  -h|--help|"")
    usage
    ;;
  *)
    echo "Mode inconnu: $cmd"
    usage
    exit 1
    ;;
esac

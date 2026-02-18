# Jardin Biot Mobile

Application mobile Expo (React Native) pour Jardin Biot — usage terrain : scan NFC, fiches spécimens, journal rapide.

## Démarrage

```bash
# Installer les dépendances
cd mobile && npm install

# Lancer Expo
npx expo start
```

Puis :
- **Web** : appuyer sur `w` ou ouvrir http://localhost:8081
- **iOS** : appuyer sur `i` (simulateur) ou scanner le QR avec l'app Expo Go
- **Android** : appuyer sur `a` (émulateur) ou scanner le QR avec Expo Go

## Configuration

1. Copier `.env.example` vers `.env`
2. Définir `EXPO_PUBLIC_API_URL` sur l'URL de ton backend Django
   - Simulateur : `http://localhost:8000`
   - Device physique : `http://<IP_ta_machine>:8000`

## Structure

```
mobile/
├── app/                  # Expo Router (file-based routing)
│   ├── (tabs)/           # Onglets : Accueil, Scan, Spécimens, Jardins
│   ├── specimen/[id].tsx # Fiche détail spécimen
│   └── _layout.tsx       # Layout racine
├── types/                # Types TS alignés API Django
├── api/                  # Client API (appels REST)
├── constants/            # Config (URL API, endpoints)
└── assets/               # Icônes, splash (à ajouter)
```

## NFC

- **iOS** : nécessite un appareil physique (NFC non dispo simulateur)
- **Android** : idem
- **Web** : NFC non supporté

## Backend

Le backend Django doit tourner (`python manage.py runserver`) et l'API doit être accessible depuis l'appareil où tourne Expo.

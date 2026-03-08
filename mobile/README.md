# Jardin bIOT — Mobile

Application mobile Expo (React Native) pour la gestion de jardins en forêt comestible.

**Concept central** : chaque plant est un spécimen individuel avec un journal de vie complet — événements, photos, rappels, stades phénologiques — accessible sur le terrain via scan RFID.

---

## Prérequis

- Node 18+ (ou LTS), npm
- Expo Go (optionnel, pour tester sur appareil sans build natif)
- Backend Django lancé et joignable (voir [Backend](#backend))

## Démarrage

```bash
cd mobile && npm install
npx expo start
```

| Plateforme | Commande |
|------------|----------|
| Web | `w` ou http://localhost:8081 |
| iOS | `i` (simulateur) ou Expo Go |
| Android | `a` (émulateur) ou Expo Go |

Sur appareil physique, le backend doit être joignable à l’URL définie dans `.env` (ex. `http://<IP>:8000`).

## Configuration

1. Copier `.env.example` vers `.env`
2. Définir `EXPO_PUBLIC_API_URL` sur l’URL du backend Django
   - Simulateur : `http://localhost:8000`
   - Appareil physique : `http://<IP_ta_machine>:8000`
3. Optionnel : `EXPO_PUBLIC_USE_LOCALHOST=true` pour forcer localhost en dev (voir [constants/config.ts](constants/config.ts))

## Structure

```
mobile/
├── app/
│   ├── (tabs)/           # Accueil · Espèces · Spécimens · Jardins
│   ├── specimen/        # [id].tsx, create.tsx, edit/[id].tsx
│   ├── species/         # [id].tsx, library.tsx, cultivars.tsx, create, edit
│   ├── garden/          # [id].tsx, create.tsx
│   ├── settings/        # Paramètres, profil, utilisateurs
│   ├── scan.tsx         # Scan RFID (mode fiche ou mode événement)
│   ├── login.tsx, register.tsx
│   ├── reminders.tsx, events/recent.tsx, observation/quick.tsx
│   └── _layout.tsx
├── components/          # Composants réutilisables
├── contexts/            # AuthContext, etc.
├── api/                 # Client REST
├── types/               # Types TypeScript alignés sur l’API Django
└── constants/           # Config (URL API, endpoints)
```

## Fonctionnalités principales

### Journal de vie par spécimen

- Historique chronologique de tous les événements (plantation, taille, floraison, récolte, maladie, traitement, etc.)
- Photos attachées aux événements
- Score de santé, statut (planifié → établi → déclin → mort)
- Rappels liés à chaque plant

### Scan RFID terrain

- **Mode fiche** : scan → ouverture directe du spécimen
- **Mode événement** : scan → enregistrement rapide (3 taps, icônes larges)
- Association tag NFC à la création ou depuis la fiche

### Intelligence botanique

- Base de données de ~1700+ espèces (Hydro-Québec, PFAF, VASCAN)
- Alertes : pollinisateur manquant, stade phénologique imminent, rappels en retard
- Compagnonnage au niveau spécimen (bénéfices actifs + manques détectés)
- Distances calculées par GPS (haversine) entre spécimens

### GPS et visualisation terrain

- Coordonnées GPS capturées à la création de chaque spécimen
- Vue « À proximité » : spécimens dans un rayon configurable
- **Roadmap** : visualisation 2D/3D/LiDAR des spécimens sur le terrain

## NFC

iOS et Android : appareil physique requis (NFC non disponible sur simulateur/web).

## Backend

Django + PostgreSQL. Lancer `python manage.py runserver` avant de démarrer Expo.  
Voir le [README principal](../README.md) et [docs/](../docs/) pour l’architecture complète.

## Stack

- React Native / Expo, Expo Router (file-based)
- API : Django REST Framework (JSON), auth JWT (simplejwt)
- NFC : react-native-nfc-manager
- Photos / position : expo-image-picker, expo-location

## Dépannage

- **L’app ne joint pas l’API** : vérifier que le backend tourne sur le même réseau ; sur appareil physique, `EXPO_PUBLIC_API_URL` doit être l’IP de la machine (ex. `http://192.168.1.x:8000`), pas `localhost`.

## Documentation

- [Navigation et présentation des données](../docs/navigation-presentation-des-donnees-et-gestion-du-jardin.md)
- [Pollinisation, cultivars et groupes de spécimens](../docs/pollinisation-cultivars-groupes-specimens.md)

# Vue 3D Cesium — configuration Cesium Ion (terrain + imagerie)

Pour que la vue 3D affiche **l’imagerie satellite et le terrain** (y compris depuis une IP comme `https://192.168.0.140:8000`), le token Cesium Ion doit autoriser l’origine de ton application.

## 1. Vérifier le token sur Cesium Ion

1. Va sur **https://ion.cesium.com** et connecte-toi.
2. Ouvre **Access Tokens** (menu ou profil).
3. Ouvre ton token (ex. « Default Token »).

## 2. Autoriser l’URL de ton application

Si le token a une restriction **« Allowed URLs »** (ou équivalent) :

- **Option A — Tout autoriser (dev)** : laisse la liste vide ou désactive la restriction. Le token fonctionnera depuis n’importe quelle URL (localhost, IP, futur domaine).
- **Option B — Limiter aux URLs de l’app** : ajoute chaque origine utilisée, par exemple :
  - `https://localhost:8000/*`
  - `https://127.0.0.1:8000/*`
  - `https://192.168.0.140:8000/*`
  - (plus tard) `https://tondomaine.com/*`

Sans autorisation de l’origine, les requêtes de tuiles depuis le navigateur peuvent être rejetées (401/403) et l’écran reste noir.

## 3. Scopes du token

Le token doit avoir au minimum :

- **assets:read** — pour l’imagerie mondiale (assets 2, 3) et le terrain (World Terrain, ou ton asset LiDAR si tu en as un).

Tu peux laisser **geocode** si tu l’utilises.

## 4. En cas d’écran noir

1. Ouvre les **outils de développement** (F12) → onglet **Réseau** (Network).
2. Recharge la page `cesium-view`.
3. Filtre par « ion » ou « cesium » et regarde les requêtes en **rouge** (échouées).
4. Si tu vois **401** ou **403** : le token ou les « Allowed URLs » bloquent l’accès → corrige le token sur ion.cesium.com comme ci‑dessus.
5. Si tu vois des erreurs **CORS** : vérifie que l’URL utilisée (ex. `https://192.168.0.140:8000`) est bien ajoutée aux Allowed URLs du token.

## 5. Comportement en cas d’échec Ion

Si le token ou l’origine n’est pas autorisé, la vue 3D **bascule automatiquement** sur un **relief simplifié** (ellipsoïde, pas de MNT) pour éviter l’écran noir. Vous verrez au moins le globe (vert ou imagerie de fallback) et pourrez zoomer/déplacer. La console (F12) affiche alors un message indiquant d’ajouter l’origine dans **Allowed URLs** sur ion.cesium.com pour retrouver le relief 3D et l’imagerie satellite.

## 6. Résumé

- **Token** : présent dans `.env` (`CESIUM_ION_ACCESS_TOKEN`).
- **Origine** : autoriser l’URL de l’app (IP, localhost, futur domaine) dans les paramètres du token sur ion.cesium.com (**Allowed URLs**).
- **Code** : la vue 3D tente toujours Ion (imagerie + terrain) ; en cas de rejet (401/origine), fallback automatique vers relief simplifié pour éviter le noir.

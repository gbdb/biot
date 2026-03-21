# Séparer Jardin bIOT et Radix Sylva sur GitHub

Tu as aujourd’hui **un dépôt** qui contient à la fois la racine **Jardin bIOT** et le dossier **`radixsylva/`**. Pour **pousser / tirer sur le droplet** avec des clones propres (un service = un repo), il faut **deux dépôts GitHub**.

Ce document décrit deux approches ; tu peux en choisir **une** (la B est la plus simple si tu n’as pas besoin de l’historique Git uniquement dans `radixsylva/`).

---

## 1. Créer les dépôts vides sur GitHub

1. Va sur GitHub → **New repository**.
2. Crée par exemple :
   - **`radixsylva`** — **sans** README / .gitignore / licence (dépôt vide).
   - **`jardinbiot`** (ou garde le nom actuel du repo si tu renommes) — idem vide **si** tu pars d’un split propre ; sinon voir §3.

Note les URLs HTTPS ou SSH, ex. `git@github.com:TON_USER/radixsylva.git`.

---

## 2. Travailler dans **une seule fenêtre Cursor**

Cursor (comme VS Code) peut ouvrir **plusieurs dossiers** dans le même workspace :

1. **Fichier** → **Add Folder to Workspace…** → choisir le second dossier (ex. `radixsylva` à côté de `jardinbiot`).
2. Ou créer un fichier **`*.code-workspace`** (voir §6) et l’ouvrir avec **File → Open Workspace from File…**.

Tu continues donc à coder **Radix** et **BIOT** côte à côte, avec **deux racines Git** distinctes dans la barre latérale.

---

## 3. Approche A — Garder l’historique Git du dossier `radixsylva/` (subtree split)

À lancer depuis la racine de ton clone actuel (ex. `biot/`), avec un remote `origin` qui pointe vers ton repo GitHub actuel.

```bash
# Branche contenant uniquement l’historique de radixsylva/
git subtree split -P radixsylva -b radix-only

# Pousser vers le NOUVEAU repo GitHub (créé vide)
git remote add radix-origin git@github.com:TON_USER/radixsylva.git
git push radix-origin radix-only:main
```

Ensuite, **retirer** `radixsylva/` du dépôt principal et enregistrer ce retrait :

```bash
git checkout main   # ou master
git rm -rf radixsylva
git commit -m "chore: extraire radixsylva vers dépôt dédié"
git push origin main
```

Le dépôt **`jardinbiot`** ne contient plus `radixsylva/`. Tu clones à part `radixsylva` pour le travail quotidien (voir §5).

**Option submodule** (si tu veux qu’un clone de `jardinbiot` ramène automatiquement Radix) :

```bash
git submodule add git@github.com:TON_USER/radixsylva.git radixsylva
git commit -m "chore: radixsylva en sous-module"
git push origin main
```

Sans submodule : tu clones **deux repos** à côté l’un de l’autre (plus simple pour beaucoup d’équipes).

---

## 4. Approche B — Nouveau repo Radix sans historique (rapide)

1. Copie le dossier hors du dépôt actuel :

   ```bash
   cp -R radixsylva /chemin/vers/radixsylva-repo
   cd /chemin/vers/radixsylva-repo
   rm -rf .git   # s’il y avait un .git parasite
   git init
   git add .
   git commit -m "Initial: Radix Sylva extrait de Jardin bIOT"
   git branch -M main
   git remote add origin git@github.com:TON_USER/radixsylva.git
   git push -u origin main
   ```

2. Dans le dépôt **principal**, supprime `radixsylva/` et commit (comme en §3), ou utilise le subtree split seulement pour le dépôt principal sans pousser l’historique Radix.

---

## 5. Disposition locale recommandée (deux clones)

Exemple :

```text
~/Documents/gBOIT_Cursor/
  jardinbiot/          ← clone de github.com/TON_USER/jardinbiot
  radixsylva/          ← clone de github.com/TON_USER/radixsylva
```

```bash
cd ~/Documents/gBOIT_Cursor
git clone git@github.com:TON_USER/jardinbiot.git
git clone git@github.com:TON_USER/radixsylva.git
```

Cursor : **Add Folder to Workspace** → ajouter les deux dossiers.

---

## 6. Fichier workspace (optionnel)

Crée par ex. `~/Documents/gBOIT_Cursor/jardinbiot-radix.code-workspace` :

```json
{
  "folders": [
    { "name": "Jardin bIOT", "path": "jardinbiot" },
    { "name": "Radix Sylva", "path": "radixsylva" }
  ],
  "settings": {}
}
```

Ouvre ce fichier avec **Open Workspace from File…**. Adapte les chemins si ton dossier parent a un autre nom.

---

## 7. Sur le droplet DigitalOcean

**Radix (API + Django)** :

```bash
cd /opt   # ou ton choix
git clone git@github.com:TON_USER/radixsylva.git
cd radixsylva
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# .env, migrate, gunicorn, etc.
```

**Jardin bIOT** (autre répertoire ou autre serveur) :

```bash
git clone git@github.com:TON_USER/jardinbiot.git
```

Chaque service ne récupère que **son** code — déploiements et mises à jour (`git pull`) restent clairs.

---

## 8. Rappels

- **Deux venv Python** : un par projet (`jardinbiot/.venv`, `radixsylva/.venv`) — inchangé par rapport à aujourd’hui.
- **Chemins relatifs** dans la doc (`../data/`) : à ajuster si Radix n’est plus sous `biot/` ; les scripts qui pointent vers `../data/hydroquebec` depuis `radixsylva/` devront utiliser un chemin absolu ou une variable d’environnement.
- Mets à jour **`docs/plan-radix-biot-phases.md`** / README si les URLs des repos changent.

---

## 9. Si ton repo GitHub actuel s’appelle déjà `jardinbiot`

Tu peux :

1. Pousser Radix vers `radixsylva` (§3 ou §4).
2. Nettoyer le repo actuel en retirant `radixsylva/` (§3).
3. Le repo existant **reste** `jardinbiot` — pas besoin de créer un second repo pour BIOT sauf si tu préfères repartir de zéro.

Si le repo actuel s’appelle autre chose (`biot`, etc.), tu peux **renommer** le dépôt sur GitHub (Settings → Repository name) en `jardinbiot` pour clarifier.

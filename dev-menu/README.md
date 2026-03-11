# Jardin Biot — Dev menu bar app (macOS)

Menu bar app to start Django and Expo with one click, with a combined output window and **Copy last** / **Copy all** for sharing logs (e.g. with Cursor).

**Requirements:** Python with Tk (the python.org macOS installer includes it; Homebrew Python may need `brew install python-tk`). Use the project venv so “Django — LAN” uses the same Python as your backend.

## Run from terminal (script mode)

Use the project’s virtualenv so Django is available when you start “Django — LAN” or “Django — HTTPS”:

```bash
cd /path/to/biot
source venv/bin/activate
python dev-menu/app.py
```

A “Biot” icon appears in the menu bar. Use **Django** and **Expo** submenus to start commands; **Show output** opens the log window with **Copy last output** and **Copy all** buttons.

## Build a standalone .app (PyInstaller)

From the project root, with the same venv activated:

```bash
cd /path/to/biot
source venv/bin/activate
pip install -r dev-menu/requirements.txt
./dev-menu/build_app.sh
```

The `.app` is created under `dev-menu/dist/`. You can move it to Applications or keep it in the repo and start it from the Dock or Spotlight.

**First launch (frozen .app):** The app will ask you to select the Jardin Biot project folder (the `biot` directory that contains `manage.py` and `mobile/`). The path is saved in `~/Library/Application Support/JardinBiotDevMenu/project_root.txt`. To change it later, delete that file and relaunch.

## Commands

| Menu | Command |
|------|--------|
| Django — LAN | `python manage.py runserver 0.0.0.0:8000` |
| Django — HTTPS | `python run_https.py` (Cesium 3D) |
| Expo — Start | `npx expo start` |
| Expo — run:ios | `npx expo run:ios` |
| Expo — run:android | `npx expo run:android` |
| Expo — web | `npx expo start --web` |

Clicking the same item again stops the previous run and starts a new one.

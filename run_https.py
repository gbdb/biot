#!/usr/bin/env python3
"""
Lance le serveur Django en HTTPS (dev) pour voir la vue 3D Cesium avec imagerie satellite.
Usage: python run_https.py
Puis ouvrir https://localhost:8000/cesium-view/?garden_id=1 et accepter le certificat.
"""
import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEV_CERT_DIR = BASE_DIR / ".dev"
CERT_FILE = DEV_CERT_DIR / "cert.pem"
KEY_FILE = DEV_CERT_DIR / "key.pem"


def ensure_cert():
    if CERT_FILE.exists() and KEY_FILE.exists():
        return
    DEV_CERT_DIR.mkdir(exist_ok=True)
    subprocess.run([
        "openssl", "req", "-x509", "-newkey", "rsa:2048",
        "-keyout", str(KEY_FILE), "-out", str(CERT_FILE),
        "-days", "365", "-nodes",
        "-subj", "/CN=localhost",
    ], check=True)
    print(f"Certificat créé: {CERT_FILE}")


def main():
    try:
        import django_extensions
    except ImportError:
        print("Installez les dépendances: pip install django-extensions pyOpenSSL Werkzeug")
        sys.exit(1)
    ensure_cert()
    os.chdir(BASE_DIR)
    subprocess.run([
        sys.executable, "manage.py", "runserver_plus",
        "0.0.0.0:8000",
        "--cert-file", str(CERT_FILE),
        "--key-file", str(KEY_FILE),
    ])


if __name__ == "__main__":
    main()

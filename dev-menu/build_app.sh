#!/bin/bash
# Build JardinBiotDevMenu.app from the PyInstaller onedir output.
# Run from repo root: ./dev-menu/build_app.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Building with PyInstaller (onedir)..."
pyinstaller --noconfirm dev-menu/JardinBiotDevMenu.spec

ONEDIR="$PROJECT_ROOT/dist/JardinBiotDevMenu"
APP_NAME="JardinBiotDevMenu.app"
OUT_APP="$SCRIPT_DIR/dist/$APP_NAME"

if [ ! -d "$ONEDIR" ]; then
  echo "Expected directory not found: $ONEDIR"
  exit 1
fi

echo "Creating .app bundle at $OUT_APP..."
rm -rf "$OUT_APP"
mkdir -p "$OUT_APP/Contents/MacOS"
mkdir -p "$OUT_APP/Contents/Resources"

cp -R "$ONEDIR/"* "$OUT_APP/Contents/MacOS/"

cat > "$OUT_APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>JardinBiotDevMenu</string>
  <key>CFBundleIdentifier</key>
  <string>com.jardinbiot.devmenu</string>
  <key>CFBundleName</key>
  <string>Jardin Biot Dev Menu</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.13</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>LSUIElement</key>
  <true/>
</dict>
</plist>
PLIST

echo "Created $OUT_APP"
echo "You can move it to Applications or run: open $OUT_APP"

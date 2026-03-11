# PyInstaller spec for Jardin Biot Dev Menu bar app (macOS).
# Run from repo root: ./dev-menu/build_app.sh (or: pyinstaller dev-menu/JardinBiotDevMenu.spec)

block_cipher = None

a = Analysis(
    ['dev-menu/app.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['rumps', 'tkinter', 'pyobjc', 'pyobjc_framework_Cocoa'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='JardinBiotDevMenu',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='JardinBiotDevMenu',
)

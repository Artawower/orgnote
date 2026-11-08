#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAND_COLOR="9356E8"
BRAND_HEX="#${BRAND_COLOR}"
CAPACITOR_ASSETS="${ROOT_DIR}/src-capacitor/assets"
ANDROID_ASSETS="${CAPACITOR_ASSETS}/android"
MACOS_ICON_BUNDLE="${ROOT_DIR}/src-electron/icons/icon.icon"
MACOS_ICON_ASSETS="${MACOS_ICON_BUNDLE}/Assets"

require_command() {
  if command -v "$1" >/dev/null 2>&1; then
    return 0
  fi

  echo "Missing required command: $1" >&2
  exit 1
}

require_command magick
require_command icongenie
require_command bunx

cd "$ROOT_DIR"

mkdir -p "$ANDROID_ASSETS" "$MACOS_ICON_ASSETS"

magick images/modern-unicorn-macos.png \
  -trim +repage \
  -resize 960x960 \
  -background none \
  -gravity center \
  -extent 1024x1024 \
  images/modern-unicorn-macos.png

magick images/modern-unicorn.png \
  -fuzz 8% \
  -transparent "$BRAND_HEX" \
  "${MACOS_ICON_ASSETS}/unicorn.png"

cat > "${MACOS_ICON_BUNDLE}/icon.json" <<'JSON'
{
  "fill": {
    "solid": "srgb:0.57647,0.33725,0.90980,1.00000"
  },
  "groups": [
    {
      "blur-material": null,
      "layers": [
        {
          "glass": false,
          "hidden": false,
          "image-name": "unicorn.png",
          "name": "unicorn",
          "position": {
            "scale": 1,
            "translation-in-points": [
              0,
              0
            ]
          }
        }
      ],
      "lighting": "individual",
      "shadow": {
        "kind": "neutral",
        "opacity": 0.5
      },
      "specular": true,
      "translucency": {
        "enabled": false,
        "value": 0.5
      }
    }
  ],
  "supported-platforms": {
    "squares": "shared"
  }
}
JSON

icongenie generate \
  --skip-trim \
  -m pwa \
  -i images/modern-unicorn.png \
  --png-color "$BRAND_COLOR" \
  --splashscreen-color "$BRAND_COLOR"

icongenie generate \
  --skip-trim \
  -m electron \
  -i images/modern-unicorn-macos.png \
  --png-color "$BRAND_COLOR" \
  --splashscreen-color "$BRAND_COLOR"

magick images/modern-unicorn.png \
  -fuzz 8% \
  -transparent "$BRAND_HEX" \
  "${CAPACITOR_ASSETS}/icon.png"

cp images/modern-unicorn-round.png "${ANDROID_ASSETS}/icon.png"
rm -f \
  "${CAPACITOR_ASSETS}/icon-only.png" \
  "${CAPACITOR_ASSETS}/icon-foreground.png" \
  "${CAPACITOR_ASSETS}/icon-background.png" \
  "${CAPACITOR_ASSETS}/splash.png" \
  "${CAPACITOR_ASSETS}/splash-dark.png"

(
  cd src-capacitor
  bunx @capacitor/assets generate \
    --iconBackgroundColor "$BRAND_HEX" \
    --iconBackgroundColorDark "$BRAND_HEX" \
    --splashBackgroundColor "$BRAND_HEX" \
    --splashBackgroundColorDark "$BRAND_HEX" \
    --logoSplashScale 0.35
)

python3 - <<'PY'
from pathlib import Path

old = '''    <background>\n        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="16.7%" />\n    </background>'''
new = '''    <background android:drawable="@mipmap/ic_launcher_background" />'''
root = Path('src-capacitor/android/app/src/main/res/mipmap-anydpi-v26')

for icon_file in ['ic_launcher.xml', 'ic_launcher_round.xml']:
    path = root / icon_file
    path.write_text(path.read_text().replace(old, new))
PY

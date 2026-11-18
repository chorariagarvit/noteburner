#!/bin/bash

# NoteBurner Extension Build Script
#
# Produces, in the repository root:
#   noteburner-extension.zip   Chrome Web Store upload (manifest.json)
#   noteburner-firefox.zip     Firefox Add-ons upload (manifest.firefox.json shipped as manifest.json)
#   noteburner-extension.crx   optional signed CRX, only if the signing key is present
#
# Each package is staged from an explicit allowlist, so tests, docs, build scripts and keys can
# never end up in a published build. Run from anywhere: ./extension/build.sh or ./build.sh

set -euo pipefail

cd "$(dirname "$0")"
EXT_DIR="$(pwd)"
ROOT_DIR="$(dirname "$EXT_DIR")"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo "🔨 Building NoteBurner Browser Extension..."

# Everything that ships (besides the manifest). Add new runtime files here.
FILES=(background.js popup.html popup.js popup.css crypto.js icons/icon16.png icons/icon48.png icons/icon128.png)

for f in "${FILES[@]}" manifest.json manifest.firefox.json; do
  [ -f "$f" ] || { echo -e "${RED}Missing $f${NC}"; exit 1; }
done

# Run the extension's own tests first: a broken package must not be produced
echo -e "${BLUE}🧪 Running extension tests...${NC}"
(cd "$ROOT_DIR" && npm run --silent test:extension >/dev/null) || { echo -e "${RED}Extension tests failed${NC}"; exit 1; }

stage() { # $1 = target dir, $2 = manifest source file
  mkdir -p "$1/icons"
  for f in "${FILES[@]}"; do cp "$f" "$1/$f"; done
  cp "$2" "$1/manifest.json"
}

stage "$STAGE/chrome" manifest.json
stage "$STAGE/firefox" manifest.firefox.json

# Both manifests must carry the same version, or one store will reject the upload
CHROME_VERSION=$(node -p "require('$STAGE/chrome/manifest.json').version")
FIREFOX_VERSION=$(node -p "require('$STAGE/firefox/manifest.json').version")
[ "$CHROME_VERSION" = "$FIREFOX_VERSION" ] || { echo -e "${RED}Version mismatch: chrome $CHROME_VERSION vs firefox $FIREFOX_VERSION${NC}"; exit 1; }

echo -e "${BLUE}🧹 Cleaning old build files...${NC}"
rm -f "$ROOT_DIR/noteburner-extension.crx" "$ROOT_DIR/noteburner-extension.zip" "$ROOT_DIR/noteburner-firefox.zip"

echo -e "${BLUE}📦 Creating Chrome ZIP...${NC}"
(cd "$STAGE/chrome" && zip -qr "$ROOT_DIR/noteburner-extension.zip" .)

echo -e "${BLUE}🦊 Creating Firefox ZIP...${NC}"
(cd "$STAGE/firefox" && zip -qr "$ROOT_DIR/noteburner-firefox.zip" .)

# Optional signed CRX (only needed for self-hosted or verified-upload flows). The private key
# is NOT kept in this repository: point NOTEBURNER_KEY at it, or put it next to this script.
KEY="${NOTEBURNER_KEY:-$EXT_DIR/noteburner-private-key.pem}"
if [ -f "$KEY" ]; then
  echo -e "${BLUE}🔐 Creating signed CRX...${NC}"
  (cd "$ROOT_DIR" && npx --yes crx3 "$STAGE/chrome" -p "$KEY" -o noteburner-extension.crx >/dev/null)
else
  echo -e "${YELLOW}ℹ️  No signing key found (set NOTEBURNER_KEY) - skipping the .crx. The Chrome Web Store zip does not need it.${NC}"
fi

# Verify what was produced
for z in noteburner-extension.zip noteburner-firefox.zip; do
  unzip -l "$ROOT_DIR/$z" | grep -q " manifest.json$" || { echo -e "${RED}$z has no manifest.json${NC}"; exit 1; }
  if unzip -l "$ROOT_DIR/$z" | grep -qE "\.md$|\.pem$|test/|build\.sh|manifest\.firefox\.json|content\.js"; then
    echo -e "${RED}$z contains files that must not ship${NC}"; exit 1
  fi
done
unzip -p "$ROOT_DIR/noteburner-firefox.zip" manifest.json | grep -q '"gecko"' || { echo -e "${RED}Firefox zip does not contain the Firefox manifest${NC}"; exit 1; }
! unzip -p "$ROOT_DIR/noteburner-extension.zip" manifest.json | grep -q '"gecko"' || { echo -e "${RED}Chrome zip contains the Firefox manifest${NC}"; exit 1; }

echo ""
echo -e "${GREEN}✅ Build complete (version $CHROME_VERSION)${NC}"
echo ""
ls -lh "$ROOT_DIR"/noteburner-extension.zip "$ROOT_DIR"/noteburner-firefox.zip "$ROOT_DIR"/noteburner-extension.crx 2>/dev/null || true
echo ""
echo "📦 Chrome package:"; unzip -l "$ROOT_DIR/noteburner-extension.zip" | awk 'NR>3 && $4!="" {print "  " $4}'
echo "📦 Firefox package:"; unzip -l "$ROOT_DIR/noteburner-firefox.zip" | awk 'NR>3 && $4!="" {print "  " $4}'
echo ""
echo "Chrome Web Store:  upload noteburner-extension.zip  https://chrome.google.com/webstore/devconsole"
echo "Firefox Add-ons:   upload noteburner-firefox.zip    https://addons.mozilla.org/developers/"

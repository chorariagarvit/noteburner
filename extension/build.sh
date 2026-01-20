#!/bin/bash

# NoteBurner Extension Build Script
# Creates both CRX (signed) and ZIP files for Chrome Web Store submission

set -e

echo "🔨 Building NoteBurner Browser Extension..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if private key exists
if [ ! -f "noteburner-private-key.pem" ]; then
    echo -e "${YELLOW}⚠️  Warning: Private key not found!${NC}"
    echo "Run these commands to generate keys:"
    echo "  openssl genrsa -out noteburner-private-key.pem 2048"
    echo "  openssl rsa -in noteburner-private-key.pem -pubout -out noteburner-public-key.pem"
    exit 1
fi

# Navigate to parent directory
cd ..

# Clean old builds
echo -e "${BLUE}🧹 Cleaning old build files...${NC}"
rm -f noteburner-extension.crx
rm -f noteburner-extension.zip
rm -f noteburner-firefox.zip

# Create signed CRX file (Chrome Web Store with verified upload)
echo -e "${BLUE}🔐 Creating signed CRX file...${NC}"
npx crx3 extension -p extension/noteburner-private-key.pem -o noteburner-extension.crx

# Create ZIP file for Chrome Web Store (alternative upload method)
echo -e "${BLUE}📦 Creating Chrome ZIP file...${NC}"
cd extension
zip -r ../noteburner-extension.zip . \
    -x "*.git*" \
    -x "node_modules/*" \
    -x "generate-icons.js" \
    -x "icons/create-icons.html" \
    -x "*.pem" \
    -x ".gitignore" \
    -x "*.md" \
    -x "build.sh" \
    -x "noteburner-*.zip" \
    -x "manifest.firefox.json"

# Create Firefox ZIP file (uses different manifest)
echo -e "${BLUE}🦊 Creating Firefox ZIP file...${NC}"
zip -r ../noteburner-firefox.zip . \
    -x "*.git*" \
    -x "node_modules/*" \
    -x "generate-icons.js" \
    -x "icons/create-icons.html" \
    -x "*.pem" \
    -x ".gitignore" \
    -x "*.md" \
    -x "build.sh" \
    -x "noteburner-*.zip" \
    -x "manifest.json" \
    -i "manifest.firefox.json"

cd ..

# Display results
echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "📋 Build artifacts:"
ls -lh noteburner-extension.crx noteburner-extension.zip noteburner-firefox.zip 2>/dev/null || true
echo ""
echo "📦 Package contents:"
unzip -l noteburner-extension.zip | grep -E "\.json$|\.js$|\.html$|\.css$|\.png$"
echo ""
echo -e "${GREEN}🚀 Ready for upload!${NC}"
echo ""
echo "Chrome Web Store:"
echo "  - Upload: noteburner-extension.zip (or .crx if using verified upload)"
echo "  - Dashboard: https://chrome.google.com/webstore/devconsole"
echo ""
echo "Firefox Add-ons:"
echo "  - Upload: noteburner-firefox.zip"
echo "  - Dashboard: https://addons.mozilla.org/developers/"
echo ""

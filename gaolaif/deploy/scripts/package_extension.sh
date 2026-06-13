#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_DIR="$SCRIPT_DIR/../../extension"
OUTPUT_DIR="$SCRIPT_DIR/../marketplace"

echo "=== Gaolaif: Packaging VS Code Extension ==="

cd "$EXTENSION_DIR"

echo "[1/3] Installing dependencies..."
npm ci --omit=dev

echo "[2/3] Compiling extension..."
npm run compile

echo "[3/3] Packaging .vsix..."
npx vsce package --out "$OUTPUT_DIR/gaolaif-$(node -p "require('./package.json').version").vsix"

echo ""
echo "=== Package created ==="
ls -lh "$OUTPUT_DIR"/*.vsix
echo ""
echo "Install locally: code --install-extension $OUTPUT_DIR/gaolaif-*.vsix"

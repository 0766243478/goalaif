#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_DIR="$SCRIPT_DIR/../../extension"

echo "=== Gaolaif: Publishing to VS Code Marketplace ==="
echo ""
echo "Prerequisites:"
echo "  1. Install vsce: npm install -g @vscode/vsce"
echo "  2. Create publisher: https://marketplace.visualstudio.com/manage"
echo "  3. Get PAT: https://dev.azure.com (create token with Marketplace scope)"
echo ""

if ! command -v vsce &> /dev/null; then
    echo "ERROR: vsce not found. Install: npm install -g @vscode/vsce"
    exit 1
fi

cd "$EXTENSION_DIR"

echo "[1/3] Installing dependencies..."
npm ci

echo "[2/3] Compiling production bundle..."
npm run package

echo "[3/3] Publishing..."
vsce publish

echo ""
echo "=== Published successfully ==="
echo "Extension live at:"
echo "  https://marketplace.visualstudio.com/items?itemName=HusseinMohammed.gaolaif"

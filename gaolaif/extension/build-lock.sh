# Build and deploy SIREEN extension with file locking
npm run compile 2>&1 | Select-String -Pattern "compiled|error" -CaseSensitive:$false

echo ""
echo "Syncing dist files..."
rsync -av dist/ ~/.vscode/extensions/hussein-m.sireen-1.0.3/dist/

echo ""
echo "Locking JS files to prevent auto-update overwrite..."
find ~/.vscode/extensions/hussein-m.sireen-1.0.3/dist -name "*.js" -exec chmod 444 {} \;

echo ""
echo "Build complete! Files are now read-only."
echo "Reload VS Code window to activate changes."

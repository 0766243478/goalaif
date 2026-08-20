# Build and lock extension - prevents VS Code Auto Update from overwriting
$ErrorActionPreference = "Stop"
$srcDir = "c:\Users\humos\Goalaif\myprojrct\goalaif\gaolaif\extension"
$dstDir = "$env:USERPROFILE\.vscode\extensions\hussein-m.sireen-1.0.3"

Write-Output "=== SIREEN Extension Builder ==="
Write-Output ""

# Step 1: Compile
Write-Output "[1/3] Compiling..."
Set-Location $srcDir
npm run compile 2>&1 | Select-String -Pattern "compiled|error" -CaseSensitive:$false

# Step 2: Sync dist files
Write-Output ""
Write-Output "[2/3] Syncing to installed extension..."
$distSrc = Join-Path $srcDir "dist"
$distDst = Join-Path $dstDir "dist"

if (Test-Path $distSrc) {
    # Remove old dist first to avoid conflicts
    if (Test-Path $distDst) {
        Remove-Item $distDst -Recurse -Force
    }
    Copy-Item $distSrc $distDst -Recurse -Force
    Write-Output "  Dist files synced successfully"
} else {
    Write-Output "  ERROR: dist folder not found at $distSrc"
    exit 1
}

# Step 3: Lock files (prevent auto-update from overwriting)
Write-Output ""
Write-Output "[3/3] Locking files to prevent auto-update..."

# Get all .js files in dist
Get-ChildItem $distDst -Recurse -Filter "*.js" | ForEach-Object {
    # Set read-only to prevent VS Code from overwriting
    $_.IsReadOnly = $true
    Write-Output "  Locked: $($_.Name)"
}

# Also copy source maps for debugging
Get-ChildItem $distSrc -Recurse -Filter "*.map" | ForEach-Object {
    $relPath = $_.FullName.Replace($distSrc, "")
    $dstFile = Join-Path $distDst $relPath
    if (-not (Test-Path $dstFile)) {
        Copy-Item $_.FullName (Split-Path $dstFile) -Force
    }
}

# Unlock package.json so it can still be updated manually if needed
$pjson = Join-Path $dstDir "package.json"
if (Test-Path $pjson) {
    (Get-Item $pjson).IsReadOnly = $false
}

Write-Output ""
Write-Output "=== Build Complete ==="
Write-Output "Extension locked. Please reload VS Code window."
Write-Output ""
Write-Output "To unlock for future builds, run:"
Write-Output "  Get-ChildItem '$distDst' -Recurse -Filter '*.js' | ForEach-Object { `$_.IsReadOnly = `\$false }"

<#
.SYNOPSIS
    Launches Sireen VS Code Extension in Extension Development Host
#>

param(
    [switch]$Watch,
    [switch]$NoBuild
)

$workspace = Get-Location
$distPath = Join-Path $workspace "dist"
$extensionJs = Join-Path $distPath "extension.js"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SIREEN - Extension Development Launcher" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

if (-not $NoBuild -or -not (Test-Path $extensionJs)) {
    Write-Host "Building extension..." -ForegroundColor Yellow
    $buildArgs = @("build.js")
    if ($Watch) { $buildArgs += "--watch" }
    
    $exitCode = (Start-Process "node" -ArgumentList $buildArgs -WorkingDirectory $workspace -Wait -PassThru).ExitCode
    if ($exitCode -ne 0) {
        Write-Error "Build failed with exit code $exitCode"
        exit $exitCode
    }
    Write-Host "`nBuild complete.`n" -ForegroundColor Green
}

if ($Watch) {
    Write-Host "Watch mode active. Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host "In Extension Host: press Ctrl+R to reload after changes.`n" -ForegroundColor Gray
    Read-Host "Press Enter to stop watching and exit"
    exit 0
}

Write-Host "Launching VS Code Extension Development Host..." -ForegroundColor Yellow

$codeArgs = "--extensionDevelopmentPath=`"$workspace`" --disable-extensions"

$proc = Start-Process "code" -ArgumentList $codeArgs -PassThru -WindowStyle Normal

if ($proc) {
    Write-Host "`nExtension Host launched (PID: $($proc.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps in the new VS Code window:" -ForegroundColor Cyan
    Write-Host "  1. Look for Sireen shield icon in Activity Bar (left)"
    Write-Host "  2. Press Ctrl+Shift+P and run 'Sireen: New Investigation'"
    Write-Host "  3. Open DevTools in webview: Ctrl+Shift+I (inside webview)"
} else {
    Write-Error "Failed to launch VS Code. Is code in PATH?"
    exit 1
}
# Sireen — VS Code Extension Debug Setup

## Quick Start (Copy-Paste Method)

Since `.vscode/` is write-protected in this environment, create the launch config manually:

### 1. Create `.vscode/launch.json`

**In VS Code:** Press `Ctrl+Shift+P` → "Debug: Open launch.json" → "VS Code Extension Development"

**Or manually create** `c:\Users\humos\myprojrct\.vscode\launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Sireen Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "npm: build"
    }
  ]
}
```

### 2. Create `.vscode/tasks.json` (for preLaunchTask)

**In VS Code:** Press `Ctrl+Shift+P` → "Tasks: Configure Task" → "Create tasks.json from template" → "Others"

**Or manually create** `c:\Users\humos\myprojrct\.vscode\tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": [],
      "label": "npm: build",
      "detail": "Builds the extension with esbuild"
    }
  ]
}
```

### 3. Launch

Press **F5** (or `Fn+F5`) → Select **"Run Sireen Extension"**

---

## Alternative: PowerShell Launcher (No Config Needed)

Run the included script directly:

```powershell
# Standard launch (builds + opens Extension Host)
.\launch-sireen.ps1

# Watch mode (rebuilds on file changes, reload with Ctrl+R in Extension Host)
.\launch-sireen.ps1 -Watch

# Skip build (if already built)
.\launch-sireen.ps1 -NoBuild
```

---

## Troubleshooting

### "Select Launch Configuration" shows only npm scripts
- You're in **Trae IDE**, not standard VS Code
- Use the **PowerShell launcher** above: `.\launch-sireen.ps1`
- Or manually create `.vscode/launch.json` as shown above

### "Cannot find module 'vscode'" when running `node dist/extension.js`
- **Don't run the extension directly with Node.js**
- Extensions **must** run inside VS Code Extension Host
- Use F5 or the PowerShell launcher instead

### Extension doesn't appear in Activity Bar
1. Check **View → Appearance → Activity Bar** is enabled
2. Look for **Sireen** shield icon (may be in "More" overflow menu `...`)
3. Run command: `Sireen: New Investigation` (Ctrl+Shift+P)

### Changes not reflecting
- Press `Ctrl+R` inside the Extension Host window to reload
- Or use `-Watch` flag with the launcher for auto-rebuild

---

## Project Structure for Debugging

```
c:\Users\humos\myprojrct\
├── .vscode/
│   ├── launch.json      ← Create this
│   └── tasks.json       ← Create this
├── dist/                ← Built output (committed)
│   ├── extension.js     ← Main entry (Node)
│   └── webview/         ← Webview bundles (browser)
├── src/
│   ├── extension.ts     ← Extension entry point
│   └── webview/screens/ ← 7 webview panels
└── launch-sireen.ps1    ← Quick launcher script
```

---

## Verification Checklist

After launching Extension Host (F5):

- [ ] New VS Code window opens with "[Extension Development Host]" in title
- [ ] **Sireen** icon (shield) appears in Activity Bar
- [ ] Clicking Sireen opens **Sidebar** (Chat + Findings tabs)
- [ ] Command Palette (`Ctrl+Shift+P`) shows:
  - `Sireen: New Investigation`
  - `Sireen: Run Exploit Verification Pipeline`
  - `Sireen: War Room`
  - `Sireen: Report Viewer`
  - `Sireen: Settings`
- [ ] Sidebar loads without console errors (check DevTools: `Ctrl+Shift+I` in webview)

---

## GitHub Repo

**Pushed to:** https://github.com/0766243478/goalaif.git

All source + built `dist/` committed. Clone and run anywhere.
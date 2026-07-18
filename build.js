// ============================================================================
// SIREEN — Build Script
// ============================================================================
// Bundles the extension (Node.js) and all webview panels (browser) with esbuild.

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
};

/** @type {esbuild.BuildOptions} */
const webviewConfig = {
  entryPoints: [
    'src/webview/screens/sidebar.tsx',
    'src/webview/screens/war-room.tsx',
    'src/webview/screens/report-viewer.tsx',
    'src/webview/screens/attack-workspace.tsx',
    'src/webview/screens/bounty-dashboard.tsx',
    'src/webview/screens/knowledge-graph.tsx',
    'src/webview/screens/settings.tsx',
  ],
  bundle: true,
  outdir: 'dist/webview',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: false,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  inject: ['src/webview/jsx-shim.js'],
  loader: { '.css': 'text' },
};

function copyStaticAssets() {
  // Copy media folder
  if (fs.existsSync('media')) {
    fs.cpSync('media', 'dist/media', { recursive: true });
  }
  // Copy test_contracts for demo mode
  if (fs.existsSync('test_contracts')) {
    fs.cpSync('test_contracts', 'dist/test_contracts', { recursive: true });
  }
  // Copy README and LICENSE to dist for packaging
  if (fs.existsSync('README.md')) {
    fs.copyFileSync('README.md', 'dist/README.md');
  }
  if (fs.existsSync('LICENSE')) {
    fs.copyFileSync('LICENSE', 'dist/LICENSE');
  }
  if (fs.existsSync('CHANGELOG.md')) {
    fs.copyFileSync('CHANGELOG.md', 'dist/CHANGELOG.md');
  }
}

async function main() {
  try {
    if (isWatch) {
      const extCtx = await esbuild.context(extensionConfig);
      const webCtx = await esbuild.context(webviewConfig);
      await Promise.all([extCtx.watch(), webCtx.watch()]);
      console.log('[Sireen] Watching for changes...');
    } else {
      await Promise.all([
        esbuild.build(extensionConfig),
        esbuild.build(webviewConfig),
      ]);
      copyStaticAssets();
      console.log('[Sireen] Build complete.');
    }
  } catch (e) {
    console.error('[Sireen] Build failed:', e);
    process.exit(1);
  }
}

main();
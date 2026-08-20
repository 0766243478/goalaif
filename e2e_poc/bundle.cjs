const esbuild = require('c:\\Users\\humos\\myprojrct\\node_modules\\esbuild');
esbuild.build({
  entryPoints: ['c:\\Users\\humos\\myprojrct\\e2e_poc\\harness_entry.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'c:\\Users\\humos\\myprojrct\\e2e_poc\\harness.cjs',
  logLevel: 'warning',
}).then(() => console.log('BUNDLED_OK')).catch((e) => { console.error(e); process.exit(1); });

// Capture REAL forge output exactly as ForgeRunner would (execSync pipe).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname;
const cmd = 'forge test --match-test testExploit -vvvv --gas-report';
const raw = execSync(cmd, {
  cwd,
  env: { ...process.env, FOUNDRY_DISABLE_NIGHTLY_WARNING: '1' },
  timeout: 180000,
  stdio: ['pipe', 'pipe', 'pipe'],
}).toString('utf8');

fs.writeFileSync(path.join(cwd, 'forge_output.txt'), raw, 'utf8');
console.log('CAPTURED_CHARS=' + raw.length);
console.log('HAS_PASS=' + raw.includes('[PASS]'));
console.log('HAS_TRANSFER_LOG=' + raw.includes('Transfer(attacker'));
console.log('HAS_BALANCE_LOG=' + raw.includes('attacker ETH balance'));

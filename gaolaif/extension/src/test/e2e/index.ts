import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..', '..', '..');
  const extensionTestsPath = path.resolve(__dirname, 'runTests');

  console.log('Extension dev path:', extensionDevelopmentPath);
  console.log('Test path:', extensionTestsPath);

  try {
    const exitCode = await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        path.resolve(extensionDevelopmentPath, '..', 'test_contracts', 'VulnerableVault.sol'),
      ],
    });
    process.exit(exitCode);
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();

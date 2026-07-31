const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
  const extensionTestsPath = path.resolve(__dirname, 'e2e-runner.js');
  const vscodeExecutablePath = path.resolve(__dirname, '..', '..', '.vscode-test', 'vscode-win32-x64-archive-1.127.0', 'Code.exe');

  console.log('Extension dev path:', extensionDevelopmentPath);
  console.log('Test path:', extensionTestsPath);
  console.log('VS Code path:', vscodeExecutablePath);

  try {
    const exitCode = await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        path.resolve(extensionDevelopmentPath, '..', '..', 'test_contracts', 'VulnerableVault.sol'),
      ],
      workspaceFolder: path.resolve(extensionDevelopmentPath, '..', '..', 'test_contracts'),
    });
    process.exit(exitCode);
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();

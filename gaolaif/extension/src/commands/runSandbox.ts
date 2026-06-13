import * as vscode from 'vscode';
import { BackendClient } from '../api/backendClient';

export async function handleRunSandbox(backendClient: BackendClient) {
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Gaolaif: Starting Docker sandbox...' },
    async () => {
      try {
        const config = vscode.workspace.getConfiguration('gaolaif');
        const rpcUrl = config.get('defaultRpcEvm', 'https://eth.llamarpc.com');

        const result = await backendClient.post('/sandbox/start', {
          language: 'solidity',
          fork_url: rpcUrl,
          session_id: 'session-' + Date.now(),
        });

        if (result?.rpc_url) {
          vscode.window.showInformationMessage(
            `Gaolaif: EVM sandbox ready at ${result.rpc_url}`
          );
        } else if (result?.container_id) {
          vscode.window.showInformationMessage(
            'Gaolaif: Sandbox started successfully'
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Gaolaif sandbox failed: ${msg}`);
      }
    }
  );
}

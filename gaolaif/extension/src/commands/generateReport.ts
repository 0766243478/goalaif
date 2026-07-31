import * as vscode from 'vscode';
import { BackendClient } from '../api/backendClient';
import { compareSessionsByCreatedAtDesc, type SessionSummary } from './sessionSort';

export async function handleGenerateReport(backendClient: BackendClient) {
  const protocolName = await vscode.window.showInputBox({
    prompt: 'Protocol name (for bug bounty report)',
    placeHolder: 'e.g. Euler Finance, Compound V3',
    ignoreFocusOut: true,
  });

  if (!protocolName) return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Gaolaif: Generating report...' },
    async () => {
      try {
        // Find the most recent completed session
        const sessionsResult = await backendClient.get('/sessions');
        const completedSession = (sessionsResult?.sessions || [])
          .filter((s: SessionSummary) => s.status === 'complete' && (s.findings_count ?? 0) > 0)
          .sort(compareSessionsByCreatedAtDesc)[0];

        if (!completedSession) {
          vscode.window.showErrorMessage('No completed audit session found. Run an audit first.');
          return;
        }

        const result = await backendClient.post('/report/generate', {
          session_id: completedSession.id,
          protocol_name: protocolName,
        });

        if (result?.report_markdown) {
          const doc = await vscode.workspace.openTextDocument({
            content: result.report_markdown,
            language: 'markdown',
          });
          await vscode.window.showTextDocument(doc);

          if (result.report_path) {
            vscode.window.showInformationMessage(
              `Gaolaif: Report saved to ${result.report_path}`,
              'Open File'
            ).then(action => {
              if (action === 'Open File') {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(result.report_path));
              }
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Gaolaif report failed: ${msg}`);
      }
    }
  );
}

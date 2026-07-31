import * as vscode from 'vscode';

export class SireenCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    const auditAction = new vscode.CodeAction(
      'Sireen: Audit this code',
      vscode.CodeActionKind.QuickFix
    );
    auditAction.command = {
      command: 'gaolaif.auditSelection',
      title: 'Audit',
      tooltip: 'Run Sireen security audit',
    };
    actions.push(auditAction);

    const exploitAction = new vscode.CodeAction(
      'Sireen: Try to exploit',
      vscode.CodeActionKind.QuickFix
    );
    exploitAction.command = {
      command: 'gaolaif.exploitSelection',
      title: 'Exploit',
      tooltip: 'Generate exploit proof',
    };
    actions.push(exploitAction);

    const explainAction = new vscode.CodeAction(
      'Sireen: Explain this code',
      vscode.CodeActionKind.QuickFix
    );
    explainAction.command = {
      command: 'sireen.openChatWithContext',
      title: 'Explain',
      arguments: [{ selection: range }],
    };
    actions.push(explainAction);

    return actions;
  }
}

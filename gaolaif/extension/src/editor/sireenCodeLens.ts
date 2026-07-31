import * as vscode from 'vscode';

export class SireenCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const funcRegex = /function\s+(\w+)\s*\(/g;
    let match;

    while ((match = funcRegex.exec(text))) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      lenses.push(new vscode.CodeLens(range, {
        title: '$(shield) Audit',
        command: 'gaolaif.auditSelection',
        tooltip: 'Run Sireen audit on this function',
      }));

      lenses.push(new vscode.CodeLens(range, {
        title: '$(bug) Exploit',
        command: 'gaolaif.exploitSelection',
        tooltip: 'Try to exploit this function',
      }));

      lenses.push(new vscode.CodeLens(range, {
        title: '$(comment) Ask',
        command: 'sireen.openChatWithContext',
        arguments: [{ function: match[1], file: document.uri.fsPath }],
        tooltip: 'Ask Sireen about this function',
      }));
    }

    return lenses;
  }
}

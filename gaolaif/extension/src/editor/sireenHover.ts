import * as vscode from 'vscode';

export class SireenHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const lineText = document.lineAt(position.line).text;
    const funcMatch = lineText.match(/function\s+(\w+)/);
    if (!funcMatch) return null;

    const funcName = funcMatch[1];
    const content = new vscode.MarkdownString();
    content.isTrusted = true;
    content.appendMarkdown(`**$(shield) Sireen Analysis**\n\n`);
    content.appendMarkdown(`Function: \`${funcName}\`\n\n`);
    content.appendMarkdown(`---\n\n`);
    content.appendMarkdown(`[$(shield) Audit](command:gaolaif.auditSelection) · `);
    content.appendMarkdown(`[$(bug) Exploit](command:gaolaif.exploitSelection) · `);
    content.appendMarkdown(`[$(comment) Ask](command:sireen.openChatWithContext)\n`);

    return new vscode.Hover(content);
  }
}

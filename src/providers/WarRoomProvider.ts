// ============================================================================
// SIREEN — War Room Webview Provider
// ============================================================================
// Single panel for live pipeline execution monitoring and report viewing.

import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';

let warRoomPanel: vscode.WebviewPanel | undefined;

export class WarRoomProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  show(): void {
    if (warRoomPanel) {
      warRoomPanel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'sireen.warRoom',
      'War Room — Live Pipeline',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
          vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        ],
      }
    );

    panel.iconPath = {
      light: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'shield.svg'),
      dark: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'shield.svg'),
    };

    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionUri, 'war-room');

    panel.webview.onDidReceiveMessage((message) => this.handleMessage(message));

    panel.onDidDispose(() => {
      warRoomPanel = undefined;
    });

    warRoomPanel = panel;
  }

  postMessage(message: any): void {
    warRoomPanel?.webview.postMessage(message);
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'ready':
        this.postConfig();
        break;

      case 'pipeline:retry':
        vscode.commands.executeCommand('sireen.runPipeline');
        break;

      case 'report:export':
        this.exportReport(message.payload?.reportId);
        break;

      case 'report:copy':
        this.copyReport(message.payload?.format);
        break;

      case 'error':
        vscode.window.showErrorMessage(message.payload?.message || 'Sireen: An error occurred');
        break;

      default:
        console.warn(`[WarRoomProvider] Unhandled message type: ${message.type}`);
        break;
    }
  }

  private postConfig(): void {
    const config = vscode.workspace.getConfiguration('sireen');
    this.postMessage({
      type: 'config',
      payload: {
        aiProvider: config.get('aiProvider'),
        aiModel: config.get('aiModel'),
        forgePath: config.get('forgePath'),
        dockerEnabled: config.get('dockerEnabled'),
      },
    });
  }

  private async exportReport(reportId?: string): Promise<void> {
    if (!reportId) {
      vscode.window.showErrorMessage('Sireen: No report ID provided for export');
      return;
    }

    const report = this.context.workspaceState.get(`report:${reportId}`);
    if (!report) {
      vscode.window.showErrorMessage(`Sireen: Report "${reportId}" not found`);
      return;
    }

    const format = await vscode.window.showQuickPick(
      ['Markdown', 'HTML', 'JSON'],
      { placeHolder: 'Select export format' }
    );
    if (!format) return;

    const content = this.formatReport(report, format.toLowerCase() as 'markdown' | 'html' | 'json');
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: format.toLowerCase(),
    });
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  private copyReport(format?: string): void {
    // Get latest report from workspace state
    const keys = this.context.workspaceState.keys().filter((k) => k.startsWith('report:'));
    if (keys.length === 0) {
      vscode.window.showWarningMessage('No reports available to copy');
      return;
    }

    const latestKey = keys.sort().pop()!;
    const report = this.context.workspaceState.get(latestKey);
    if (report) {
      const content = this.formatReport(report, (format as 'markdown' | 'html' | 'json') || 'markdown');
      vscode.env.clipboard.writeText(content);
      vscode.window.showInformationMessage(`Report copied as ${format || 'Markdown'}`);
    }
  }

  private formatReport(report: any, format: 'markdown' | 'html' | 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.reportToHtml(report);
      case 'markdown':
      default:
        return this.reportToMarkdown(report);
    }
  }

  private reportToMarkdown(report: any): string {
    const findings = report.findings || [];
    const pocResults = report.pocResults || [];
    const honestSignal = report.honestSignal;

    return `# ${report.target?.name || 'Contract'} — Exploit Verification Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Target:** ${report.target?.name || 'Unknown'} (${report.target?.chain || 'ethereum'})
**Verdict:** ${(report.verdict || 'unknown').toUpperCase()}
**Confidence:** ${report.confidence ? `${Math.round(report.confidence * 100)}%` : 'N/A'}

---

## Executive Summary

${report.summary || 'No summary available.'}

---

## Findings (${findings.length})

${findings.map((f: any, i: number) => this.findingToMarkdown(f, i + 1)).join('\n\n---\n\n')}

---

## Proof of Concept Results

${pocResults.map((p: any) => this.pocToMarkdown(p)).join('\n\n')}

---

## Honest Signal Validation

**Passed:** ${honestSignal?.passed ? 'YES' : 'NO'}
**Confidence:** ${honestSignal?.confidence ? `${Math.round(honestSignal.confidence * 100)}%` : 'N/A'}
**Critique:** ${honestSignal?.critique || 'No critique available'}

---

## Evidence

${report.evidence?.map((e: any) => `- [${e.type}] ${e.description} (${e.url || 'N/A'})`).join('\n') || 'No evidence recorded'}

---

*Report generated by Sireen — AI-Powered Smart Contract Exploit Verification*
`;
  }

  private findingToMarkdown(f: any, index: number): string {
    return `### ${index}. ${f.title || f.name || 'Unnamed Finding'}

**Severity:** ${f.severity || 'unknown'.toUpperCase()}
**Category:** ${f.category || 'unknown'}
**Location:** ${f.location || 'N/A'}
**Confidence:** ${f.confidence ? `${Math.round(f.confidence * 100)}%` : 'N/A'}

${f.description || 'No description'}

**Attack Vector:** ${f.attackVector || 'Not specified'}

**Remediation:** ${f.remediation || 'Not specified'}
`;
  }

  private pocToMarkdown(p: any): string {
    return `#### PoC: ${p.findingId || p.name || 'Unknown'}

**Status:** ${p.passed ? 'PASSED ✅' : 'FAILED ❌'}
**Gas Used:** ${p.gasUsed || 'N/A'}
**Block Number:** ${p.blockNumber || 'N/A'}

\`\`\`solidity
${p.code || '// No PoC code available'}
\`\`\`

**Execution Log:**
${p.logs?.join('\n') || 'No logs available'}
`;
  }

  private reportToHtml(report: any): string {
    const md = this.reportToMarkdown(report);
    // Simple markdown to HTML conversion for basic display
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    h1, h2, h3, h4 { color: #1a1a2e; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 4px; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    .verdict { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; }
    .verdict-true { background: #dcfce7; color: #166534; }
    .verdict-false { background: #fee2e2; color: #991b1b; }
    .verdict-inconclusive { background: #fef3c7; color: #92400e; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  </style>
</head>
<body>
${md.replace(/^# (.*$)/gm, '<h1>$1</h1>')
   .replace(/^## (.*$)/gm, '<h2>$1</h2>')
   .replace(/^### (.*$)/gm, '<h3>$1</h3>')
   .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
   .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
   .replace(/\n\n/g, '<p></p>')
   .replace(/\n/g, '<br>')
   .replace(/\`\`\`(\w+)?\n([\s\S]*?)\n\`\`\`/g, '<pre><code>$2</code></pre>')
   .replace(/\`([^\`]+)\`/g, '<code>$1</code>')}
</body>
</html>`;
  }
}
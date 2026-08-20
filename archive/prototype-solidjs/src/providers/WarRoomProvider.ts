// ============================================================================
// SIREEN — War Room Webview Provider
// ============================================================================
// Single panel for live pipeline execution monitoring and report viewing.

import * as vscode from 'vscode';
import { getWebviewHtml } from '../utils/webview';
import type { InvestigationReport } from '../pipeline/types';

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

    const codiconsUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'codicon.css')
    );

    panel.iconPath = {
      light: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'shield.svg'),
      dark: vscode.Uri.joinPath(this.context.extensionUri, 'media', 'shield.svg'),
    };

    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionUri, 'war-room', codiconsUri);

    panel.webview.onDidReceiveMessage((message) => this.handleMessage(message));

    panel.onDidDispose(() => {
      warRoomPanel = undefined;
    });

    warRoomPanel = panel;
  }

  postMessage(message: any): void {
    warRoomPanel?.webview.postMessage(message);
  }

  /** Send pipeline report to War Room for display */
  showReport(report: InvestigationReport): void {
    this.show();
    this.postMessage({
      type: 'report:display',
      payload: { report },
    });
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
        this.exportReport(message.payload?.report);
        break;

      case 'report:copy':
        this.copyReport(message.payload?.report, message.payload?.format);
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

  private async exportReport(report?: InvestigationReport): Promise<void> {
    if (!report) {
      vscode.window.showErrorMessage('Sireen: No report provided for export');
      return;
    }

    const format = await vscode.window.showQuickPick(
      ['Markdown', 'HTML', 'JSON', 'SARIF'],
      { placeHolder: 'Select export format' }
    );
    if (!format) return;

    const content = this.formatReport(report, format.toLowerCase() as 'markdown' | 'html' | 'json' | 'sarif');
    
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`sireen-report-${report.id}.${format.toLowerCase()}`),
      filters: {
        'Report': [format.toLowerCase()],
      },
    });
    
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
    }
  }

  private copyReport(report?: InvestigationReport, format?: string): void {
    if (!report) {
      vscode.window.showWarningMessage('No report available to copy');
      return;
    }

    const content = this.formatReport(report, (format as 'markdown' | 'html' | 'json') || 'markdown');
    vscode.env.clipboard.writeText(content);
    vscode.window.showInformationMessage(`Report copied as ${format || 'Markdown'}`);
  }

  private formatReport(report: InvestigationReport, format: 'markdown' | 'html' | 'json' | 'sarif'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'html':
        return this.reportToHtml(report);
      case 'sarif':
        return this.reportToSarif(report);
      case 'markdown':
      default:
        return this.reportToMarkdown(report);
    }
  }

  private reportToMarkdown(report: InvestigationReport): string {
    const findings = report.evidence || [];
    const honestSignal = report.honestSignal;

    return `# ${report.target} — Exploit Verification Report

**Generated:** ${new Date(report.generatedAt).toLocaleString()}
**Target:** ${report.targetAddress || report.target} (${report.chain})
**Verdict:** ${report.verdict.toUpperCase()}
**Confidence:** ${Math.round(report.honestSignal.confidence * 100)}%

---

## Executive Summary

${report.summary}

---

## Attack Hypothesis

**Title:** ${report.hypothesis.title}
**Type:** ${report.hypothesis.vulnerabilityType}
**Affected Contracts:** ${report.hypothesis.affectedContracts.join(', ') || 'N/A'}
**Severity:** ${report.hypothesis.severity.toUpperCase()}
**Confidence:** ${Math.round(report.hypothesis.confidence * 100)}%

**Attack Vector:**
${report.hypothesis.attackVector}

**Preconditions:**
${report.hypothesis.preconditions.map(p => `- ${p}`).join('\n')}

**Expected Outcome:**
${report.hypothesis.expectedOutcome}

---

## Proof of Concept

**State:** ${report.poc.state.toUpperCase()}
**Compilation Attempts:** ${report.poc.compilationAttempts}
**Compilation Success:** ${report.poc.compilationSuccess ? 'YES' : 'NO'}

${!report.poc.compilationSuccess && report.poc.errors.length > 0 ? `**Compilation Errors:**
\`\`\`
${report.poc.errors.join('\n')}
\`\`\`
` : ''}

**PoC Source Code:**
\`\`\`solidity
${report.poc.sourceCode}
\`\`\`

---

## Forge Execution Results

**Exit Code:** ${report.forgeOutput.exitCode}
**Duration:** ${report.forgeOutput.duration}ms
**Test Results:** ${report.forgeOutput.testResults.filter(t => t.status === 'pass').length} passed / ${report.forgeOutput.testResults.length} total

${report.forgeOutput.testResults.map(t => `- ${t.name}: ${t.status.toUpperCase()}${t.gasUsed ? ` (${t.gasUsed} gas)` : ''}${t.error ? ` — ${t.error}` : ''}`).join('\n')}

${report.forgeOutput.gasReport ? `**Gas Report:**
- Total: ${report.forgeOutput.gasReport.total.toLocaleString()} gas
- By Function: ${JSON.stringify(report.forgeOutput.gasReport.byFunction, null, 2)}` : ''}

---

## Exploit Verification

**Success:** ${report.exploitResult.success ? 'YES' : 'NO'}
**Attacker Profit:** ${report.exploitResult.attackerProfit} ${report.exploitResult.profitToken} ($${report.exploitResult.profitUSD.toLocaleString()})
**Money Flow Entries:** ${report.exploitResult.moneyFlow.length}

**Token Balances:**
${Object.entries(report.exploitResult.tokenBalances).map(([addr, tokens]) => 
  `${addr}: ${Object.entries(tokens).map(([sym, bal]) => `${bal} ${sym}`).join(', ')}`
).join('\n')}

**Money Flow:**
${report.exploitResult.moneyFlow.map(f => `- ${f.from} → ${f.to}: ${f.amount} ${f.token} (${f.type})${f.txIndex !== undefined ? ` [tx ${f.txIndex}]` : ''}`).join('\n') || 'No money flow recorded'}

**Reverted Transactions:**
${report.exploitResult.revertedTransactions.map(t => `- tx ${t.index}: ${t.reason} (${t.gasUsed} gas)`).join('\n') || 'None'}

---

## Honest Signal Validation

**Confirmed:** ${honestSignal.confirmed ? 'YES ✅' : 'NO ❌'}
**Confidence:** ${Math.round(honestSignal.confidence * 100)}%

**Conditions:**
${honestSignal.conditions.map(c => `- ${c.name}: ${c.satisfied ? '✅ SATISFIED' : '❌ NOT SATISFIED'} — ${c.detail}`).join('\n')}

**Explanation:** ${honestSignal.explanation}

---

## Timeline

${report.timeline.map(e => `- [${new Date(e.timestamp).toLocaleTimeString()}] ${e.title}: ${e.description}`).join('\n')}

---

## Evidence

${report.evidence.map(e => `- [${e.type}] ${e.title}: ${e.description}`).join('\n') || 'No evidence recorded'}

---

*Report generated by Sireen — AI-Powered Smart Contract Exploit Verification*
`;
  }

  private reportToHtml(report: InvestigationReport): string {
    const md = this.reportToMarkdown(report);
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

  private reportToSarif(report: InvestigationReport): string {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'Sireen',
            version: '0.2.0',
            informationUri: 'https://github.com/sireen-security/sireen',
            rules: [],
          },
        },
        results: [{
          ruleId: report.hypothesis.vulnerabilityType,
          level: this.severityToSarifLevel(report.hypothesis.severity),
          message: {
            text: `${report.hypothesis.title}: ${report.hypothesis.attackVector}`,
          },
          locations: [{
            physicalLocation: {
              artifactLocation: {
                uri: report.targetAddress || report.target,
              },
            },
          }],
          properties: {
            confidence: report.honestSignal.confidence,
            verdict: report.verdict,
            attackerProfit: report.exploitResult.attackerProfit,
            profitToken: report.exploitResult.profitToken,
            confirmed: report.honestSignal.confirmed,
          },
        }],
        columnKind: 'utf16',
      }],
    };
    return JSON.stringify(sarif, null, 2);
  }

  private severityToSarifLevel(severity: string): 'error' | 'warning' | 'note' | 'none' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'note';
      default:
        return 'none';
    }
  }
}
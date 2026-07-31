import * as vscode from 'vscode';

interface Finding {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  line_number?: number;
  file_path?: string;
  affected_functions?: string[];
}

export class SireenDiagnostics {
  private collection: vscode.DiagnosticCollection;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('sireen');
  }

  updateFindings(findings: Finding[]) {
    const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();

    for (const finding of findings) {
      if (!finding.line_number || !finding.file_path) continue;

      const uri = vscode.Uri.file(finding.file_path);
      const line = finding.line_number - 1;
      const range = new vscode.Range(line, 0, line, 9999);

      const severityMap: Record<string, vscode.DiagnosticSeverity> = {
        CRITICAL: vscode.DiagnosticSeverity.Error,
        HIGH: vscode.DiagnosticSeverity.Warning,
        MEDIUM: vscode.DiagnosticSeverity.Information,
        LOW: vscode.DiagnosticSeverity.Hint,
      };

      const diag = new vscode.Diagnostic(
        range,
        `[Sireen ${finding.severity}] ${finding.title}`,
        severityMap[finding.severity] || vscode.DiagnosticSeverity.Information
      );
      diag.source = 'sireen';
      diag.code = finding.id;

      if (!diagnosticsByFile.has(finding.file_path)) {
        diagnosticsByFile.set(finding.file_path, []);
      }
      diagnosticsByFile.get(finding.file_path)!.push(diag);
    }

    const entries: [vscode.Uri, vscode.Diagnostic[]][] = [];
    for (const [filePath, diags] of diagnosticsByFile) {
      entries.push([vscode.Uri.file(filePath), diags]);
    }
    this.collection.set(entries);
  }

  clear() {
    this.collection.clear();
  }

  dispose() {
    this.collection.dispose();
  }
}

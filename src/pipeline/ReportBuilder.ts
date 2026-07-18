// ============================================================================
// SIREEN — Report Builder
// ============================================================================
// Builds a complete investigation report from all pipeline stages.
// Includes attack hypothesis, generated PoC, forge output, money flow,
// evidence, honest signal, and final verdict. Supports Markdown, HTML, JSON export.

import type {
  AttackHypothesis,
  PoCResult,
  ForgeOutput,
  ExploitResult,
  HonestSignal,
  MoneyFlowEntry,
  InvestigationReport,
  Verdict,
} from './types';
import type { EvidenceItem, TimelineEvent } from '../webview/types';

export interface ReportInput {
  target: string;
  targetAddress?: string;
  chain: string;
  hypothesis: AttackHypothesis;
  poc: PoCResult;
  forgeOutput: ForgeOutput;
  exploitResult: ExploitResult;
  honestSignal: HonestSignal;
  moneyFlow: MoneyFlowEntry[];
}

export type ExportFormat = 'markdown' | 'html' | 'json';

export class ReportBuilder {
  /**
   * Build a complete investigation report.
   */
  build(input: ReportInput): InvestigationReport {
    const verdict = this.determineVerdict(input.honestSignal);
    const evidence = this.buildEvidence(input);
    const timeline = this.buildTimeline(input);
    const summary = this.buildSummary(input, verdict);

    return {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      target: input.target,
      targetAddress: input.targetAddress,
      chain: input.chain,
      hypothesis: input.hypothesis,
      poc: input.poc,
      forgeOutput: input.forgeOutput,
      exploitResult: input.exploitResult,
      honestSignal: input.honestSignal,
      moneyFlow: input.moneyFlow,
      evidence,
      timeline,
      verdict,
      summary,
      generatedAt: Date.now(),
    };
  }

  /**
   * Export report in specified format.
   */
  export(report: InvestigationReport, format: ExportFormat): string {
    switch (format) {
      case 'markdown':
        return this.toMarkdown(report);
      case 'html':
        return this.toHtml(report);
      case 'json':
        return JSON.stringify(report, null, 2);
      default:
        return this.toMarkdown(report);
    }
  }

  /**
   * Determine the final verdict based on honest signal.
   */
  private determineVerdict(signal: HonestSignal): Verdict {
    if (signal.confirmed) return 'confirmed';
    if (signal.confidence > 0) return 'inconclusive';
    return 'not_confirmed';
  }

  /**
   * Build evidence items from pipeline results.
   */
  private buildEvidence(input: ReportInput): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];
    const now = Date.now();

    // PoC source code as evidence
    evidence.push({
      id: `ev-poc-${now}`,
      type: 'code',
      title: 'Generated Exploit PoC',
      description: `Foundry test generated after ${input.poc.compilationAttempts} compilation attempts`,
      content: input.poc.sourceCode,
      tags: ['poc', 'foundry', 'solidity'],
      pinned: true,
      createdAt: now,
    });

    // Forge output as evidence
    evidence.push({
      id: `ev-forge-${now}`,
      type: 'log',
      title: 'Forge Test Output',
      description: `Exit code: ${input.forgeOutput.exitCode}, Duration: ${input.forgeOutput.duration}ms`,
      content: input.forgeOutput.raw.slice(0, 50_000),
      tags: ['forge', 'test-output'],
      pinned: true,
      createdAt: now,
    });

    // Money flow as evidence
    if (input.moneyFlow.length > 0) {
      const flowContent = input.moneyFlow
        .map((f) => `[${f.type.toUpperCase()}] ${f.from} → ${f.to}: ${f.amount} ${f.token}`)
        .join('\n');

      evidence.push({
        id: `ev-flow-${now}`,
        type: 'trace',
        title: 'Money Flow Trace',
        description: `${input.moneyFlow.length} transactions tracked`,
        content: flowContent,
        tags: ['money-flow', 'trace'],
        pinned: true,
        createdAt: now,
      });
    }

    // Honest signal as evidence
    evidence.push({
      id: `ev-verdict-${now}`,
      type: 'other',
      title: `Verdict: ${input.honestSignal.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED'}`,
      description: `Confidence: ${(input.honestSignal.confidence * 100).toFixed(0)}%`,
      content: input.honestSignal.explanation,
      tags: ['verdict', 'honest-signal'],
      pinned: true,
      createdAt: now,
    });

    return evidence;
  }

  /**
   * Build timeline of pipeline events.
   */
  private buildTimeline(input: ReportInput): TimelineEvent[] {
    const now = Date.now();
    const timeline: TimelineEvent[] = [];
    const baseTime = now - 60_000;

    timeline.push({
      id: `tl-start-${now}`,
      type: 'investigation_start',
      title: 'Investigation Started',
      description: `Target: ${input.target} on ${input.chain}`,
      timestamp: baseTime,
    });

    timeline.push({
      id: `tl-hypothesis-${now}`,
      type: 'finding_discovered',
      title: 'Attack Hypothesis Formed',
      description: `${input.hypothesis.title} (${input.hypothesis.vulnerabilityType})`,
      timestamp: baseTime + 10_000,
      severity: input.hypothesis.severity,
    });

    timeline.push({
      id: `tl-poc-${now}`,
      type: 'exploit_simulated',
      title: 'PoC Generated',
      description: `${input.poc.compilationSuccess ? 'Compilation successful' : 'Compilation failed'} after ${input.poc.compilationAttempts} attempt(s)`,
      timestamp: baseTime + 30_000,
    });

    timeline.push({
      id: `tl-forge-${now}`,
      type: 'exploit_simulated',
      title: 'Forge Test Executed',
      description: `${input.forgeOutput.testResults.length} tests, exit code ${input.forgeOutput.exitCode}`,
      timestamp: baseTime + 45_000,
    });

    timeline.push({
      id: `tl-verdict-${now}`,
      type: input.honestSignal.confirmed ? 'finding_verified' : 'analysis_complete',
      title: input.honestSignal.confirmed ? 'Exploit Confirmed' : 'Exploit Not Confirmed',
      description: input.honestSignal.explanation.slice(0, 200),
      timestamp: now,
      severity: input.honestSignal.confirmed ? 'critical' : 'none',
    });

    return timeline;
  }

  /**
   * Build a human-readable summary of the investigation.
   */
  private buildSummary(input: ReportInput, verdict: Verdict): string {
    const parts: string[] = [];

    parts.push(`## Investigation Summary: ${input.hypothesis.title}`);
    parts.push('');
    parts.push(`**Target:** ${input.target}${input.targetAddress ? ` (${input.targetAddress})` : ''}`);
    parts.push(`**Chain:** ${input.chain}`);
    parts.push(`**Vulnerability Type:** ${input.hypothesis.vulnerabilityType}`);
    parts.push(`**Verdict:** ${verdict.toUpperCase()}`);
    parts.push(`**Confidence:** ${(input.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push('');

    // PoC status
    if (input.poc.compilationSuccess) {
      parts.push(`**PoC:** ✅ Compiled successfully after ${input.poc.compilationAttempts} attempt(s)`);
    } else {
      parts.push(`**PoC:** ❌ Compilation failed after ${input.poc.compilationAttempts} attempt(s)`);
      if (input.poc.errors.length > 0) {
        parts.push(`Errors: ${input.poc.errors.slice(0, 3).join('; ')}`);
      }
    }

    // Forge results
    const passedTests = input.forgeOutput.testResults.filter((t) => t.status === 'pass').length;
    const failedTests = input.forgeOutput.testResults.filter((t) => t.status === 'fail').length;
    parts.push(`**Forge Test:** ${passedTests} passed, ${failedTests} failed (exit code: ${input.forgeOutput.exitCode})`);

    // Exploit result
    if (input.exploitResult.success) {
      parts.push(`**Exploit:** ✅ Successful — Attacker profit: ${input.exploitResult.attackerProfit} ${input.exploitResult.profitToken}`);
    } else {
      parts.push(`**Exploit:** ❌ Not successful`);
    }

    // Money flow
    if (input.moneyFlow.length > 0) {
      parts.push(`**Money Flow:** ${input.moneyFlow.length} transactions tracked`);
    }

    // Honest signal conditions
    const satisfied = input.honestSignal.conditions.filter((c) => c.satisfied).length;
    const total = input.honestSignal.conditions.length;
    parts.push(`**Verification:** ${satisfied}/${total} conditions met`);

    parts.push('');
    parts.push(input.honestSignal.explanation);

    return parts.join('\n');
  }

  /**
   * Export to professional Markdown format.
   */
  private toMarkdown(report: InvestigationReport): string {
    const parts: string[] = [];

    // Header
    parts.push(`# ${report.target} — Exploit Verification Report`);
    parts.push('');
    parts.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
    parts.push(`**Chain:** ${report.chain}`);
    parts.push(`**Verdict:** \`${report.verdict.toUpperCase()}\``);
    parts.push(`**Confidence:** ${(report.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push('');

    // Executive Summary
    parts.push('## Executive Summary');
    parts.push('');
    parts.push(report.summary);
    parts.push('');

    // Attack Hypothesis
    parts.push('## Attack Hypothesis');
    parts.push('');
    parts.push(`**Title:** ${report.hypothesis.title}`);
    parts.push(`**Type:** ${report.hypothesis.vulnerabilityType}`);
    parts.push(`**Severity:** ${report.hypothesis.severity.toUpperCase()}`);
    parts.push(`**Confidence:** ${(report.hypothesis.confidence * 100).toFixed(0)}%`);
    parts.push('');
    parts.push(`**Attack Vector:** ${report.hypothesis.attackVector}`);
    parts.push('');
    parts.push('**Preconditions:**');
    report.hypothesis.preconditions.forEach((p) => parts.push(`- ${p}`));
    parts.push('');
    parts.push(`**Expected Outcome:** ${report.hypothesis.expectedOutcome}`);
    parts.push('');

    // Remediation
    parts.push('## Remediation Guidance');
    parts.push('');
    parts.push(this.getRemediationGuidance(report.hypothesis.vulnerabilityType));
    parts.push('');

    // PoC Section
    parts.push('## Proof of Concept');
    parts.push('');
    parts.push(`**Compilation:** ${report.poc.compilationSuccess ? '✅ Success' : '❌ Failed'} (${report.poc.compilationAttempts} attempts)`);
    if (!report.poc.compilationSuccess && report.poc.errors.length > 0) {
      parts.push('');
      parts.push('**Errors:**');
      report.poc.errors.forEach((e) => parts.push(`- ${e}`));
    }
    parts.push('');
    parts.push('```solidity');
    parts.push(report.poc.sourceCode);
    parts.push('```');
    parts.push('');

    // Forge Execution Results
    parts.push('## Forge Test Execution');
    parts.push('');
    parts.push(`**Exit Code:** ${report.forgeOutput.exitCode}`);
    parts.push(`**Duration:** ${report.forgeOutput.duration}ms`);
    parts.push(`**Tests:** ${report.forgeOutput.testResults.length} total`);
    parts.push('');

    const passedTests = report.forgeOutput.testResults.filter((t) => t.status === 'pass');
    const failedTests = report.forgeOutput.testResults.filter((t) => t.status === 'fail');
    if (passedTests.length > 0) {
      parts.push('### Passing Tests');
      passedTests.forEach((t) => {
        parts.push(`- \`${t.name}\` ${t.gasUsed ? `(gas: ${t.gasUsed})` : ''}`);
      });
      parts.push('');
    }
    if (failedTests.length > 0) {
      parts.push('### Failing Tests');
      failedTests.forEach((t) => {
        parts.push(`- \`${t.name}\`: ${t.error || 'Failed'}`);
      });
      parts.push('');
    }

    // Exploit Result
    parts.push('## Exploit Result');
    parts.push('');
    if (report.exploitResult.success) {
      parts.push(`**Status:** ✅ **SUCCESSFUL**`);
      parts.push(`**Attacker Profit:** ${report.exploitResult.attackerProfit} ${report.exploitResult.profitToken}`);
      if (report.exploitResult.profitUSD > 0) {
        parts.push(`**USD Value:** ~$${report.exploitResult.profitUSD.toLocaleString()}`);
      }
    } else {
      parts.push(`**Status:** ❌ Not Successful`);
    }
    parts.push('');

    // Money Flow
    if (report.moneyFlow.length > 0) {
      parts.push('## Money Flow');
      parts.push('');
      parts.push('| Type | From | To | Amount | Token |');
      parts.push('|------|------|-----|--------|-------|');
      report.moneyFlow.forEach((f) => {
        parts.push(`| ${f.type.toUpperCase()} | \`${f.from.slice(0, 10)}...\` | \`${f.to.slice(0, 10)}...\` | ${f.amount} | ${f.token} |`);
      });
      parts.push('');
    }

    // Honest Signal
    parts.push('## Honest Signal Verification');
    parts.push('');
    parts.push(`**Confirmed:** ${report.honestSignal.confirmed ? 'YES' : 'NO'}`);
    parts.push(`**Confidence:** ${(report.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push('');
    parts.push('**Conditions:**');
    report.honestSignal.conditions.forEach((c) => {
      parts.push(`- ${c.satisfied ? '✅' : '❌'} **${c.name}**: ${c.detail}`);
    });
    parts.push('');
    parts.push(`**Explanation:** ${report.honestSignal.explanation}`);
    parts.push('');

    // Evidence
    parts.push('## Evidence');
    parts.push('');
    report.evidence.forEach((e) => {
      parts.push(`### ${e.title}`);
      parts.push(`**Type:** ${e.type} | **Created:** ${new Date(e.createdAt).toLocaleString()}`);
      parts.push('');
      parts.push(e.description);
      parts.push('');
      if (e.content) {
        parts.push('```');
        parts.push(e.content.slice(0, 2000));
        if (e.content.length > 2000) parts.push('... (truncated)');
        parts.push('```');
        parts.push('');
      }
    });

    // Timeline
    parts.push('## Timeline');
    parts.push('');
    report.timeline.forEach((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      parts.push(`- **${time}** — ${t.title}: ${t.description}`);
    });
    parts.push('');

    // Footer
    parts.push('---');
    parts.push(`*Report generated by Sireen — AI-Powered Smart Contract Exploit Verification*`);
    parts.push(`*Report ID: ${report.id}*`);

    return parts.join('\n');
  }

  /**
   * Export to HTML format with embedded styling.
   */
  private toHtml(report: InvestigationReport): string {
    const markdown = this.toMarkdown(report);
    // Simple markdown to HTML conversion for key elements
    let html = markdown
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\`\`\`(\w+)?\n([\s\S]*?)\n\`\`\`/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.target} — Exploit Verification Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a2e; }
    h1, h2, h3 { color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: inherit; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; border: 1px solid #e5e7eb; text-align: left; }
    th { background: #f9fafb; }
    blockquote { border-left: 3px solid #3b82f6; padding-left: 1rem; color: #6b7280; margin: 1rem 0; }
    .verdict { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; }
    .verdict-confirmed { background: #dcfce7; color: #166534; }
    .verdict-inconclusive { background: #fef3c7; color: #92400e; }
    .verdict-not_confirmed { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * Get remediation guidance based on vulnerability type.
   */
  private getRemediationGuidance(vulnType: string): string {
    const guidance: Record<string, string> = {
      'reentrancy': 'Use the Checks-Effects-Interactions pattern. Apply a reentrancy guard (e.g., OpenZeppelin\'s ReentrancyGuard). Ensure state changes happen before external calls.',
      'access-control': 'Implement proper role-based access control (OpenZeppelin AccessControl). Use ownership patterns with two-step transfer. Validate caller permissions on all sensitive functions.',
      'oracle-manipulation': 'Use TWAP oracles instead of spot prices. Implement circuit breakers for price deviation. Use multiple oracle sources with consensus.',
      'flash-loan': 'Add flash loan protection (e.g., block.timestamp checks, minimum deposit times). Use TWAP oracles. Limit single-transaction interactions.',
      'arithmetic': 'Use SafeMath or Solidity 0.8+ built-in overflow checks. Validate all math operations. Use checked arithmetic for critical calculations.',
      'logic-error': 'Comprehensive unit testing with edge cases. Formal verification for critical invariants. Invariant testing with tools like Echidna or Foundry.',
      'sandwich': 'Use commit-reveal schemes for sensitive operations. Implement MEV protection (e.g., Flashbots Protect). Minimize transaction ordering dependence.',
      'front-running': 'Use commit-reveal for sensitive operations. Implement transaction ordering protections. Consider using Flashbots for private transaction submission.',
      'delegatecall': 'Avoid delegatecall to untrusted contracts. Use library patterns with strict version control. Validate delegatecall targets.',
      'unsafe-typecast': 'Use explicit type conversions with validation. Avoid assembly type casts. Use OpenZeppelin\'s SafeCast library.',
    };
    return guidance[vulnType.toLowerCase()] || 'Review the code for the identified vulnerability pattern. Apply security best practices specific to the vulnerability type. Consider a formal audit for critical contracts.';
  }
}

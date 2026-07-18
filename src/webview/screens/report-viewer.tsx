import { createSignal, createMemo, Show, For } from 'solid-js'
import { render } from 'solid-js/web'
import { Button } from '../components/Button'
import { Panel } from '../components/Card'
import { Badge } from '../components/Badge'
import { IconShield, IconAlert, IconCheck, IconDownload, IconEye, IconClock, IconRefreshCw, IconPlus, IconServer, IconBug, IconTarget, IconExternalLink, IconMaximize, IconMinimize, IconGraph, IconFile, IconSearch } from '../design-system/icons'
import { injectGlobalStyles } from '../design-system/styles'
import { postMessage } from '../providers/vscode-api'

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface CodeSnippet {
  language: string
  code: string
  lines: string
}

interface Evidence {
  title: string
  url: string
}

interface VulnerabilityFinding {
  id: number
  severity: Severity
  title: string
  category: string
  status: 'open' | 'fixed' | 'mitigated' | 'confirmed'
  description: string
  impact: string
  likelihood: string
  evidence: Evidence[]
  codeSnippets: CodeSnippet[]
  cweId: string
  cvssScore: string
  recommendation: string
}

interface ReportData {
  id: string
  title: string
  target: string
  chain: string
  date: string
  status: 'draft' | 'final' | 'in-review'
  author: string
  version: string
  executiveSummary: string
  findings: VulnerabilityFinding[]
  summary: Record<Severity, number>
}

const SAMPLE_REPORT: ReportData = {
  id: 'SIR-2026-001',
  title: 'VaultContract Security Audit Report',
  target: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  chain: 'Ethereum Mainnet',
  date: '2026-07-10',
  status: 'final',
  author: 'Sireen Security Team',
  version: '1.2.0',
  executiveSummary: `This report presents the findings of a comprehensive security audit conducted by the Sireen Security Team on the VaultContract smart contract.

A total of 7 findings were identified across various severity levels, including 1 critical, 2 high, 2 medium, and 2 low-severity issues. The most significant finding is a reentrancy vulnerability in the withdraw() function that could allow an attacker to drain the contract's entire balance.

All critical and high-severity issues have been addressed in the latest deployment.`,
  findings: [
    {
      id: 1,
      severity: 'critical',
      title: 'Reentrancy Vulnerability in withdraw() Function',
      category: 'Access Control',
      status: 'fixed',
      description: 'The withdraw() function at line 142 performs an external call before updating the user balance, enabling a reentrancy attack.',
      impact: 'Critical — Complete loss of contract funds. An attacker can drain all ETH held by the contract.',
      likelihood: 'High — Exploit is well-documented and straightforward to execute.',
      evidence: [
        { title: 'Transaction trace showing reentrancy loop', url: '#' },
        { title: 'Proof of concept exploit contract', url: '#' },
      ],
      codeSnippets: [
        {
          language: 'solidity',
          code: 'function withdraw(uint256 amount) external {\n    require(balances[msg.sender] >= amount);\n    (bool success, ) = msg.sender.call{value: amount}("");\n    require(success, "Transfer failed");\n    balances[msg.sender] -= amount;\n}',
          lines: '140-145',
        },
      ],
      cweId: 'CWE-841',
      cvssScore: '9.3',
      recommendation: 'Apply the Checks-Effects-Interactions pattern. Update the balance before making the external call.',
    },
    {
      id: 2,
      severity: 'high',
      title: 'Unchecked External Call Return Value',
      category: 'Input Validation',
      status: 'fixed',
      description: 'The contract makes external calls using the low-level call() function without checking the return value.',
      impact: 'High — Failed calls could leave the contract in an inconsistent state.',
      likelihood: 'Medium — Requires specific scenario where the target call fails.',
      evidence: [
        { title: 'Static analysis report showing unchecked calls', url: '#' },
      ],
      codeSnippets: [
        {
          language: 'solidity',
          code: '(bool success, ) = msg.sender.call{value: amount}("");\n// success not checked before state update',
          lines: '143-144',
        },
      ],
      cweId: 'CWE-252',
      cvssScore: '7.5',
      recommendation: 'Always check the return value of low-level calls.',
    },
    {
      id: 3,
      severity: 'high',
      title: 'Insufficient Slippage Protection in swap()',
      category: 'Logic Error',
      status: 'mitigated',
      description: 'The swap() function lacks minimum output amount validation.',
      impact: 'High — Users could receive significantly less tokens due to MEV/sandwich attacks.',
      likelihood: 'High — Common attack vector on DEX integrations.',
      evidence: [],
      codeSnippets: [],
      cweId: 'CWE-682',
      cvssScore: '7.0',
      recommendation: 'Implement minimum output amount parameters and deadline checks.',
    },
    {
      id: 4,
      severity: 'medium',
      title: 'Centralization Risk in Price Oracle',
      category: 'Centralization',
      status: 'open',
      description: 'The price oracle is controlled by a single admin address that can set arbitrary prices.',
      impact: 'Medium — Admin can manipulate prices to extract value.',
      likelihood: 'Low — Requires malicious or compromised admin.',
      evidence: [],
      codeSnippets: [],
      cweId: 'CWE-829',
      cvssScore: '5.3',
      recommendation: 'Consider using a decentralized oracle solution (e.g., Chainlink).',
    },
    {
      id: 5,
      severity: 'medium',
      title: 'Missing Event Emissions on State Changes',
      category: 'Observability',
      status: 'fixed',
      description: 'Several state-changing functions do not emit events.',
      impact: 'Medium — Reduced transparency and difficulty in tracking state changes.',
      likelihood: 'N/A',
      evidence: [],
      codeSnippets: [],
      cweId: 'CWE-778',
      cvssScore: '5.0',
      recommendation: 'Add events to all state-changing functions.',
    },
    {
      id: 6,
      severity: 'low',
      title: 'Unused State Variable',
      category: 'Code Quality',
      status: 'fixed',
      description: 'The feeCollector address variable is declared but never used.',
      impact: 'Low — Minimal gas waste and code confusion.',
      likelihood: 'N/A',
      evidence: [],
      codeSnippets: [],
      cweId: 'CWE-563',
      cvssScore: '2.1',
      recommendation: 'Remove unused variables or implement the intended functionality.',
    },
    {
      id: 7,
      severity: 'low',
      title: 'Outdated Compiler Version',
      category: 'Code Quality',
      status: 'open',
      description: 'Contract compiled with Solidity 0.8.17.',
      impact: 'Low — Potential missed security fixes in newer compiler versions.',
      likelihood: 'N/A',
      evidence: [],
      codeSnippets: [],
      cweId: 'CWE-1104',
      cvssScore: '1.0',
      recommendation: 'Upgrade to the latest stable Solidity compiler version.',
    },
  ],
  summary: { critical: 1, high: 2, medium: 2, low: 2, info: 0 },
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

const SEVERITY_CONFIG: Record<Severity, { color: string; label: string }> = {
  critical: { color: 'var(--vscode-testing-iconFailed)', label: 'Critical' },
  high: { color: 'var(--vscode-testing-iconErrored)', label: 'High' },
  medium: { color: 'var(--vscode-testing-iconQueued)', label: 'Medium' },
  low: { color: 'var(--vscode-testing-iconPassed)', label: 'Low' },
  info: { color: 'var(--vscode-descriptionForeground)', label: 'Info' },
}

function severityBadgeVariant(s: Severity) {
  switch (s) {
    case 'critical': return 'danger' as const
    case 'high': return 'warning' as const
    case 'medium': return 'warning' as const
    case 'low': return 'success' as const
    case 'info': return 'info' as const
  }
}

function statusBadgeVariant(s: VulnerabilityFinding['status']) {
  switch (s) {
    case 'fixed': return 'success' as const
    case 'mitigated': return 'info' as const
    case 'confirmed': return 'warning' as const
    default: return 'default' as const
  }
}

export default function ReportViewer() {
  injectGlobalStyles()

  const [report] = createSignal<ReportData>(SAMPLE_REPORT)
  const [expandedFindingId, setExpandedFindingId] = createSignal<number | null>(null)

  const toggleFinding = (id: number) => {
    setExpandedFindingId(prev => prev === id ? null : id)
  }

  const handleExport = () => {
    postMessage({ type: 'report:export', payload: { id: report().id } })
  }

  return (
    <div style={{
      display: 'flex', 'flex-direction': 'column', height: '100%',
      background: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)',
      'font-family': 'var(--vscode-font-family)',
      'font-size': 'var(--vscode-font-size)',
      'line-height': 'var(--vscode-line-height)',
      overflow: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', 'align-items': 'center', 'justify-content': 'space-between',
        padding: '10px 16px',
        'border-bottom': '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-panel-background)',
        position: 'sticky', top: 0, 'z-index': 10,
      }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <IconShield size={16} />
          <div>
            <span style={{ 'font-size': 'var(--vscode-font-size)', 'font-weight': 600 }}>Report Viewer</span>
            <div style={{ 'font-size': '11px', color: 'var(--vscode-descriptionForeground)', 'margin-top': 1 }}>
              {report().id} · v{report().version}
            </div>
          </div>
          <Badge variant={report().status === 'final' ? 'success' : report().status === 'in-review' ? 'info' : 'warning'} size="sm">
            {report().status}
          </Badge>
        </div>
        <Button variant="primary" size="sm" icon={<IconDownload size={12} />} onClick={handleExport}>Export</Button>
      </div>

      <div style={{ padding: '16px', 'max-width': 960, width: '100%', 'box-sizing': 'border-box', margin: '0 auto' }}>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
          {/* Metadata */}
          <Panel variant="bordered" padding="md">
            <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 10px 0' }}>Report Metadata</h2>
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Target</div>
                <span style={{ 'font-size': 'var(--vscode-font-size)', 'font-family': 'var(--vscode-editor-font-family)', background: 'var(--vscode-textBlockQuote-background)', padding: '2px 6px', 'border-radius': '2px' }}>
                  {report().target.slice(0, 10)}...{report().target.slice(-6)}
                </span>
              </div>
              <div>
                <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Chain</div>
                <div style={{ 'font-size': 'var(--vscode-font-size)' }}>{report().chain}</div>
              </div>
              <div>
                <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Date</div>
                <div style={{ 'font-size': 'var(--vscode-font-size)', display: 'flex', 'align-items': 'center', gap: '4px' }}><IconClock size={12} /> {report().date}</div>
              </div>
              <div>
                <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Author</div>
                <div style={{ 'font-size': 'var(--vscode-font-size)' }}>{report().author}</div>
              </div>
            </div>
          </Panel>

          {/* Severity Summary */}
          <Panel variant="bordered" padding="md">
            <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 8px 0' }}>Severity Summary</h2>
            <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
              <For each={SEVERITY_ORDER}>
                {(severity) => {
                  const count = report().summary[severity]
                  if (count === 0) return null
                  const cfg = SEVERITY_CONFIG[severity]
                  return (
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '4px', padding: '4px 8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', border: '1px solid var(--vscode-panel-border)' }}>
                      <span style={{ width: 8, height: 8, 'border-radius': '50%', background: cfg.color }} />
                      <span style={{ 'font-size': '10px', 'font-weight': 600, color: cfg.color }}>{count}</span>
                      <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>{cfg.label}</span>
                    </div>
                  )
                }}
              </For>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '4px', padding: '4px 8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', border: '1px solid var(--vscode-panel-border)' }}>
                <span style={{ 'font-size': '10px', 'font-weight': 600 }}>{report().findings.length}</span>
                <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>Total</span>
              </div>
            </div>
          </Panel>

          {/* Executive Summary */}
          <Panel variant="bordered" padding="md">
            <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 8px 0', display: 'flex', 'align-items': 'center', gap: '6px' }}>
              <IconEye size={14} /> Executive Summary
            </h2>
            <div style={{ 'font-size': 'var(--vscode-font-size)', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.6, 'white-space': 'pre-line' }}>
              {report().executiveSummary}
            </div>
          </Panel>

          {/* Findings */}
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: 0, display: 'flex', 'align-items': 'center', gap: '6px' }}>
              <IconAlert size={14} /> Findings ({report().findings.length})
            </h2>

            <For each={report().findings}>
              {(finding) => {
                const isExpanded = expandedFindingId() === finding.id
                const cfg = SEVERITY_CONFIG[finding.severity]

                return (
                  <Panel
                    variant="bordered"
                    padding="none"
                    onClick={() => toggleFinding(finding.id)}
                    style={{ cursor: 'pointer', transition: 'box-shadow 120ms ease', border: `1px solid ${expandedFindingId() === finding.id ? cfg.color + '44' : 'var(--vscode-panel-border)'}` }}
                  >
                    {/* Header */}
                    <div style={{
                      display: 'flex', 'align-items': 'center', gap: '10px',
                      padding: '10px 14px',
                    }}>
                      <div style={{ width: 3, height: 28, 'border-radius': '2px', background: cfg.color, 'flex-shrink': 0 }} />
                      <Badge variant={severityBadgeVariant(finding.severity)} size="sm">{cfg.label}</Badge>
                      <div style={{ flex: 1, 'min-width': 0 }}>
                        <div style={{ 'font-size': 'var(--vscode-font-size)', 'font-weight': 600 }}>{finding.title}</div>
                        <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', display: 'flex', gap: '8px' }}>
                          <span>{finding.cweId}</span>
                          <span>·</span>
                          <span>CVSS {finding.cvssScore}</span>
                          <span>·</span>
                          <span>{finding.category}</span>
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant(finding.status)} size="sm">{finding.status}</Badge>
                      <span style={{
                        color: 'var(--vscode-descriptionForeground)', 'font-size': '9px',
                        transition: 'transform 120ms',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}>▼</span>
                    </div>

                    {/* Expanded */}
                    <Show when={isExpanded}>
                      <div style={{ 'border-top': '1px solid var(--vscode-panel-border)', padding: '10px 14px', display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
                        <div>
                          <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Description</h4>
                          <p style={{ margin: 0, 'font-size': 'var(--vscode-font-size)', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5 }}>{finding.description}</p>
                        </div>

                        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '8px' }}>
                          <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                            <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Impact</h4>
                            <p style={{ margin: 0, 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5 }}>{finding.impact}</p>
                          </div>
                          <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                            <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Likelihood</h4>
                            <p style={{ margin: 0, 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5 }}>{finding.likelihood}</p>
                          </div>
                        </div>

                        <Show when={finding.codeSnippets.length > 0}>
                          <div>
                            <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Code</h4>
                            <For each={finding.codeSnippets}>
                              {(snippet) => (
                                <div style={{ background: 'var(--vscode-textCodeBlock-background)', 'border-radius': '2px', overflow: 'hidden', 'margin-bottom': '6px' }}>
                                  <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '4px 8px', background: 'var(--vscode-textBlockQuote-background)', 'border-bottom': '1px solid var(--vscode-panel-border)', 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
                                    <span>{snippet.language}</span>
                                    <span>Lines {snippet.lines}</span>
                                  </div>
                                  <pre style={{ margin: 0, padding: '8px', 'font-size': '10px', 'font-family': 'var(--vscode-editor-font-family)', 'line-height': 1.5, overflow: 'auto' }}>{snippet.code}</pre>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>

                        <Show when={finding.evidence.length > 0}>
                          <div>
                            <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Evidence</h4>
                            <For each={finding.evidence}>
                              {(ev) => (
                                <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'font-size': 'var(--vscode-font-size)', color: 'var(--vscode-textLink-foreground)', cursor: 'pointer', padding: '4px 8px', 'border-radius': '2px' }}
                                  onClick={(e: MouseEvent) => { e.stopPropagation(); postMessage({ type: 'report:openEvidence', payload: { url: ev.url } }) }}>
                                  <IconExternalLink size={12} />
                                  <span>{ev.title}</span>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>

                        <div style={{ padding: '8px', background: 'color-mix(in srgb, var(--vscode-testing-iconPassed) 12%, transparent)', 'border-radius': '2px', border: '1px solid var(--vscode-panel-border)' }}>
                          <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-testing-iconPassed)', display: 'flex', 'align-items': 'center', gap: '6px' }}>
                            <IconCheck size={12} /> Recommendation
                          </h4>
                          <p style={{ margin: 0, 'font-size': 'var(--vscode-font-size)', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5 }}>{finding.recommendation}</p>
                        </div>
                      </div>
                    </Show>
                  </Panel>
                )
              }}
            </For>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        'border-top': '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-panel-background)',
        display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '12px',
        'font-size': '10px', color: 'var(--vscode-descriptionForeground)',
      }}>
        <For each={SEVERITY_ORDER}>
          {(severity) => {
            const count = report().summary[severity]
            if (count === 0) return null
            return (
              <span style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}>
                <span style={{ width: 6, height: 6, 'border-radius': '50%', background: SEVERITY_CONFIG[severity].color, display: 'inline-block' }} />
                {SEVERITY_CONFIG[severity].label}: {count}
              </span>
            )
          }}
        </For>
        <span>Total: {report().findings.length} findings</span>
      </div>
    </div>
  )
}

const root = document.getElementById('root');
if (root) { render(() => <ReportViewer />, root); }
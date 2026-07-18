import { createSignal, createMemo, Show, For, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Button } from '../components/Button'
import { Panel } from '../components/Card'
import { Badge } from '../components/Badge'
import { IconShield, IconAlert, IconCheck, IconDownload, IconEye, IconClock, IconRefreshCw, IconPlus, IconServer, IconBug, IconTarget, IconExternalLink, IconMaximize, IconMinimize, IconGraph, IconFile, IconSearch, IconLoader, IconTerminal, IconCopy, IconArrowRight } from '../design-system/icons'
import { injectGlobalStyles } from '../design-system/styles'
import { postMessage, onMessage } from '../providers/vscode-api'

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

interface PipelineReport {
  id: string
  target: string
  targetAddress?: string
  chain: string
  hypothesis: {
    title: string
    vulnerabilityType: string
    affectedContracts: string[]
    attackVector: string
    preconditions: string[]
    expectedOutcome: string
    severity: Severity
    confidence: number
  }
  poc: {
    sourceCode: string
    filePath: string
    compilationAttempts: number
    compilationSuccess: boolean
    errors: string[]
    state: string
    stateHistory: Array<{ from: string; to: string; timestamp: number; metadata?: Record<string, unknown> }>
    verificationDetails?: {
      exploitReproduced: boolean
      stateChangeVerified: boolean
      attackerGainVerified: boolean
      profitAmount?: string
      profitToken?: string
    }
  }
  forgeOutput: {
    raw: string
    testResults: Array<{ name: string; status: string; gasUsed?: number; error?: string }>
    gasReport?: { total: number; byFunction: Record<string, number> }
    compilationErrors: string[]
    exitCode: number
    duration: number
  }
  exploitResult: {
    success: boolean
    attackerProfit: string
    profitToken: string
    profitUSD: number
    tokenBalances: Record<string, Record<string, string>>
    moneyFlow: Array<{ from: string; to: string; token: string; amount: string; type: string; txIndex?: number }>
    revertedTransactions: Array<{ index: number; reason: string; gasUsed: number }>
    gasUsage: { total: number; byOperation: Record<string, number> }
  }
  honestSignal: {
    confirmed: boolean
    confidence: number
    conditions: Array<{ name: string; satisfied: boolean; detail: string }>
    explanation: string
    pocGenerated: boolean
    pocCompiled: boolean
    forgeExecuted: boolean
    exploitReproduced: boolean
    stateChangeVerified: boolean
    attackerGainVerified: boolean
  }
  moneyFlow: Array<{ from: string; to: string; token: string; amount: string; type: string; txIndex?: number }>
  evidence: Array<{ id: string; type: string; title: string; description: string; content: string; tags: string[]; pinned: boolean; createdAt: number; metadata?: Record<string, string> }>
  timeline: Array<{ id: string; type: string; title: string; description: string; timestamp: number; severity?: Severity; collapsed?: boolean }>
  verdict: 'confirmed' | 'not_confirmed' | 'inconclusive'
  summary: string
  generatedAt: number
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

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatAddress(addr: string): string {
  if (!addr) return 'N/A'
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function pipelineReportToReportData(report: PipelineReport): ReportData {
  const findings: VulnerabilityFinding[] = [
    {
      id: 1,
      severity: report.hypothesis.severity,
      title: report.hypothesis.title,
      category: report.hypothesis.vulnerabilityType,
      status: report.verdict === 'confirmed' ? 'confirmed' : report.verdict === 'inconclusive' ? 'open' : 'fixed',
      description: report.hypothesis.attackVector,
      impact: report.hypothesis.expectedOutcome,
      likelihood: report.hypothesis.confidence > 0.7 ? 'High' : report.hypothesis.confidence > 0.4 ? 'Medium' : 'Low',
      evidence: report.evidence.map(e => ({ title: e.title, url: e.metadata?.url || '#' })),
      codeSnippets: report.poc.sourceCode ? [{
        language: 'solidity',
        code: report.poc.sourceCode,
        lines: 'PoC Test',
      }] : [],
      cweId: getCWEForVulnType(report.hypothesis.vulnerabilityType),
      cvssScore: getCVSSForSeverity(report.hypothesis.severity),
      recommendation: getRecommendationForVulnType(report.hypothesis.vulnerabilityType),
    },
  ]

  return {
    id: report.id,
    title: `Security Analysis: ${report.hypothesis.title}`,
    target: report.targetAddress || report.target,
    chain: report.chain,
    date: formatDate(report.generatedAt),
    status: 'final',
    author: 'Sireen Pipeline',
    version: '1.0.0',
    executiveSummary: report.summary,
    findings,
    summary: {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
    },
  }
}

function getCWEForVulnType(type: string): string {
  const map: Record<string, string> = {
    'reentrancy': 'CWE-841',
    'access-control': 'CWE-284',
    'oracle-manipulation': 'CWE-1188',
    'flash-loan': 'CWE-840',
    'arithmetic': 'CWE-682',
    'logic-error': 'CWE-840',
    'sandwich': 'CWE-840',
    'front-running': 'CWE-362',
    'delegatecall': 'CWE-642',
    'unsafe-typecast': 'CWE-704',
    'other': 'CWE-699',
  }
  return map[type] || 'CWE-699'
}

function getCVSSForSeverity(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: '9.0-10.0',
    high: '7.0-8.9',
    medium: '4.0-6.9',
    low: '0.1-3.9',
    info: '0.0',
  }
  return map[severity]
}

function getRecommendationForVulnType(type: string): string {
  const map: Record<string, string> = {
    'reentrancy': 'Apply the Checks-Effects-Interactions pattern. Update state before external calls. Use ReentrancyGuard.',
    'access-control': 'Implement proper access controls using Ownable, Roles, or custom modifiers. Avoid tx.origin.',
    'oracle-manipulation': 'Use TWAP oracles, multiple price sources, or commit-reveal schemes.',
    'flash-loan': 'Validate business logic against flash loan scenarios. Use strict price boundaries.',
    'arithmetic': 'Use SafeMath or Solidity 0.8+ built-in overflow checks. Validate inputs.',
    'logic-error': 'Comprehensive unit testing. Formal verification for critical logic.',
    'sandwich': 'Implement slippage protection. Use commit-reveal or MEV-resistant designs.',
    'front-running': 'Use commit-reveal schemes. Avoid predictable transaction ordering.',
    'delegatecall': 'Audit delegatecall targets carefully. Use transparent proxy patterns.',
    'unsafe-typecast': 'Validate type assumptions. Use explicit casting with checks.',
    'other': 'Review the specific vulnerability and apply appropriate mitigation.',
  }
  return map[type] || 'Review the vulnerability and apply appropriate security best practices.'
}

function convertPipelineReport(payload: any): PipelineReport | null {
  if (!payload) return null
  
  if (payload.report && payload.report.hypothesis) {
    return payload.report
  }
  
  if (payload.hypothesis && payload.poc && payload.forgeOutput) {
    return payload
  }
  
  return null
}

export default function ReportViewer() {
  injectGlobalStyles()

  const [report, setReport] = createSignal<ReportData | null>(null)
  const [pipelineReport, setPipelineReport] = createSignal<PipelineReport | null>(null)
  const [expandedFindingId, setExpandedFindingId] = createSignal<number | null>(null)
  const [loading, setLoading] = createSignal(false)

  const toggleFinding = (id: number) => {
    setExpandedFindingId(prev => prev === id ? null : id)
  }

  const handleExport = () => {
    if (pipelineReport()) {
      postMessage({ type: 'report:export', payload: { id: pipelineReport().id, format: 'markdown' } })
    }
  }

  const handleCopy = () => {
    if (pipelineReport()) {
      postMessage({ type: 'report:copy', payload: { id: pipelineReport().id, format: 'markdown' } })
    }
  }

  onMount(() => {
    const unsubscribe = onMessage((message: any) => {
      if (message.type === 'pipeline:complete' && message.payload?.report) {
        const pipelineReport = convertPipelineReport(message.payload)
        if (pipelineReport) {
          setPipelineReport(pipelineReport)
          setReport(pipelineReportToReportData(pipelineReport))
          setLoading(false)
        }
      } else if (message.type === 'report:load' && message.payload?.report) {
        const pipelineReport = convertPipelineReport(message.payload.report)
        if (pipelineReport) {
          setPipelineReport(pipelineReport)
          setReport(pipelineReportToReportData(pipelineReport))
          setLoading(false)
        }
      } else if (message.type === 'report:request') {
        setLoading(true)
      }
    })

    postMessage({ type: 'report:request', payload: {} })

    return unsubscribe
  })

  const displayReport = report()
  const displayPipelineReport = pipelineReport()

  if (loading && !displayReport) {
    return (
      <div style={{
        display: 'flex', 'flex-direction': 'column', height: '100%',
        background: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)',
        'font-family': 'var(--vscode-font-family)',
        'font-size': 'var(--vscode-font-size)',
        'line-height': 'var(--vscode-line-height)',
        'align-items': 'center', 'justify-content': 'center', gap: '16px',
      }}>
        <IconLoader size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ color: 'var(--vscode-descriptionForeground)' }}>Loading report...</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!displayReport) {
    return (
      <div style={{
        display: 'flex', 'flex-direction': 'column', height: '100%',
        background: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)',
        'font-family': 'var(--vscode-font-family)',
        'font-size': 'var(--vscode-font-size)',
        'line-height': 'var(--vscode-line-height)',
        'align-items': 'center', 'justify-content': 'center', gap: '16px',
        padding: '32px', 'text-align': 'center',
      }}>
        <IconFile size={48} style={{ color: 'var(--vscode-descriptionForeground)', opacity: 0.5 }} />
        <div style={{ color: 'var(--vscode-descriptionForeground)' }}>No report loaded</div>
        <div style={{ 'font-size': '12px', color: 'var(--vscode-descriptionForeground)', opacity: 0.7 }}>
          Run a pipeline analysis to generate a report
        </div>
      </div>
    )
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
              {displayReport.id} · v{displayReport.version}
            </div>
          </div>
          <Badge variant={displayReport.status === 'final' ? 'success' : displayReport.status === 'in-review' ? 'info' : 'warning'} size="sm">
            {displayReport.status}
          </Badge>
          {displayPipelineReport && (
            <Badge variant={displayPipelineReport.verdict === 'confirmed' ? 'success' : displayPipelineReport.verdict === 'inconclusive' ? 'warning' : 'danger'} size="sm" style={{ marginLeft: '8px' }}>
              {displayPipelineReport.verdict.toUpperCase()}
            </Badge>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" icon={<IconCopy size={12} />} onClick={handleCopy} title="Copy Report">Copy</Button>
          <Button variant="primary" size="sm" icon={<IconDownload size={12} />} onClick={handleExport}>Export</Button>
        </div>
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
                  {formatAddress(displayReport.target)}
                </span>
              </div>
              <div>
                <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Chain</div>
                <span>{displayReport.chain}</span>
              </div>
              <div>
                <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Date</div>
                <span>{displayReport.date}</span>
              </div>
              <div>
                <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Author</div>
                <span>{displayReport.author}</span>
              </div>
              {displayPipelineReport && (
                <div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Vulnerability Type</div>
                  <span>{displayPipelineReport.hypothesis.vulnerabilityType}</span>
                </div>
              )}
              {displayPipelineReport && (
                <div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Confidence</div>
                  <span>{(displayPipelineReport.hypothesis.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
              {displayPipelineReport && (
                <div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Honest Signal</div>
                  <Badge variant={displayPipelineReport.honestSignal.confirmed ? 'success' : 'danger'} size="sm">
                    {displayPipelineReport.honestSignal.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED'}
                  </Badge>
                </div>
              )}
              {displayPipelineReport && (
                <div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>PoC Compilation</div>
                  <Badge variant={displayPipelineReport.poc.compilationSuccess ? 'success' : 'danger'} size="sm">
                    {displayPipelineReport.poc.compilationSuccess ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                </div>
              )}
              {displayPipelineReport && (
                <div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'margin-bottom': 2 }}>Forge Exit Code</div>
                  <span style={{ 'font-family': 'var(--vscode-editor-font-family)' }}>{displayPipelineReport.forgeOutput.exitCode}</span>
                </div>
              )}
            </div>
          </Panel>

          {/* Executive Summary */}
          <Panel variant="bordered" padding="md">
            <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 10px 0' }}>Executive Summary</h2>
            <div style={{ 'font-size': 'var(--vscode-font-size)', 'line-height': 1.6, color: 'var(--vscode-editor-foreground)' }}>
              {displayReport.executiveSummary}
            </div>
          </Panel>

          {/* Honest Signal Details */}
          {displayPipelineReport && (
            <Panel variant="bordered" padding="md">
              <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 10px 0', display: 'flex', 'align-items': 'center', gap: '8px' }}>
                <IconShield size={14} />
                Honest Signal Verification
              </h2>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {displayPipelineReport.honestSignal.conditions.map((cond, i) => (
                  <div key={i} style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', marginBottom: '4px' }}>
                      <Badge variant={cond.satisfied ? 'success' : 'danger'} size="sm">
                        {cond.satisfied ? '✓' : '✗'}
                      </Badge>
                      <span style={{ 'font-size': '11px', 'font-weight': 500 }}>{cond.name.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>{cond.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', 'font-size': '11px', color: 'var(--vscode-descriptionForeground)' }}>
                <strong>Explanation:</strong> {displayPipelineReport.honestSignal.explanation}
              </div>
              <div style={{ marginTop: '8px', padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', 'font-size': '11px', color: 'var(--vscode-descriptionForeground)' }}>
                <strong>Confidence: </strong> {(displayPipelineReport.honestSignal.confidence * 100).toFixed(0)}%
              </div>
            </Panel>
          )}

          {/* Findings */}
          <Panel variant="bordered" padding="md">
            <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 10px 0' }}>Findings ({displayReport.findings.length})</h2>
            <For each={displayReport.findings}>
              {(finding) => {
                const isExpanded = expandedFindingId() === finding.id
                const cfg = SEVERITY_CONFIG[finding.severity]
                return (
                  <div style={{ 'border': '1px solid var(--vscode-panel-border)', 'border-radius': '2px', overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex', 'align-items': 'center', gap: '10px',
                      padding: '10px 14px',
                      background: 'var(--vscode-panel-background)',
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
                        cursor: 'pointer',
                      }} onClick={() => toggleFinding(finding.id)}>▼</span>
                    </div>

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
                            <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Proof of Concept</h4>
                            <For each={finding.codeSnippets}>
                              {(snippet) => (
                                <div style={{ background: 'var(--vscode-textCodeBlock-background)', 'border-radius': '2px', overflow: 'hidden', 'margin-bottom': '6px' }}>
                                  <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '4px 8px', background: 'var(--vscode-textBlockQuote-background)' }}>
                                    <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>{snippet.language}</span>
                                    <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>{snippet.lines}</span>
                                  </div>
                                  <pre style={{ margin: 0, padding: '8px', overflow: 'auto', 'font-size': '11px', 'font-family': 'var(--vscode-editor-font-family)', 'line-height': 1.5 }}>
                                    {snippet.code}
                                  </pre>
                                </div>
                              )}
                            </For>
                          </div>
                        </Show>

                        <div>
                          <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Recommendation</h4>
                          <p style={{ margin: 0, 'font-size': 'var(--vscode-font-size)', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5 }}>{finding.recommendation}</p>
                        </div>

                        {finding.evidence.length > 0 && (
                          <div>
                            <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Evidence</h4>
                            <For each={finding.evidence}>
                              {(e) => (
                                <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '6px 8px', marginBottom: '4px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', 'font-size': '11px', color: 'var(--vscode-textLink-foreground)', 'text-decoration': 'none' }}>
                                  <IconExternalLink size={10} style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'middle' }} />
                                  {e.title}
                                </a>
                              )}
                            </For>
                          </div>
                        )}
                      </div>
                    </Show>
                  </div>
                )
              }}
            </For>
          </Panel>

          {/* Pipeline Details */}
          {displayPipelineReport && (
            <Panel variant="bordered" padding="md">
              <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 10px 0', display: 'flex', 'align-items': 'center', gap: '8px' }}>
                <IconTerminal size={14} />
                Pipeline Execution Details
              </h2>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginBottom: '2px' }}>PoC State</div>
                  <div style={{ 'font-weight': 600 }}>{displayPipelineReport.poc.state.toUpperCase()}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginBottom: '2px' }}>Compilation Attempts</div>
                  <div style={{ 'font-weight': 600 }}>{displayPipelineReport.poc.compilationAttempts}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginBottom: '2px' }}>Test Results</div>
                  <div style={{ 'font-weight': 600 }}>
                    {displayPipelineReport.forgeOutput.testResults.filter(t => t.status === 'pass').length} passed / {displayPipelineReport.forgeOutput.testResults.length} total
                  </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginBottom: '2px' }}>Gas Used</div>
                  <div style={{ 'font-weight': 600, 'font-family': 'var(--vscode-editor-font-family)' }}>{displayPipelineReport.forgeOutput.gasReport?.total?.toLocaleString() || 'N/A'}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginBottom: '2px' }}>Attacker Profit</div>
                  <div style={{ 'font-weight': 600, color: displayPipelineReport.exploitResult.success ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-descriptionForeground)' }}>
                    {displayPipelineReport.exploitResult.attackerProfit} {displayPipelineReport.exploitResult.profitToken}
                  </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px' }}>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginBottom: '2px' }}>Money Flow Entries</div>
                  <div style={{ 'font-weight': 600 }}>{displayPipelineReport.moneyFlow.length}</div>
                </div>
              </div>
            </Panel>
          )}

          {/* Timeline */}
          {displayPipelineReport && displayPipelineReport.timeline.length > 0 && (
            <Panel variant="bordered" padding="md">
              <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 10px 0', display: 'flex', 'align-items': 'center', gap: '8px' }}>
                <IconClock size={14} />
                Investigation Timeline
              </h2>
              <For each={displayPipelineReport.timeline}>
                {(event) => (
                  <div key={event.id} style={{ display: 'flex', gap: '12px', padding: '8px 0', 'border-bottom': '1px solid var(--vscode-panel-border)' }}>
                    <div style={{ width: 12, height: 12, 'border-radius': '50%', background: 'var(--vscode-button-background)', 'margin-top': 4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                        <span style={{ 'font-weight': 600 }}>{event.title}</span>
                        <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>{formatDate(event.timestamp)}</span>
                        {event.severity && <Badge variant={severityBadgeVariant(event.severity)} size="xs">{event.severity}</Badge>}
                      </div>
                      <div style={{ 'font-size': '11px', color: 'var(--vscode-descriptionForeground)', marginTop: 2 }}>{event.description}</div>
                    </div>
                  </div>
                )}
              </For>
            </Panel>
          )}

          {/* Money Flow */}
          {displayPipelineReport && displayPipelineReport.moneyFlow.length > 0 && (
            <Panel variant="bordered" padding="md">
              <h2 style={{ 'font-size': '12px', 'font-weight': 600, margin: '0 0 10px 0', display: 'flex', 'align-items': 'center', gap: '8px' }}>
                <IconGraph size={14} />
                Money Flow
              </h2>
              <For each={displayPipelineReport.moneyFlow}>
                {(flow) => (
                  <div key={`${flow.from}-${flow.to}-${flow.amount}`} style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '6px 0', 'font-size': '11px' }}>
                    <span style={{ 'font-family': 'var(--vscode-editor-font-family)', color: 'var(--vscode-descriptionForeground)' }}>{formatAddress(flow.from)}</span>
                    <IconArrowRight size={12} style={{ color: 'var(--vscode-descriptionForeground)' }} />
                    <span style={{ 'font-family': 'var(--vscode-editor-font-family)' }}>{formatAddress(flow.to)}</span>
                    <span style={{ color: 'var(--vscode-descriptionForeground)' }}>·</span>
                    <span style={{ 'font-weight': 500 }}>{flow.amount} {flow.token}</span>
                    <span style={{ color: 'var(--vscode-descriptionForeground)' }}>({flow.type})</span>
                  </div>
                )}
              </For>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
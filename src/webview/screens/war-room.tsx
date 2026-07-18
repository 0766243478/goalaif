/** @jsx h */
/** @jsxFrag Fragment */
// ============================================================================
// SIREEN — War Room (Native Execution Panel)
// ============================================================================
// Matches VS Code Output/Terminal panel: monospace, clean, functional.
// No cards, no shadows, no web-app styling.
// ============================================================================

import { createSignal, createMemo, For, Show, onMount, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';
import { Button } from '../components/Button';
import { injectGlobalStyles } from '../design-system/styles';
import {
  IconShield,
  IconBrain,
  IconFileCode,
  IconAlert,
  IconTerminal,
  IconSearch,
  IconCheck,
  IconX,
  IconEye,
  IconArrowRight,
  IconCopy,
  IconDownload,
  IconActivity,
  IconPlus,
  IconFilter,
  IconMaximize,
  IconMinimize,
} from '../design-system/icons';
import { postMessage } from '../providers/vscode-api';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type PipelineStage =
  | 'idle'
  | 'hypothesis'
  | 'poc_generation'
  | 'poc_compilation'
  | 'forge_execution'
  | 'output_parsing'
  | 'verification'
  | 'report_generation'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface StageEvent {
  stage: PipelineStage;
  status: 'running' | 'completed' | 'failed';
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface LogEntry {
  id: string;
  type: 'stage' | 'forge' | 'llm' | 'system' | 'error';
  stage: PipelineStage;
  timestamp: number;
  message: string;
  details?: string;
  expanded?: boolean;
}

interface PipelineReport {
  id: string;
  target: string;
  chain: string;
  verdict: 'confirmed' | 'not_confirmed' | 'inconclusive';
  confidence: number;
  hypothesis: {
    title: string;
    vulnerabilityType: string;
    severity: string;
    attackVector: string;
  };
  poc: {
    compilationSuccess: boolean;
    compilationAttempts: number;
    errors: string[];
    sourceCode: string;
  };
  forgeOutput: {
    exitCode: number;
    testResults: Array<{ name: string; status: string; gasUsed?: number; error?: string }>;
  };
  exploitResult: {
    success: boolean;
    attackerProfit: string;
    profitToken: string;
  };
  moneyFlow: Array<{ type: string; from: string; to: string; amount: string; token: string }>;
  honestSignal: {
    confirmed: boolean;
    confidence: number;
    explanation: string;
    conditions: Array<{ name: string; satisfied: boolean; detail: string }>;
  };
  generatedAt: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const STAGE_ORDER: PipelineStage[] = [
  'hypothesis',
  'poc_generation',
  'poc_compilation',
  'forge_execution',
  'output_parsing',
  'verification',
  'report_generation',
];

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: 'Idle',
  hypothesis: 'Forming Hypothesis',
  poc_generation: 'Generating PoC',
  poc_compilation: 'Compiling PoC',
  forge_execution: 'Running Forge Tests',
  output_parsing: 'Parsing Output',
  verification: 'Honest Signal Verification',
  report_generation: 'Building Report',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STAGE_ICONS: Record<PipelineStage, any> = {
  idle: IconShield,
  hypothesis: IconBrain,
  poc_generation: IconFileCode,
  poc_compilation: IconAlert,
  forge_execution: IconTerminal,
  output_parsing: IconSearch,
  verification: IconBrain,
  report_generation: IconFileCode,
  completed: IconCheck,
  failed: IconX,
  cancelled: IconX,
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/* ------------------------------------------------------------------ */
/*  WarRoom Component                                                 */
/* ------------------------------------------------------------------ */

function WarRoom() {
  // ── State ────────────────────────────────────────────────────────
  const [currentStage, setCurrentStage] = createSignal<PipelineStage>('idle');
  const [stageProgress, setStageProgress] = createSignal(0);
  const [logs, setLogs] = createSignal<LogEntry[]>([]);
  const [report, setReport] = createSignal<PipelineReport | null>(null);
  const [viewMode, setViewMode] = createSignal<'live' | 'report'>('live');
  const [logFilter, setLogFilter] = createSignal<'all' | 'stage' | 'forge' | 'llm' | 'error'>('all');
  const [startTime, setStartTime] = createSignal<number | null>(null);

  // ── Lifecycle ────────────────────────────────────────────────────
  onMount(() => {
    injectGlobalStyles();

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.type) return;

      switch (msg.type) {
        case 'pipeline:status':
          handlePipelineStatus(msg.payload);
          break;
        case 'pipeline:complete':
          handlePipelineComplete(msg.payload);
          break;
        case 'pipeline:error':
          handlePipelineError(msg.payload);
          break;
      }
    };
    window.addEventListener('message', handler);
    onCleanup(() => window.removeEventListener('message', handler));
  });

  // ── Handlers ─────────────────────────────────────────────────────

  const handlePipelineStatus = (payload: { stage: PipelineStage; message: string; data?: Record<string, unknown> }) => {
    if (!startTime()) setStartTime(Date.now());

    const newStage = payload.stage;
    if (newStage !== currentStage()) {
      setCurrentStage(newStage);
      const idx = STAGE_ORDER.indexOf(newStage);
      if (idx >= 0) setStageProgress(((idx + 1) / STAGE_ORDER.length) * 100);
    }

    // Add log entry
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'stage',
      stage: newStage,
      timestamp: Date.now(),
      message: payload.message,
      details: payload.data ? JSON.stringify(payload.data, null, 2) : undefined,
    };
    setLogs((prev) => [...prev, logEntry].slice(-500));

    // Auto-switch to live view when pipeline starts
    if (viewMode() === 'report') setViewMode('live');
  };

  const handlePipelineComplete = (payload: { report: PipelineReport }) => {
    setCurrentStage('completed');
    setStageProgress(100);
    setReport(payload.report);
    setViewMode('report');

    const logEntry: LogEntry = {
      id: `log-${Date.now()}-complete`,
      type: 'system',
      stage: 'completed',
      timestamp: Date.now(),
      message: `Pipeline complete — Verdict: ${payload.report.verdict.toUpperCase()}`,
    };
    setLogs((prev) => [...prev, logEntry]);
  };

  const handlePipelineError = (payload: { error: string; stage: PipelineStage }) => {
    setCurrentStage('failed');
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-error`,
      type: 'error',
      stage: payload.stage,
      timestamp: Date.now(),
      message: `Pipeline failed: ${payload.error}`,
    };
    setLogs((prev) => [...prev, logEntry]);
  };

  const handleLogTypeClick = (type: LogEntry['type']) => {
    setLogFilter((prev) => (prev === type ? 'all' : type));
  };

  const toggleLogExpand = (id: string) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, expanded: !log.expanded } : log))
    );
  };

  const clearLogs = () => setLogs([]);

  const copyReport = (format: 'markdown' | 'html' | 'json') => {
    if (!report()) return;
    postMessage({ type: 'report:copy', payload: { format } });
  };

  const exportReport = (format: 'markdown' | 'html' | 'json') => {
    if (!report()) return;
    postMessage({ type: 'report:export', payload: { format } });
  };

  // ── Derived ──────────────────────────────────────────────────────

  const filteredLogs = createMemo(() => {
    const filter = logFilter();
    if (filter === 'all') return logs();
    return logs().filter((log) => log.type === filter);
  });

  const elapsedTime = createMemo(() => {
    if (!startTime()) return '0s';
    return formatDuration(Date.now() - startTime());
  });

  const stageIndex = createMemo(() => STAGE_ORDER.indexOf(currentStage()));
  const completedStages = createMemo(() =>
    stageIndex() >= 0 ? STAGE_ORDER.slice(0, stageIndex() + 1) : []
  );

  // ── Render helpers ───────────────────────────────────────────────

  const renderStageIndicator = () => {
    const stage = currentStage();
    const Icon = STAGE_ICONS[stage] || IconShield;
    const isRunning = [
      'hypothesis',
      'poc_generation',
      'poc_compilation',
      'forge_execution',
      'output_parsing',
      'verification',
      'report_generation',
    ].includes(stage);

    return (
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
          padding: '0 12px',
          height: '30px',
          background: 'var(--vscode-panel-background)',
          'border-bottom': '1px solid var(--vscode-panel-border)',
          'font-size': '11px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        <Icon
          style={{
            width: '13px',
            height: '13px',
            color: 'var(--vscode-button-background)',
            ...(isRunning && { animation: 'spin 1s linear infinite' }),
          }}
        />
        <span style={{ 'font-weight': '500' }}>{STAGE_LABELS[stage]}</span>
        <span style={{ marginLeft: 'auto', 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
          {elapsedTime()}
        </span>
      </div>
    );
  };

  const renderProgressBar = () => (
    <div
      style={{
        position: 'relative',
        height: '2px',
        background: 'var(--vscode-panel-border)',
        'flex-shrink': '0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          background: 'var(--vscode-progressBar-background)',
          transition: 'width 200ms ease',
          width: `${stageProgress()}%`,
        }}
      />
    </div>
  );

  const renderStageStep = (stage: PipelineStage, index: number) => {
    const completed = completedStages().includes(stage);
    const current = stage === currentStage() && !['completed', 'failed', 'cancelled'].includes(currentStage());
    const Icon = STAGE_ICONS[stage];

    return (
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          gap: '6px',
          opacity: completed || current ? 1 : 0.4,
          'font-size': '10px',
        }}
      >
        <Icon
          style={{
            width: '12px',
            height: '12px',
            color: completed
              ? 'var(--vscode-testing-iconPassed)'
              : current
              ? 'var(--vscode-button-background)'
              : 'var(--vscode-descriptionForeground)',
          }}
        />
        <span
          style={{
            color: completed ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)',
          }}
        >
          {STAGE_LABELS[stage]}
        </span>
        {index < STAGE_ORDER.length - 1 && (
          <div
            style={{
              flex: 1,
              height: '1px',
              background: completed ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-panel-border)',
              margin: '0 4px',
            }}
          />
        )}
      </div>
    );
  };

  const renderLogEntry = (log: LogEntry) => {
    const typeColors: Record<LogEntry['type'], string> = {
      stage: 'var(--vscode-textLink-foreground)',
      forge: 'var(--vscode-testing-iconQueued)',
      llm: '#8b5cf6',
      system: 'var(--vscode-testing-iconPassed)',
      error: 'var(--vscode-testing-iconFailed)',
    };

    const typeLabels: Record<LogEntry['type'], string> = {
      stage: 'STAGE',
      forge: 'FORGE',
      llm: 'LLM',
      system: 'SYS',
      error: 'ERROR',
    };

    return (
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '4px 6px',
          'border-radius': '2px',
          background: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          transition: 'background 80ms',
          ...(log.expanded && { background: 'var(--vscode-list-hoverBackground)' }),
        }}
        onClick={() => toggleLogExpand(log.id)}
      >
        <span style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'white-space': 'nowrap', flex: '0 0 55px' }}>
          {formatTime(log.timestamp)}
        </span>
        <span style={{ ...{ 'font-size': '9px', 'font-weight': '600', 'text-transform': 'uppercase', 'letter-spacing': '0.3px', flex: '0 0 50px' }, color: typeColors[log.type] }}>
          {typeLabels[log.type]}
        </span>
        <span style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'white-space': 'nowrap', flex: '0 0 110px' }}>
          {STAGE_LABELS[log.stage]}
        </span>
        <span style={{ flex: 1, 'font-size': '10px', 'line-height': '1.4', 'word-break': 'break-word' }}>
          {log.message}
        </span>
        <button
          style={{
            padding: '2px',
            color: 'var(--vscode-descriptionForeground)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            'border-radius': '2px',
            flex: '0 0 18px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleLogExpand(log.id);
          }}
        >
          {log.expanded ? <IconEye size={10} /> : <IconArrowRight size={10} />}
        </button>
      </div>
    );
  };

  const renderReport = () => {
    const r = report();
    if (!r) return null;

    return (
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px',
          display: 'flex',
          'flex-direction': 'column',
          gap: '12px',
          'font-family': 'var(--vscode-font-family)',
          'font-size': 'var(--vscode-font-size)',
        }}
      >
        {/* Report Header */}
        <div
          style={{
            display: 'flex',
            'align-items': 'flex-start',
            'justify-content': 'space-between',
            gap: '16px',
            padding: '12px',
            background: 'var(--vscode-editor-background)',
            'border-radius': '2px',
            border: '1px solid var(--vscode-panel-border)',
          }}
        >
          <div>
            <h1 style={{ 'font-size': '15px', 'font-weight': '600', margin: '0 0 4px 0' }}>{r.target}</h1>
            <div
              style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '3px',
                'font-size': '11px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              <span>Chain: {r.chain}</span>
              <span>Generated: {new Date(r.generatedAt).toLocaleString()}</span>
              <span>Report ID: {r.id.slice(0, 20)}…</span>
            </div>
          </div>
          <span
            style={{
              padding: '4px 12px',
              'border-radius': '2px',
              'font-size': '11px',
              'font-weight': '600',
              'text-transform': 'uppercase',
              background:
                r.verdict === 'confirmed'
                  ? 'var(--vscode-testing-iconPassed)'
                  : r.verdict === 'inconclusive'
                  ? 'var(--vscode-testing-iconQueued)'
                  : 'var(--vscode-testing-iconFailed)',
              color: 'var(--vscode-editor-background)',
              border: `1px solid
                ${r.verdict === 'confirmed'
                  ? 'var(--vscode-testing-iconPassed)'
                  : r.verdict === 'inconclusive'
                  ? 'var(--vscode-testing-iconQueued)'
                  : 'var(--vscode-testing-iconFailed)'}`,
            }}
          >
            {r.verdict.toUpperCase()}
          </span>
        </div>

        {/* Summary Grid */}
        <div
          style={{
            display: 'grid',
            'grid-template-columns': 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '8px',
          }}
        >
          <div
            style={{
              background: 'var(--vscode-editor-background)',
              'border-radius': '2px',
              padding: '10px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '3px' }}>
              Verdict
            </div>
            <div
              style={{
                'font-size': '13px',
                'font-weight': '500',
                color:
                  r.verdict === 'confirmed'
                    ? 'var(--vscode-testing-iconPassed)'
                    : r.verdict === 'inconclusive'
                    ? 'var(--vscode-testing-iconQueued)'
                    : 'var(--vscode-testing-iconFailed)',
              }}
            >
              {r.verdict.toUpperCase()}
            </div>
          </div>
          <div
            style={{
              background: 'var(--vscode-editor-background)',
              'border-radius': '2px',
              padding: '10px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '3px' }}>
              Confidence
            </div>
            <div style={{ 'font-size': '13px', 'font-weight': '500' }}>{(r.confidence * 100).toFixed(0)}%</div>
          </div>
          <div
            style={{
              background: 'var(--vscode-editor-background)',
              'border-radius': '2px',
              padding: '10px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '3px' }}>
              Vulnerability Type
            </div>
            <div style={{ 'font-size': '13px', 'font-weight': '500' }}>{r.hypothesis.vulnerabilityType}</div>
          </div>
          <div
            style={{
              background: 'var(--vscode-editor-background)',
              'border-radius': '2px',
              padding: '10px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '3px' }}>
              Severity
            </div>
            <div style={{ 'font-size': '13px', 'font-weight': '500' }}>{r.hypothesis.severity.toUpperCase()}</div>
          </div>
          <div
            style={{
              background: 'var(--vscode-editor-background)',
              'border-radius': '2px',
              padding: '10px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '3px' }}>
              PoC Compilation
            </div>
            <div
              style={{
                ...{ 'font-size': '13px', 'font-weight': '500' },
                color: r.poc.compilationSuccess ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)',
              }}
            >
              {r.poc.compilationSuccess ? 'Success' : `Failed (${r.poc.compilationAttempts} attempts)`}
            </div>
          </div>
          <div
            style={{
              background: 'var(--vscode-editor-background)',
              'border-radius': '2px',
              padding: '10px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '3px' }}>
              Forge Exit Code
            </div>
            <div style={{ 'font-size': '13px', 'font-weight': '500' }}>{r.forgeOutput.exitCode}</div>
          </div>
          <div
            style={{
              background: 'var(--vscode-editor-background)',
              'border-radius': '2px',
              padding: '10px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div style={{ 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '3px' }}>
              Exploit Result
            </div>
            <div
              style={{
                ...{ 'font-size': '13px', 'font-weight': '500' },
                color: r.exploitResult.success ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)',
              }}
            >
              {r.exploitResult.success ? `Success — ${r.exploitResult.attackerProfit} ${r.exploitResult.profitToken}` : 'Not Successful'}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div style={{ background: 'var(--vscode-editor-background)', 'border-radius': '2px', border: '1px solid var(--vscode-panel-border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', 'border-bottom': '1px solid var(--vscode-panel-border)', display: 'flex', 'align-items': 'center', gap: '8px', 'font-weight': '600', background: 'var(--vscode-panel-background)' }}>
            <IconActivity size={14} />
            <span>Summary</span>
          </div>
          <div style={{ padding: '12px' }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ 'font-weight': 600, marginBottom: '4px' }}>{r.hypothesis.title}</div>
              <div style={{ 'font-size': '11px', color: 'var(--vscode-descriptionForeground)', marginBottom: '6px' }}>
                Type: {r.hypothesis.vulnerabilityType} | Severity: {r.hypothesis.severity.toUpperCase()}
              </div>
              <div><strong>Attack Vector:</strong> {r.hypothesis.attackVector}</div>
            </div>
          </div>
        </div>

        {/* PoC */}
        <div style={{ background: 'var(--vscode-editor-background)', 'border-radius': '2px', border: '1px solid var(--vscode-panel-border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', 'border-bottom': '1px solid var(--vscode-panel-border)', display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'font-weight': '600', background: 'var(--vscode-panel-background)' }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
              <IconFileCode size={14} />
              <span>Proof of Concept</span>
            </div>
            <span
              style={{
                ...{ 'font-size': '9px' },
                color: r.poc.compilationSuccess ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)',
              }}
            >
              {r.poc.compilationSuccess ? 'Compiled ✓' : `Failed (${r.poc.compilationAttempts} attempts)`}
            </span>
          </div>
          <div style={{ padding: '12px' }}>
            <pre
              style={{
                margin: 0,
                padding: '10px',
                'font-size': '10px',
                'font-family': 'var(--vscode-editor-font-family)',
                'line-height': 1.5,
                overflow: 'auto',
                'white-space': 'pre-wrap',
                'word-break': 'break-word',
                background: 'var(--vscode-textCodeBlock-background)',
                color: 'var(--vscode-editor-foreground)',
                'border-radius': '2px',
              }}
            >
              {r.poc.sourceCode}
            </pre>
          </div>
        </div>

        {/* Forge Results */}
        <div style={{ background: 'var(--vscode-editor-background)', 'border-radius': '2px', border: '1px solid var(--vscode-panel-border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', 'border-bottom': '1px solid var(--vscode-panel-border)', display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'font-weight': '600', background: 'var(--vscode-panel-background)' }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
              <IconTerminal size={14} />
              <span>Forge Test Results</span>
            </div>
            <span
              style={{
                ...{ 'font-size': '9px' },
                color: r.forgeOutput.exitCode === 0 ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)',
              }}
            >
              Exit Code: {r.forgeOutput.exitCode}
            </span>
          </div>
          <div style={{ padding: '12px' }}>
            <For each={r.forgeOutput.testResults} children={(test) => (
              <div
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  padding: '6px 0',
                  'border-bottom': '1px solid var(--vscode-panel-border)',
                }}
              >
                <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                  <span
                    style={{
                      color: test.status === 'pass' ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)',
                      'font-size': '9px',
                    }}
                  >
                    {test.status === 'pass' ? '✓' : '✗'}
                  </span>
                  <code style={{ 'font-size': '10px' }}>{test.name}</code>
                </div>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
                  {test.gasUsed && <span>Gas: {test.gasUsed.toLocaleString()}</span>}
                  {test.error && (
                    <span style={{ color: 'var(--vscode-testing-iconFailed)', 'max-width': '300px', 'text-overflow': 'ellipsis', overflow: 'hidden', 'white-space': 'nowrap' }}>
                      {test.error}
                    </span>
                  )}
                </div>
              </div>
            )} />
          </div>
        </div>

        {/* Honest Signal */}
        <div style={{ background: 'var(--vscode-editor-background)', 'border-radius': '2px', border: '1px solid var(--vscode-panel-border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', 'border-bottom': '1px solid var(--vscode-panel-border)', display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'font-weight': '600', background: 'var(--vscode-panel-background)' }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
              <IconBrain size={14} />
              <span>Honest Signal Verification</span>
            </div>
            <span
              style={{
                padding: '4px 10px',
                'border-radius': '2px',
                'font-size': '11px',
                'font-weight': '600',
                'text-transform': 'uppercase',
                background: r.honestSignal.confirmed
                  ? 'color-mix(in srgb, var(--vscode-testing-iconPassed) 20%, transparent)'
                  : 'color-mix(in srgb, var(--vscode-testing-iconFailed) 20%, transparent)',
                color: r.honestSignal.confirmed ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)',
                border: `1px solid ${r.honestSignal.confirmed ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)'}`,
              }}
            >
              {r.honestSignal.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED'}
            </span>
          </div>
          <div style={{ padding: '12px' }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>Confidence:</strong> {(r.honestSignal.confidence * 100).toFixed(0)}%
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Explanation:</strong>
              <p style={{ marginTop: '4px', 'font-size': '11px', color: 'var(--vscode-descriptionForeground)' }}>{r.honestSignal.explanation}</p>
            </div>
            <div>
              <strong>Conditions:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '18px', 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
                <For each={r.honestSignal.conditions} children={(c) => (
                  <li style={{ marginBottom: '4px', display: 'flex', 'align-items': 'center', gap: '6px' }}>
                    <span style={{ color: c.satisfied ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)', 'font-size': '9px' }}>
                      {c.satisfied ? '✓' : '✗'}
                    </span>
                    <strong>{c.name}:</strong> {c.detail}
                  </li>
                )} />
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 12px',
            'border-top': '1px solid var(--vscode-panel-border)',
            background: 'var(--vscode-panel-background)',
            'flex-shrink': '0',
            'flex-wrap': 'wrap',
          }}
        >
          <Button variant="secondary" size="sm" onClick={() => copyReport('markdown')}>
            <IconCopy size={12} /> Copy Markdown
          </Button>
          <Button variant="secondary" size="sm" onClick={() => copyReport('html')}>
            <IconCopy size={12} /> Copy HTML
          </Button>
          <Button variant="secondary" size="sm" onClick={() => copyReport('json')}>
            <IconCopy size={12} /> Copy JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportReport('markdown')}>
            <IconDownload size={12} /> Export .md
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportReport('html')}>
            <IconDownload size={12} /> Export .html
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportReport('json')}>
            <IconDownload size={12} /> Export .json
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setViewMode('live');
              setLogs([]);
              setReport(null);
              setCurrentStage('idle');
              setStageProgress(0);
              setStartTime(null);
            }}
          >
            <IconPlus size={12} /> New Scan
          </Button>
        </div>
      </div>
    );
  };

  const renderLiveView = () => (
    <>
      {renderProgressBar()}
      {renderStageIndicator()}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          'flex-direction': 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            padding: '6px 12px',
            'border-bottom': '1px solid var(--vscode-panel-border)',
            background: 'var(--vscode-panel-background)',
            'font-size': '10px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          <span style={{ 'font-size': '9px', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', color: 'var(--vscode-descriptionForeground)' }}>
            Live Pipeline Logs <span style={{ marginLeft: '8px', color: 'var(--vscode-button-background)' }}>{logs().length}</span>
          </span>
          <div style={{ display: 'flex', gap: '3px' }}>
            <button style={{ ...{ padding: '2px 7px', 'font-size': '9px', 'border-radius': '2px', border: 'none', cursor: 'pointer', background: logFilter() === 'all' ? 'var(--vscode-button-background)' : 'transparent', color: logFilter() === 'all' ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)', transition: 'all 80ms' }, ...(logFilter() === 'all' ? { background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)' } : {}) }} onClick={() => handleLogTypeClick('all')}>All</button>
            <button style={{ ...{ padding: '2px 7px', 'font-size': '9px', 'border-radius': '2px', border: 'none', cursor: 'pointer', background: logFilter() === 'stage' ? 'var(--vscode-button-background)' : 'transparent', color: logFilter() === 'stage' ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)' }, ...(logFilter() === 'stage' ? { background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)' } : {}) }} onClick={() => handleLogTypeClick('stage')}>Stage</button>
            <button style={{ ...{ padding: '2px 7px', 'font-size': '9px', 'border-radius': '2px', border: 'none', cursor: 'pointer', background: logFilter() === 'forge' ? 'var(--vscode-button-background)' : 'transparent', color: logFilter() === 'forge' ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)' }, ...(logFilter() === 'forge' ? { background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)' } : {}) }} onClick={() => handleLogTypeClick('forge')}>Forge</button>
            <button style={{ ...{ padding: '2px 7px', 'font-size': '9px', 'border-radius': '2px', border: 'none', cursor: 'pointer', background: logFilter() === 'llm' ? 'var(--vscode-button-background)' : 'transparent', color: logFilter() === 'llm' ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)' }, ...(logFilter() === 'llm' ? { background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)' } : {}) }} onClick={() => handleLogTypeClick('llm')}>LLM</button>
            <button style={{ ...{ padding: '2px 7px', 'font-size': '9px', 'border-radius': '2px', border: 'none', cursor: 'pointer', background: logFilter() === 'error' ? 'var(--vscode-button-background)' : 'transparent', color: logFilter() === 'error' ? 'var(--vscode-button-foreground)' : 'var(--vscode-descriptionForeground)' }, ...(logFilter() === 'error' ? { background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)' } : {}) }} onClick={() => handleLogTypeClick('error')}>Errors</button>
            <button style={{ padding: '2px 7px', 'font-size': '9px', 'border-radius': '2px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--vscode-descriptionForeground)' }} onClick={clearLogs} title="Clear logs">
              <IconX size={10} />
            </button>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 10px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '3px',
            'scrollbar-width': 'thin',
            'scrollbar-color': 'var(--vscode-scrollbarSlider-background) transparent',
          }}
        >
          <For each={filteredLogs()} children={renderLogEntry} />
          {filteredLogs().length === 0 && (
            <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--vscode-descriptionForeground)', 'font-size': '11px' }}>
              Waiting for pipeline to start…
            </div>
          )}
        </div>
      </div>
    </>
  );

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        height: '100%',
        background: 'var(--vscode-editor-background)',
        color: 'var(--vscode-editor-foreground)',
        'font-family': 'var(--vscode-font-family)',
        'font-size': 'var(--vscode-font-size)',
        'line-height': '1.5',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          height: '35px',
          padding: '0 12px',
          'border-bottom': '1px solid var(--vscode-panel-border)',
          background: 'var(--vscode-panel-background)',
        }}
      >
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <IconShield style={{ width: '16px', height: '16px', color: 'var(--vscode-textLink-foreground)' }} />
          <span style={{ 'font-size': '13px', 'font-weight': '600', 'letter-spacing': '0.5px' }}>War Room</span>
          <Badge variant={currentStage() === 'failed' ? 'danger' : currentStage() === 'completed' ? 'success' : 'default'} size="sm">
            {STAGE_LABELS[currentStage()]}
          </Badge>
        </div>
        <div style={{ display: 'flex', gap: '1px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('live')}
            style={{ display: viewMode() === 'report' ? 'flex' : 'none' }}
          >
            <IconActivity size={12} /> Live View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('report')}
            style={{ display: viewMode() === 'live' && report() ? 'flex' : 'none' }}
          >
            <IconEye size={12} /> View Report
          </Button>
        </div>
      </header>

      {/* Stage Steps */}
      <div
        style={{
          padding: '6px 12px',
          'border-bottom': '1px solid var(--vscode-panel-border)',
          background: 'var(--vscode-panel-background)',
          'font-size': '10px',
        }}
      >
        <For each={STAGE_ORDER} children={renderStageStep} />
      </div>

      {/* Content */}
      <Show when={viewMode() === 'live'} fallback={renderReport()}>
        {renderLiveView()}
      </Show>
    </div>
  );
}

export default WarRoom;

const root = document.getElementById('root');
if (root) { render(() => <WarRoom />, root); }
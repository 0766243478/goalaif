// ============================================================================
// SIREEN — Global Application Store (State Machine)
// ============================================================================
// Single source of truth for all shared UI state. Every screen subscribes
// to this store. State transitions are explicit and traceable.
//
// State Machine:
//   idle → loading → researching → analyzing → generating → executing →
//   verifying → reporting → completed
//   Any state → error → idle
//   Any state → cancelled → idle
// ============================================================================

import { createStore } from 'solid-js/store';
import type {
  Investigation,
  InvestigationMode,
  Finding,
  GraphNode,
  GraphEdge,
  TimelineEvent,
  EvidenceItem,
  ChatMessage,
  SeverityLevel,
} from '../types';
import type { PipelineStage, InvestigationReport } from '../../pipeline/types';

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------
export type AppStatus =
  | 'idle'
  | 'loading'
  | 'researching'
  | 'analyzing'
  | 'generating'
  | 'executing'
  | 'verifying'
  | 'reporting'
  | 'completed'
  | 'error'
  | 'cancelled';

export const STATUS_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  idle: ['loading'],
  loading: ['researching', 'error', 'cancelled'],
  researching: ['analyzing', 'error', 'cancelled'],
  analyzing: ['generating', 'error', 'cancelled'],
  generating: ['executing', 'error', 'cancelled'],
  executing: ['verifying', 'error', 'cancelled'],
  verifying: ['reporting', 'error', 'cancelled'],
  reporting: ['completed', 'error', 'cancelled'],
  completed: ['idle'],
  error: ['idle'],
  cancelled: ['idle'],
};

export function canTransition(from: AppStatus, to: AppStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function statusLabel(status: AppStatus): string {
  switch (status) {
    case 'idle': return 'Idle';
    case 'loading': return 'Loading...';
    case 'researching': return 'Researching';
    case 'analyzing': return 'Analyzing';
    case 'generating': return 'Generating PoC';
    case 'executing': return 'Executing Simulation';
    case 'verifying': return 'Verifying';
    case 'reporting': return 'Generating Report';
    case 'completed': return 'Completed';
    case 'error': return 'Error';
    case 'cancelled': return 'Cancelled';
  }
}

// ---------------------------------------------------------------------------
// Pipeline Phase Mapping
// ---------------------------------------------------------------------------
export function pipelineStageToStatus(stage: PipelineStage): AppStatus {
  switch (stage) {
    case 'idle': return 'idle';
    case 'initializing': return 'loading';
    case 'hypothesis': return 'researching';
    case 'poc_generation': return 'generating';
    case 'poc_compilation': return 'generating';
    case 'forge_execution': return 'executing';
    case 'output_parsing': return 'analyzing';
    case 'verification': return 'verifying';
    case 'report_generation': return 'reporting';
    case 'completed': return 'completed';
    case 'failed': return 'error';
  }
}

// ---------------------------------------------------------------------------
// Store Slices
// ---------------------------------------------------------------------------
export interface AppState {
  // Global status
  status: AppStatus;
  error: string | null;

  // Active investigation
  investigation: Investigation | null;
  investigationMode: InvestigationMode;
  investigationChain: string;

  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;

  // Pipeline
  pipelineStage: PipelineStage | null;
  pipelineProgress: number;
  pipelineLog: string[];
  lastReport: InvestigationReport | null;

  // Findings
  findings: Finding[];

  // Threat graph
  threatNodes: GraphNode[];
  threatEdges: GraphEdge[];

  // Timeline
  timelineEvents: TimelineEvent[];

  // Evidence
  evidenceItems: EvidenceItem[];

  // UI
  activeTab: string;
  sidebarVisible: boolean;
}

const initialState: AppState = {
  status: 'idle',
  error: null,
  investigation: null,
  investigationMode: 'recon',
  investigationChain: 'ethereum',
  messages: [],
  isStreaming: false,
  pipelineStage: null,
  pipelineProgress: 0,
  pipelineLog: [],
  lastReport: null,
  findings: [],
  threatNodes: [],
  threatEdges: [],
  timelineEvents: [],
  evidenceItems: [],
  activeTab: 'chat',
  sidebarVisible: true,
};

const [appState, setAppState] = createStore<AppState>(initialState);

// ---------------------------------------------------------------------------
// Store Actions
// ---------------------------------------------------------------------------
export const appActions = {
  // ── Status ──────────────────────────────────────────────────────────────
  transition(to: AppStatus) {
    if (canTransition(appState.status, to)) {
      setAppState('status', to);
      if (to === 'idle') {
        setAppState('error', null);
        setAppState('pipelineProgress', 0);
      }
      if (to === 'error') {
        setAppState('isStreaming', false);
      }
      if (to === 'completed') {
        setAppState('isStreaming', false);
      }
      if (to === 'cancelled') {
        setAppState('isStreaming', false);
      }
    }
  },

  setError(message: string) {
    setAppState('error', message);
    setAppState('status', 'error');
    setAppState('isStreaming', false);
  },

  clearError() {
    setAppState('error', null);
  },

  // ── Investigation ──────────────────────────────────────────────────────
  setInvestigation(inv: Investigation) {
    setAppState('investigation', inv);
    setAppState('investigationMode', inv.mode);
    setAppState('investigationChain', inv.chain);
  },

  setInvestigationMode(mode: InvestigationMode) {
    setAppState('investigationMode', mode);
  },

  setInvestigationChain(chain: string) {
    setAppState('investigationChain', chain);
  },

  clearInvestigation() {
    setAppState('investigation', null);
    setAppState('messages', []);
    setAppState('findings', []);
    setAppState('threatNodes', []);
    setAppState('threatEdges', []);
    setAppState('timelineEvents', []);
    setAppState('evidenceItems', []);
    setAppState('lastReport', null);
    setAppState('pipelineLog', []);
    setAppState('pipelineProgress', 0);
    setAppState('pipelineStage', null);
    setAppState('status', 'idle');
    setAppState('error', null);
  },

  // ── Chat ────────────────────────────────────────────────────────────────
  addMessage(msg: ChatMessage) {
    setAppState('messages', (m) => [...m, msg]);
  },

  setStreaming(streaming: boolean) {
    setAppState('isStreaming', streaming);
  },

  clearMessages() {
    setAppState('messages', []);
  },

  // ── Pipeline ────────────────────────────────────────────────────────────
  setPipelineStage(stage: PipelineStage | null) {
    setAppState('pipelineStage', stage);
    const newStatus = stage ? pipelineStageToStatus(stage) : 'idle';
    this.transition(newStatus);
  },

  setPipelineProgress(progress: number) {
    setAppState('pipelineProgress', Math.min(1, Math.max(0, progress)));
  },

  addPipelineLog(line: string) {
    setAppState('pipelineLog', (log) => [...log, line]);
  },

  setLastReport(report: InvestigationReport) {
    setAppState('lastReport', report);
    if (report.evidence?.length) {
      setAppState('evidenceItems', report.evidence as any);
    }
    if (report.timeline?.length) {
      setAppState('timelineEvents', report.timeline as any);
    }
  },

  clearPipeline() {
    setAppState('pipelineStage', null);
    setAppState('pipelineProgress', 0);
    setAppState('pipelineLog', []);
  },

  // ── Findings ────────────────────────────────────────────────────────────
  addFinding(finding: Finding) {
    setAppState('findings', (f) => [...f, finding]);
  },

  updateFinding(id: string, updates: Partial<Finding>) {
    setAppState('findings', (f) =>
      f.map((finding) => (finding.id === id ? { ...finding, ...updates } : finding))
    );
  },

  clearFindings() {
    setAppState('findings', []);
  },

  // ── Threat Graph ────────────────────────────────────────────────────────
  setThreatGraph(nodes: GraphNode[], edges: GraphEdge[]) {
    setAppState('threatNodes', nodes);
    setAppState('threatEdges', edges);
  },

  addThreatNode(node: GraphNode) {
    setAppState('threatNodes', (n) => [...n, node]);
  },

  addThreatEdge(edge: GraphEdge) {
    setAppState('threatEdges', (e) => [...e, edge]);
  },

  // ── Timeline ────────────────────────────────────────────────────────────
  addTimelineEvent(event: TimelineEvent) {
    setAppState('timelineEvents', (e) => [...e, event]);
  },

  clearTimeline() {
    setAppState('timelineEvents', []);
  },

  // ── Evidence ────────────────────────────────────────────────────────────
  addEvidence(item: EvidenceItem) {
    setAppState('evidenceItems', (e) => [...e, item]);
  },

  clearEvidence() {
    setAppState('evidenceItems', []);
  },

  // ── UI ──────────────────────────────────────────────────────────────────
  setActiveTab(tab: string) {
    setAppState('activeTab', tab);
  },

  toggleSidebar() {
    setAppState('sidebarVisible', (v) => !v);
  },

  // ── Reset ───────────────────────────────────────────────────────────────
  resetAll() {
    setAppState({ ...initialState });
  },
};

export function useAppStore() {
  return [appState, setAppState] as const;
}

export { appState, setAppState };

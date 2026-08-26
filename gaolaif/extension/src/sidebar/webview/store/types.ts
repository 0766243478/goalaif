import type { ReactNode } from 'react';

export type ViewId =
  | 'sessionManager' | 'overview' | 'findings'
  | 'memory' | 'notes' | 'tasks'
  | 'exploits' | 'simulation' | 'settings';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SessionMeta {
  id: string;
  name: string;
  project: string;
  repository: string;
  status: 'active' | 'archived' | 'deleted';
  audit_status: string;
  file_path: string;
  file_name: string;
  language: string;
  created_at: number;
  updated_at: number;
  findings_count?: number;
}

export interface WorkspaceState {
  findings?: unknown[];
  exploits?: unknown[];
  chatMessages?: unknown[];
  thinkingSteps?: unknown[];
  notes?: string;
  tasks?: unknown[];
  protocol?: unknown;
  contractCode?: string;
  contractFilePath?: string;
  auditPhase?: string;
  auditProgress?: unknown;
  activeView?: ViewId;
  rightPanelTab?: string;
  rightPanelOpen?: boolean;
  bottomPanelOpen?: boolean;
  [key: string]: unknown;
}

export interface ProtocolState {
  name: string;
  chain: string;
  totalContracts: number;
  totalFunctions: number;
  findingsSummary: { critical: number; high: number; medium: number; low: number; total: number };
  riskScore: number;
  attackSurfaces: string[];
}

export interface ContractFile {
  path: string;
  name: string;
  riskScore: number;
  findingsCount: number;
}

export interface Finding {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affected_functions: string[];
  confirmed: boolean;
  category: string;
  remediation: string;
  line_number?: number;
  file_path?: string;
  /** Durable audit id — links the finding to its Evidence Pack. */
  audit_id?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  thinking?: ThinkingStep[];
  suggestions?: SuggestedAction[];
}

export interface ChatContext {
  file?: string;
  selection?: { startLine: number; endLine: number; code: string };
  memoryRefs?: string[];
  findingRefs?: string[];
}

export interface ThinkingStep {
  agent: string;
  thought: string;
  duration?: number;
  evidence?: string[];
}

export interface SuggestedAction {
  id: string;
  label: string;
  icon?: string;
  command: string;
  args?: Record<string, unknown>;
}

export interface ExploitRecord {
  id: string;
  findingId: string;
  hypothesis: string;
  pocCode: string;
  confirmed: boolean;
  forgeOutput: string;
  attackVector?: string;
  estimatedImpact?: string;
  createdAt: number;
}

export interface MemoryEntry {
  key: string;
  content: string;
  metadata: Record<string, unknown>;
  score?: number;
}

export interface ResearchTask {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'done';
  findingRef?: string;
  createdAt: number;
}

export interface ProactiveSuggestion {
  id: string;
  type: 'audit' | 'exploit' | 'patch' | 'research';
  priority: 'urgent' | 'normal' | 'low';
  title: string;
  description: string;
  context: { file?: string; line?: number; function?: string };
  actions: SuggestedAction[];
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
}

export interface TimelineEvent {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: number;
  status?: 'pending' | 'active' | 'completed' | 'error';
}

export interface PatchResult {
  finding_title: string;
  severity: string;
  original_code: string;
  patched_code: string;
  explanation: string;
  function_name: string;
  success: boolean;
}

export type AuditPhase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'complete' | 'error' | 'incomplete';
export type PipelineStage = 'idle' | 'understanding' | 'scenarios' | 'compiling' | 'auto_fixing' | 'running_forge' | 'verifying' | 'judging' | 'complete' | 'error';

export interface AuditProgress {
  phase: number;
  message: string;
  scenariosTotal: number;
  scenariosCompleted: number;
  stage: PipelineStage;
  startedAt: number;
}

export interface SireenState {
  connectionStatus: ConnectionStatus;
  apiKeySet: boolean | null;
  activeView: ViewId;
  rightPanelTab: 'chat' | 'reasoning';
  bottomPanelTab: 'logs';
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  protocol: ProtocolState | null;
  contracts: ContractFile[];
  findings: Finding[];
  findingsFilter: { severity: string[]; search: string };
  chatMessages: ChatMessage[];
  chatContext: ChatContext;
  isThinking: boolean;
  thinkingSteps: ThinkingStep[];
  exploits: ExploitRecord[];
  memoryEntries: MemoryEntry[];
  memoryCollection: string;
  researchNotes: string;
  tasks: ResearchTask[];
  sandboxReady: boolean;
  simulationLog: LogEntry[];
  suggestions: ProactiveSuggestion[];
  activeSessionId: string | null;
  activeSessionName: string | null;
  sessionList: SessionMeta[];
  sessionView: 'manager' | 'workspace';
  patchResult: PatchResult | null;
  auditProgress: AuditProgress | null;
  auditPhase: AuditPhase;
  contractCode: string;
  contractFilePath: string;
}

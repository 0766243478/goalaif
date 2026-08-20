// ============================================================================
// SIREEN — Core Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Severity & Risk
// ---------------------------------------------------------------------------
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none';

export type RiskLevel = SeverityLevel;

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: 'var(--color-severity-critical)',
  high: 'var(--color-severity-high)',
  medium: 'var(--color-severity-medium)',
  low: 'var(--color-severity-low)',
  info: 'var(--color-severity-info)',
  none: 'var(--color-text-tertiary)',
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
  none: 'None',
};

// ---------------------------------------------------------------------------
// Investigation
// ---------------------------------------------------------------------------
export type InvestigationStatus = 'draft' | 'active' | 'paused' | 'complete';

export type InvestigationMode = 'recon' | 'analyze' | 'exploit' | 'patch';

export interface Investigation {
  id: string;
  title: string;
  target: string;
  chain: string;
  status: InvestigationStatus;
  mode: InvestigationMode;
  riskScore: RiskLevel;
  duration: number;
  findingsCount: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------
export type FindingStatus = 'open' | 'verified' | 'dismissed';

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: FindingStatus;
  category: string;
  location: string;
  impact: string;
  likelihood: string;
  evidence: string[];
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Threat Graph
// ---------------------------------------------------------------------------
export type GraphNodeType = 'contract' | 'function' | 'attacker' | 'token' | 'vulnerability' | 'external';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  severity?: SeverityLevel;
  risk?: number;
  x?: number;
  y?: number;
  properties?: Record<string, string>;
}

export type GraphEdgeType = 'call' | 'transfer' | 'vulnerability' | 'ownership' | 'dependency';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
}

export interface ThreatGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
export type TimelineEventType =
  | 'investigation_start'
  | 'finding_discovered'
  | 'finding_verified'
  | 'exploit_simulated'
  | 'evidence_collected'
  | 'report_generated'
  | 'analysis_complete';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: number;
  severity?: SeverityLevel;
  collapsed?: boolean;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------
export type EvidenceType = 'trace' | 'code' | 'transaction' | 'screenshot' | 'log' | 'other';

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Chat / Messages
// ---------------------------------------------------------------------------
export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'streaming' | 'complete' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'running' | 'complete' | 'error';
  input?: string;
  output?: string;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Sessions (War Room)
// ---------------------------------------------------------------------------
export type SessionStatus = 'active' | 'paused' | 'completed';

export interface Session {
  id: string;
  title: string;
  target: string;
  chain: string;
  status: SessionStatus;
  mode: InvestigationMode;
  riskScore: RiskLevel;
  findings: number;
  duration: number;
  lastActive: number;
  pinned?: boolean;
}

// ---------------------------------------------------------------------------
// Webview Messages
// ---------------------------------------------------------------------------
export type WebviewMessage =
  | { type: 'config'; payload: Record<string, any> }
  | { type: 'theme:change'; payload: { kind: number } }
  | { type: 'chat:stream'; payload: { message: ChatMessage } }
  | { type: 'chat:send'; payload: { text: string } }
  | { type: 'investigation:create'; payload: Partial<Investigation> }
  | { type: 'investigation:list'; payload: { investigations: any[] } }
  | { type: 'investigation:save'; payload: { id: string; data: any } }
  | { type: 'investigation:load'; payload: { id: string } }
  | { type: 'state:restore'; payload: { id: string; data: any } }
  | { type: 'finding:verify'; payload: { id: string } }
  | { type: 'finding:dismiss'; payload: { id: string } }
  | { type: 'session:list'; payload: { sessions: any[] } }
  | { type: 'session:load'; payload: { id: string } }
  | { type: 'session:deleted'; payload: { id: string } }
  | { type: 'simulation:update'; payload: { status: string } }
  | { type: 'bounty:data'; payload: { findings: any[] } }
  | { type: 'reports:export'; payload: { reportId: string } }
  | { type: 'graph:selectNode'; payload: { nodeId: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'open:panel'; payload: { panel: string } }
  | { type: 'ready' }
  | { type: 'focus:input' };

// ---------------------------------------------------------------------------
// Bounty
// ---------------------------------------------------------------------------
export interface Bounty {
  id: string;
  title: string;
  platform: string;
  reward: string;
  status: 'open' | 'submitted' | 'accepted' | 'rejected';
  severity: SeverityLevel;
  findings: number;
  deadline: number;
  scope: string[];
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
export interface Report {
  id: string;
  title: string;
  target: string;
  chain: string;
  severity: SeverityLevel;
  findings: Finding[];
  summary: string;
  createdAt: number;
  status: 'draft' | 'final';
}

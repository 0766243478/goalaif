export type Mode = 'protocol' | 'hacker';
export type PipelineStage = 'idle' | 'planning' | 'researching' | 'auditing' | 'done';
export type ExploitStage = 'idle' | 'generating' | 'running' | 'confirmed' | 'failed';

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  line_number?: number;
  affected_function?: string;
  contract_name?: string;
  category?: string;
}

export interface Patch {
  id: string;
  strategy: string;
  code_diff?: string;
  why_best?: string;
}

export interface MemoryEntry {
  text: string;
  score?: number;
  type?: string;
  severity?: string;
  warning?: string;
  suggestion?: string;
  confidence?: number;
  idea?: string;
  degraded?: boolean;
}

export interface PoCResult {
  confirmed: boolean;
  poc_code: string;
  forge_output: string;
  money_flow?: MoneyFlowData;
  attack_vector?: string;
  target_function?: string;
  estimated_impact?: string;
}

export interface MoneyFlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  label: string;
  type: 'victim' | 'attacker' | 'intermediary' | 'pool';
  balance_before: string;
  balance_after: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  amount: string;
  step: number;
  token: string;
}

export interface TacticEntry extends MemoryEntry {
  attack_vector?: string;
  impact?: string;
}

/** Canonical event schema — one source of truth for all SIREEN communication.
 * Every event flows: Frontend → MessageRouter → Backend → SQLite → Frontend restoration.
 * No ad-hoc message formats. All events have event_id, session_id, timestamp, type, status.
 */
export interface SireenEvent {
  event_id: string;       // UUID v4, unique per event
  session_id: string;     // Current session — EVERY event belongs to a session
  task_id?: string;       // Current task being performed
  agent_id?: string;      // Performing agent (Planner, Researcher, etc.)
  timestamp: number;      // Epoch ms, for timeline reconstruction
  type: EventType;        // Defined enum below
  status: EventStatus;    // running, completed, failed, etc.
  payload: any;           // Typed data specific to event type
  correlation_id?: string; // For multi-step operations (links related events)
}

export type EventType =
  | 'session_created'
  | 'session_restored'
  | 'session_archived'
  | 'audit_started'
  | 'audit_progress'
  | 'audit_complete'
  | 'audit_error'
  | 'audit_phase1_complete'
  | 'audit_phase2_complete'
  | 'audit_phase3_complete'
  | 'audit_phase4_complete'
  | 'finding_discovered'
  | 'finding_updated'
  | 'finding_resolved'
  | 'exploit_started'
  | 'exploit_progress'
  | 'exploit_complete'
  | 'exploit_failed'
  | 'chat_message'
  | 'thinking_start'
  | 'thinking_step'
  | 'thinking_end'
  | 'tool_execution'
  | 'terminal_output'
  | 'verification_started'
  | 'verification_complete'
  | 'verification_passed'
  | 'verification_failed'
  | 'task_created'
  | 'task_completed'
  | 'task_failed'
  | 'note_added'
  | 'report_generated';

export type EventStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

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

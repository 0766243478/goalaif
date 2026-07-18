// ============================================================================
// SIREEN — Pipeline Type Definitions
// ============================================================================
// Core types for the exploit verification pipeline: PoC generation, forge
// execution, output parsing, honest signal verification, and reporting.

import type { SeverityLevel, EvidenceItem, TimelineEvent } from '../webview/types';

// ---------------------------------------------------------------------------
// Pipeline Configuration
// ---------------------------------------------------------------------------
export interface PipelineConfig {
  aiProvider: 'openai' | 'anthropic' | 'openrouter';
  aiApiKey: string;
  aiModel: string;
  forgePath: string;
  dockerImage: string;
  forkRpcUrl: string;
  maxRetries: number;
  workspaceDir: string;
  dockerEnabled: boolean;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  aiProvider: 'openrouter',
  aiApiKey: '',
  aiModel: 'openai/o3-mini',
  forgePath: 'forge',
  dockerImage: 'ghcr.io/foundry-rs/foundry:latest',
  forkRpcUrl: '',
  maxRetries: 3,
  workspaceDir: '',
  dockerEnabled: false,
};

// ---------------------------------------------------------------------------
// Pipeline Stages & Events
// ---------------------------------------------------------------------------
export type PipelineStage =
  | 'idle'
  | 'initializing'
  | 'hypothesis'
  | 'poc_generation'
  | 'poc_compilation'
  | 'forge_execution'
  | 'output_parsing'
  | 'verification'
  | 'report_generation'
  | 'completed'
  | 'failed';

export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

// ---------------------------------------------------------------------------
// PoC State Machine
// ---------------------------------------------------------------------------
export type PoCState =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'compiling'
  | 'compiled'
  | 'compilation_failed'
  | 'executing'
  | 'executed'
  | 'execution_failed'
  | 'verified'
  | 'failed';

export interface PoCStateTransition {
  from: PoCState;
  to: PoCState;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineEvent {
  stage: PipelineStage;
  status: 'running' | 'completed' | 'failed';
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export type PipelineEventHandler = (event: PipelineEvent) => void;

// ---------------------------------------------------------------------------
// Attack Hypothesis
// ---------------------------------------------------------------------------
export interface AttackHypothesis {
  title: string;
  vulnerabilityType: string;
  affectedContracts: string[];
  attackVector: string;
  preconditions: string[];
  expectedOutcome: string;
  severity: SeverityLevel;
  confidence: number; // 0–1
}

// ---------------------------------------------------------------------------
// PoC Generation
// ---------------------------------------------------------------------------
export interface PoCGenerationRequest {
  hypothesis: AttackHypothesis;
  targetCode: string;
  targetAddress?: string;
  chain: string;
  forkUrl?: string;
}

export interface PoCResult {
  sourceCode: string;
  filePath: string;
  compilationAttempts: number;
  compilationSuccess: boolean;
  errors: string[];
  // PoC State Machine
  state: PoCState;
  stateHistory: PoCStateTransition[];
  lastError?: string;
  verificationDetails?: {
    exploitReproduced: boolean;
    stateChangeVerified: boolean;
    attackerGainVerified: boolean;
    profitAmount?: string;
    profitToken?: string;
  };
}

// ---------------------------------------------------------------------------
// Forge Execution
// ---------------------------------------------------------------------------
export interface ForgeTestResult {
  name: string;
  status: 'pass' | 'fail';
  gasUsed?: number;
  error?: string;
}

export interface GasReport {
  total: number;
  byFunction: Record<string, number>;
}

export interface ForgeOutput {
  raw: string;
  testResults: ForgeTestResult[];
  gasReport?: GasReport;
  compilationErrors: string[];
  exitCode: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// Exploit Result
// ---------------------------------------------------------------------------
export type MoneyFlowType = 'transfer' | 'mint' | 'burn' | 'swap' | 'approval';

export interface MoneyFlowEntry {
  from: string;
  to: string;
  token: string;
  amount: string;
  type: MoneyFlowType;
  txIndex?: number;
}

export interface RevertedTx {
  index: number;
  reason: string;
  gasUsed: number;
}

export interface GasUsage {
  total: number;
  byOperation: Record<string, number>;
}

export type TokenBalances = Record<string, Record<string, string>>;
// ^ address -> token symbol -> formatted balance

export interface ExploitResult {
  success: boolean;
  attackerProfit: string;
  profitToken: string;
  profitUSD: number;
  tokenBalances: TokenBalances;
  moneyFlow: MoneyFlowEntry[];
  revertedTransactions: RevertedTx[];
  gasUsage: GasUsage;
}

// ---------------------------------------------------------------------------
// Honest Signal
// ---------------------------------------------------------------------------
export interface HonestCondition {
  name: string;
  satisfied: boolean;
  detail: string;
}

// Strict verification conditions (ALL must be true for confirmed=true)
export const HONEST_SIGNAL_CONDITIONS: readonly string[] = [
  'poc_generated',
  'poc_compiled',
  'forge_executed',
  'exploit_reproduced',
  'state_change_verified',
  'attacker_gain_verified',
] as const;

export type HonestSignalCondition = (typeof HONEST_SIGNAL_CONDITIONS)[number];

export interface HonestSignal {
  confirmed: boolean;
  confidence: number; // 0–1
  conditions: HonestCondition[];
  explanation: string;
  // Individual condition status for UI display
  pocGenerated: boolean;
  pocCompiled: boolean;
  forgeExecuted: boolean;
  exploitReproduced: boolean;
  stateChangeVerified: boolean;
  attackerGainVerified: boolean;
}

export type Verdict = 'confirmed' | 'not_confirmed' | 'inconclusive';

// ---------------------------------------------------------------------------
// Investigation Report
// ---------------------------------------------------------------------------
export interface InvestigationReport {
  id: string;
  target: string;
  targetAddress?: string;
  chain: string;
  hypothesis: AttackHypothesis;
  poc: PoCResult;
  forgeOutput: ForgeOutput;
  exploitResult: ExploitResult;
  honestSignal: HonestSignal;
  moneyFlow: MoneyFlowEntry[];
  evidence: EvidenceItem[];
  timeline: TimelineEvent[];
  verdict: Verdict;
  summary: string;
  generatedAt: number;
}

// ---------------------------------------------------------------------------
// Pipeline State (persistent)
// ---------------------------------------------------------------------------
export interface PipelineState {
  id: string;
  status: PipelineStatus;
  currentStage: PipelineStage;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  config: PipelineConfig;
  report?: InvestigationReport;
}

// ---------------------------------------------------------------------------
// Pipeline Session (for resume capability)
// ---------------------------------------------------------------------------
export interface PipelineSession {
  id: string;
  target: PipelineTarget;
  sourceCode: string;
  forkUrl?: string;
  status: PipelineStatus;
  currentStage: PipelineStage;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  report?: InvestigationReport;
  error?: string;
  stagesCompleted: PipelineStage[];
}

// ---------------------------------------------------------------------------
// Pipeline Target
// ---------------------------------------------------------------------------
export interface PipelineTarget {
  type: 'contract_address' | 'source_code' | 'repository' | 'bounty';
  value: string;
  chain: string;
  name?: string;
}

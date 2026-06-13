// ──────────────────────────────────────────────
// Gaolaif — Shared TypeScript Types
// ──────────────────────────────────────────────
// Types shared between Tauri commands, API client,
// and Next.js components. All fields strict, no any.
// ──────────────────────────────────────────────

// ── Audit Session ──────────────────────────

export type AuditLanguage = 'solidity' | 'move' | 'rust';
export type AuditChain = 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'sui' | 'aptos';
export type AuditStatus = 'ingesting' | 'auditing' | 'exploiting' | 'patching' | 'complete' | 'error';

export interface AuditSession {
  id: string;
  contractName: string;
  contractPath: string;
  language: AuditLanguage;
  chain: AuditChain;
  status: AuditStatus;
  forkUrl: string;
  currentAgent: string;
  iterationCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Agent ──────────────────────────────────

export type AgentName = 'auditor' | 'exploit' | 'patch_verifier';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface AgentLog {
  id: number;
  sessionId: string;
  agentName: AgentName;
  logLevel: LogLevel;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Findings ───────────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Confidence = 'UNCONFIRMED' | 'CONFIRMED' | 'FALSE_POSITIVE';
export type FindingCategory = 'reentrancy' | 'access-control' | 'oracle' | 'arithmetic' | 'logic' | 'resource-management' | 'type-safety' | 'general';

export interface Finding {
  title: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  location: string;
  codeSnippet?: string;
  confidence: Confidence;
  cweIds: string[];
  staticTool?: string;
}

// ── Exploit Proof ──────────────────────────

export interface ExploitProof {
  findingId: string;
  pocCode: string;
  forgeOutput: string;
  confirmed: boolean;
  attackVector: string;
  estimatedImpact: string;
}

// ── Patch Proposal ─────────────────────────

export interface PatchProposal {
  findingId: string;
  originalCode: string;
  patchedCode: string;
  verified: boolean;
  regressionReport?: string;
  newFindings: Finding[];
}

// ── Firewall ───────────────────────────────

export interface FirewallDecision {
  allowed: boolean;
  reason: string;
  sanitizedContent?: string;
  riskScore: number;
  blockedPatterns: string[];
}

export interface ScanResult {
  filePath: string;
  sha256: string;
  clean: boolean;
  threats: string[];
  engine: string;
  quarantined: boolean;
  quarantinePath?: string;
}

// ── API Responses ──────────────────────────

export interface IngestResponse {
  sessionId: string;
  status: AuditStatus;
  findingsCount: number;
  exploitCount: number;
  patchValidated: boolean;
}

export interface AuditStatusResponse {
  sessionId: string;
  status: AuditStatus;
  currentAgent: AgentName;
  iterationCount: number;
  contractName: string;
  findingsCount: number;
  exploitCount: number;
  patchValidated: boolean;
}

export interface PatchResponse {
  verified: boolean;
  report?: string;
  newFindings: Finding[];
}

// ── Export ─────────────────────────────────

export interface ExportPayload {
  sessionId: string;
  format: 'markdown' | 'json';
}

export interface JsonReport {
  sessionId: string;
  contract: string;
  path: string;
  chain: AuditChain;
  status: AuditStatus;
  findings: Finding[];
  exploitProofs: ExploitProof[];
  patchProposals: PatchProposal[];
  analyticsSummary: Record<string, unknown>;
  generatedAt: string;
  tool: string;
}

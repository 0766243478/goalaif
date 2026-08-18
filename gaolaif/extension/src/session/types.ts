// Session-specific types - defined locally to avoid circular import issues
export type ViewId = 'overview' | 'findings' | 'exploits' | 'timeline' | 'settings';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
export type AuditPhase = 'idle' | 'planning' | 'discovering' | 'analyzing' | 'testing' | 'verifying' | 'waiting_for_human' | 'completed' | 'failed' | 'partial';

export interface AuditProgress {
  phase: number;
  message: string;
  completedPhases: number[];
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  details?: string;
  evidence?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ExploitRecord {
  id: string;
  finding_id: string;
  confirmed: boolean;
}

export interface MemoryEntry {
  key: string;
  content: string;
}

export interface ResearchTask {
  id: string;
  title: string;
  status: 'open' | 'done';
}

export interface ProtocolState {
  version: string;
  features: string[];
}

// Session-specific types (continued)
export type SessionId = string;
export type ProjectId = string;
export type WorkspaceId = string;
export type TaskId = string;
export type ConversationId = string;
export type AgentRunId = string;

export interface SessionIdentity {
  session_id: SessionId;
  project_id: ProjectId;
  workspace_id: WorkspaceId;
  task_id: TaskId;
  conversation_id: ConversationId;
  agent_run_id: AgentRunId;
  created_at: number;
  updated_at: number;
}

export interface SessionRole {
  id: number;
  label: string;
  description: string;
}

export interface SessionCreateRequest {
  name: string;
  project: string;
  workspace?: string;
  role?: SessionRole;
}

export interface SessionState {
  id: SessionId;
  name: string;
  project: string;
  status: 'active' | 'paused' | 'completed' | 'deleted';
  created_at: number;
  updated_at: number;
  auditPhase: AuditPhase;
  auditProgress: AuditProgress;
  chatMessages: ChatMessage[];
  findings: Finding[];
  exploits: ExploitRecord[];
  memoryEntries: MemoryEntry[];
  tasks: ResearchTask[];
  timeline: TimelineEvent[];
  activeView: ViewId;
  rightPanelTab: 'chat' | 'reasoning';
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  connectionStatus: ConnectionStatus;
  apiKeySet: boolean;
  protocol?: ProtocolState;
  contractCode: string;
  contractFilePath: string;
  researchNotes: string;
  memoryCollection: string;
  sessionRoles?: SessionRole[];
}

// AI Provider specific types (defined here to avoid conflicts)
export enum ProviderName {
  Gemini = 'gemini',
  OpenRouter = 'openrouter',
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Local = 'local',
}

export interface AIHealthStatus {
  healthy: boolean;
  type: 'available' | 'quota_exhausted' | 'timeout' | 'error';
  message: string;
  lastChecked: number;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  timeout?: number;
  maxRetries?: number;
  [key: string]: unknown;
}

export interface AIProviderManagerOptions {
  primaryProvider?: ProviderName;
  fallbackProvider?: ProviderName;
  providers?: Record<ProviderName, AIProviderConfig>;
  healthCheckInterval?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface AIProvider {
  name: ProviderName;
  config: AIProviderConfig;
  isAvailable: () => Promise<boolean>;
  isHealthy: () => Promise<boolean>;
  sendMessage: (messages: any, options?: any) => Promise<any>;
  getQuotaStatus: () => Promise<{ remaining: number; resetTime: number | null }>;
  healthCheck: () => Promise<AIHealthStatus>;
  dispose?: () => Promise<void>;
}


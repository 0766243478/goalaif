import type {
  SessionId,
  SessionState,
  SessionCreateRequest,
  AuditPhase,
  AuditProgress,
  TimelineEvent,
  ConnectionStatus,
  ChatMessage,
  Finding,
  ExploitRecord,
  ResearchTask,
} from './types';

// In-memory storage
const sessionsMap = new Map<SessionId, SessionState>();

// Generate unique IDs
function generateSessionId(): SessionId {
  return `session_${crypto.randomUUID()}`;
}

function generateEventId(): string {
  return crypto.randomUUID();
}

// Default session state
function defaultSessionState(name: string, project: string): SessionState {
  return {
    id: generateSessionId(),
    name,
    project,
    status: 'active',
    created_at: Date.now(),
    updated_at: Date.now(),
    auditPhase: 'idle',
    auditProgress: { phase: 0, message: 'Idle', completedPhases: [] },
    chatMessages: [],
    findings: [],
    exploits: [],
    memoryEntries: [],
    tasks: [],
    timeline: [],
    activeView: 'overview',
    rightPanelTab: 'chat',
    rightPanelOpen: true,
    bottomPanelOpen: false,
    connectionStatus: 'disconnected',
    apiKeySet: false,
    contractCode: '',
    contractFilePath: '',
    researchNotes: '',
    memoryCollection: 'patterns',
  };
}

// SessionManager class
export class SessionManager {
  private readonly onSessionChange?: (session: SessionState) => void;
  private currentSessionId: SessionId | null = null;

  constructor(onSessionChange?: (session: SessionState) => void) {
    this.onSessionChange = onSessionChange;
  }

  // Initialize the manager (no-op for in-memory version)
  async initialize(): Promise<void> {
    console.log('[SessionManager] Initialized with in-memory storage');
  }

  // Create a new session
  async create(request: SessionCreateRequest): Promise<SessionState> {
    const sessionId = generateSessionId();
    const projectId = request.project || 'default';

    const sessionState: SessionState = {
      id: sessionId,
      name: request.name || `Session ${sessionsMap.size + 1}`,
      project: projectId,
      status: 'active',
      created_at: Date.now(),
      updated_at: Date.now(),
      auditPhase: 'idle',
      auditProgress: { phase: 0, message: 'Idle', completedPhases: [] },
      chatMessages: [],
      findings: [],
      exploits: [],
      memoryEntries: [],
      tasks: [],
      timeline: [],
      activeView: 'overview',
      rightPanelTab: 'chat',
      rightPanelOpen: true,
      bottomPanelOpen: false,
      connectionStatus: 'disconnected',
      apiKeySet: false,
      contractCode: '',
      contractFilePath: '',
      researchNotes: '',
      memoryCollection: 'patterns',
    };

    sessionsMap.set(sessionId, sessionState);
    this.onSessionChange?.(sessionState);

    console.log(`[SessionManager] Created session ${sessionId} for project ${projectId}`);
    return sessionState;
  }

  // Load an existing session
  load(sessionId: SessionId): SessionState | null {
    const session = sessionsMap.get(sessionId);
    if (session) {
      this.setCurrentSession(sessionId);
      console.log(`[SessionManager] Loaded session ${sessionId}`);
      return session;
    }
    console.warn(`[SessionManager] Session ${sessionId} not found`);
    return null;
  }

  // Get current session
  getCurrent(): SessionState | null {
    if (this.currentSessionId) {
      return sessionsMap.get(this.currentSessionId) || null;
    }
    return null;
  }

  // List all sessions
  list(): SessionState[] {
    return Array.from(sessionsMap.values());
  }

  // Close a session
  close(sessionId: SessionId): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.status = 'deleted';
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Delete a session
  async delete(sessionId: SessionId): Promise<boolean> {
    const session = sessionsMap.get(sessionId);
    if (session) {
      sessionsMap.delete(sessionId);
      this.onSessionChange?.(session);
      return true;
    }
    return false;
  }

  // Pause a session
  pause(sessionId: SessionId): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.status = 'paused';
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Resume a session
  resume(sessionId: SessionId): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.status = 'active';
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Set current session
  private setCurrentSession(sessionId: SessionId): void {
    this.currentSessionId = sessionId;
    const current = this.getCurrent();
    if (current) {
      this.onSessionChange?.(current);
    }
  }

  // Add event to session timeline
  addTimelineEvent(sessionId: SessionId, event: Omit<TimelineEvent, 'id' | 'timestamp'>): string {
    const timelineEvent: TimelineEvent = {
      id: generateEventId(),
      timestamp: Date.now(),
      ...event,
    };

    const session = sessionsMap.get(sessionId);
    if (session) {
      session.timeline.push(timelineEvent);
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
      return timelineEvent.id;
    }
    return '';
  }

  // Add chat message to session
  addChatMessage(sessionId: SessionId, message: ChatMessage): string {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.chatMessages.push(message);
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
      return message.id;
    }
    return '';
  }

  // Add finding to session
  addFinding(sessionId: SessionId, finding: Finding): string {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.findings.push(finding);
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
      return finding.id;
    }
    return '';
  }

  // Add exploit to session
  addExploit(sessionId: SessionId, exploit: ExploitRecord): string {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.exploits.push(exploit);
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
      return exploit.id;
    }
    return '';
  }

  // Add task to session
  addTask(sessionId: SessionId, task: ResearchTask): string {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.tasks.push(task);
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
      return task.id;
    }
    return '';
  }

  // Set session audit phase
  setAuditPhase(sessionId: SessionId, phase: AuditPhase, message: string): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.auditPhase = phase;
      session.auditProgress = {
        phase: 0,
        message,
        completedPhases: [],
      };
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Update audit progress
  updateAuditProgress(sessionId: SessionId, progress: Partial<AuditProgress>): void {
    const session = sessionsMap.get(sessionId);
    if (session && session.auditProgress) {
      session.auditProgress = {
        ...session.auditProgress,
        ...progress,
      };
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Set connection status
  setConnectionStatus(sessionId: SessionId, status: ConnectionStatus): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.connectionStatus = status;
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Set API key status
  setApiKeyStatus(sessionId: SessionId, configured: boolean): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.apiKeySet = configured;
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Set contract code
  setContractCode(sessionId: SessionId, code: string, filePath: string): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.contractCode = code;
      session.contractFilePath = filePath;
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Set research notes
  setResearchNotes(sessionId: SessionId, notes: string): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.researchNotes = notes;
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Set memory collection
  setMemoryCollection(sessionId: SessionId, collection: string): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.memoryCollection = collection;
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Update session name
  renameSession(sessionId: SessionId, newName: string): void {
    const session = sessionsMap.get(sessionId);
    if (session) {
      session.name = newName;
      session.updated_at = Date.now();
      this.onSessionChange?.(session);
    }
  }

  // Reject events from other sessions
  rejectCrossSessionEvent(event: any): boolean {
    if (!this.currentSessionId) return false;
    if (event.session_id && event.session_id !== this.currentSessionId) {
      console.log(`[SessionManager] Rejecting cross-session event for ${event.session_id}, expected ${this.currentSessionId}`);
      return true;
    }
    return false;
  }

  // Send message to webview with session awareness
  sendToWebview(webview: any, message: any): void {
    if (!message.session_id && this.currentSessionId) {
      message.session_id = this.currentSessionId;
    }
    webview.postMessage(message);
  }
}

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { vscode } from '../vscodeApi';
import type { SireenState, ViewId, Finding, ChatMessage, ThinkingStep, ChatContext, ExploitRecord, ResearchTask, ProactiveSuggestion, PatchResult, ProtocolState, ContractFile, AuditProgress, AuditPhase, SessionMeta, WorkspaceState, TimelineEvent } from './types';

type Action =
  | { type: 'SET_VIEW'; view: ViewId }
  | { type: 'SET_CONNECTION'; status: SireenState['connectionStatus'] }
  | { type: 'SET_BACKEND_STATUS'; status: SireenState['backendStatus'] }
  | { type: 'SET_PROTOCOL'; protocol: ProtocolState | null }
  | { type: 'SET_CONTRACTS'; contracts: ContractFile[] }
  | { type: 'ADD_FINDINGS'; findings: Finding[] }
  | { type: 'SET_FINDINGS'; findings: Finding[] }
  | { type: 'DISMISS_FINDING'; id: string }
  | { type: 'SET_FINDINGS_FILTER'; filter: Partial<SireenState['findingsFilter']> }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'SET_CHAT_MESSAGES'; messages: ChatMessage[] }
  | { type: 'UPDATE_LAST_ASSISTANT'; content: string }
  | { type: 'SET_THINKING'; thinking: boolean; steps?: ThinkingStep[] }
  | { type: 'SET_CHAT_CONTEXT'; context: Partial<ChatContext> }
  | { type: 'ADD_EXPLOIT'; exploit: ExploitRecord }
  | { type: 'SET_NOTES'; content: string }
  | { type: 'ADD_TASK'; task: ResearchTask }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'ADD_SUGGESTION'; suggestion: ProactiveSuggestion }
  | { type: 'DISMISS_SUGGESTION'; id: string }
  | { type: 'SET_SESSION'; id: string | null; name?: string | null }
  | { type: 'SET_SESSION_LIST'; sessions: SessionMeta[] }
  | { type: 'SET_SESSION_VIEW'; view: 'manager' | 'workspace' }
  | { type: 'RESTORE_WORKSPACE'; state: WorkspaceState }
  | { type: 'SET_PATCH'; result: PatchResult | null }
  | { type: 'SET_RIGHT_PANEL'; open: boolean }
  | { type: 'SET_RIGHT_PANEL_TAB'; tab: SireenState['rightPanelTab'] }
  | { type: 'SET_AUDIT_PROGRESS'; progress: AuditProgress | null }
  | { type: 'SET_AUDIT_PHASE'; phase: AuditPhase }
  | { type: 'SET_CONTRACT_CODE'; code: string; filePath: string }
  | { type: 'SET_TIMELINE_EVENTS'; events: TimelineEvent[] }
  | { type: 'RESTORE'; state: Partial<SireenState> };

const initialState: SireenState = {
  connectionStatus: 'connecting',
  backendStatus: null,
  activeView: 'overview',
  rightPanelTab: 'chat',
  rightPanelOpen: true,
  protocol: null,
  contracts: [],
  findings: [],
  findingsFilter: { severity: [], search: '' },
  chatMessages: [],
  chatContext: {},
  isThinking: false,
  thinkingSteps: [],
  exploits: [],
  researchNotes: '',
  tasks: [],
  suggestions: [],
  activeSessionId: null,
  activeSessionName: null,
  sessionList: [],
  sessionView: 'manager',
  patchResult: null,
  auditProgress: null,
  auditPhase: 'idle',
  contractCode: '',
  contractFilePath: '',
};

function reducer(state: SireenState, action: Action): SireenState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    case 'SET_CONNECTION':
      return { ...state, connectionStatus: action.status };
    case 'SET_BACKEND_STATUS':
      return { ...state, backendStatus: action.status };
    case 'SET_PROTOCOL':
      return { ...state, protocol: action.protocol };
    case 'SET_CONTRACTS':
      return { ...state, contracts: action.contracts };
    case 'ADD_FINDINGS':
      return { ...state, findings: [...state.findings, ...action.findings] };
    case 'SET_FINDINGS':
      return { ...state, findings: action.findings };
    case 'DISMISS_FINDING':
      return { ...state, findings: state.findings.filter(f => f.id !== action.id) };
    case 'SET_FINDINGS_FILTER':
      return { ...state, findingsFilter: { ...state.findingsFilter, ...action.filter } };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'SET_CHAT_MESSAGES':
      return { ...state, chatMessages: action.messages };
    case 'UPDATE_LAST_ASSISTANT': {
      const msgs = [...state.chatMessages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content: action.content };
          break;
        }
      }
      return { ...state, chatMessages: msgs };
    }
    case 'SET_THINKING':
      return { ...state, isThinking: action.thinking, thinkingSteps: action.steps || [] };
    case 'SET_CHAT_CONTEXT':
      return { ...state, chatContext: { ...state.chatContext, ...action.context } };
    case 'ADD_EXPLOIT':
      return { ...state, exploits: [...state.exploits, action.exploit] };
    case 'SET_NOTES':
      return { ...state, researchNotes: action.content };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'TOGGLE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, status: t.status === 'open' ? 'done' : 'open' } : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };
    case 'ADD_SUGGESTION':
      return { ...state, suggestions: [...state.suggestions, action.suggestion] };
    case 'DISMISS_SUGGESTION':
      return { ...state, suggestions: state.suggestions.filter(s => s.id !== action.id) };
    case 'SET_SESSION':
      return { ...state, activeSessionId: action.id, activeSessionName: action.name ?? state.activeSessionName };
    case 'SET_SESSION_LIST':
      return { ...state, sessionList: action.sessions };
    case 'SET_SESSION_VIEW':
      return { ...state, sessionView: action.view };
    case 'RESTORE_WORKSPACE': {
      const ws = action.state;
      return {
        ...state,
        findings: (ws.findings as Finding[]) ?? state.findings,
        exploits: (ws.exploits as ExploitRecord[]) ?? state.exploits,
        chatMessages: (ws.chatMessages as ChatMessage[]) ?? state.chatMessages,
        thinkingSteps: (ws.thinkingSteps as ThinkingStep[]) ?? state.thinkingSteps,
        researchNotes: ws.notes ?? state.researchNotes,
        tasks: (ws.tasks as ResearchTask[]) ?? state.tasks,
        protocol: (ws.protocol as ProtocolState | null) ?? state.protocol,
        contractCode: ws.contractCode ?? state.contractCode,
        contractFilePath: ws.contractFilePath ?? state.contractFilePath,
        auditPhase: (ws.auditPhase as AuditPhase) ?? state.auditPhase,
        auditProgress: (ws.auditProgress as AuditProgress | null) ?? state.auditProgress,
        activeView: (ws.activeView as ViewId) ?? state.activeView,
        rightPanelTab: (ws.rightPanelTab as 'chat' | 'reasoning') ?? state.rightPanelTab,
        rightPanelOpen: ws.rightPanelOpen ?? state.rightPanelOpen,
      };
    }
    case 'SET_PATCH':
      return { ...state, patchResult: action.result };
    case 'SET_RIGHT_PANEL':
      return { ...state, rightPanelOpen: action.open };
    case 'SET_RIGHT_PANEL_TAB':
      return { ...state, rightPanelTab: action.tab };
    case 'SET_AUDIT_PROGRESS':
      return { ...state, auditProgress: action.progress };
    case 'SET_AUDIT_PHASE':
      return { ...state, auditPhase: action.phase };
    case 'SET_CONTRACT_CODE':
      return { ...state, contractCode: action.code, contractFilePath: action.filePath };
    case 'RESTORE':
      return { ...state, ...action.state };
    default:
      return state;
  }
}

const PERSISTED_KEYS: (keyof SireenState)[] = [
  'activeView',
  'rightPanelTab',
  'rightPanelOpen',
  'findingsFilter',
  'researchNotes',
  'tasks',
  'chatMessages',
  'activeSessionId',
  'activeSessionName',
  'sessionView',
  'connectionStatus',
  'backendStatus',
  'protocol',
  'contracts',
  'findings',
  'exploits',
  'thinkingSteps',
  'suggestions',
  'auditProgress',
  'auditPhase',
  'contractCode',
  'contractFilePath',
];

interface StoreContextValue {
  state: SireenState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const saved = vscode.getState<Partial<SireenState>>();
      if (saved) {
        dispatch({ type: 'RESTORE', state: saved });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Save full workspace state to backend for persistence across restarts
        const workspaceState: WorkspaceState = {
          findings: state.findings,
          exploits: state.exploits,
          chatMessages: state.chatMessages,
          thinkingSteps: state.thinkingSteps,
          notes: state.researchNotes,
          tasks: state.tasks,
          protocol: state.protocol,
          contractCode: state.contractCode,
          contractFilePath: state.contractFilePath,
          activeView: state.activeView,
          rightPanelTab: state.rightPanelTab,
          rightPanelOpen: state.rightPanelOpen,
          findingsFilter: state.findingsFilter,
          suggestions: state.suggestions,
          connectionStatus: state.connectionStatus,
          backendStatus: state.backendStatus,
          auditProgress: state.auditProgress,
          auditPhase: state.auditPhase,
        };
        vscode.setState(workspaceState);
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

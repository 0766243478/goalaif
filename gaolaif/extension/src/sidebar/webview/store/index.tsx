import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { vscode } from '../vscodeApi';
import type { SireenState, ViewId, Finding, ChatMessage, ThinkingStep, ChatContext, ExploitRecord, MemoryEntry, ResearchTask, ProactiveSuggestion, LogEntry, PatchResult, ProtocolState, ContractFile, AuditProgress, AuditPhase } from './types';

type Action =
  | { type: 'SET_VIEW'; view: ViewId }
  | { type: 'SET_CONNECTION'; status: SireenState['connectionStatus'] }
  | { type: 'SET_API_KEY'; set: boolean }
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
  | { type: 'SET_MEMORY'; entries: MemoryEntry[] }
  | { type: 'SET_MEMORY_COLLECTION'; collection: string }
  | { type: 'SET_NOTES'; content: string }
  | { type: 'ADD_TASK'; task: ResearchTask }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'ADD_SUGGESTION'; suggestion: ProactiveSuggestion }
  | { type: 'DISMISS_SUGGESTION'; id: string }
  | { type: 'SET_SANDBOX'; ready: boolean }
  | { type: 'ADD_SIM_LOG'; entry: LogEntry }
  | { type: 'SET_SESSION'; id: string | null }
  | { type: 'SET_PATCH'; result: PatchResult | null }
  | { type: 'SET_RIGHT_PANEL'; open: boolean }
  | { type: 'SET_BOTTOM_PANEL'; open: boolean }
  | { type: 'SET_RIGHT_PANEL_TAB'; tab: SireenState['rightPanelTab'] }
  | { type: 'SET_BOTTOM_PANEL_TAB'; tab: SireenState['bottomPanelTab'] }
  | { type: 'SET_AUDIT_PROGRESS'; progress: AuditProgress | null }
  | { type: 'SET_AUDIT_PHASE'; phase: AuditPhase }
  | { type: 'SET_CONTRACT_CODE'; code: string; filePath: string }
  | { type: 'RESTORE'; state: Partial<SireenState> };

const initialState: SireenState = {
  connectionStatus: 'connecting',
  apiKeySet: null,
  activeView: 'overview',
  rightPanelTab: 'chat',
  bottomPanelTab: 'logs',
  rightPanelOpen: true,
  bottomPanelOpen: false,
  protocol: null,
  contracts: [],
  findings: [],
  findingsFilter: { severity: [], search: '' },
  chatMessages: [],
  chatContext: {},
  isThinking: false,
  thinkingSteps: [],
  exploits: [],
  memoryEntries: [],
  memoryCollection: 'patterns',
  researchNotes: '',
  tasks: [],
  sandboxReady: false,
  simulationLog: [],
  suggestions: [],
  activeSessionId: null,
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
    case 'SET_API_KEY':
      return { ...state, apiKeySet: action.set };
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
    case 'SET_MEMORY':
      return { ...state, memoryEntries: action.entries };
    case 'SET_MEMORY_COLLECTION':
      return { ...state, memoryCollection: action.collection };
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
    case 'SET_SANDBOX':
      return { ...state, sandboxReady: action.ready };
    case 'ADD_SIM_LOG':
      return { ...state, simulationLog: [...state.simulationLog, action.entry] };
    case 'SET_SESSION':
      return { ...state, activeSessionId: action.id };
    case 'SET_PATCH':
      return { ...state, patchResult: action.result };
    case 'SET_RIGHT_PANEL':
      return { ...state, rightPanelOpen: action.open };
    case 'SET_BOTTOM_PANEL':
      return { ...state, bottomPanelOpen: action.open };
    case 'SET_RIGHT_PANEL_TAB':
      return { ...state, rightPanelTab: action.tab };
    case 'SET_BOTTOM_PANEL_TAB':
      return { ...state, bottomPanelTab: action.tab };
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
  'bottomPanelOpen',
  'findingsFilter',
  'researchNotes',
  'tasks',
  'chatMessages',
  'memoryCollection',
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
        const toSave: Record<string, unknown> = {};
        for (const key of PERSISTED_KEYS) {
          toSave[key] = state[key];
        }
        vscode.setState(toSave);
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

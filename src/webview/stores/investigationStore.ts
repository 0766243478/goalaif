// ============================================================================
// SIREEN — Investigation Store
// ============================================================================
// Reference: Design System Part 7.2 — Investigation Store Definition
// Manages findings, threat graph, timeline, evidence, and investigation metadata.

import { createStore } from 'solid-js/store';
import type {
  Finding,
  GraphNode,
  GraphEdge,
  TimelineEvent,
  EvidenceItem,
  InvestigationStatus,
  RiskLevel,
} from '../types';

interface InvestigationState {
  id: string | null;
  title: string;
  target: string;
  chain: string;
  status: InvestigationStatus;
  riskScore: RiskLevel;
  duration: number;
  findings: Finding[];
  threatGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
  timelineEvents: TimelineEvent[];
  evidenceItems: EvidenceItem[];
}

const [investigationState, setInvestigationState] = createStore<InvestigationState>({
  id: null,
  title: '',
  target: '',
  chain: 'ethereum',
  status: 'draft',
  riskScore: 'none',
  duration: 0,
  findings: [],
  threatGraph: { nodes: [], edges: [] },
  timelineEvents: [],
  evidenceItems: [],
});

export function useInvestigationStore() {
  return [investigationState, setInvestigationState] as const;
}

export const investigationActions = {
  create(params: { title: string; target: string; chain: string }) {
    setInvestigationState({
      id: `inv-${Date.now()}`,
      title: params.title,
      target: params.target,
      chain: params.chain,
      status: 'active',
      riskScore: 'none',
      duration: 0,
      findings: [],
      threatGraph: { nodes: [], edges: [] },
      timelineEvents: [],
      evidenceItems: [],
    });
  },

  setTarget(target: string) {
    setInvestigationState('target', target);
  },

  setChain(chain: string) {
    setInvestigationState('chain', chain);
  },

  setStatus(status: InvestigationStatus) {
    setInvestigationState('status', status);
  },

  addFinding(finding: Finding) {
    setInvestigationState('findings', (f) => [...f, finding]);
    // Auto-update risk score based on highest severity finding
    const severities = [...investigationState.findings, finding].map((f) => f.severity);
    if (severities.includes('critical')) setInvestigationState('riskScore', 'critical');
    else if (severities.includes('high')) setInvestigationState('riskScore', 'high');
    else if (severities.includes('medium')) setInvestigationState('riskScore', 'medium');
    else if (severities.includes('low')) setInvestigationState('riskScore', 'low');
  },

  updateFinding(id: string, updates: Partial<Finding>) {
    setInvestigationState('findings', (f) =>
      f.map((finding) => (finding.id === id ? { ...finding, ...updates } : finding))
    );
  },

  verifyFinding(id: string) {
    setInvestigationState('findings', (f) =>
      f.map((finding) =>
        finding.id === id ? { ...finding, status: 'verified' as const } : finding
      )
    );
  },

  dismissFinding(id: string) {
    setInvestigationState('findings', (f) =>
      f.map((finding) =>
        finding.id === id ? { ...finding, status: 'dismissed' as const } : finding
      )
    );
  },

  addThreatNode(node: GraphNode) {
    setInvestigationState('threatGraph', 'nodes', (n) => [...n, node]);
  },

  addThreatEdge(edge: GraphEdge) {
    setInvestigationState('threatGraph', 'edges', (e) => [...e, edge]);
  },

  addTimelineEvent(event: TimelineEvent) {
    setInvestigationState('timelineEvents', (e) => [...e, event]);
  },

  addEvidence(item: EvidenceItem) {
    setInvestigationState('evidenceItems', (e) => [...e, item]);
  },

  toggleEvidencePin(id: string) {
    setInvestigationState('evidenceItems', (items) =>
      items.map((item) =>
        item.id === id ? { ...item, pinned: !item.pinned } : item
      )
    );
  },

  removeEvidence(id: string) {
    setInvestigationState('evidenceItems', (items) =>
      items.filter((item) => item.id !== id)
    );
  },

  clear() {
    setInvestigationState({
      id: null,
      title: '',
      target: '',
      chain: 'ethereum',
      status: 'draft',
      riskScore: 'none',
      duration: 0,
      findings: [],
      threatGraph: { nodes: [], edges: [] },
      timelineEvents: [],
      evidenceItems: [],
    });
  },
};

// ──────────────────────────────────────────────
// Gaolaif — Agent Core API Client
// ──────────────────────────────────────────────
// Typed wrapper around all agent-core REST endpoints.
// All calls are to localhost only.
// ──────────────────────────────────────────────

const BASE_URL = 'http://localhost:8000';

// ── Types ────────────────────────────────────

export interface IngestResponse {
  session_id: string;
  status: string;
  findings_count: number;
  exploit_count: number;
  patch_validated: boolean;
}

export interface AuditStatusResponse {
  session_id: string;
  status: string;
  current_agent: string;
  iteration_count: number;
  contract_name: string;
  findings_count: number;
  exploit_count: number;
  patch_validated: boolean;
}

export interface Finding {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  location: string;
  code_snippet?: string;
  confidence: 'UNCONFIRMED' | 'CONFIRMED' | 'FALSE_POSITIVE';
  static_tool?: string;
}

export interface ExploitProof {
  finding_id: string;
  poc_code: string;
  forge_output: string;
  confirmed: boolean;
  attack_vector: string;
  estimated_impact: string;
}

export interface PatchResponse {
  verified: boolean;
  report: string;
  new_findings: Finding[];
}

// ── Error Classes ──────────────────────────

export class AgentCoreError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AgentCoreError';
  }
}

// ── Client ──────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AgentCoreError(response.status, body || response.statusText);
  }

  return response.json();
}

export const agentCoreClient = {
  // Health
  health: () => request<{ status: string; ollama: boolean }>('/health'),

  // Ingest contract
  ingest: (payload: {
    contract_path: string;
    fork_url?: string;
    target_address?: string;
    chain?: string;
  }) =>
    request<IngestResponse>('/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Audit status
  getStatus: (sessionId: string) =>
    request<AuditStatusResponse>(`/audit/${sessionId}`),

  // Findings
  getFindings: (sessionId: string) =>
    request<{ findings: Finding[] }>(`/audit/${sessionId}/findings`),

  // Exploit proofs
  getExploitProofs: (sessionId: string) =>
    request<{ proofs: ExploitProof[] }>(`/audit/${sessionId}/proofs`),

  // Apply patch
  applyPatch: (sessionId: string, patchContent: string) =>
    request<PatchResponse>(`/audit/${sessionId}/patch`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, patch_content: patchContent }),
    }),

  // Export report (returns raw text for markdown, JSON for json)
  exportReport: async (sessionId: string, format: 'markdown' | 'json' = 'markdown') => {
    const url = `${BASE_URL}/export/${sessionId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, format }),
    });
    if (!response.ok) throw new AgentCoreError(response.status, await response.text());
    return format === 'json' ? response.json() : response.text();
  },

  // Analytics
  getAnalytics: (days: number = 30) =>
    request<Record<string, unknown>>(`/analytics?days=${days}`),

  getDailyAnalytics: (days: number = 30) =>
    request<Record<string, unknown>[]>(`/analytics/daily?days=${days}`),

  // Scan file
  scanFile: (filePath: string) =>
    request<{ clean: boolean; threats: string[]; quarantined: boolean }>('/scan', {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath }),
    }),

  // Creative attack session
  submitCreativeAttack: (sessionId: string, proposal: {
    description: string;
    targetFunction: string;
    attackerBehavior: string;
  }) =>
    request<{
      confirmed: boolean;
      forge_output: string;
      ai_analysis: string;
      proposal: typeof proposal;
    }>(`/audit/creative-attack?session_id=${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(proposal),
    }),
};

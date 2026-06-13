'use client';

import { useEffect, useState } from 'react';
import { agentCoreClient, type Finding, type ExploitProof, type AuditStatusResponse } from '@/lib/agentCoreClient';

// ── Types ────────────────────────────────────

type AppView = 'workspace' | 'findings' | 'settings';

// ── Main App ─────────────────────────────────

export default function Home() {
  const [activeView, setActiveView] = useState<AppView>('workspace');
  const [ollamaStatus, setOllamaStatus] = useState<boolean | null>(null);

  useEffect(() => {
    agentCoreClient.health().then(h => setOllamaStatus(h.ollama)).catch(() => setOllamaStatus(false));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="h-10 border-b border-border flex items-center px-4 gap-4 shrink-0">
        <span className="text-accent-orange font-bold text-sm tracking-wider">GAOLAIF</span>
        <span className="text-text-muted text-xs">v0.1.0</span>
        <div className="flex-1" />
        <nav className="flex gap-1">
          {(['workspace', 'findings', 'settings'] as AppView[]).map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                activeView === v
                  ? 'bg-accent-orange/10 text-accent-orange border border-accent-orange/30'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {v}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-xs ml-4">
          <span className={`w-2 h-2 ${ollamaStatus ? 'bg-accent-green' : 'bg-accent-red'}`} />
          <span className="text-text-secondary">Ollama</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeView === 'workspace' && <WorkspaceView />}
        {activeView === 'findings' && <FindingsView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

// ── Workspace View ──────────────────────────

function WorkspaceView() {
  const [contractPath, setContractPath] = useState('');
  const [forkUrl, setForkUrl] = useState('http://localhost:8545');
  const [targetAddress, setTargetAddress] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<AuditStatusResponse | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [proofs, setProofs] = useState<ExploitProof[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const ts = new Date().toISOString().slice(11, 19);
    setLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 200));
  };

  const handleIngest = async () => {
    if (!contractPath) return;
    setLoading(true);
    setError(null);
    addLog(`Ingesting contract: ${contractPath}`);
    try {
      const result = await agentCoreClient.ingest({
        contract_path: contractPath,
        fork_url: forkUrl,
        target_address: targetAddress,
      });
      setSessionId(result.session_id);
      addLog(`Session created: ${result.session_id}`);
      addLog(`Findings: ${result.findings_count}, Exploits: ${result.exploit_count}`);

      // Load full results
      const [statusData, findingsData, proofsData] = await Promise.all([
        agentCoreClient.getStatus(result.session_id),
        agentCoreClient.getFindings(result.session_id),
        agentCoreClient.getExploitProofs(result.session_id),
      ]);
      setStatus(statusData);
      setFindings(findingsData.findings);
      setProofs(proofsData.proofs);
      addLog('Audit complete');
    } catch (e: any) {
      setError(e.message || 'Ingestion failed');
      addLog(`ERROR: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'text-accent-red';
      case 'HIGH': return 'text-accent-orange';
      case 'MEDIUM': return 'text-accent-amber';
      case 'LOW': return 'text-accent-blue';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel — Contract Input + Controls */}
      <div className="w-96 border-r border-border flex flex-col p-4 gap-4 overflow-y-auto">
        <h2 className="text-xs uppercase tracking-widest text-text-secondary">Target Contract</h2>
        <input
          type="text"
          placeholder="./src/Vault.sol or 0x address"
          value={contractPath}
          onChange={e => setContractPath(e.target.value)}
          className="w-full bg-surface border border-border px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-orange/50 transition-colors"
        />
        <input
          type="text"
          placeholder="Fork URL (default: http://localhost:8545)"
          value={forkUrl}
          onChange={e => setForkUrl(e.target.value)}
          className="w-full bg-surface border border-border px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-orange/50 transition-colors"
        />
        <input
          type="text"
          placeholder="Target address (optional)"
          value={targetAddress}
          onChange={e => setTargetAddress(e.target.value)}
          className="w-full bg-surface border border-border px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-orange/50 transition-colors"
        />

        <button
          onClick={handleIngest}
          disabled={loading || !contractPath}
          className="w-full bg-accent-orange/90 hover:bg-accent-orange disabled:opacity-30 disabled:cursor-not-allowed text-background font-bold py-2 text-sm uppercase tracking-wider transition-colors"
        >
          {loading ? 'INGESTING...' : 'INGEST & AUDIT'}
        </button>

        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 p-2 text-xs text-accent-red">
            {error}
          </div>
        )}

        {status && (
          <div className="space-y-2 text-xs">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary mt-4">Session</h2>
            <div className="bg-surface border border-border p-3 space-y-1">
              <div><span className="text-text-muted">ID:</span> <span className="text-text-primary font-mono">{status.session_id.slice(0, 12)}...</span></div>
              <div><span className="text-text-muted">Status:</span> <span className={`${status.status === 'complete' ? 'text-accent-green' : 'text-accent-amber'}`}>{status.status}</span></div>
              <div><span className="text-text-muted">Contract:</span> <span className="text-text-primary">{status.contract_name}</span></div>
              <div><span className="text-text-muted">Findings:</span> <span className="text-text-primary">{status.findings_count}</span></div>
              <div><span className="text-text-muted">Exploits:</span> <span className="text-text-primary">{status.exploit_count}</span></div>
              <div><span className="text-text-muted">Patch:</span> <span className={status.patch_validated ? 'text-accent-green' : 'text-text-secondary'}>{status.patch_validated ? 'VERIFIED' : 'PENDING'}</span></div>
            </div>
          </div>
        )}

        {sessionId && (
          <button
            onClick={async () => {
              try {
                const report = await agentCoreClient.exportReport(sessionId, 'markdown');
                const blob = new Blob([report as string], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gaolaif-report-${sessionId.slice(0, 8)}.md`;
                a.click();
                URL.revokeObjectURL(url);
                addLog('Report exported');
              } catch (e: any) {
                addLog(`ERROR: Export failed: ${e.message}`);
              }
            }}
            className="w-full border border-accent-orange/50 text-accent-orange hover:bg-accent-orange/10 py-2 text-sm uppercase tracking-wider transition-colors"
          >
            EXPORT REPORT (MD)
          </button>
        )}
      </div>

      {/* Center Panel — Findings */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {findings.length === 0 && !loading && (
            <div className="text-text-muted text-sm mt-8 text-center">
              Ingest a contract to begin analysis
            </div>
          )}
          {findings.map((f, i) => (
            <div key={i} className="border border-border p-3 mb-2 hover:border-accent-orange/20 transition-colors">
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-xs font-bold ${severityColor(f.severity)}`}>[{f.severity}]</span>
                <span className="text-sm text-text-primary">{f.title}</span>
                <span className="text-xs text-text-muted ml-auto">{f.category}</span>
              </div>
              <div className="text-xs text-text-secondary mb-1">{f.description.slice(0, 200)}</div>
              <div className="text-xs text-text-muted">{f.location}</div>
              {f.code_snippet && (
                <pre className="mt-2 p-2 bg-surface text-xs text-text-secondary overflow-x-auto border border-border">{f.code_snippet.slice(0, 300)}</pre>
              )}
            </div>
          ))}
        </div>

        {/* Exploit Proofs */}
        {proofs.length > 0 && (
          <div className="border-t border-border p-4 max-h-48 overflow-y-auto">
            <h3 className="text-xs uppercase tracking-widest text-text-secondary mb-2">Exploit Proofs</h3>
            {proofs.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-xs py-1">
                <span className={p.confirmed ? 'text-accent-green' : 'text-accent-red'}>
                  {p.confirmed ? '[CONFIRMED]' : '[UNCONFIRMED]'}
                </span>
                <span className="text-text-primary">{p.attack_vector}</span>
                <span className="text-text-muted">→ {p.estimated_impact}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel — Console Logs */}
      <div className="w-80 border-l border-border flex flex-col">
        <h3 className="text-xs uppercase tracking-widest text-text-secondary p-3 border-b border-border shrink-0">Console</h3>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
          {logs.length === 0 && (
            <span className="text-text-muted">Ready</span>
          )}
          {logs.map((log, i) => (
            <div key={i} className={`${log.includes('ERROR') ? 'text-accent-red' : 'text-text-secondary'}`}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Findings View ───────────────────────────

function FindingsView() {
  const [sessionId, setSessionId] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);

  const severityColor = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'text-accent-red';
      case 'HIGH': return 'text-accent-orange';
      case 'MEDIUM': return 'text-accent-amber';
      case 'LOW': return 'text-accent-blue';
      default: return 'text-text-secondary';
    }
  };

  const loadFindings = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await agentCoreClient.getFindings(sessionId);
      setFindings(data.findings);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const groupedBySeverity = {
    CRITICAL: findings.filter(f => f.severity === 'CRITICAL'),
    HIGH: findings.filter(f => f.severity === 'HIGH'),
    MEDIUM: findings.filter(f => f.severity === 'MEDIUM'),
    LOW: findings.filter(f => f.severity === 'LOW'),
    INFO: findings.filter(f => f.severity === 'INFO'),
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <h1 className="text-lg font-bold mb-4">Vulnerability Findings</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Session ID"
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          className="w-80 bg-surface border border-border px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-orange/50"
        />
        <button
          onClick={loadFindings}
          disabled={loading || !sessionId}
          className="bg-accent-orange/90 hover:bg-accent-orange disabled:opacity-30 text-background px-4 py-2 text-sm font-bold"
        >
          LOAD
        </button>
      </div>

      {Object.entries(groupedBySeverity).map(([sev, items]) =>
        items.length > 0 && (
          <div key={sev} className="mb-6">
            <h2 className={`text-sm uppercase tracking-widest mb-2 ${severityColor(sev)}`}>
              {sev} ({items.length})
            </h2>
            {items.map((f, i) => (
              <div key={i} className="border border-border p-3 mb-2">
                <div className="flex gap-3">
                  <span className={`text-xs font-bold ${severityColor(f.severity)} shrink-0 w-16`}>[{f.severity}]</span>
                  <div>
                    <div className="text-sm text-text-primary">{f.title}</div>
                    <div className="text-xs text-text-secondary">{f.description.slice(0, 300)}</div>
                    <div className="text-xs text-text-muted mt-1">{f.location}</div>
                    {f.code_snippet && (
                      <pre className="mt-2 p-2 bg-surface text-xs text-text-secondary overflow-x-auto border border-border">{f.code_snippet}</pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Settings View ───────────────────────────

function SettingsView() {
  const [ollamaModel, setOllamaModel] = useState('codellama:13b');
  const [forkUrl, setForkUrl] = useState('http://localhost:8545');
  const [chain, setChain] = useState('ethereum');

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto max-w-2xl">
      <h1 className="text-lg font-bold mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-text-secondary mb-3">Local Inference</h2>
        <div className="bg-surface border border-border p-4 space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Ollama Model</label>
            <select
              value={ollamaModel}
              onChange={e => setOllamaModel(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-orange/50"
            >
              <option value="codellama:13b">CodeLlama 13B</option>
              <option value="codellama:7b">CodeLlama 7B</option>
              <option value="deepseek-coder:6.7b">DeepSeek Coder 6.7B</option>
              <option value="deepseek-coder:1.3b">DeepSeek Coder 1.3B</option>
            </select>
          </div>
          <div className="text-xs text-text-secondary">
            <span className="text-text-muted">Endpoint:</span> http://localhost:11434
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-text-secondary mb-3">Blockchain Sandbox</h2>
        <div className="bg-surface border border-border p-4 space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Default Fork URL</label>
            <input
              type="text"
              value={forkUrl}
              onChange={e => setForkUrl(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-orange/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Chain</label>
            <select
              value={chain}
              onChange={e => setChain(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-orange/50"
            >
              <option value="ethereum">Ethereum (EVM)</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="polygon">Polygon</option>
              <option value="sui">Sui (Move)</option>
              <option value="aptos">Aptos (Move)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-widest text-text-secondary mb-3">Firewall</h2>
        <div className="bg-surface border border-border p-4 space-y-2 text-xs text-text-secondary">
          <div>✅ DLP Guard: Active</div>
          <div>✅ Prompt Sanitizer: Active</div>
          <div>❌ Virus Inspector: ClamAV not available (heuristic only)</div>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-text-secondary mb-3">Database</h2>
        <div className="bg-surface border border-border p-4 text-xs text-text-secondary space-y-1">
          <div><span className="text-text-muted">PostgreSQL:</span> localhost:5432/gaolaif</div>
          <div><span className="text-text-muted">DuckDB:</span> ~/.gaolaif/analytics.duckdb</div>
          <div><span className="text-text-muted">Redis:</span> localhost:6379</div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { agentCoreClient } from '@/lib/agentCoreClient';

interface HumanAttackProposal {
  description: string;
  targetFunction: string;
  attackerBehavior: string;
}

interface AttackValidationResult {
  proposal: HumanAttackProposal;
  confirmed: boolean;
  forge_output: string;
  ai_analysis: string;
}

interface Props {
  sessionId: string;
}

export function CreativeAttackSession({ sessionId }: Props) {
  const [proposals, setProposals] = useState<HumanAttackProposal[]>([]);
  const [results, setResults] = useState<AttackValidationResult[]>([]);
  const [currentProposal, setCurrentProposal] = useState<HumanAttackProposal>({
    description: '',
    targetFunction: '',
    attackerBehavior: '',
  });
  const [loading, setLoading] = useState(false);

  const submitProposal = async () => {
    setLoading(true);
    try {
      const result = await agentCoreClient.submitCreativeAttack(sessionId, currentProposal);
      setResults(prev => [...prev, result]);
      setProposals(prev => [...prev, currentProposal]);
      setCurrentProposal({ description: '', targetFunction: '', attackerBehavior: '' });
    } catch (e) {
      console.error('Creative attack failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-amber-500/30 rounded-lg p-6">
      <h2 className="text-amber-400 font-mono text-lg mb-2">
        Creative Attack Session
      </h2>
      <p className="text-text-secondary text-sm mb-6">
        The AI has found what it can find. Now think like a hacker it cannot imagine.
        Propose novel attack vectors &mdash; the AI will attempt each one via Forge.
      </p>

      <div className="space-y-3 mb-6">
        <textarea
          className="w-full bg-[#0a0a0a] border border-border text-text-primary font-mono text-sm p-3 rounded"
          placeholder="Describe your attack idea in plain English..."
          value={currentProposal.description}
          onChange={e => setCurrentProposal(p => ({ ...p, description: e.target.value }))}
          rows={3}
        />
        <input
          className="w-full bg-[#0a0a0a] border border-border text-text-primary font-mono text-sm p-3 rounded"
          placeholder="Target function name..."
          value={currentProposal.targetFunction}
          onChange={e => setCurrentProposal(p => ({ ...p, targetFunction: e.target.value }))}
        />
        <textarea
          className="w-full bg-[#0a0a0a] border border-border text-text-primary font-mono text-sm p-3 rounded"
          placeholder="Step-by-step attacker behavior: 1. Call X with Y. 2. Re-enter via Z..."
          value={currentProposal.attackerBehavior}
          onChange={e => setCurrentProposal(p => ({ ...p, attackerBehavior: e.target.value }))}
          rows={4}
        />
        <button
          onClick={submitProposal}
          disabled={loading || !currentProposal.description}
          className="bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Running Forge...' : 'Attempt This Attack'}
        </button>
      </div>

      {results.map((r, i) => (
        <div
          key={i}
          className={`border rounded p-4 mb-3 font-mono text-sm ${
            r.confirmed
              ? 'border-accent-red/50 bg-red-950/20'
              : 'border-accent-green/50 bg-green-950/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={r.confirmed ? 'text-accent-red' : 'text-accent-green'}>
              {r.confirmed ? 'CONFIRMED - NEW FINDING' : 'SAFE - Vector Refuted'}
            </span>
          </div>
          <p className="text-text-secondary text-xs">{r.proposal.description}</p>
          <details className="mt-2">
            <summary className="text-text-muted text-xs cursor-pointer hover:text-text-secondary">
              Forge output
            </summary>
            <pre className="text-text-muted text-xs mt-1 whitespace-pre-wrap">
              {r.forge_output.slice(0, 1000)}
            </pre>
          </details>
          {!r.confirmed && r.ai_analysis && (
            <p className="text-text-muted text-xs mt-2">
              AI analysis: {r.ai_analysis}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

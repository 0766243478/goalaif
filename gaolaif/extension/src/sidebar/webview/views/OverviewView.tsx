import { useStore } from '../store';
import { useMessageBus } from '../hooks/useMessageBus';
import { SeverityBadge } from '../components/SeverityBadge';
import { AuditProgressBar } from '../components/AuditProgressBar';
import { Icon } from '../components/Icon';

export default function OverviewView() {
  const { state, dispatch } = useStore();
  const { send } = useMessageBus();

  const critCount = state.findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = state.findings.filter(f => f.severity === 'HIGH').length;
  const medCount = state.findings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = state.findings.filter(f => f.severity === 'LOW').length;

  return (
    <div className="animate-fade-in">
      {state.protocol && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-lg)',
            background: 'var(--sireen-amber-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="brand" size={20} color="var(--sireen-amber)" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {state.protocol.name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>
              {state.protocol.totalContracts} contracts · {state.protocol.totalFunctions} functions
            </div>
          </div>
        </div>
      )}

      {!state.protocol && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
            SIREEN
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)', marginTop: 4 }}>
            Open a smart contract to begin analysis.
            Right-click a .sol file and select &quot;Audit with Gaolaif&quot;.
          </div>
        </div>
      )}

      <AuditProgressBar />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="findings" size={14} color="var(--sireen-text-muted)" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>Findings</div>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
            {state.findings.length}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {critCount > 0 && <SeverityBadge severity="CRITICAL" size="sm" />}
            {highCount > 0 && <SeverityBadge severity="HIGH" size="sm" />}
            {medCount > 0 && <SeverityBadge severity="MEDIUM" size="sm" />}
            {lowCount > 0 && <SeverityBadge severity="LOW" size="sm" />}
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="exploits" size={14} color="var(--sireen-text-muted)" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>Exploits</div>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
            {state.exploits.length}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)', marginTop: 4 }}>
            {state.exploits.filter(e => e.confirmed).length} confirmed
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="memory" size={14} color="var(--sireen-text-muted)" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>Memory</div>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--sireen-text-primary)' }}>
            {state.memoryEntries.length}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)', marginTop: 4 }}>
            patterns stored
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon name="gauge" size={14} color="var(--sireen-text-muted)" />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-muted)' }}>Risk Score</div>
          </div>
          <div style={{
            fontSize: 'var(--text-2xl)', fontWeight: 700,
            color: (state.protocol?.riskScore || 0) > 70 ? 'var(--sireen-critical)' :
                   (state.protocol?.riskScore || 0) > 40 ? 'var(--sireen-medium)' : 'var(--sireen-green)',
          }}>
            {state.protocol?.riskScore || '--'}/100
          </div>
        </div>
      </div>

      <div className="section-label">Actions</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className="btn-primary"
          onClick={() => {
            const code = state.contractCode || '';
            const filePath = state.contractFilePath || '';
            send('sireen.audit.request', { code, file_path: filePath });
          }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Icon name="scan" size={14} />
          Full Audit
        </button>
        <button
          className="btn-secondary"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'chat' })}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Icon name="chat" size={14} />
          Chat
        </button>
        <button
          className="btn-secondary"
          onClick={() => dispatch({ type: 'SET_VIEW', view: 'findings' })}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Icon name="findings" size={14} />
          Findings
        </button>
      </div>

      {state.suggestions.length > 0 && (
        <>
          <div className="section-label">Suggestions</div>
          {state.suggestions.slice(0, 3).map((s) => (
            <div
              key={s.id}
              className="card card-clickable animate-fade-in"
              style={{ padding: 10, marginBottom: 6 }}
              onClick={() => {
                if (s.actions?.[0]?.command === 'sireen.navigate') {
                  dispatch({ type: 'SET_VIEW', view: s.actions[0].args?.view as any });
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 700,
                  color: s.priority === 'urgent' ? 'var(--sireen-critical)' : 'var(--sireen-amber)',
                }}>
                  {s.type.toUpperCase()}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--sireen-text-secondary)' }}>
                {s.description}
              </div>
            </div>
          ))}
        </>
      )}

      {state.protocol?.attackSurfaces && state.protocol.attackSurfaces.length > 0 && (
        <>
          <div className="section-label">Attack Surfaces</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {state.protocol.attackSurfaces.map((surface) => (
              <span key={surface} className="badge badge-ghost">{surface}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

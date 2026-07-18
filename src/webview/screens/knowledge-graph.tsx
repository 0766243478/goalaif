import { createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js'
import { render } from 'solid-js/web'
import { Button } from '../components/Button'
import { Panel } from '../components/Card'
import { Badge } from '../components/Badge'
import { IconShield, IconGraph, IconServer, IconBug, IconTarget, IconExternalLink, IconMaximize, IconMinimize, IconSearch, IconRefreshCw, IconFilter, IconPlus, IconEye, IconAlert, IconCheck, IconClock, IconZap, IconFileCode, IconLink, IconArrowRight, IconDownload, IconSettings, IconHistory } from '../design-system/icons'
import { injectGlobalStyles } from '../design-system/styles'
import { postMessage } from '../providers/vscode-api'

interface GraphNode {
  id: string
  label: string
  type: 'contract' | 'function' | 'vulnerability' | 'variable' | 'event' | 'modifier'
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
  metadata?: Record<string, unknown>
}

interface GraphEdge {
  from: string
  to: string
  type: 'calls' | 'reads' | 'writes' | 'emits' | 'modifies' | 'inherits'
}

interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  target: string
  chain: string
}

const SAMPLE_GRAPH: GraphData = {
  target: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  chain: 'Ethereum Mainnet',
  nodes: [
    { id: 'vault', label: 'VaultContract', type: 'contract' },
    { id: 'deposit', label: 'deposit()', type: 'function', metadata: { visibility: 'external', payable: true } },
    { id: 'withdraw', label: 'withdraw()', type: 'function', severity: 'critical', metadata: { visibility: 'external' } },
    { id: 'balanceOf', label: 'balanceOf()', type: 'function', metadata: { visibility: 'external', view: true } },
    { id: 'emergencyWithdraw', label: 'emergencyWithdraw()', type: 'function', severity: 'high', metadata: { visibility: 'external', onlyOwner: true } },
    { id: 'balances', label: 'balances', type: 'variable', metadata: { type: 'mapping(address => uint256)' } },
    { id: 'owner', label: 'owner', type: 'variable', metadata: { type: 'address' } },
    { id: 'Deposit', label: 'Deposit', type: 'event' },
    { id: 'Withdraw', label: 'Withdraw', type: 'event' },
    { id: 'Reentrancy', label: 'Reentrancy Vulnerability', type: 'vulnerability', severity: 'critical' },
    { id: 'UncheckedCall', label: 'Unchecked External Call', type: 'vulnerability', severity: 'high' },
    { id: 'PriceOracle', label: 'Centralized Price Oracle', type: 'vulnerability', severity: 'medium' },
    { id: 'noEvents', label: 'Missing Events', type: 'vulnerability', severity: 'medium' },
    { id: 'onlyOwner', label: 'onlyOwner', type: 'modifier' },
    { id: 'ReentrancyGuard', label: 'ReentrancyGuard', type: 'modifier' },
  ],
  edges: [
    { from: 'vault', to: 'deposit', type: 'calls' },
    { from: 'vault', to: 'withdraw', type: 'calls' },
    { from: 'vault', to: 'balanceOf', type: 'calls' },
    { from: 'vault', to: 'emergencyWithdraw', type: 'calls' },
    { from: 'vault', to: 'balances', type: 'writes' },
    { from: 'vault', to: 'owner', type: 'writes' },
    { from: 'deposit', to: 'balances', type: 'writes' },
    { from: 'deposit', to: 'Deposit', type: 'emits' },
    { from: 'withdraw', to: 'balances', type: 'reads' },
    { from: 'withdraw', to: 'balances', type: 'writes' },
    { from: 'withdraw', to: 'Withdraw', type: 'emits' },
    { from: 'withdraw', to: 'Reentrancy', type: 'calls' },
    { from: 'withdraw', to: 'UncheckedCall', type: 'calls' },
    { from: 'emergencyWithdraw', to: 'owner', type: 'reads' },
    { from: 'emergencyWithdraw', to: 'onlyOwner', type: 'modifies' },
    { from: 'deposit', to: 'ReentrancyGuard', type: 'modifies' },
    { from: 'withdraw', to: 'ReentrancyGuard', type: 'modifies' },
    { from: 'PriceOracle', to: 'vault', type: 'calls' },
    { from: 'noEvents', to: 'vault', type: 'calls' },
  ],
}

const NODE_TYPE_CONFIG: Record<GraphNode['type'], { icon: any; color: string; label: string }> = {
  contract: { icon: IconServer, color: 'var(--vscode-textLink-foreground)', label: 'Contract' },
  function: { icon: IconGraph, color: 'var(--vscode-button-background)', label: 'Function' },
  vulnerability: { icon: IconBug, color: 'var(--vscode-testing-iconFailed)', label: 'Vulnerability' },
  variable: { icon: IconTarget, color: 'var(--vscode-testing-iconQueued)', label: 'Variable' },
  event: { icon: IconZap, color: '#8b5cf6', label: 'Event' },
  modifier: { icon: IconFileCode, color: 'var(--vscode-testing-iconPassed)', label: 'Modifier' },
}

const EDGE_TYPE_CONFIG: Record<GraphEdge['type'], { label: string; color: string }> = {
  calls: { label: 'Calls', color: 'var(--vscode-textLink-foreground)' },
  reads: { label: 'Reads', color: 'var(--vscode-testing-iconPassed)' },
  writes: { label: 'Writes', color: 'var(--vscode-testing-iconFailed)' },
  emits: { label: 'Emits', color: '#8b5cf6' },
  modifies: { label: 'Modifies', color: 'var(--vscode-testing-iconQueued)' },
  inherits: { label: 'Inherits', color: 'var(--vscode-descriptionForeground)' },
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--vscode-testing-iconFailed)',
  high: 'var(--vscode-testing-iconErrored)',
  medium: 'var(--vscode-testing-iconQueued)',
  low: 'var(--vscode-testing-iconPassed)',
  info: 'var(--vscode-descriptionForeground)',
}

function KnowledgeGraph() {
  injectGlobalStyles()

  const [graph] = createSignal<GraphData>(SAMPLE_GRAPH)
  const [selectedNodeId, setSelectedNodeId] = createSignal<string | null>(null)
  const [filterType, setFilterType] = createSignal<'all' | GraphNode['type']>('all')
  const [layout, setLayout] = createSignal<'force' | 'hierarchical' | 'circular'>('force')
  const [searchQuery, setSearchQuery] = createSignal('')

  // Canvas state
  const [nodePositions, setNodePositions] = createSignal<Record<string, { x: number; y: number }>>({})
  const [pan, setPan] = createSignal({ x: 0, y: 0 })
  const [zoom, setZoom] = createSignal(1)

  // Initialize positions with simple force-directed layout
  onMount(() => {
    const nodes = graph().nodes
    const positions: Record<string, { x: number; y: number }> = {}
    const centerX = 400
    const centerY = 300
    const radius = 200

    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2
      positions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      }
    })
    setNodePositions(positions)
  })

  const filteredNodes = createMemo(() => {
    const query = searchQuery().toLowerCase()
    const type = filterType()
    return graph().nodes.filter(n =>
      (type === 'all' || n.type === type) &&
      (n.label.toLowerCase().includes(query) || n.id.toLowerCase().includes(query))
    )
  })

  const filteredEdges = createMemo(() => {
    const nodeIds = new Set(filteredNodes().map(n => n.id))
    return graph().edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
  })

  const selectedNode = createMemo(() => graph().nodes.find(n => n.id === selectedNodeId()))

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(prev => prev === id ? null : id)
  }

  const handleBackgroundClick = () => setSelectedNodeId(null)

  const handleExport = () => {
    postMessage({ type: 'graph:export', payload: { format: 'json' } })
  }

  const handleRunAnalysis = () => {
    postMessage({ type: 'graph:analyze', payload: { target: graph().target } })
  }

  // SVG path for edge
  const getEdgePath = (edge: GraphEdge) => {
    const from = nodePositions()[edge.from]
    const to = nodePositions()[edge.to]
    if (!from || !to) return ''
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const ratio = dist ? 1 - 15 / dist : 0
    const startX = from.x + dx * (1 - ratio)
    const startY = from.y + dy * (1 - ratio)
    const endX = to.x - dx * (1 - ratio)
    const endY = to.y - dy * (1 - ratio)
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const angle = Math.atan2(dy, dx)
    const arrowSize = 8
    const arrowX = endX - Math.cos(angle) * arrowSize
    const arrowY = endY - Math.sin(angle) * arrowSize

    return `M ${startX} ${startY} Q ${midX} ${midY} ${arrowX} ${arrowY}`
  }

  return (
    <div style={{
      display: 'flex', 'flex-direction': 'column', height: '100%',
      background: 'var(--vscode-editor-background)', color: 'var(--vscode-editor-foreground)',
      'font-family': 'var(--vscode-font-family)',
      'font-size': 'var(--vscode-font-size)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', 'align-items': 'center', 'justify-content': 'space-between',
        padding: '8px 12px',
        'border-bottom': '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-panel-background)',
      }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <IconGraph size={16} />
          <div>
            <span style={{ 'font-weight': 600 }}>Knowledge Graph</span>
            <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
              {graph().target.slice(0, 10)}...{graph().target.slice(-6)} · {graph().chain}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="secondary" size="sm" icon={<IconRefreshCw size={12} />} onClick={handleRunAnalysis}>Analyze</Button>
          <Button variant="secondary" size="sm" icon={<IconDownload size={12} />} onClick={handleExport}>Export</Button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', 'align-items': 'center', gap: '8px',
        padding: '6px 12px',
        'border-bottom': '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-panel-background)',
      }}>
        <div style={{ flex: 1, 'max-width': 300 }}>
          <input
            type="search"
            placeholder="Search nodes..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '4px 8px', 'font-size': '11px',
              background: 'var(--vscode-input-background)', border: '1px solid var(--vscode-input-border)',
              'border-radius': '2px', color: 'var(--vscode-input-foreground)', outline: 'none',
            }}
          />
        </div>
        <select
          value={filterType()}
          onChange={(e) => setFilterType(e.target.value as any)}
          style={{
            padding: '4px 8px', 'font-size': '11px',
            background: 'var(--vscode-dropdown-background)', border: '1px solid var(--vscode-dropdown-border)',
            'border-radius': '2px', color: 'var(--vscode-dropdown-foreground)', outline: 'none',
          }}
        >
          <option value="all">All Types</option>
          <option value="contract">Contract</option>
          <option value="function">Functions</option>
          <option value="vulnerability">Vulnerabilities</option>
          <option value="variable">Variables</option>
          <option value="event">Events</option>
          <option value="modifier">Modifiers</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
          <Button variant="ghost" size="sm" onClick={() => setLayout('force')} style={{ display: layout() === 'force' ? 'none' : 'flex' }}>Force</Button>
          <Button variant="ghost" size="sm" onClick={() => setLayout('hierarchical')} style={{ display: layout() === 'hierarchical' ? 'none' : 'flex' }}>Hierarchical</Button>
          <Button variant="ghost" size="sm" onClick={() => setLayout('circular')} style={{ display: layout() === 'circular' ? 'none' : 'flex' }}>Circular</Button>
        </div>
        <div style={{ marginLeft: '8px', paddingLeft: '8px', 'border-left': '1px solid var(--vscode-panel-border)', display: 'flex', 'align-items': 'center', gap: '12px', 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
          <span>Nodes: {filteredNodes().length}</span>
          <span>Edges: {filteredEdges().length}</span>
          <span style={{ color: 'var(--vscode-button-background)' }}>Zoom: {Math.round(zoom() * 100)}%</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          background: 'var(--vscode-editor-background)',
        }}
        onClick={handleBackgroundClick}
      >
        <svg
          style={{
            width: '100%', height: '100%',
            transform: `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Edges */}
          <g style={{ strokeWidth: 1.5, fill: 'none', opacity: 0.6 }}>
            <For each={filteredEdges()}>
              {(edge) => (
                <path
                  d={getEdgePath(edge)}
                  stroke={EDGE_TYPE_CONFIG[edge.type].color}
                  style={{ markerEnd: 'url(#arrowhead)' }}
                />
              )}
            </For>
            {/* Arrowhead marker */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--vscode-descriptionForeground)" />
              </marker>
            </defs>
          </g>

          {/* Nodes */}
          <g>
            <For each={filteredNodes()}>
              {(node) => {
                const pos = nodePositions()[node.id]
                if (!pos) return null
                const isSelected = selectedNodeId() === node.id
                const cfg = NODE_TYPE_CONFIG[node.type]
                const severityColor = node.severity ? SEVERITY_COLOR[node.severity] : cfg.color

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id) }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Node circle */}
                    <circle
                      r={isSelected ? 20 : 16}
                      fill="var(--vscode-editor-background)"
                      stroke={severityColor}
                      strokeWidth={isSelected ? 3 : 2}
                      style={{ filter: isSelected ? 'drop-shadow(0 0 4px ' + severityColor + ')' : 'none' }}
                    />
                    {/* Icon */}
                    <text
                      x="0" y="4"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="'codicon'"
                      fontSize={isSelected ? 14 : 11}
                      fill={severityColor}
                    >
                      {cfg.icon({ size: isSelected ? 14 : 11 } as any).props?.children}
                    </text>
                    {/* Label */}
                    <text
                      x="0" y={isSelected ? -28 : -24}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={isSelected ? 11 : 10}
                      fill="var(--vscode-editor-foreground)"
                      style={{ fontWeight: isSelected ? 600 : 400, pointerEvents: 'none' }}
                    >
                      {node.label}
                    </text>
                    {/* Severity badge */}
                    {node.severity && (
                      <text
                        x="0" y={isSelected ? 32 : 28}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={9}
                        fill={severityColor}
                        style={{ fontWeight: 600, textTransform: 'uppercase', pointerEvents: 'none' }}
                      >
                        {node.severity}
                      </text>
                    )}
                  </g>
                )
              }}
            </For>
          </g>
        </svg>

        {/* Pan/Zoom Controls */}
        <div style={{
          position: 'absolute', bottom: '12px', right: '12px',
          display: 'flex', 'flex-direction': 'column', gap: '4px',
        }}>
          <Button variant="ghost" size="sm" icon={<IconPlus size={12} />} onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Zoom In" />
          <Button variant="ghost" size="sm" icon={<IconMinimize size={12} />} onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} title="Zoom Out" />
          <Button variant="ghost" size="sm" icon={<IconMaximize size={12} />} onClick={() => setZoom(1)} title="Reset Zoom" />
        </div>
      </div>

      {/* Detail Panel */}
      <Show when={selectedNode()}>
        {() => {
          const node = selectedNode()!
          const cfg = NODE_TYPE_CONFIG[node.type]
          const severityColor = node.severity ? SEVERITY_COLOR[node.severity] : cfg.color

          return (
            <div style={{
              position: 'absolute', right: '0', top: '48px', bottom: '0', width: 300,
              background: 'var(--vscode-sideBar-background)',
              'border-left': '1px solid var(--vscode-sideBar-border)',
              display: 'flex', 'flex-direction': 'column',
              overflow: 'auto',
            }}>
              <div style={{
                padding: '10px 12px',
                'border-bottom': '1px solid var(--vscode-sideBar-border)',
                display: 'flex', 'align-items': 'center', 'justify-content': 'space-between',
              }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, 'border-radius': '50%', background: severityColor }} />
                  <span style={{ 'font-weight': 600 }}>{node.label}</span>
                </div>
                <button onClick={() => setSelectedNodeId(null)} style={{ background: 'none', border: 'none', color: 'var(--vscode-descriptionForeground)', cursor: 'pointer' }}>
                  <IconArrowRight size={12} />
                </button>
              </div>
              <div style={{ padding: '12px', flex: 1, overflow: 'auto' }}>
                <div style={{ marginBottom: '12px', display: 'flex', 'align-items': 'center', gap: '8px' }}>
                  <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>Type:</span>
                  <Badge variant="default" size="sm">{cfg.label}</Badge>
                </div>
                {node.severity && (
                  <div style={{ marginBottom: '12px', display: 'flex', 'align-items': 'center', gap: '8px' }}>
                    <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>Severity:</span>
                    <Badge variant={severityBadgeVariant(node.severity)} size="sm">{node.severity.toUpperCase()}</Badge>
                  </div>
                )}
                {node.metadata && Object.keys(node.metadata).length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ 'font-size': '10px', 'font-weight': 600, margin: '0 0 6px 0', color: 'var(--vscode-descriptionForeground)' }}>Metadata</h4>
                    <For each={Object.entries(node.metadata)}>
                      {([key, value]) => (
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '10px', padding: '3px 0', 'border-bottom': '1px solid var(--vscode-panel-border)' }}>
                          <span style={{ color: 'var(--vscode-descriptionForeground)' }}>{key}</span>
                          <span style={{ 'font-family': 'var(--vscode-editor-font-family)', 'word-break': 'break-all' }}>{String(value)}</span>
                        </div>
                      )}
                    </For>
                  </div>
                )}
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px', marginTop: 'auto' }}>
                  <Button variant="secondary" size="sm" onClick={() => postMessage({ type: 'graph:focusNode', payload: { id: node.id } })}>Focus</Button>
                  <Button variant="ghost" size="sm" onClick={() => postMessage({ type: 'graph:openNode', payload: { id: node.id } })}>Open in Editor</Button>
                </div>
              </div>
            </div>
          )
        }}
      </Show>

      {/* Empty state */}
      <Show when={filteredNodes().length === 0}>
        {() => (
          <div style={{
            flex: 1, display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center',
            color: 'var(--vscode-descriptionForeground)', padding: '24px', 'text-align': 'center',
          }}>
            <IconSearch style={{ width: 48, height: 48, marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No nodes match your filter</p>
          </div>
        )}
      </Show>
    </div>
  )
}

function severityBadgeVariant(s: 'critical' | 'high' | 'medium' | 'low' | 'info') {
  switch (s) {
    case 'critical': return 'danger' as const
    case 'high': return 'warning' as const
    case 'medium': return 'warning' as const
    case 'low': return 'success' as const
    default: return 'info' as const
  }
}

const root = document.getElementById('root');
if (root) { render(() => <KnowledgeGraph />, root); }
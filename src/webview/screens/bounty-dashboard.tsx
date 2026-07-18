import { createSignal, createMemo, Show, For, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Button } from '../components/Button'
import { Panel } from '../components/Card'
import { Badge } from '../components/Badge'
import { Input } from '../components/Input'
import { IconShield, IconTarget, IconClock, IconAlert, IconCheck, IconX, IconDollar, IconArrowRight, IconExternalLink, IconFilter, IconRefreshCw, IconDownload, IconPlus, IconHistory, IconEye, IconStar, IconGlobe, IconMail, IconBell, IconSettings, IconFileCode, IconGraph, IconServer, IconBug, IconZap, IconSearch } from '../design-system/icons'
import { injectGlobalStyles } from '../design-system/styles'
import { postMessage } from '../providers/vscode-api'

interface BountyProgram {
  id: string
  name: string
  platform: 'immunefi' | 'hackenproof' | 'code4rena' | 'sherlock' | 'cantina' | 'custom'
  status: 'active' | 'upcoming' | 'paused' | 'ended'
  maxReward: string
  chain: string
  scope: string[]
  languages: string[]
  deadline?: string
  url: string
  tags: string[]
  description: string
}

interface Submission {
  id: string
  programId: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'submitted' | 'triaged' | 'accepted' | 'rejected' | 'paid'
  submittedAt: string
  reward?: string
  txHash?: string
}

const PLATFORM_CONFIG = {
  immunefi: { color: 'var(--vscode-testing-iconFailed)', label: 'Immunefi', icon: IconBug },
  hackenproof: { color: '#8b5cf6', label: 'HackenProof', icon: IconShield },
  code4rena: { color: 'var(--vscode-testing-iconQueued)', label: 'Code4rena', icon: IconGraph },
  sherlock: { color: '#10b981', label: 'Sherlock', icon: IconTarget },
  cantina: { color: '#f59e0b', label: 'Cantina', icon: IconZap },
  custom: { color: 'var(--vscode-descriptionForeground)', label: 'Custom', icon: IconFileCode },
}

const PROGRAMS: BountyProgram[] = [
  {
    id: 'immunefi-aave',
    name: 'Aave V3',
    platform: 'immunefi',
    status: 'active',
    maxReward: '$250,000',
    chain: 'Ethereum',
    scope: ['AaveV3Pool', 'AaveV3Core', 'AaveV3InterestRate'],
    languages: ['Solidity'],
    deadline: '2026-12-31',
    url: 'https://immunefi.com/bounty/aave/',
    tags: ['defi', 'lending', 'high-value'],
    description: 'Aave V3 protocol bug bounty. Focus on liquidation logic, interest rate models, and flash loan integrations.',
  },
  {
    id: 'immunefi-uniswap',
    name: 'Uniswap V4',
    platform: 'immunefi',
    status: 'active',
    maxReward: '$500,000',
    chain: 'Ethereum',
    scope: ['PoolManager', 'Hooks', 'ERC6909'],
    languages: ['Solidity'],
    deadline: '2026-11-15',
    url: 'https://immunefi.com/bounty/uniswapv4/',
    tags: ['dex', 'hooks', 'concentrated-liquidity'],
    description: 'Uniswap V4 with hooks architecture. Novel attack surface around custom pool logic.',
  },
  {
    id: 'code4rena-eigenlayer',
    name: 'EigenLayer',
    platform: 'code4rena',
    status: 'active',
    maxReward: '$100,000',
    chain: 'Ethereum',
    scope: ['StrategyManager', 'DelegationManager', 'RewardsCoordinator'],
    languages: ['Solidity'],
    deadline: '2026-10-20',
    url: 'https://code4rena.com/contests/eigenlayer',
    tags: ['restaking', 'middleware', 'new-protocol'],
    description: 'EigenLayer restaking protocol audit competition. Focus on slashing conditions and delegation logic.',
  },
  {
    id: 'sherlock-pendle',
    name: 'Pendle Finance',
    platform: 'sherlock',
    status: 'active',
    maxReward: '$75,000',
    chain: 'Ethereum',
    scope: ['PendleV2', 'SY', 'PT', 'YT'],
    languages: ['Solidity'],
    deadline: '2026-09-30',
    url: 'https://audits.sherlock.xyz/contests/pendle',
    tags: ['yield', 'tokenization', 'fixed-income'],
    description: 'Pendle V2 yield tokenization. Look for precision loss, rounding errors, and oracle dependencies.',
  },
  {
    id: 'hackenproof-gmx',
    name: 'GMX V2',
    platform: 'hackenproof',
    status: 'upcoming',
    maxReward: '$200,000',
    chain: 'Arbitrum',
    scope: ['GMXV2', 'GLP', 'OrderBook'],
    languages: ['Solidity'],
    deadline: '2026-11-01',
    url: 'https://hackenproof.com/gmx',
    tags: ['perp-dex', 'oracle', 'leverage'],
    description: 'GMX V2 perpetual DEX. Oracle manipulation and position management logic are key areas.',
  },
  {
    id: 'custom-private',
    name: 'Private Program: Protocol X',
    platform: 'custom',
    status: 'active',
    maxReward: '$50,000',
    chain: 'Base',
    scope: ['CoreRouter', 'Vault', 'Strategy'],
    languages: ['Solidity'],
    url: '#',
    tags: ['private', 'invite-only', 'l2'],
    description: 'Invite-only private program. Contact for access.',
  },
]

const SUBMISSIONS: Submission[] = [
  { id: 'sub-1', programId: 'immunefi-aave', title: 'Incorrect Liquidation Threshold Calculation', severity: 'high', status: 'accepted', submittedAt: '2026-06-15', reward: '$45,000', txHash: '0xabc...def' },
  { id: 'sub-2', programId: 'code4rena-eigenlayer', title: 'Slashing Condition Bypass', severity: 'critical', status: 'triaged', submittedAt: '2026-07-01', reward: 'Pending' },
  { id: 'sub-3', programId: 'sherlock-pendle', title: 'YT Token Precision Loss on Redeem', severity: 'medium', status: 'rejected', submittedAt: '2026-06-28' },
  { id: 'sub-4', programId: 'immunefi-uniswap', title: 'Hook Reentrancy in beforeSwap', severity: 'high', status: 'submitted', submittedAt: '2026-07-10' },
  { id: 'sub-5', programId: 'hackenproof-gmx', title: 'Oracle Staleness Check Bypass', severity: 'medium', status: 'paid', submittedAt: '2026-05-20', reward: '$12,500', txHash: '0x123...456' },
]

const SEVERITY_CONFIG = {
  critical: { color: 'var(--vscode-testing-iconFailed)', label: 'Critical' },
  high: { color: 'var(--vscode-testing-iconErrored)', label: 'High' },
  medium: { color: 'var(--vscode-testing-iconQueued)', label: 'Medium' },
  low: { color: 'var(--vscode-testing-iconPassed)', label: 'Low' },
}

const STATUS_CONFIG = {
  active: { color: 'var(--vscode-testing-iconPassed)', label: 'Active' },
  upcoming: { color: 'var(--vscode-testing-iconQueued)', label: 'Upcoming' },
  paused: { color: '#f59e0b', label: 'Paused' },
  ended: { color: 'var(--vscode-descriptionForeground)', label: 'Ended' },
}

function severityBadge(s: Submission['severity']) {
  switch (s) { case 'critical': return 'danger' as const; case 'high': return 'warning' as const; case 'medium': return 'warning' as const; default: return 'success' as const; }
}

function statusBadge(s: Submission['status']) {
  switch (s) { case 'accepted': return 'success' as const; case 'rejected': return 'danger' as const; case 'paid': return 'info' as const; case 'triaged': return 'info' as const; default: return 'default' as const; }
}

function BountyDashboard() {
  injectGlobalStyles()

  const [programs] = createSignal<BountyProgram[]>(PROGRAMS)
  const [submissions] = createSignal<Submission[]>(SUBMISSIONS)
  const [filterPlatform, setFilterPlatform] = createSignal<'all' | BountyProgram['platform']>('all')
  const [filterStatus, setFilterStatus] = createSignal<'all' | BountyProgram['status']>('all')
  const [searchQuery, setSearchQuery] = createSignal('')
  const [tab, setTab] = createSignal<'programs' | 'submissions' | 'stats'>('programs')
  const [selectedProgram, setSelectedProgram] = createSignal<BountyProgram | null>(null)

  const filteredPrograms = createMemo(() =>
    programs().filter(p =>
      (filterPlatform() === 'all' || p.platform === filterPlatform()) &&
      (filterStatus() === 'all' || p.status === filterStatus()) &&
      (p.name.toLowerCase().includes(searchQuery().toLowerCase()) ||
       p.chain.toLowerCase().includes(searchQuery().toLowerCase()) ||
       p.scope.some(s => s.toLowerCase().includes(searchQuery().toLowerCase())) ||
       p.tags.some(t => t.toLowerCase().includes(searchQuery().toLowerCase())))
    )
  )

  const platformStats = createMemo(() => {
    const stats: Record<string, { count: number; totalMax: number }> = {}
    programs().forEach(p => {
      const cfg = PLATFORM_CONFIG[p.platform]
      const max = parseInt(p.maxReward.replace(/[^0-9]/g, ''))
      if (!stats[p.platform]) stats[p.platform] = { count: 0, totalMax: 0 }
      stats[p.platform].count++
      stats[p.platform].totalMax += max
    })
    return stats
  })

  const handleOpenProgram = (p: BountyProgram) => {
    setSelectedProgram(p)
    postMessage({ type: 'bounty:open', payload: { url: p.url } })
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
          <IconTarget size={16} style={{ color: 'var(--vscode-button-background)' }} />
          <div>
            <span style={{ 'font-weight': 600 }}>Bounty Dashboard</span>
            <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
              {programs().length} programs · {Object.values(platformStats()).reduce((a, b) => a + b.count, 0)} platforms
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={<IconRefreshCw size={12} />} onClick={() => postMessage({ type: 'bounty:refresh' })}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '1px',
        padding: '4px 8px',
        'border-bottom': '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-panel-background)',
      }}>
        <For each={['programs', 'submissions', 'stats']}>
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
            placeholder="Search programs..."
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
          value={filterPlatform()}
          onChange={(e) => setFilterPlatform(e.target.value as any)}
          style={{ padding: '4px 8px', 'font-size': '11px', background: 'var(--vscode-dropdown-background)', border: '1px solid var(--vscode-dropdown-border)', 'border-radius': '2px', color: 'var(--vscode-dropdown-foreground)', outline: 'none' }}
        >
          <option value="all">All Platforms</option>
          <option value="immunefi">Immunefi</option>
          <option value="code4rena">Code4rena</option>
          <option value="sherlock">Sherlock</option>
          <option value="hackenproof">HackenProof</option>
          <option value="cantina">Cantina</option>
          <option value="custom">Custom</option>
        </select>
        <select
          value={filterStatus()}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          style={{ padding: '4px 8px', 'font-size': '11px', background: 'var(--vscode-dropdown-background)', border: '1px solid var(--vscode-dropdown-border)', 'border-radius': '2px', color: 'var(--vscode-dropdown-foreground)', outline: 'none' }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="paused">Paused</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Show when={tab() === 'programs'}>
          {() => (
            <div style={{ padding: '12px', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <For each={filteredPrograms()}>
                {(p) => {
                  const pcfg = PLATFORM_CONFIG[p.platform]
                  const scfg = STATUS_CONFIG[p.status]
                  const Icon = pcfg.icon

                  return (
                    <Panel
                      variant="bordered"
                      padding="md"
                      onClick={() => handleOpenProgram(p)}
                      style={{ cursor: 'pointer', transition: 'border-color 120ms', borderColor: selectedProgram()?.id === p.id ? pcfg.color : undefined }}
                    >
                      <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '12px' }}>
                        <div style={{ width: 4, height: '100%', 'border-radius': '2px', background: pcfg.color, 'flex-shrink': 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, 'min-width': 0 }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px', 'flex-wrap': 'wrap' }}>
                            <Icon style={{ width: 14, height: 14, color: pcfg.color, 'flex-shrink': 0 }} />
                            <span style={{ 'font-weight': 600 }}>{p.name}</span>
                            <Badge variant="default" size="sm" style={{ background: pcfg.color, color: 'var(--vscode-editor-background)' }}>
                              {pcfg.label}
                            </Badge>
                            <Badge variant={p.status === 'active' ? 'success' : p.status === 'upcoming' ? 'info' : p.status === 'paused' ? 'warning' : 'default'} size="sm">
                              {scfg.label}
                            </Badge>
                            <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginLeft: 'auto', display: 'flex', 'align-items': 'center', gap: '4px' }}>
                              <IconDollar size={11} /> {p.maxReward}
                            </span>
                          </div>
                          <p style={{ margin: 0, 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5, 'margin-bottom': '8px' }}>
                            {p.description}
                          </p>
                          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '6px', 'margin-bottom': '8px', 'font-size': '10px' }}>
                            <span style={{ display: 'flex', 'align-items': 'center', gap: '3px', color: 'var(--vscode-descriptionForeground)' }}>
                              <IconGlobe size={11} /> {p.chain}
                            </span>
                            <span style={{ display: 'flex', 'align-items': 'center', gap: '3px', color: 'var(--vscode-descriptionForeground)' }}>
                              <IconClock size={11} /> {p.deadline || 'No deadline'}
                            </span>
                            {p.scope.slice(0, 3).map(s => (
                              <span key={s} style={{ padding: '1px 6px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', color: 'var(--vscode-descriptionForeground)' }}>
                                {s}
                              </span>
                            ))}
                            {p.scope.length > 3 && <span style={{ color: 'var(--vscode-descriptionForeground)' }}>+{p.scope.length - 3} more</span>}
                          </div>
                          <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '4px' }}>
                            {p.tags.map(tag => (
                              <span key={tag} style={{ 'font-size': '9px', padding: '1px 6px', background: 'var(--vscode-textBlockQuote-background)', 'border-radius': '2px', color: 'var(--vscode-descriptionForeground)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px', 'align-items': 'flex-end' }}>
                          <Button variant="primary" size="sm" icon={<IconArrowRight size={12} />} onClick={(e) => { e.stopPropagation(); handleOpenProgram(p) }}>
                            View
                          </Button>
                        </div>
                      </div>
                    </Panel>
                  )
                }}
              </For>
              {filteredPrograms().length === 0 && (
                <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--vscode-descriptionForeground)' }}>
                  <IconSearch style={{ width: 32, height: 32, marginBottom: '8px', opacity: 0.3 }} />
                  <p>No programs match your filter</p>
                </div>
              )}
            </div>
          )}
        </Show>

        <Show when={tab() === 'submissions'}>
          {() => (
            <div style={{ padding: '12px', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <For each={submissions().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())}>
                {(sub) => {
                  const program = programs().find(p => p.id === sub.programId)
                  const pcfg = program ? PLATFORM_CONFIG[program.platform] : { color: 'var(--vscode-descriptionForeground)', label: 'Unknown', icon: IconFileCode }

                  return (
                    <Panel variant="bordered" padding="md">
                      <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '12px' }}>
                        <div style={{ width: 4, height: '100%', 'border-radius': '2px', background: SEVERITY_CONFIG[sub.severity].color, 'flex-shrink': 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, 'min-width': 0 }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px', 'flex-wrap': 'wrap' }}>
                            <span style={{ 'font-weight': 600 }}>{sub.title}</span>
                            <Badge variant={severityBadge(sub.severity)} size="sm">{SEVERITY_CONFIG[sub.severity].label}</Badge>
                            <Badge variant={statusBadge(sub.status)} size="sm">{sub.status}</Badge>
                            {program && (
                              <Badge variant="default" size="sm" style={{ background: pcfg.color, color: 'var(--vscode-editor-background)' }}>
                                {pcfg.label}
                              </Badge>
                            )}
                            <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', marginLeft: 'auto' }}>
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {sub.reward && (
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
                              <span style={{ display: 'flex', 'align-items': 'center', gap: '3px' }}>
                                <IconDollar size={11} /> Reward: {sub.reward}
                              </span>
                              {sub.txHash && (
                                <span style={{ display: 'flex', 'align-items': 'center', gap: '3px', 'font-family': 'var(--vscode-editor-font-family)' }}>
                                  <IconExternalLink size={11} /> {sub.txHash}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                          <Button variant="ghost" size="sm" onClick={() => postMessage({ type: 'bounty:viewSubmission', payload: { id: sub.id } })}>
                            <IconEye size={12} /> Details
                          </Button>
                        </div>
                      </div>
                    </Panel>
                  )
                }}
              </For>
              {submissions().length === 0 && (
                <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--vscode-descriptionForeground)' }}>
                  <IconHistory style={{ width: 32, height: 32, marginBottom: '8px', opacity: 0.3 }} />
                  <p>No submissions yet</p>
                </div>
              )}
            </div>
          )}
        </Show>

        <Show when={tab() === 'stats'}>
          {() => (
            <div style={{ padding: '16px', display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <Panel variant="bordered" padding="md" style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '28px', 'font-weight': 700, color: 'var(--vscode-button-background)' }}>{programs().length}</div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>Total Programs</div>
                </Panel>
                <Panel variant="bordered" padding="md" style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '28px', 'font-weight': 700, color: 'var(--vscode-testing-iconPassed)' }}>
                    {programs().filter(p => p.status === 'active').length}
                  </div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>Active</div>
                </Panel>
                <Panel variant="bordered" padding="md" style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '28px', 'font-weight': 700, color: 'var(--vscode-testing-iconQueued)' }}>
                    {programs().filter(p => p.status === 'upcoming').length}
                  </div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>Upcoming</div>
                </Panel>
                <Panel variant="bordered" padding="md" style={{ 'text-align': 'center' }}>
                  <div style={{ 'font-size': '28px', 'font-weight': 700, color: 'var(--vscode-testing-iconFailed)' }}>
                    {submissions().filter(s => s.status === 'accepted' || s.status === 'paid').length}
                  </div>
                  <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>Accepted / Paid</div>
                </Panel>
              </div>

              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                <Panel variant="bordered" padding="md">
                  <h4 style={{ margin: '0 0 12px', 'font-size': '11px', 'font-weight': 600, color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>By Platform</h4>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                    {Object.entries(platformStats()).map(([platform, stats]) => {
                      const pcfg = PLATFORM_CONFIG[platform as any]
                      return (
                        <div key={platform} style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                          <span style={{ width: 8, height: 8, 'border-radius': '50%', background: pcfg.color }} />
                          <span style={{ flex: 1, 'font-size': 'var(--vscode-font-size)' }}>{pcfg.label}</span>
                          <span style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>{stats.count} programs</span>
                          <span style={{ 'font-size': '10px', 'font-weight': 500 }}>~${stats.totalMax.toLocaleString()}K max</span>
                        </div>
                      )
                    })}
                  </div>
                </Panel>

                <Panel variant="bordered" padding="md">
                  <h4 style={{ margin: '0 0 12px', 'font-size': '11px', 'font-weight': 600, color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>Submission Status</h4>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                    {Object.entries(
                      submissions().reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc }, {} as Record<string, number>)
                    ).map(([status, count]) => (
                      <div key={status} style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                        <Badge variant={statusBadge(status as any)} size="sm">{status}</Badge>
                        <span style={{ flex: 1, 'font-size': 'var(--vscode-font-size)' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel variant="bordered" padding="md">
                  <h4 style={{ margin: '0 0 12px', 'font-size': '11px', 'font-weight': 600, color: 'var(--vscode-descriptionForeground)', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>By Chain</h4>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                    {Object.entries(
                      programs().reduce((acc, p) => { acc[p.chain] = (acc[p.chain] || 0) + 1; return acc }, {} as Record<string, number>)
                    ).map(([chain, count]) => (
                      <div key={chain} style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': 'var(--vscode-font-size)' }}>
                        <span style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                          <IconGlobe size={11} style={{ color: 'var(--vscode-descriptionForeground)' }} />
                          {chain}
                        </span>
                        <span style={{ 'font-weight': 500 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}

const root = document.getElementById('root');
if (root) { render(() => <BountyDashboard />, root); }
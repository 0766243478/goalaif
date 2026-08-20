import { createSignal, createMemo, Show, For, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { Button } from '../components/Button'
import { Panel } from '../components/Card'
import { Badge } from '../components/Badge'
import { Input } from '../components/Input'
import { Select } from '../components/Select'
import { IconShield, IconSettings, IconKey, IconServer, IconBug, IconGraph, IconAlert, IconCheck, IconX, IconClock, IconRefreshCw, IconDownload, IconPlus, IconExternalLink, IconFileCode, IconLock, IconUnlock, IconBell, IconHistory, IconEye, IconArrowRight, IconCopy, IconServer, IconGlobe, IconTerminal, IconUser, IconMail, IconGitBranch, IconGear } from '../design-system/icons'
import { injectGlobalStyles } from '../design-system/styles'
import { postMessage } from '../providers/vscode-api'

interface SettingsSection {
  id: string
  label: string
  icon: any
  fields: SettingsField[]
}

interface SettingsField {
  key: string
  label: string
  type: 'text' | 'password' | 'select' | 'boolean' | 'number' | 'textarea'
  options?: { value: string; label: string }[]
  placeholder?: string
  description?: string
  requiresRestart?: boolean
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'general',
    label: 'General',
    icon: IconGear,
    fields: [
      { key: 'defaultMode', label: 'Default Investigation Mode', type: 'select', options: [
        { value: 'recon', label: 'Reconnaissance' },
        { value: 'analyze', label: 'Analysis' },
        { value: 'exploit', label: 'Exploit Development' },
        { value: 'patch', label: 'Patch Verification' },
      ], description: 'Mode used when starting new investigations' },
      { key: 'defaultChain', label: 'Default Chain', type: 'select', options: [
        { value: 'ethereum', label: 'Ethereum Mainnet' },
        { value: 'polygon', label: 'Polygon' },
        { value: 'arbitrum', label: 'Arbitrum' },
        { value: 'optimism', label: 'Optimism' },
        { value: 'base', label: 'Base' },
        { value: 'bsc', label: 'BSC' },
        { value: 'solana', label: 'Solana' },
      ], description: 'Default blockchain for new scans' },
      { key: 'autoStartPipeline', label: 'Auto-start Pipeline', type: 'boolean', description: 'Automatically begin analysis after input' },
      { key: 'maxConcurrentScans', label: 'Max Concurrent Scans', type: 'number', placeholder: '3', description: 'Limit simultaneous pipeline executions' },
      { key: 'logLevel', label: 'Log Level', type: 'select', options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warning' },
        { value: 'error', label: 'Error' },
      ], description: 'Verbosity of internal logging' },
    ],
  },
  {
    id: 'api',
    label: 'API Keys',
    icon: IconKey,
    fields: [
      { key: 'etherscanApiKey', label: 'Etherscan API Key', type: 'password', placeholder: 'Enter API key', description: 'Required for contract verification and source retrieval' },
      { key: 'alchemyApiKey', label: 'Alchemy API Key', type: 'password', placeholder: 'Enter API key', description: 'Enhanced RPC access for mainnet and testnets' },
      { key: 'infuraProjectId', label: 'Infura Project ID', type: 'password', placeholder: 'Enter project ID', description: 'Alternative RPC provider' },
      { key: 'tenderlyApiKey', label: 'Tenderly API Key', type: 'password', placeholder: 'Enter API key', description: 'Simulation and debugging integration' },
      { key: 'openaiApiKey', label: 'OpenAI API Key', type: 'password', placeholder: 'Enter API key', description: 'LLM-powered analysis and report generation' },
      { key: 'anthropicApiKey', label: 'Anthropic API Key', type: 'password', placeholder: 'Enter API key', description: 'Alternative LLM provider for analysis' },
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    icon: IconTerminal,
    fields: [
      { key: 'forgePath', label: 'Forge Binary Path', type: 'text', placeholder: '/usr/local/bin/forge', description: 'Path to Foundry forge executable', requiresRestart: true },
      { key: 'castPath', label: 'Cast Binary Path', type: 'text', placeholder: '/usr/local/bin/cast', description: 'Path to Foundry cast executable', requiresRestart: true },
      { key: 'anvilPath', label: 'Anvil Binary Path', type: 'text', placeholder: '/usr/local/bin/anvil', description: 'Path to Foundry anvil executable', requiresRestart: true },
      { key: 'forgeTimeout', label: 'Forge Timeout (seconds)', type: 'number', placeholder: '300', description: 'Maximum time for forge operations' },
      { key: 'forgeMemory', label: 'Forge Memory Limit (MB)', type: 'number', placeholder: '4096', description: 'Memory limit for compilation and testing' },
      { key: 'solcVersion', label: 'Default Solc Version', type: 'select', options: [
        { value: '0.8.24', label: '0.8.24 (Latest)' },
        { value: '0.8.23', label: '0.8.23' },
        { value: '0.8.22', label: '0.8.22' },
        { value: '0.8.21', label: '0.8.21' },
        { value: '0.8.20', label: '0.8.20' },
        { value: '0.8.19', label: '0.8.19' },
        { value: '0.8.18', label: '0.8.18' },
        { value: '0.8.17', label: '0.8.17' },
        { value: '0.8.16', label: '0.8.16' },
      ], description: 'Solidity compiler version for PoC compilation', requiresRestart: true },
      { key: 'evmVersion', label: 'Default EVM Version', type: 'select', options: [
        { value: 'cancun', label: 'Cancun (Latest)' },
        { value: 'shanghai', label: 'Shanghai' },
        { value: 'paris', label: 'Paris' },
        { value: 'london', label: 'London' },
        { value: 'berlin', label: 'Berlin' },
      ], description: 'EVM version for compilation target', requiresRestart: true },
    ],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: IconGraph,
    fields: [
      { key: 'enableStaticAnalysis', label: 'Enable Static Analysis', type: 'boolean', description: 'Run Slither/Slither-like detectors' },
      { key: 'enableFuzzing', label: 'Enable Fuzzing', type: 'boolean', description: 'Run Echidna/Foundry fuzz campaigns' },
      { key: 'enableSymbolicExecution', label: 'Enable Symbolic Execution', type: 'boolean', description: 'Run Manticore/Halmos for deep analysis' },
      { key: 'maxFuzzRuns', label: 'Max Fuzz Runs', type: 'number', placeholder: '10000', description: 'Maximum fuzzing iterations per campaign' },
      { key: 'fuzzTimeout', label: 'Fuzz Timeout (minutes)', type: 'number', placeholder: '30', description: 'Time limit for fuzzing campaigns' },
      { key: 'enableGasReporting', label: 'Gas Reporting', type: 'boolean', description: 'Include gas usage in reports' },
      { key: 'enableCoverage', label: 'Code Coverage', type: 'boolean', description: 'Collect and report line/branch coverage' },
      { key: 'detectors', label: 'Custom Detectors Path', type: 'text', placeholder: './detectors', description: 'Path to custom Slither detectors' },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: IconFileCode,
    fields: [
      { key: 'reportFormat', label: 'Default Report Format', type: 'select', options: [
        { value: 'markdown', label: 'Markdown (.md)' },
        { value: 'html', label: 'HTML (.html)' },
        { value: 'json', label: 'JSON (.json)' },
        { value: 'pdf', label: 'PDF (.pdf)' },
        { value: 'sarif', label: 'SARIF (.sarif)' },
      ], description: 'Default output format for generated reports' },
      { key: 'includePoc', label: 'Include PoC Code', type: 'boolean', description: 'Embed proof-of-concept contracts in reports' },
      { key: 'includeTraces', label: 'Include Execution Traces', type: 'boolean', description: 'Add call traces and state changes' },
      { key: 'includeCoverage', label: 'Include Coverage Data', type: 'boolean', description: 'Add code coverage metrics to reports' },
      { key: 'reportTemplate', label: 'Custom Template Path', type: 'text', placeholder: './templates/report.md', description: 'Path to custom report template' },
      { key: 'autoExport', label: 'Auto-export on Complete', type: 'boolean', description: 'Automatically save reports to workspace' },
      { key: 'exportPath', label: 'Export Directory', type: 'text', placeholder: './sireen-reports', description: 'Default directory for exported reports' },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: IconBell,
    fields: [
      { key: 'notifyOnComplete', label: 'Notify on Pipeline Complete', type: 'boolean', description: 'Show VS Code notification when analysis finishes' },
      { key: 'notifyOnError', label: 'Notify on Errors', type: 'boolean', description: 'Show notification for pipeline failures' },
      { key: 'notifyOnFinding', label: 'Notify on Critical Findings', type: 'boolean', description: 'Alert when critical/high severity found' },
      { key: 'notificationSound', label: 'Play Sound', type: 'boolean', description: 'Play system sound with notifications' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/...', description: 'Send notifications to external webhook (Slack, Discord, etc.)' },
      { key: 'webhookEvents', label: 'Webhook Events', type: 'select', options: [
        { value: 'all', label: 'All Events' },
        { value: 'critical', label: 'Critical Only' },
        { value: 'complete', label: 'Pipeline Complete' },
        { value: 'error', label: 'Errors Only' },
      ], description: 'Which events trigger webhook' },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: IconAlert,
    fields: [
      { key: 'telemetry', label: 'Enable Telemetry', type: 'boolean', description: 'Send anonymous usage statistics to improve Sireen' },
      { key: 'autoUpdate', label: 'Auto-check Updates', type: 'boolean', description: 'Check for extension updates on startup' },
      { key: 'debugMode', label: 'Debug Mode', type: 'boolean', description: 'Enable verbose debugging output', requiresRestart: true },
      { key: 'experimentalFeatures', label: 'Experimental Features', type: 'boolean', description: 'Enable features under development' },
      { key: 'customRpcEndpoints', label: 'Custom RPC Endpoints', type: 'textarea', placeholder: 'ethereum: https://eth-mainnet.alchemyapi.io/v2/...\narbitrum: https://arb1.arbitrum.io/rpc', description: 'Custom RPC URLs per chain (one per line: chain:url)' },
      { key: 'proxySettings', label: 'Proxy Configuration', type: 'text', placeholder: 'http://proxy:8080', description: 'HTTP/HTTPS proxy for outbound requests' },
    ],
  },
]

const DEFAULTS: Record<string, any> = {
  defaultMode: 'recon',
  defaultChain: 'ethereum',
  autoStartPipeline: true,
  maxConcurrentScans: 3,
  logLevel: 'info',
  etherscanApiKey: '',
  alchemyApiKey: '',
  infuraProjectId: '',
  tenderlyApiKey: '',
  openaiApiKey: '',
  anthropicApiKey: '',
  forgePath: 'forge',
  castPath: 'cast',
  anvilPath: 'anvil',
  forgeTimeout: 300,
  forgeMemory: 4096,
  solcVersion: '0.8.24',
  evmVersion: 'cancun',
  enableStaticAnalysis: true,
  enableFuzzing: true,
  enableSymbolicExecution: false,
  maxFuzzRuns: 10000,
  fuzzTimeout: 30,
  enableGasReporting: true,
  enableCoverage: true,
  detectors: '',
  reportFormat: 'markdown',
  includePoc: true,
  includeTraces: true,
  includeCoverage: true,
  reportTemplate: '',
  autoExport: true,
  exportPath: './sireen-reports',
  notifyOnComplete: true,
  notifyOnError: true,
  notifyOnFinding: true,
  notificationSound: false,
  webhookUrl: '',
  webhookEvents: 'critical',
  telemetry: false,
  autoUpdate: true,
  debugMode: false,
  experimentalFeatures: false,
  customRpcEndpoints: '',
  proxySettings: '',
}

function Settings() {
  injectGlobalStyles()

  const [activeSection, setActiveSection] = createSignal<string>('general')
  const [settings, setSettings] = createSignal<Record<string, any>>({})
  const [hasChanges, setHasChanges] = createSignal(false)
  const [saved, setSaved] = createSignal(false)

  onMount(() => {
    // Load from VS Code configuration
    postMessage({ type: 'settings:load' })

    const handler = (event: MessageEvent) => {
      const msg = event.data
      if (msg.type === 'settings:loaded') {
        setSettings({ ...DEFAULTS, ...msg.payload })
      } else if (msg.type === 'settings:saved') {
        if (msg.payload?.success) {
          setHasChanges(false)
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        }
      } else if (msg.type === 'error') {
        // Display error toast/notification
        console.error('[Settings] Error:', msg.payload?.message);
        alert(`Settings Error: ${msg.payload?.message || 'Unknown error'}`);
      }
    }
    window.addEventListener('message', handler)
    onCleanup(() => window.removeEventListener('message', handler))
  })

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaved(false)
  }

  const handleSave = () => {
    postMessage({ type: 'settings:save', payload: settings() })
    setHasChanges(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings({ ...DEFAULTS })
      setHasChanges(true)
      setSaved(false)
    }
  }

  const handleExport = () => {
    postMessage({ type: 'settings:export', payload: {} })
  }

  const handleImport = () => {
    postMessage({ type: 'settings:import', payload: {} })
  }

  const currentSection = SETTINGS_SECTIONS.find(s => s.id === activeSection)

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
          <IconSettings size={16} />
          <div>
            <span style={{ 'font-weight': 600 }}>Settings</span>
            <div style={{ 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
              Configure Sireen behavior
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button variant="secondary" size="sm" icon={<IconDownload size={12} />} onClick={handleExport}>Export</Button>
          <Button variant="secondary" size="sm" icon={<IconArrowRight size={12} />} onClick={handleImport}>Import</Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!hasChanges()}>
            {saved() ? (<><IconCheck size={12} /> Saved</>) : (<><IconCheck size={12} /> Save</>)}
          </Button>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 220,
          'border-right': '1px solid var(--vscode-sideBar-border)',
          background: 'var(--vscode-sideBar-background)',
          display: 'flex', 'flex-direction': 'column',
          overflow: 'auto',
        }}>
          <nav style={{ padding: '8px', display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
            <For each={SETTINGS_SECTIONS}>
              {(section) => {
                const Icon = section.icon
                return (
                  <button
                    onClick={() => setActiveSection(section.id)}
                    style={{
                      display: 'flex', 'align-items': 'center', gap: '8px',
                      padding: '8px 10px', 'font-size': 'var(--vscode-font-size)',
                      color: activeSection() === section.id ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)',
                      background: activeSection() === section.id ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                      border: 'none', 'border-radius': '2px', cursor: 'pointer',
                      'text-align': 'left', width: '100%',
                    }}
                  >
                    <Icon style={{ width: 14, height: 14, 'flex-shrink': 0, color: activeSection() === section.id ? 'var(--vscode-button-background)' : 'var(--vscode-descriptionForeground)' }} />
                    {section.label}
                  </button>
                )
              }}
            </For>
          </nav>
          <div style={{ padding: '8px', 'border-top': '1px solid var(--vscode-sideBar-border)', 'font-size': '9px', color: 'var(--vscode-descriptionForeground)', 'line-height': 1.5 }}>
            Changes require restart where marked. Settings are stored in VS Code workspace configuration.
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <Show when={!!currentSection}>
            {() => {
              const section = currentSection!
              return (
                <div style={{ 'max-width': 700, margin: '0 auto', display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 4px', 'font-size': '18px', 'font-weight': 600 }}>{section.label}</h2>
                    <p style={{ margin: 0, 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
                      {section.fields.length} settings
                    </p>
                  </div>

                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
                    <For each={section.fields}>
                      {(field) => (
                        <Panel variant="bordered" padding="md" style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1, 'min-width': 0 }}>
                              <label style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'font-weight': 500, cursor: 'pointer' }}>
                                {field.label}
                                {field.requiresRestart && (
                                  <Badge variant="warning" size="sm" style={{ 'font-size': '8px' }}>Restart required</Badge>
                                )}
                              </label>
                              {field.description && (
                                <p style={{ margin: '4px 0 0', 'font-size': '10px', color: 'var(--vscode-descriptionForeground)' }}>
                                  {field.description}
                                </p>
                              )}
                            </div>
                            <div style={{ 'min-width': 200 }}>
                              {field.type === 'boolean' && (
                                <label style={{ display: 'flex', 'align-items': 'center', gap: '8px', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={settings()[field.key] || false}
                                    onChange={(e) => handleChange(field.key, e.target.checked)}
                                    style={{
                                      width: 16, height: 16, accentColor: 'var(--vscode-button-background)',
                                      border: '1px solid var(--vscode-input-border)', 'border-radius': '2px',
                                    }}
                                  />
                                  <span style={{ 'font-size': 'var(--vscode-font-size)' }}>
                                    {settings()[field.key] ? 'Enabled' : 'Disabled'}
                                  </span>
                                </label>
                              )}
                              {field.type === 'select' && (
                                <select
                                  value={settings()[field.key] || ''}
                                  onChange={(e) => handleChange(field.key, e.target.value)}
                                  style={{
                                    width: '100%', padding: '4px 8px', 'font-size': 'var(--vscode-font-size)',
                                    background: 'var(--vscode-dropdown-background)', border: '1px solid var(--vscode-dropdown-border)',
                                    'border-radius': '2px', color: 'var(--vscode-dropdown-foreground)', outline: 'none',
                                  }}
                                >
                                  {field.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              )}
                              {field.type === 'textarea' && (
                                <textarea
                                  value={settings()[field.key] || ''}
                                  onInput={(e) => handleChange(field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  rows={4}
                                  style={{
                                    width: '100%', padding: '8px', 'font-size': '10px', 'font-family': 'var(--vscode-editor-font-family)',
                                    background: 'var(--vscode-input-background)', border: '1px solid var(--vscode-input-border)',
                                    'border-radius': '2px', color: 'var(--vscode-input-foreground)', resize: 'vertical', outline: 'none',
                                  }}
                                />
                              )}
                              {(field.type === 'text' || field.type === 'password' || field.type === 'number') && (
                                <input
                                  type={field.type}
                                  value={settings()[field.key] || ''}
                                  onInput={(e) => handleChange(field.key, field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
                                  placeholder={field.placeholder}
                                  style={{
                                    width: '100%', padding: '4px 8px', 'font-size': 'var(--vscode-font-size)',
                                    background: 'var(--vscode-input-background)', border: '1px solid var(--vscode-input-border)',
                                    'border-radius': '2px', color: 'var(--vscode-input-foreground)', outline: 'none',
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </Panel>
                      )}
                    </For>
                  </div>
                </div>
              )
            }}
          </Show>
        </div>
      </div>
    </div>
  )
}

const root = document.getElementById('root');
if (root) { render(() => <Settings />, root); }
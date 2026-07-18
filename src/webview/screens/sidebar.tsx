// ============================================================================
// SIREEN — Sidebar (Primary Workspace)
// ============================================================================
// Matches GitHub Copilot Chat: minimal, native, VS Code themed.
// ============================================================================

import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { injectGlobalStyles } from '../design-system/styles';
import {
  IconShield,
  IconMessage,
  IconSearch,
  IconPlus,
  IconSettings,
  IconLoader,
  IconSend,
  IconHistory,
  IconPlay,
  IconStop,
} from '../design-system/icons';
import { postMessage } from '../providers/vscode-api';
import type { ChatMessage, InvestigationMode } from '../types';

type TabId = 'chat' | 'findings';

const TABS: { id: TabId; label: string; icon: (p: { size?: number }) => any }[] = [
  { id: 'chat', label: 'Chat', icon: IconMessage },
  { id: 'findings', label: 'Findings', icon: IconSearch },
];

const MODES: { value: InvestigationMode; label: string }[] = [
  { value: 'recon', label: 'Recon' },
  { value: 'analyze', label: 'Analyze' },
  { value: 'exploit', label: 'Exploit' },
  { value: 'patch', label: 'Patch' },
];

function EmptyPanel(props: { icon: any; title: string; description: string }) {
  return (
    <div
      style={{
        flex: '1',
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        gap: '12px',
        padding: '24px 16px',
        'text-align': 'center',
        color: 'var(--vscode-descriptionForeground)',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          'border-radius': '4px',
          background: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-panel-border)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        {props.icon({ size: 20 })}
      </div>
      <div>
        <div
          style={{
            'font-size': 'var(--vscode-font-size)',
            'font-weight': '500',
            color: 'var(--vscode-editor-foreground)',
            'margin-bottom': '4px',
          }}
        >
          {props.title}
        </div>
        <div
          style={{
            'font-size': '12px',
            color: 'var(--vscode-descriptionForeground)',
            'max-width': '240px',
            'line-height': '1.45',
          }}
        >
          {props.description}
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  injectGlobalStyles();

  const [hasInvestigation, setHasInvestigation] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<TabId>('chat');
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [inputValue, setInputValue] = createSignal('');
  const [mode, setMode] = createSignal<InvestigationMode>('recon');
  const [chain, setChain] = createSignal('ethereum');
  const [isStreaming, setIsStreaming] = createSignal(false);
  const [inputFocused, setInputFocused] = createSignal(false);
  const [showInput, setShowInput] = createSignal(false);

  createEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg?.type) return;
      console.log('[SIDEBAR] Received:', msg.type, msg.payload);
      switch (msg.type) {
        case 'config':
          if (msg.payload?.defaultMode) setMode(msg.payload.defaultMode);
          if (msg.payload?.defaultChain) setChain(msg.payload.defaultChain);
          break;
        case 'chat:message':
          if (msg.payload?.message) {
            setIsStreaming(false);
            setMessages((p) => [...p, msg.payload.message]);
          }
          break;
        case 'chat:stream':
          if (msg.payload?.content) {
            setIsStreaming(true);
            // Update last assistant message if one exists, or add a new one
            setMessages((p) => {
              const msgs = [...p];
              const lastAssistant = msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant';
              if (lastAssistant) {
                // Update last assistant message content
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  content: msg.payload.content,
                  status: 'streaming',
                };
              } else {
                // First streaming chunk
                msgs.push({
                  role: 'assistant',
                  content: msg.payload.content,
                  status: 'streaming',
                });
              }
              return msgs;
            });
          }
          break;
        case 'chat:status':
          if (msg.payload?.status === 'queued') {
            setIsStreaming(false);
          }
          break;
        case 'chat:complete':
          setIsStreaming(false);
          // Finalize last message
          setMessages((p) => {
            const msgs = [...p];
            if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], status: 'complete' };
            }
            return msgs;
          });
          break;
        case 'focus:input':
          document.querySelector<HTMLTextAreaElement>('.s-input')?.focus();
          break;
        case 'investigation:create':
          setHasInvestigation(true);
          setMessages([]);
          break;
        case 'investigation:list':
          if (msg.payload?.investigations?.length > 0) setHasInvestigation(true);
          break;
      }
    };
    window.addEventListener('message', handler);
    onCleanup(() => window.removeEventListener('message', handler));
  });

  createEffect(() => {
    postMessage({ type: 'ready' });
  });

  const handleSend = () => {
    const text = inputValue().trim();
    if (!text || isStreaming()) return;
    if (!hasInvestigation()) setHasInvestigation(true);
    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: 'user',
      content: text,
      status: 'complete',
      timestamp: Date.now(),
    };
    setMessages((p) => [...p, userMsg]);
    setInputValue('');
    postMessage({ type: 'chat:send', payload: { text, mode: mode(), chain: chain() } });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewInvestigation = () => {
    setShowInput(true);
    setHasInvestigation(false);
    setMessages([]);
  };

  const handleSubmitInput = (value: string, type: 'address' | 'code') => {
    if (!value.trim()) return;
    setShowInput(false);
    setHasInvestigation(true);
    postMessage({
      type: 'pipeline:start',
      payload: { input: { type, value: value.trim(), chain: chain() }, mode: mode(), chain: chain() },
    });
  };

  const canSend = () => !!inputValue().trim() && !isStreaming();

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        height: '100%',
        background: 'var(--vscode-sideBar-background)',
        color: 'var(--vscode-editor-foreground)',
        'font-size': 'var(--vscode-font-size)',
        'min-height': '0',
        'font-family': 'var(--vscode-font-family)',
      }}
    >
      {/* Header — compact, matches Copilot */}
      <header
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          height: '35px',
          padding: '0 8px',
          'border-bottom': '1px solid var(--vscode-sideBar-border)',
          'flex-shrink': '0',
          background: 'var(--vscode-sideBar-background)',
        }}
      >
        <div style={{ display: 'flex', 'align-items': 'center', gap: '7px' }}>
          <span style={{ display: 'flex', color: 'var(--vscode-button-background)' }}>
            <IconShield size={15} />
          </span>
          <span style={{ 'font-size': 'var(--vscode-font-size)', 'font-weight': '600' }}>Sireen</span>
        </div>
        <div style={{ display: 'flex', gap: '1px' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<IconPlus size={13} />}
            onClick={handleNewInvestigation}
            aria-label="New investigation"
            title="New investigation"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<IconHistory size={13} />}
            onClick={() => postMessage({ type: 'open:panel', payload: { panel: 'war-room' } })}
            aria-label="History"
            title="History"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<IconSettings size={13} />}
            onClick={() => postMessage({ type: 'open:panel', payload: { panel: 'settings' } })}
            aria-label="Settings"
            title="Settings"
          />
        </div>
      </header>

      {/* Simple input panel when no investigation */}
      <Show when={!hasInvestigation() && showInput()}>
        <div
          style={{
            padding: '10px',
            'border-bottom': '1px solid var(--vscode-sideBar-border)',
            'flex-shrink': '0',
            gap: '8px',
            display: 'flex',
            'flex-direction': 'column',
          }}
        >
          <label style={{ 'font-size': '11px', color: 'var(--vscode-descriptionForeground)' }}>Contract address or paste Solidity code</label>
          <textarea
            value={inputValue()}
            onInput={(e) => setInputValue(e.target.value)}
            placeholder="0x... or paste contract code"
            rows={3}
            aria-label="Contract input"
            style={{
              width: '100%',
              padding: '8px 10px',
              'font-size': 'var(--vscode-font-size)',
              'font-family': 'var(--vscode-editor-font-family)',
              background: 'var(--vscode-input-background)',
              border: '1px solid var(--vscode-input-border)',
              'border-radius': '2px',
              color: 'var(--vscode-input-foreground)',
              outline: 'none',
              resize: 'vertical',
              'min-height': '64px',
              'box-sizing': 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={chain()}
              onChange={(e) => setChain((e.target as HTMLSelectElement).value)}
              style={{
                flex: '1',
                padding: '4px 8px',
                'font-size': '11px',
                background: 'var(--vscode-dropdown-background)',
                border: '1px solid var(--vscode-dropdown-border)',
                'border-radius': '2px',
                color: 'var(--vscode-dropdown-foreground)',
              }}
            >
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="bsc">BSC</option>
              <option value="base">Base</option>
              <option value="solana">Solana</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => handleSubmitInput(inputValue(), inputValue().startsWith('0x') ? 'address' : 'code')} disabled={!inputValue().trim()}>
              Analyze
            </Button>
          </div>
        </div>
      </Show>

      {/* Tabs — only when investigating */}
      <Show when={hasInvestigation()}>
        <nav
          style={{
            display: 'flex',
            gap: '1px',
            padding: '4px 6px',
            'border-bottom': '1px solid var(--vscode-sideBar-border)',
            'flex-shrink': '0',
          }}
          role="tablist"
          aria-label="Workspace"
        >
          <For each={TABS}>
            {(tab) => {
              const active = () => activeTab() === tab.id;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={active()}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    'font-size': '11px',
                    'font-weight': '500',
                    color: active() ? 'var(--vscode-editor-foreground)' : 'var(--vscode-descriptionForeground)',
                    background: active() ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                    'border-radius': '2px',
                    border: 'none',
                    cursor: 'pointer',
                    'white-space': 'nowrap',
                    transition: 'all 80ms ease',
                  }}
                >
                  <span style={{ display: 'flex' }}>{tab.icon({ size: 13 })}</span>
                  {tab.label}
                </button>
              );
            }}
          </For>
        </nav>
      </Show>

      {/* Content */}
      <main
        style={{
          flex: '1',
          'min-height': '0',
          'overflow-y': 'auto',
          display: 'flex',
          'flex-direction': 'column',
        }}
      >
        {/* Welcome screen */}
        <Show when={!hasInvestigation() && !showInput()}>
          <div
            style={{
              flex: '1',
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              padding: '24px 16px',
              gap: '16px',
              'text-align': 'center',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                'border-radius': '4px',
                background: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
              }}
            >
              <IconShield size={24} />
            </div>
            <div>
              <div
                style={{
                  'font-size': '14px',
                  'font-weight': '600',
                  'margin-bottom': '5px',
                }}
              >
                Start an investigation
              </div>
              <div
                style={{
                  'font-size': 'var(--vscode-font-size)',
                  color: 'var(--vscode-descriptionForeground)',
                  'max-width': '220px',
                  'line-height': '1.45',
                  margin: '0 auto',
                }}
              >
                Enter a contract address or paste Solidity code to begin analysis.
              </div>
            </div>
            <Button variant="primary" size="md" icon={<IconPlus size={13} />} onClick={handleNewInvestigation}>
              New Investigation
            </Button>
          </div>
        </Show>

        {/* Simple input inline when not investigating */}
        <Show when={!hasInvestigation() && showInput()}>
          <div style={{ padding: '10px', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <EmptyPanel
              icon={IconMessage}
              title="Ready to analyze"
              description="Enter a contract address or paste Solidity code above, then click Analyze."
            />
          </div>
        </Show>

        {/* Chat tab */}
        <Show when={hasInvestigation() && activeTab() === 'chat'}>
          <div
            style={{
              flex: '1',
              display: 'flex',
              'flex-direction': 'column',
              gap: '10px',
              padding: '10px',
              'min-height': '0',
            }}
          >
            <Show when={messages().length === 0}>
              <EmptyPanel
                icon={IconMessage}
                title="No messages yet"
                description="Ask a security question or describe what to investigate."
              />
            </Show>

            <For each={messages()}>
              {(msg) => (
                <div
                  style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      'max-width': '90%',
                      'font-size': 'var(--vscode-font-size)',
                      'line-height': '1.5',
                      'word-break': 'break-word',
                      'border-radius': msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: msg.role === 'user' ? 'var(--vscode-button-background)' : 'var(--vscode-editor-background)',
                      color: msg.role === 'user' ? 'var(--vscode-button-foreground)' : 'var(--vscode-editor-foreground)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--vscode-panel-border)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              )}
            </For>

            <Show when={isStreaming()}>
              <div
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '8px',
                  'font-size': '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  padding: '0 4px',
                }}
              >
                <span style={{ display: 'flex', animation: 'spin 1s linear infinite' }}>
                  <IconLoader size={12} />
                </span>
                Thinking…
              </div>
            </Show>
          </div>
        </Show>

        {/* Findings tab — empty state */}
        <Show when={hasInvestigation() && activeTab() === 'findings'}>
          <EmptyPanel
            icon={IconSearch}
            title="No findings"
            description="Vulnerabilities discovered during analysis will appear here."
          />
        </Show>
      </main>

      {/* Composer — compact, only when investigating */}
      <Show when={hasInvestigation()}>
        <footer
          style={{
            'flex-shrink': '0',
            padding: '8px 8px 10px',
            'border-top': '1px solid var(--vscode-sideBar-border)',
            background: 'var(--vscode-sideBar-background)',
          }}
        >
          <div
            style={{
              display: 'flex',
              'align-items': 'flex-end',
              gap: '7px',
              background: 'var(--vscode-input-background)',
              border: `1px solid ${inputFocused() ? 'var(--vscode-focusBorder)' : 'var(--vscode-input-border)'}`,
              'border-radius': '4px',
              padding: '5px 7px',
              'box-shadow': inputFocused() ? '0 0 0 1px var(--vscode-focusBorder)' : 'none',
              transition: 'border-color 80ms ease, box-shadow 80ms ease',
            }}
          >
            <textarea
              class="s-input"
              value={inputValue()}
              onInput={(e) => setInputValue((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Ask Sireen…"
              rows={1}
              aria-label="Message input"
              style={{
                flex: '1',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                'font-family': 'var(--vscode-font-family)',
                'font-size': 'var(--vscode-font-size)',
                'line-height': '20px',
                color: 'var(--vscode-input-foreground)',
                'max-height': '80px',
                padding: '0',
                'box-shadow': 'none',
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend()}
              aria-label="Send"
              style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                width: '26px',
                height: '26px',
                'border-radius': '4px',
                background: canSend() ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
                color: canSend() ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                cursor: canSend() ? 'pointer' : 'default',
                'flex-shrink': '0',
                transition: 'all 80ms ease',
              }}
            >
              {isStreaming() ? <IconLoader size={12} /> : <IconSend size={12} />}
            </button>
          </div>
        </footer>
      </Show>
    </div>
  );
}

export default Sidebar;

const root = document.getElementById('root');
if (root) { render(() => <Sidebar />, root); }
// ============================================================================
// SIREEN — Sidebar Webview Provider
// ============================================================================
// Handles all messages from the sidebar webview panel.
// Every message has: handler, loading state, error state, response.
// ============================================================================

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWebviewHtml } from '../utils/webview';
import { PipelineManager } from '../pipeline/PipelineManager';
import type { PipelineConfig } from '../pipeline/types';
import { DEFAULT_PIPELINE_CONFIG } from '../pipeline/types';
import { AIClient } from '../ai/AIClient';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view: vscode.WebviewView | undefined;
  private _context: vscode.ExtensionContext;
  private _pipelineManager: PipelineManager | undefined;
  private _currentPipelineAbortController: AbortController | null = null;
  private _aiClient: AIClient | undefined;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._initializeAIClient();
  }

  private _initializeAIClient(): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const provider = config.get('aiProvider') || 'openrouter';
    const model = config.get('aiModel') || 'openai/o3-mini';
    
    // Load API key from SecretStorage
    this._context.secrets.get('sireen.aiApiKey').then(apiKey => {
      if (apiKey) {
        this._aiClient = new AIClient({ provider, apiKey, model });
      } else {
        console.warn('[SidebarProvider] AI API key not configured in SecretStorage — AI chat will not work');
      }
    });
  }

  private _reinitializeAIClient(): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const provider = config.get('aiProvider') || 'openrouter';
    const model = config.get('aiModel') || 'openai/o3-mini';
    
    this._context.secrets.get('sireen.aiApiKey').then(apiKey => {
      if (apiKey) {
        this._aiClient = new AIClient({ provider, apiKey, model });
      } else {
        this._aiClient = undefined;
        console.warn('[SidebarProvider] AI API key not configured in SecretStorage — AI chat will not work');
      }
    });
  }

  /** Public method to reinitialize AI client after settings change */
  reinitializeAIClient(): void {
    this._reinitializeAIClient();
  }

  setPipelineManager(pm: PipelineManager): void {
    this._pipelineManager = pm;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    const codiconsUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'codicon.css')
    );

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'dist'),
        vscode.Uri.joinPath(this._context.extensionUri, 'media'),
      ],
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview, this._context.extensionUri, 'sidebar', codiconsUri);

    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });

    webviewView.onDidDispose(() => {
      this._view = undefined;
    });

    this.postConfig();
    webviewView.show?.(true);
  }

  private handleMessage(message: any): void {
    const handleError = (error: Error, messageType: string) => {
      console.error(`[SidebarProvider] Error handling ${messageType}:`, error);
      this.postMessage({ 
        type: 'error', 
        payload: { 
          message: error.message || 'Unknown error',
          code: messageType.toUpperCase().replace(/:/g, '_')
        } 
      });
    };

    try {
      // Runtime diagnostic logging
      console.log(`[PROVIDER] Received: ${message.type}`, message.payload);

      // Handle correlation IDs for request-response patterns
      if (message._correlationId) {
        this.handleCorrelatedResponse(message, message);
        return;
      }

      switch (message.type) {
        // ── Lifecycle ──────────────────────────────────────────────
        case 'ready':
          this.postConfig();
          break;

        // ── Input ──────────────────────────────────────────────────
        case 'focus:input':
          vscode.commands.executeCommand('sireen.focusInput');
          break;

        // ── Investigation ──────────────────────────────────────────
        case 'investigation:create':
          // Always respond to this message type - no correlation ID needed
          this.postMessage({ type: 'investigation:created', payload: {} });
          break;

        case 'investigation:save':
          this.saveInvestigation(message.payload);
          this.handleCorrelatedResponse(message, { type: 'investigation:saved', payload: { id: message.payload?.id } });
          break;

        case 'investigation:load':
          this.loadInvestigation(message.payload?.id);
          break;

        case 'investigation:delete':
          this.deleteInvestigation(message.payload?.id);
          break;

        case 'investigation:list':
          this.listInvestigations();
          break;

        case 'investigation:mode':
          this.setInvestigationMode(message.payload?.mode);
          break;

        // ── Chat ───────────────────────────────────────────────────
        case 'chat:send':
          this.handleChatSend(message.payload);
          break;

        case 'chat:stop':
          this.postMessage({ type: 'chat:stopped', payload: {} });
          break;

        // ── Tab ────────────────────────────────────────────────────
        case 'tab:change':
          // UI-only state — no provider persistence needed
          break;

        // ── Config ─────────────────────────────────────────────────
        case 'config:save':
          this.saveConfig(message.payload);
          break;

        case 'config:clear':
          this.clearAllData();
          break;

        case 'config:get':
          this.postConfig();
          break;

        // ── Findings ───────────────────────────────────────────────
        case 'finding:verify':
          this.handleFindingAction('verified', message.payload);
          break;

        case 'finding:dismiss':
          this.handleFindingAction('dismissed', message.payload);
          break;

        // ── War Room ───────────────────────────────────────────────
        case 'war-room:toggle-pin':
          // UI-only state — handled in webview
          break;

        case 'war-room:new-session':
          this.postMessage({ type: 'war-room:session-created', payload: { id: crypto.randomUUID() } });
          break;

        case 'war-room:select-session':
          // UI-only state — handled in webview
          break;

        case 'war-room:open':
          vscode.commands.executeCommand('sireen.openWarRoom');
          break;

        // ── Pipeline ───────────────────────────────────────────────
        case 'pipeline:start':
          this.handlePipelineStart(message.payload);
          break;

        case 'pipeline:stop':
          this.handlePipelineStop();
          break;

        case 'scan:workspace':
          this.handleWorkspaceScan();
          break;

        case 'demo:load':
          this.handleDemoLoad();
          break;

        // ── Open Panel ─────────────────────────────────────────────
        case 'open:panel':
          this.openPanel(message.payload?.panel);
          break;

        // ── Attack Workspace ───────────────────────────────────────
        case 'attack:run':
          this.handleAttackRun(message.payload);
          break;

        case 'attack:stop':
          this.handleAttackStop(message.payload);
          break;

        case 'attack:refresh':
          this.handleAttackRefresh(message.payload);
          break;

        case 'attack:copyResult':
          this.handleAttackCopyResult(message.payload);
          break;

        case 'attack:saveCustom':
          this.handleAttackSaveCustom(message.payload);
          break;

        // ── Bounty Dashboard ───────────────────────────────────────
        case 'bounty:refresh':
          this.handleBountyRefresh(message.payload);
          break;

        case 'bounty:open':
          this.handleBountyOpen(message.payload);
          break;

        case 'bounty:viewSubmission':
          this.handleBountyViewSubmission(message.payload);
          break;

        // ── Knowledge Graph ────────────────────────────────────────
        case 'graph:analyze':
          this.handleGraphAnalyze(message.payload);
          break;

        case 'graph:export':
          this.handleGraphExport(message.payload);
          break;

        case 'graph:focusNode':
          this.handleGraphFocusNode(message.payload);
          break;

        case 'graph:openNode':
          this.handleGraphOpenNode(message.payload);
          break;

        // ── Report Viewer ──────────────────────────────────────────
        case 'report:copy':
          this.handleReportCopy(message.payload);
          break;

        case 'report:export':
          this.handleReportExport(message.payload);
          break;

        case 'report:openEvidence':
          this.handleReportOpenEvidence(message.payload);
          break;

        // ── Settings ───────────────────────────────────────────────
        case 'settings:save':
          this.handleSettingsSave(message.payload);
          break;

        case 'settings:load':
          this.handleSettingsLoad(message.payload);
          break;

        case 'settings:export':
          this.handleSettingsExport(message.payload);
          break;

        case 'settings:import':
          this.handleSettingsImport(message.payload);
          break;

        // ── External Links ─────────────────────────────────────────
        case 'open:external':
          this.handleOpenExternal(message.payload);
          break;

        // ── Errors ─────────────────────────────────────────────────
        case 'error':
          vscode.window.showErrorMessage(message.payload?.message || 'Sireen: An error occurred');
          break;

        // ── Info Messages ──────────────────────────────────────
        case 'info':
          vscode.window.showInformationMessage(message.payload?.message || 'Sireen: Information');
          break;

        default:
          console.warn(`[SidebarProvider] Unhandled message type: ${message.type}`);
          break;
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)), message.type);
    }
  }

  private async handleWorkspaceScan(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.postMessage({ type: 'scan:results', payload: { contracts: [], error: 'No workspace folder open' } });
      return;
    }

    const contracts: Array<{ path: string; name: string; content: string }> = [];

    for (const folder of workspaceFolders) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, '**/*.sol'),
        '**/node_modules/**'
      );

      for (const file of files.slice(0, 20)) { // Limit to 20 files
        try {
          const content = fs.readFileSync(file.fsPath, 'utf-8');
          contracts.push({
            path: file.fsPath,
            name: path.basename(file.fsPath, '.sol'),
            content,
          });
        } catch {
          // ignore
        }
      }
    }

    this.postMessage({
      type: 'scan:results',
      payload: { contracts },
    });
  }

  private async handleDemoLoad(): Promise<void> {
    // Load VulnerableVault.sol from test_contracts
    const demoPath = path.join(this._context.extensionPath, '..', 'test_contracts', 'VulnerableVault.sol');
    let sourceCode = '';

    try {
      sourceCode = fs.readFileSync(demoPath, 'utf-8');
    } catch {
      // Fallback demo contract
      sourceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VulnerableVault {
    mapping(address => uint256) public balances;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`;
    }

    this.postMessage({
      type: 'contract:loaded',
      payload: { sourceCode, name: 'VulnerableVault', chain: 'ethereum' },
    });
  }

  private handleCorrelatedResponse(message: any, response: any): void {
    if (message._correlationId) {
      this.postMessage({ ...response, _correlationId: message._correlationId });
    }
  }

  // ── Config ──────────────────────────────────────────────────────

  private postConfig(): void {
    const config = vscode.workspace.getConfiguration('sireen');
    this.postMessage({
      type: 'config',
      payload: {
        defaultChain: config.get('defaultChain'),
        defaultMode: config.get('defaultMode'),
        rpcEndpoints: config.get('rpcEndpoints'),
        autoSave: config.get('autoSave'),
        aiProvider: config.get('aiProvider'),
        aiModel: config.get('aiModel'),
        forgePath: config.get('forgePath'),
        dockerEnabled: config.get('dockerEnabled'),
      },
    });
  }

  private saveConfig(payload: any): void {
    if (!payload?.key) return;
    const config = vscode.workspace.getConfiguration('sireen');
    config.update(payload.key, payload.value, vscode.ConfigurationTarget.Global);
    this.postMessage({ type: 'config:saved', payload: { key: payload.key } });
  }

  // ── Investigation ───────────────────────────────────────────────

  private saveInvestigation(payload: any): void {
    if (payload?.id && payload?.data) {
      this._context.workspaceState.update(`investigation:${payload.id}`, payload.data);
    }
  }

  private loadInvestigation(id: string): void {
    if (!id) {
      this.postMessage({ type: 'error', payload: { message: 'Investigation ID is required' } });
      return;
    }
    const data = this._context.workspaceState.get(`investigation:${id}`);
    if (data) {
      this.postMessage({ type: 'state:restore', payload: { id, data } });
    } else {
      this.postMessage({ type: 'error', payload: { message: `Investigation "${id}" not found` } });
    }
  }

  private deleteInvestigation(id: string): void {
    if (!id) return;
    this._context.workspaceState.update(`investigation:${id}`, undefined).then(() => {
      this.postMessage({ type: 'investigation:deleted', payload: { id } });
    });
  }

  private listInvestigations(): void {
    const keys = this._context.workspaceState.keys().filter((k) => k.startsWith('investigation:'));
    const investigations = keys.map((key) => ({
      id: key.replace('investigation:', ''),
      data: this._context.workspaceState.get(key),
    }));
    this.postMessage({ type: 'investigation:list', payload: { investigations } });
  }

  private setInvestigationMode(mode: string): void {
    if (!mode) return;
    const config = vscode.workspace.getConfiguration('sireen');
    config.update('defaultMode', mode, vscode.ConfigurationTarget.Global);
    this.postMessage({ type: 'investigation:mode-changed', payload: { mode } });
  }

  // ── Chat ────────────────────────────────────────────────────────

  private async handleChatSend(payload: any): Promise<void> {
    if (!payload?.text?.trim()) return;

    // Echo user message
    this.postMessage({
      type: 'chat:message',
      payload: {
        message: {
          role: 'user',
          content: payload.text,
          status: 'complete',
        },
      },
    });

    // Check if AI client is available
    if (!this._aiClient) {
      this.postMessage({
        type: 'chat:message',
        payload: {
          message: {
            role: 'assistant',
            content: '⚠️ AI chat is not configured. Please set your API key in Settings → General → AI API Key.',
            status: 'complete',
            isError: true,
          },
        },
      });
      return;
    }

    // Start streaming indicator
    this.postMessage({
      type: 'chat:status',
      payload: { status: 'streaming', message: 'AI is thinking...' },
    });

    try {
      const messages = [
        { role: 'system' as const, content: 'You are Sireen, an AI security researcher specializing in smart contract vulnerabilities. Provide concise, technical responses about vulnerability analysis, exploit development, and security best practices.' },
        { role: 'user' as const, content: payload.text },
      ];

      // Stream the AI response
      let fullResponse = '';
      for await (const chunk of this._aiClient.streamChat(messages)) {
        fullResponse += chunk;
        this.postMessage({
          type: 'chat:stream',
          payload: { content: fullResponse },
        });
      }

      // Send complete
      this.postMessage({
        type: 'chat:complete',
        payload: {},
      });
    } catch (err) {
      console.error('[SidebarProvider] AI chat error:', err);
      this.postMessage({
        type: 'chat:message',
        payload: {
          message: {
            role: 'assistant',
            content: `❌ AI error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            status: 'complete',
            isError: true,
          },
        },
      });
    }
  }

  // ── Findings ─────────────────────────────────────────────────────

  private handleFindingAction(action: string, payload: any): void {
    if (!payload?.findingId) return;
    this.postMessage({ type: `finding:${action}`, payload: { findingId: payload.findingId } });
  }

  // ── Data ─────────────────────────────────────────────────────────

  private clearAllData(): void {
    const keys = this._context.workspaceState.keys();
    const investigationKeys = keys.filter((k) => k.startsWith('investigation:'));
    Promise.all(investigationKeys.map((k) => this._context.workspaceState.update(k, undefined)));
    this.postMessage({ type: 'config:cleared', payload: {} });
    vscode.window.showInformationMessage('Sireen: All investigation data cleared.');
  }

  // ── Panel Navigation ────────────────────────────────────────────

  private openPanel(panel: string): void {
    const panelViews: Record<string, () => void> = {
      'war-room': () => vscode.commands.executeCommand('sireen.openWarRoom'),
      'report-viewer': () => vscode.commands.executeCommand('sireen.openReportViewer'),
      'settings': () => this.createPanel('settings', 'Sireen Settings'),
      'attack-workspace': () => this.createPanel('attack-workspace', 'Sireen Attack Workspace'),
      'bounty-dashboard': () => this.createPanel('bounty-dashboard', 'Sireen Bounty Dashboard'),
      'knowledge-graph': () => this.createPanel('knowledge-graph', 'Sireen Knowledge Graph'),
    };

    const action = panelViews[panel];
    if (action) {
      action();
    } else {
      console.warn(`[SidebarProvider] Unknown panel: ${panel}`);
    }
  }

  private createPanel(panelId: string, title: string): void {
    const panel = vscode.window.createWebviewPanel(
      `sireen.${panelId}`,
      title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this._context.extensionUri, 'dist'),
          vscode.Uri.joinPath(this._context.extensionUri, 'media'),
        ],
      }
    );

    const codiconsUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'codicon.css')
    );

    panel.webview.html = getWebviewHtml(panel.webview, this._context.extensionUri, panelId, codiconsUri);
  }

  // ── Pipeline ──────────────────────────────────────────────────────

  private async handlePipelineStart(payload: any): Promise<void> {
    if (!this._pipelineManager) {
      this.postMessage({ type: 'error', payload: { message: 'Pipeline manager not initialized' } });
      return;
    }

    const errors = this._pipelineManager.validateConfig();
    if (errors.length > 0) {
      this.postMessage({ type: 'error', payload: { message: `Pipeline config: ${errors.join('; ')}` } });
      return;
    }

    // Accept both shapes:
    //   - command-palette / direct: { sourceCode, target, ... }
    //   - sidebar UI: { input: { sourceCode, ... }, mode, chain }
    const input = payload.input ?? {};
    const sourceCode = payload.sourceCode ?? input.sourceCode ?? '';
    const target = payload.target ?? input.target ?? { type: 'source_code', value: sourceCode, chain: payload.chain ?? input.chain ?? 'ethereum', name: 'Investigation Target' };
    const forkUrl = payload.forkUrl ?? input.forkUrl;
    const chain = payload.chain ?? input.chain ?? target.chain ?? 'ethereum';

    if (!sourceCode?.trim()) {
      this.postMessage({ type: 'error', payload: { message: 'No source code provided' } });
      return;
    }

    this._currentPipelineAbortController = new AbortController();
    
    // Show War Room
    vscode.commands.executeCommand('sireen.openWarRoom');

    try {
      const result = await this._pipelineManager.run({
        target,
        sourceCode,
        forkUrl,
        onEvent: (event) => {
          this.postMessage({
            type: 'pipeline:status',
            payload: { stage: event.stage, message: event.message, data: event.data },
          });

          this.postMessage({
            type: 'chat:stream',
            payload: {
              message: {
                role: 'assistant',
                content: `[${event.stage}] ${event.message}`,
                status: 'complete' as const,
                id: `pipeline-${event.stage}-${Date.now()}`,
                timestamp: Date.now(),
              },
            },
          });
        },
        signal: this._currentPipelineAbortController.signal,
      });

      if (result.success && result.report) {
        this.postMessage({
          type: 'pipeline:complete',
          payload: { report: result.report },
        });

        this.postMessage({
          type: 'chat:stream',
          payload: {
            message: {
              role: 'assistant',
              content: `## Pipeline Complete\n\n**Verdict:** ${result.report.verdict.toUpperCase()}\n\n${result.report.summary}`,
              status: 'complete' as const,
              id: `pipeline-result-${Date.now()}`,
              timestamp: Date.now(),
            },
          },
        });

        this._context.workspaceState.update(`report:${result.report.id}`, result.report);
      } else {
        this.postMessage({
          type: 'pipeline:error',
          payload: { error: result.error || 'Unknown error', stage: result.stage },
        });

        this.postMessage({
          type: 'chat:stream',
          payload: {
            message: {
              role: 'assistant',
              content: `## Pipeline Failed\n\n**Error:** ${result.error || 'Unknown error'}\n**Stage:** ${result.stage}`,
              status: 'complete' as const,
              id: `pipeline-error-${Date.now()}`,
              timestamp: Date.now(),
            },
          },
        });
      }
    } catch (err) {
      this.postMessage({
        type: 'pipeline:error',
        payload: { error: err instanceof Error ? err.message : 'Unknown error', stage: 'exception' },
      });
    }
  }

  private handlePipelineStop(): void {
    if (this._currentPipelineAbortController) {
      this._currentPipelineAbortController.abort();
      this._currentPipelineAbortController = null;
      this.postMessage({ type: 'pipeline:status', payload: { stage: 'cancelled', message: 'Pipeline cancelled by user' } });
    }
  }

  // ── Attack Workspace ────────────────────────────────────────────

  private async handleAttackRun(payload: any): Promise<void> {
    // TODO: Implement attack workspace run
    this.postMessage({ type: 'attack:result', payload: { result: 'Attack workspace not yet implemented' } });
  }

  private handleAttackStop(payload: any): void {
    // TODO: Implement attack workspace stop
  }

  private handleAttackRefresh(payload: any): void {
    // TODO: Implement attack workspace refresh
  }

  private handleAttackCopyResult(payload: any): void {
    // TODO: Implement attack workspace copy result
  }

  private handleAttackSaveCustom(payload: any): void {
    // TODO: Implement attack workspace save custom
  }

  // ── Bounty Dashboard ─────────────────────────────────────────────

  private async handleBountyRefresh(payload: any): Promise<void> {
    // TODO: Implement bounty dashboard refresh
    this.postMessage({ type: 'bounty:refreshed', payload: { programs: [] } });
  }

  private handleBountyOpen(payload: any): void {
    // TODO: Implement bounty open
  }

  private handleBountyViewSubmission(payload: any): void {
    // TODO: Implement bounty view submission
  }

  // ── Knowledge Graph ──────────────────────────────────────────────

  private async handleGraphAnalyze(payload: any): Promise<void> {
    // TODO: Implement knowledge graph analyze
    this.postMessage({ type: 'graph:analyzed', payload: { nodes: [], edges: [] } });
  }

  private handleGraphExport(payload: any): void {
    // TODO: Implement knowledge graph export
  }

  private handleGraphFocusNode(payload: any): void {
    // TODO: Implement knowledge graph focus node
  }

  private handleGraphOpenNode(payload: any): void {
    // TODO: Implement knowledge graph open node
  }

  // ── Report Viewer ────────────────────────────────────────────────

  private handleReportCopy(payload: any): void {
    if (!payload?.format || !payload?.reportId) {
      this.postMessage({ type: 'error', payload: { message: 'Report ID and format required' } });
      return;
    }
    const report = this._context.workspaceState.get(`report:${payload.reportId}`);
    if (!report) {
      this.postMessage({ type: 'error', payload: { message: 'Report not found' } });
      return;
    }
    // Copy to clipboard - placeholder
    vscode.env.clipboard.writeText(JSON.stringify(report, null, 2));
    vscode.window.showInformationMessage('Report copied to clipboard');
  }

  private async handleReportExport(payload: any): Promise<void> {
    if (!payload?.format || !payload?.reportId) {
      this.postMessage({ type: 'error', payload: { message: 'Report ID and format required' } });
      return;
    }
    const report = this._context.workspaceState.get(`report:${payload.reportId}`);
    if (!report) {
      this.postMessage({ type: 'error', payload: { message: 'Report not found' } });
      return;
    }
    const content = JSON.stringify(report, null, 2);
    vscode.env.clipboard.writeText(content);
    vscode.window.showInformationMessage(`Report exported to clipboard as ${payload.format}`);
  }

  private handleReportOpenEvidence(payload: any): void {
    if (!payload?.evidenceId) return;
    this.postMessage({ type: 'report:evidence-opened', payload: { evidenceId: payload.evidenceId } });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Settings Handlers
  // ════════════════════════════════════════════════════════════════════════

  private handleSettingsSave(payload: any): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const updates: Array<[string, any]> = Object.entries(payload).map(([key, value]) => [key, value]);
    
    for (const [key, value] of updates) {
      if (key === 'aiApiKey') {
        // Store API key in SecretStorage, not workspace config
        if (value && value !== '***') {
          this._context.secrets.store('sireen.aiApiKey', value);
        } else if (!value) {
          this._context.secrets.delete('sireen.aiApiKey');
        }
      } else if (key.startsWith('apiKey') || key.includes('ApiKey')) {
        // Store other API keys in SecretStorage
        if (value && value !== '***') {
          this._context.secrets.store(`sireen.${key}`, value);
        } else if (!value) {
          this._context.secrets.delete(`sireen.${key}`);
        }
      } else {
        config.update(key, value, vscode.ConfigurationTarget.Workspace);
      }
    }
    
    // Reinitialize AI client if API key, model, or provider changed
    if (payload.aiApiKey !== undefined || payload.aiModel !== undefined || payload.aiProvider !== undefined) {
      this._reinitializeAIClient();
    }
    
    this.postMessage({ type: 'settings:saved', payload: { success: true } });
    vscode.window.showInformationMessage('Sireen settings saved');
  }

  private handleSettingsLoad(payload?: any): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const settings: Record<string, any> = {};
    
    // All known settings keys from the webview
    const keys = [
      // General
      'defaultMode', 'defaultChain', 'autoStartPipeline', 'maxConcurrentScans', 'logLevel',
      // API Keys (handled separately)
      'etherscanApiKey', 'alchemyApiKey', 'infuraProjectId', 'tenderlyApiKey', 
      'openaiApiKey', 'anthropicApiKey',
      // Execution
      'forgePath', 'castPath', 'anvilPath', 'forgeTimeout', 'forgeMemory', 
      'solcVersion', 'evmVersion',
      // Analysis
      'enableStaticAnalysis', 'enableFuzzing', 'enableSymbolicExecution',
      'maxFuzzRuns', 'fuzzTimeout', 'enableGasReporting', 'enableCoverage', 'detectors',
      // Reporting
      'reportFormat', 'includePoc', 'includeTraces', 'includeCoverage',
      'reportTemplate', 'autoExport', 'exportPath',
      // Notifications
      'notifyOnComplete', 'notifyOnError', 'notifyOnFinding', 'notificationSound',
      'webhookUrl', 'webhookEvents',
      // Advanced
      'telemetry', 'autoUpdate', 'debugMode', 'experimentalFeatures',
      'customRpcEndpoints', 'proxySettings',
      // Legacy
      'aiProvider', 'aiModel', 'forkRpcUrl', 'maxRetries', 'dockerEnabled', 
      'dockerImage', 'workspaceDir', 'autoSave', 'verboseLogging', 'gasReporting',
      'detailedTraces', 'showGasCosts', 'highlightReverts', 'showStorageChanges',
      'notifications', 'soundAlerts', 'compactMode', 'darkTheme',
      'exportFormat', 'includeEvidence', 'includeTraces', 'includeMoneyFlow',
      'theme', 'fontSize', 'sidebarWidth', 'logRetentionDays',
      'maxConcurrentPipelines', 'defaultTimeout', 'enableAutoFix', 'enableDockerSandbox',
    ];
    
    for (const key of keys) {
      settings[key] = config.get(key);
    }
    
    // Check if API keys exist in SecretStorage (don't expose the actual keys)
    const apiKeys = ['aiApiKey', 'etherscanApiKey', 'alchemyApiKey', 'infuraProjectId', 
                     'tenderlyApiKey', 'openaiApiKey', 'anthropicApiKey'];
    
    Promise.all(apiKeys.map(key => this._context.secrets.get(`sireen.${key}`))).then(values => {
      apiKeys.forEach((key, index) => {
        settings[key] = values[index] ? '***' : '';
      });
      this.postMessage({ type: 'settings:loaded', payload: { settings } });
    });
  }

  private handleSettingsExport(payload: { path?: string }): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const settings: Record<string, any> = {};
    
    const keys = [
      // General
      'defaultMode', 'defaultChain', 'autoStartPipeline', 'maxConcurrentScans', 'logLevel',
      // Execution
      'forgePath', 'castPath', 'anvilPath', 'forgeTimeout', 'forgeMemory', 
      'solcVersion', 'evmVersion',
      // Analysis
      'enableStaticAnalysis', 'enableFuzzing', 'enableSymbolicExecution',
      'maxFuzzRuns', 'fuzzTimeout', 'enableGasReporting', 'enableCoverage', 'detectors',
      // Reporting
      'reportFormat', 'includePoc', 'includeTraces', 'includeCoverage',
      'reportTemplate', 'autoExport', 'exportPath',
      // Notifications
      'notifyOnComplete', 'notifyOnError', 'notifyOnFinding', 'notificationSound',
      'webhookUrl', 'webhookEvents',
      // Advanced
      'telemetry', 'autoUpdate', 'debugMode', 'experimentalFeatures',
      'customRpcEndpoints', 'proxySettings',
      // Legacy
      'aiProvider', 'aiModel', 'forgePath', 'forkRpcUrl', 'maxRetries', 'dockerEnabled', 
      'dockerImage', 'workspaceDir', 'autoSave', 'verboseLogging', 'gasReporting',
      'detailedTraces', 'showGasCosts', 'highlightReverts', 'showStorageChanges',
      'notifications', 'soundAlerts', 'compactMode', 'darkTheme',
      'exportFormat', 'includeEvidence', 'includeTraces', 'includeMoneyFlow',
      'theme', 'fontSize', 'sidebarWidth', 'logRetentionDays',
      'maxConcurrentPipelines', 'defaultTimeout', 'enableAutoFix', 'enableDockerSandbox',
    ];
    
    for (const key of keys) {
      settings[key] = config.get(key);
    }
    
    // Add placeholder for API keys (never export actual keys)
    const apiKeys = ['aiApiKey', 'etherscanApiKey', 'alchemyApiKey', 'infuraProjectId', 
                     'tenderlyApiKey', 'openaiApiKey', 'anthropicApiKey'];
    for (const key of apiKeys) {
      settings[key] = '***REDACTED***';
    }
    
    const content = JSON.stringify(settings, null, 2);
    
    if (payload.path) {
      vscode.workspace.fs.writeFile(vscode.Uri.file(payload.path), Buffer.from(content));
      vscode.window.showInformationMessage(`Settings exported to ${payload.path}`);
    } else {
      vscode.env.clipboard.writeText(content);
      vscode.window.showInformationMessage('Settings exported to clipboard');
    }
  }

  private handleSettingsImport(payload: { path?: string }): void {
    const importFromFile = async (uri: vscode.Uri) => {
      try {
        const data = await vscode.workspace.fs.readFile(uri);
        const settings = JSON.parse(data.toString());
        // Remove placeholder values
        const apiKeys = ['aiApiKey', 'etherscanApiKey', 'alchemyApiKey', 'infuraProjectId', 
                         'tenderlyApiKey', 'openaiApiKey', 'anthropicApiKey'];
        for (const key of apiKeys) {
          if (settings[key] === '***REDACTED***' || settings[key] === '***') {
            delete settings[key];
          }
        }
        this.handleSettingsSave(settings);
        vscode.window.showInformationMessage('Settings imported successfully');
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to import settings: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
      }
    };
    
    if (payload.path) {
      importFromFile(vscode.Uri.file(payload.path));
    } else {
      // Show file picker
      vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { 'JSON Files': ['json'] },
        title: 'Import Sireen Settings',
      }).then(uris => {
        if (uris && uris.length > 0) {
          importFromFile(uris[0]);
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // External Link Handler
  // ════════════════════════════════════════════════════════════════════════

  private handleOpenExternal(payload: { url: string }): void {
    vscode.env.openExternal(vscode.Uri.parse(payload.url));
  }

  private postMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }
}
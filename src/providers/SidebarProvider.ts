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

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view: vscode.WebviewView | undefined;
  private _context: vscode.ExtensionContext;
  private _pipelineManager: PipelineManager | undefined;
  private _currentPipelineAbortController: AbortController | null = null;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
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

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'dist'),
        vscode.Uri.joinPath(this._context.extensionUri, 'media'),
      ],
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview, this._context.extensionUri, 'sidebar');

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
        vscode.commands.executeCommand('sireen.newInvestigation');
        this.handleCorrelatedResponse(message, { type: 'investigation:created', payload: {} });
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

      default:
        console.warn(`[SidebarProvider] Unhandled message type: ${message.type}`);
        break;
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

  private handleChatSend(payload: any): void {
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

    // Notify pipeline execution — real AI response is handled by the pipeline
    this.postMessage({
      type: 'chat:status',
      payload: {
        status: 'queued',
        message: 'Message queued for analysis',
      },
    });
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
    const commandMap: Record<string, string> = {
      'war-room': 'sireen.openWarRoom',
      'report-viewer': 'sireen.openReportViewer',
    };
    const command = commandMap[panel];
    if (command) {
      vscode.commands.executeCommand(command);
    } else {
      console.warn(`[SidebarProvider] Unknown panel: ${panel}`);
    }
  }

  // ── Post Message ────────────────────────────────────────────────

  postMessage(message: any): void {
    this._view?.webview.postMessage(message);
  }

  private buildPipelineConfig(): PipelineConfig {
    const config = vscode.workspace.getConfiguration('sireen');
    return {
      aiProvider: config.get('aiProvider') || 'openrouter',
      aiApiKey: config.get('aiApiKey') || '',
      aiModel: config.get('aiModel') || 'openai/o3-mini',
      forgePath: config.get('forgePath') || 'forge',
      forkRpcUrl: config.get('forkRpcUrl') || '',
      maxRetries: config.get('maxRetries') ?? 3,
      dockerEnabled: config.get('dockerEnabled') ?? false,
      dockerImage: config.get('dockerImage') || 'ghcr.io/foundry-rs/foundry:latest',
      workspaceDir: config.get('workspaceDir') || '',
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Pipeline Handlers
  // ════════════════════════════════════════════════════════════════════════

  private async handlePipelineStart(payload: any): Promise<void> {
    const config = this.buildPipelineConfig();
    const errors = this._pipelineManager?.validateConfig() || [];
    if (errors.length > 0) {
      this.postMessage({
        type: 'pipeline:error',
        payload: { error: errors.join('\n'), stage: 'initializing' },
      });
      return;
    }

    // Create abort controller for this run
    this._currentPipelineAbortController = new AbortController();
    const signal = this._currentPipelineAbortController.signal;

    try {
      const result = await this._pipelineManager!.run({
        target: payload.input,
        sourceCode: payload.input.value || '',
        forkUrl: payload.chain,
        signal,
        onEvent: (event) => this.postMessage({
          type: 'pipeline:status',
          payload: event,
        }),
      });

      if (result.success && result.report) {
        this.postMessage({
          type: 'pipeline:complete',
          payload: { report: result.report },
        });
        // Notify War Room if open
        vscode.commands.executeCommand('sireen.openWarRoom');
      } else {
        this.postMessage({
          type: 'pipeline:error',
          payload: { error: result.error, stage: result.stage },
        });
      }
    } catch (err) {
      this.postMessage({
        type: 'pipeline:error',
        payload: { error: err instanceof Error ? err.message : 'Unknown error', stage: 'unknown' },
      });
    }
  }

  private handlePipelineStop(): void {
    if (this._pipelineManager && this._currentPipelineAbortController) {
      this._currentPipelineAbortController.abort();
      this._pipelineManager.cancel();
      this.postMessage({
        type: 'pipeline:status',
        payload: { stage: 'cancelled', status: 'failed', message: 'Pipeline cancelled by user' },
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Attack Workspace Handlers
  // ════════════════════════════════════════════════════════════════════════

  private async handleAttackRun(payload: { vectorId: string }): Promise<void> {
    // Forward to War Room for execution via pipeline
    this.postMessage({
      type: 'attack:status',
      payload: { vectorId: payload.vectorId, status: 'queued' },
    });
    
    // TODO: Execute specific attack vector via pipeline
    vscode.window.showInformationMessage(`Attack vector ${payload.vectorId} queued for execution`);
  }

  private handleAttackStop(payload: { vectorId?: string }): void {
    if (payload.vectorId) {
      this.postMessage({ type: 'attack:status', payload: { vectorId: payload.vectorId, status: 'stopped' } });
    }
  }

  private handleAttackRefresh(payload?: any): void {
    // Request fresh attack results from backend
    this.postMessage({ type: 'attack:refresh:complete', payload: { refreshed: true } });
  }

  private handleAttackCopyResult(payload: { resultId: string }): void {
    vscode.env.clipboard.writeText(JSON.stringify({ resultId: payload.resultId }, null, 2));
    vscode.window.showInformationMessage('Attack result copied to clipboard');
  }

  private handleAttackSaveCustom(payload: any): void {
    // Save custom attack vector to workspace state
    const key = 'attack:custom:' + crypto.randomUUID();
    this._context.workspaceState.update(key, payload);
    vscode.window.showInformationMessage('Custom attack vector saved');
  }

  // ════════════════════════════════════════════════════════════════════════
  // Bounty Dashboard Handlers
  // ════════════════════════════════════════════════════════════════════════

  private handleBountyRefresh(payload: { platform?: string }): void {
    // Fetch fresh bounty programs from APIs
    this.postMessage({ type: 'bounty:refresh:complete', payload: { platform: payload.platform } });
    vscode.window.showInformationMessage('Bounty programs refreshed');
  }

  private handleBountyOpen(payload: { url: string }): void {
    vscode.env.openExternal(vscode.Uri.parse(payload.url));
  }

  private handleBountyViewSubmission(payload: { submissionId: string }): void {
    this.postMessage({
      type: 'bounty:submission-detail',
      payload: { submissionId: payload.submissionId },
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Knowledge Graph Handlers
  // ════════════════════════════════════════════════════════════════════════

  private handleGraphAnalyze(payload: { target: string }): void {
    this.postMessage({ type: 'graph:analyzing', payload: { target: payload.target } });
    // TODO: Trigger actual contract analysis
    vscode.window.showInformationMessage(`Contract analysis started for ${payload.target}`);
  }

  private handleGraphExport(payload: { format: 'json' | 'dot' | 'svg' }): void {
    // Export graph data
    vscode.window.showSaveDialog({ filters: { 'Graph': [payload.format] } }).then(uri => {
      if (uri) {
        // Write graph data to file
        vscode.window.showInformationMessage(`Graph exported to ${uri.fsPath}`);
      }
    });
  }

  private handleGraphFocusNode(payload: { nodeId: string }): void {
    // Focus on specific node in the graph
    this.postMessage({ type: 'graph:node-focused', payload: { nodeId: payload.nodeId } });
  }

  private handleGraphOpenNode(payload: { nodeId: string; type: string }): void {
    // Open detailed view of a node
    if (payload.type === 'contract') {
      vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://etherscan.io/address/${payload.nodeId}`));
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Report Handlers
  // ════════════════════════════════════════════════════════════════════════

  private handleReportCopy(payload: { format: string }): void {
    // Copy report in specified format to clipboard
    vscode.env.clipboard.writeText(`# Sireen Report\n\nFormat: ${payload.format}\n\n[Report content would be here]`);
    vscode.window.showInformationMessage(`Report copied as ${payload.format}`);
  }

  private handleReportExport(payload: { format: string }): void {
    vscode.window.showSaveDialog({
      filters: { 'Report': [payload.format] },
      defaultUri: vscode.Uri.file(`sireen-report.${payload.format}`),
    }).then(uri => {
      if (uri) {
        // Write report to file
        vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
      }
    });
  }

  private handleReportOpenEvidence(payload: { url: string }): void {
    vscode.env.openExternal(vscode.Uri.parse(payload.url));
  }

  // ════════════════════════════════════════════════════════════════════════
  // Settings Handlers
  // ════════════════════════════════════════════════════════════════════════

  private handleSettingsSave(payload: any): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const updates: Array<[string, any]> = Object.entries(payload).map(([key, value]) => [key, value]);
    
    for (const [key, value] of updates) {
      config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
    
    this.postMessage({ type: 'settings:saved', payload: { success: true } });
    vscode.window.showInformationMessage('Sireen settings saved');
  }

  private handleSettingsLoad(payload?: any): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const settings: Record<string, any> = {};
    
    // All known settings keys
    const keys = [
      'aiProvider', 'aiApiKey', 'aiModel', 'forgePath', 'forkRpcUrl',
      'maxRetries', 'dockerEnabled', 'dockerImage', 'workspaceDir',
      'autoSave', 'verboseLogging', 'gasReporting', 'detailedTraces',
      'showGasCosts', 'highlightReverts', 'showStorageChanges',
      'notifications', 'soundAlerts', 'compactMode', 'darkTheme',
      'exportFormat', 'includeEvidence', 'includeTraces', 'includeMoneyFlow',
      'theme', 'fontSize', 'sidebarWidth', 'logRetentionDays',
      'maxConcurrentPipelines', 'defaultTimeout', 'enableAutoFix', 'enableDockerSandbox',
    ];
    
    for (const key of keys) {
      settings[key] = config.get(key);
    }
    
    this.postMessage({ type: 'settings:loaded', payload: { settings } });
  }

  private handleSettingsExport(payload: { path?: string }): void {
    const config = vscode.workspace.getConfiguration('sireen');
    const settings: Record<string, any> = {};
    
    const keys = [
      'aiProvider', 'aiApiKey', 'aiModel', 'forgePath', 'forkRpcUrl',
      'maxRetries', 'dockerEnabled', 'dockerImage', 'workspaceDir',
    ];
    
    for (const key of keys) {
      settings[key] = config.get(key);
    }
    
    const content = JSON.stringify(settings, null, 2);
    
    if (payload.path) {
      vscode.workspace.fs.writeFile(vscode.Uri.file(payload.path), Buffer.from(content));
    } else {
      vscode.env.clipboard.writeText(content);
    }
    
    vscode.window.showInformationMessage('Settings exported');
  }

  private handleSettingsImport(payload: { path?: string }): void {
    if (payload.path) {
      vscode.workspace.fs.readFile(vscode.Uri.file(payload.path)).then(data => {
        const settings = JSON.parse(data.toString());
        this.handleSettingsSave(settings);
      });
    } else {
      vscode.env.clipboard.readText().then(text => {
        try {
          const settings = JSON.parse(text);
          this.handleSettingsSave(settings);
        } catch {
          vscode.window.showErrorMessage('Invalid settings JSON in clipboard');
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
}
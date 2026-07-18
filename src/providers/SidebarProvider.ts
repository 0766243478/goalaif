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

      // ── Errors ─────────────────────────────────────────────────
      case 'error':
        vscode.window.showErrorMessage(message.payload?.message || 'Sireen: An error occurred');
        break;

      default:
        console.warn(`[SidebarProvider] Unhandled message type: ${message.type}`);
        break;
    }
  }

  private async handlePipelineStart(payload: any): Promise<void> {
    if (!this._pipelineManager) {
      this.postMessage({ type: 'error', payload: { message: 'Pipeline not initialized' } });
      return;
    }

    const { input, mode, chain } = payload;
    const errors = this._pipelineManager.validateConfig();
    if (errors.length > 0) {
      this.postMessage({ type: 'error', payload: { message: errors.join('; ') } });
      return;
    }

    let sourceCode = '';
    let targetName = 'contract';

    if (input.type === 'address') {
      // Contract address - would need RPC to fetch source
      this.postMessage({ type: 'error', payload: { message: 'Contract address fetching not yet implemented. Please paste Solidity code or open a .sol file.' } });
      return;
    } else if (input.type === 'code' || input.type === 'file') {
      sourceCode = input.value;
      targetName = input.type === 'file' ? 'uploaded-contract' : 'pasted-contract';
    }

    if (!sourceCode.trim()) {
      this.postMessage({ type: 'error', payload: { message: 'No source code provided' } });
      return;
    }

    // Trigger pipeline via command (which shows War Room)
    vscode.commands.executeCommand('sireen.runPipeline');
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
}
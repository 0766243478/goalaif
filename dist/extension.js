"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode5 = __toESM(require("vscode"));

// src/providers/SidebarProvider.ts
var vscode2 = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));

// src/utils/webview.ts
var vscode = __toESM(require("vscode"));
var scriptMap = {
  "sidebar": "dist/webview/sidebar.js",
  "attack-workspace": "dist/webview/attack-workspace.js",
  "knowledge-graph": "dist/webview/knowledge-graph.js",
  "report-viewer": "dist/webview/report-viewer.js",
  "war-room": "dist/webview/war-room.js",
  "bounty-dashboard": "dist/webview/bounty-dashboard.js",
  "settings": "dist/webview/settings.js"
};
var panelTitles = {
  "sidebar": "Sireen \u2014 Investigation",
  "attack-workspace": "Sireen \u2014 Live Attack Workspace",
  "knowledge-graph": "Sireen \u2014 Knowledge Graph",
  "report-viewer": "Sireen \u2014 Report Viewer",
  "war-room": "Sireen \u2014 War Room",
  "bounty-dashboard": "Sireen \u2014 Bug Bounty Dashboard",
  "settings": "Sireen \u2014 Settings"
};
function getWebviewScriptUri(webview, extensionUri, panelId) {
  const scriptPath = scriptMap[panelId] || scriptMap["sidebar"];
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, scriptPath));
}
function getWebviewHtml(webview, extensionUri, panelId) {
  const scriptUri = getWebviewScriptUri(webview, extensionUri, panelId);
  const nonce = getNonce();
  const title = panelTitles[panelId] || "Sireen";
  const initialState = JSON.stringify({ panelId, version: "0.1.0" }).replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' ${webview.cspSource}; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; connect-src 'none';">
  <title>${title}</title>
</head>
<body>
  <div id="root" data-panel="${panelId}" data-state='${initialState}'></div>
  <script nonce="${nonce}">
    window.addEventListener('error', function(e) {
      if (window.acquireVsCodeApi) {
        const vscode = window.acquireVsCodeApi();
        vscode.postMessage({ type: 'error', payload: { message: e.message || 'Script error' } });
      }
      e.preventDefault();
    });
    window.addEventListener('unhandledrejection', function(e) {
      if (window.acquireVsCodeApi) {
        const vscode = window.acquireVsCodeApi();
        vscode.postMessage({ type: 'error', payload: { message: e.reason?.message || 'Unhandled Promise rejection' } });
      }
      e.preventDefault();
    });
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  let text = "";
  for (let i = 0; i < 64; i++) {
    text += chars.charAt(array[i] % chars.length);
  }
  return text;
}

// src/providers/SidebarProvider.ts
var SidebarProvider = class {
  constructor(context) {
    this._context = context;
  }
  setPipelineManager(pm) {
    this._pipelineManager = pm;
  }
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode2.Uri.joinPath(this._context.extensionUri, "dist"),
        vscode2.Uri.joinPath(this._context.extensionUri, "media")
      ]
    };
    webviewView.webview.html = getWebviewHtml(webviewView.webview, this._context.extensionUri, "sidebar");
    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });
    webviewView.onDidDispose(() => {
      this._view = void 0;
    });
    this.postConfig();
    webviewView.show?.(true);
  }
  handleMessage(message) {
    switch (message.type) {
      case "ready":
        this.postConfig();
        break;
      case "focus:input":
        vscode2.commands.executeCommand("sireen.focusInput");
        break;
      case "investigation:create":
        vscode2.commands.executeCommand("sireen.newInvestigation");
        this.handleCorrelatedResponse(message, { type: "investigation:created", payload: {} });
        break;
      case "investigation:save":
        this.saveInvestigation(message.payload);
        this.handleCorrelatedResponse(message, { type: "investigation:saved", payload: { id: message.payload?.id } });
        break;
      case "investigation:load":
        this.loadInvestigation(message.payload?.id);
        break;
      case "investigation:delete":
        this.deleteInvestigation(message.payload?.id);
        break;
      case "investigation:list":
        this.listInvestigations();
        break;
      case "investigation:mode":
        this.setInvestigationMode(message.payload?.mode);
        break;
      case "chat:send":
        this.handleChatSend(message.payload);
        break;
      case "chat:stop":
        this.postMessage({ type: "chat:stopped", payload: {} });
        break;
      case "tab:change":
        break;
      case "config:save":
        this.saveConfig(message.payload);
        break;
      case "config:clear":
        this.clearAllData();
        break;
      case "config:get":
        this.postConfig();
        break;
      case "finding:verify":
        this.handleFindingAction("verified", message.payload);
        break;
      case "finding:dismiss":
        this.handleFindingAction("dismissed", message.payload);
        break;
      case "war-room:toggle-pin":
        break;
      case "war-room:new-session":
        this.postMessage({ type: "war-room:session-created", payload: { id: crypto.randomUUID() } });
        break;
      case "war-room:select-session":
        break;
      case "war-room:open":
        vscode2.commands.executeCommand("sireen.openWarRoom");
        break;
      case "pipeline:start":
        this.handlePipelineStart(message.payload);
        break;
      case "scan:workspace":
        this.handleWorkspaceScan();
        break;
      case "demo:load":
        this.handleDemoLoad();
        break;
      case "open:panel":
        this.openPanel(message.payload?.panel);
        break;
      case "error":
        vscode2.window.showErrorMessage(message.payload?.message || "Sireen: An error occurred");
        break;
      default:
        console.warn(`[SidebarProvider] Unhandled message type: ${message.type}`);
        break;
    }
  }
  async handlePipelineStart(payload) {
    if (!this._pipelineManager) {
      this.postMessage({ type: "error", payload: { message: "Pipeline not initialized" } });
      return;
    }
    const { input, mode, chain } = payload;
    const errors = this._pipelineManager.validateConfig();
    if (errors.length > 0) {
      this.postMessage({ type: "error", payload: { message: errors.join("; ") } });
      return;
    }
    let sourceCode = "";
    let targetName = "contract";
    if (input.type === "address") {
      this.postMessage({ type: "error", payload: { message: "Contract address fetching not yet implemented. Please paste Solidity code or open a .sol file." } });
      return;
    } else if (input.type === "code" || input.type === "file") {
      sourceCode = input.value;
      targetName = input.type === "file" ? "uploaded-contract" : "pasted-contract";
    }
    if (!sourceCode.trim()) {
      this.postMessage({ type: "error", payload: { message: "No source code provided" } });
      return;
    }
    vscode2.commands.executeCommand("sireen.runPipeline");
  }
  async handleWorkspaceScan() {
    const workspaceFolders = vscode2.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.postMessage({ type: "scan:results", payload: { contracts: [], error: "No workspace folder open" } });
      return;
    }
    const contracts = [];
    for (const folder of workspaceFolders) {
      const files = await vscode2.workspace.findFiles(
        new vscode2.RelativePattern(folder, "**/*.sol"),
        "**/node_modules/**"
      );
      for (const file of files.slice(0, 20)) {
        try {
          const content = fs.readFileSync(file.fsPath, "utf-8");
          contracts.push({
            path: file.fsPath,
            name: path.basename(file.fsPath, ".sol"),
            content
          });
        } catch {
        }
      }
    }
    this.postMessage({
      type: "scan:results",
      payload: { contracts }
    });
  }
  async handleDemoLoad() {
    const demoPath = path.join(this._context.extensionPath, "..", "test_contracts", "VulnerableVault.sol");
    let sourceCode = "";
    try {
      sourceCode = fs.readFileSync(demoPath, "utf-8");
    } catch {
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
      type: "contract:loaded",
      payload: { sourceCode, name: "VulnerableVault", chain: "ethereum" }
    });
  }
  handleCorrelatedResponse(message, response) {
    if (message._correlationId) {
      this.postMessage({ ...response, _correlationId: message._correlationId });
    }
  }
  // ── Config ──────────────────────────────────────────────────────
  postConfig() {
    const config = vscode2.workspace.getConfiguration("sireen");
    this.postMessage({
      type: "config",
      payload: {
        defaultChain: config.get("defaultChain"),
        defaultMode: config.get("defaultMode"),
        rpcEndpoints: config.get("rpcEndpoints"),
        autoSave: config.get("autoSave"),
        aiProvider: config.get("aiProvider"),
        aiModel: config.get("aiModel"),
        forgePath: config.get("forgePath"),
        dockerEnabled: config.get("dockerEnabled")
      }
    });
  }
  saveConfig(payload) {
    if (!payload?.key)
      return;
    const config = vscode2.workspace.getConfiguration("sireen");
    config.update(payload.key, payload.value, vscode2.ConfigurationTarget.Global);
    this.postMessage({ type: "config:saved", payload: { key: payload.key } });
  }
  // ── Investigation ───────────────────────────────────────────────
  saveInvestigation(payload) {
    if (payload?.id && payload?.data) {
      this._context.workspaceState.update(`investigation:${payload.id}`, payload.data);
    }
  }
  loadInvestigation(id) {
    if (!id) {
      this.postMessage({ type: "error", payload: { message: "Investigation ID is required" } });
      return;
    }
    const data = this._context.workspaceState.get(`investigation:${id}`);
    if (data) {
      this.postMessage({ type: "state:restore", payload: { id, data } });
    } else {
      this.postMessage({ type: "error", payload: { message: `Investigation "${id}" not found` } });
    }
  }
  deleteInvestigation(id) {
    if (!id)
      return;
    this._context.workspaceState.update(`investigation:${id}`, void 0).then(() => {
      this.postMessage({ type: "investigation:deleted", payload: { id } });
    });
  }
  listInvestigations() {
    const keys = this._context.workspaceState.keys().filter((k) => k.startsWith("investigation:"));
    const investigations = keys.map((key) => ({
      id: key.replace("investigation:", ""),
      data: this._context.workspaceState.get(key)
    }));
    this.postMessage({ type: "investigation:list", payload: { investigations } });
  }
  setInvestigationMode(mode) {
    if (!mode)
      return;
    const config = vscode2.workspace.getConfiguration("sireen");
    config.update("defaultMode", mode, vscode2.ConfigurationTarget.Global);
    this.postMessage({ type: "investigation:mode-changed", payload: { mode } });
  }
  // ── Chat ────────────────────────────────────────────────────────
  handleChatSend(payload) {
    if (!payload?.text?.trim())
      return;
    this.postMessage({
      type: "chat:message",
      payload: {
        message: {
          role: "user",
          content: payload.text,
          status: "complete"
        }
      }
    });
    this.postMessage({
      type: "chat:status",
      payload: {
        status: "queued",
        message: "Message queued for analysis"
      }
    });
  }
  // ── Findings ─────────────────────────────────────────────────────
  handleFindingAction(action, payload) {
    if (!payload?.findingId)
      return;
    this.postMessage({ type: `finding:${action}`, payload: { findingId: payload.findingId } });
  }
  // ── Data ─────────────────────────────────────────────────────────
  clearAllData() {
    const keys = this._context.workspaceState.keys();
    const investigationKeys = keys.filter((k) => k.startsWith("investigation:"));
    Promise.all(investigationKeys.map((k) => this._context.workspaceState.update(k, void 0)));
    this.postMessage({ type: "config:cleared", payload: {} });
    vscode2.window.showInformationMessage("Sireen: All investigation data cleared.");
  }
  // ── Panel Navigation ────────────────────────────────────────────
  openPanel(panel) {
    const commandMap = {
      "war-room": "sireen.openWarRoom",
      "report-viewer": "sireen.openReportViewer"
    };
    const command = commandMap[panel];
    if (command) {
      vscode2.commands.executeCommand(command);
    } else {
      console.warn(`[SidebarProvider] Unknown panel: ${panel}`);
    }
  }
  // ── Post Message ────────────────────────────────────────────────
  postMessage(message) {
    this._view?.webview.postMessage(message);
  }
};

// src/providers/WarRoomProvider.ts
var vscode3 = __toESM(require("vscode"));
var warRoomPanel;
var WarRoomProvider = class {
  constructor(context) {
    this.context = context;
  }
  show() {
    if (warRoomPanel) {
      warRoomPanel.reveal(vscode3.ViewColumn.Beside);
      return;
    }
    const panel = vscode3.window.createWebviewPanel(
      "sireen.warRoom",
      "War Room \u2014 Live Pipeline",
      { viewColumn: vscode3.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode3.Uri.joinPath(this.context.extensionUri, "dist"),
          vscode3.Uri.joinPath(this.context.extensionUri, "media")
        ]
      }
    );
    panel.iconPath = {
      light: vscode3.Uri.joinPath(this.context.extensionUri, "media", "shield.svg"),
      dark: vscode3.Uri.joinPath(this.context.extensionUri, "media", "shield.svg")
    };
    panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionUri, "war-room");
    panel.webview.onDidReceiveMessage((message) => this.handleMessage(message));
    panel.onDidDispose(() => {
      warRoomPanel = void 0;
    });
    warRoomPanel = panel;
  }
  postMessage(message) {
    warRoomPanel?.webview.postMessage(message);
  }
  handleMessage(message) {
    switch (message.type) {
      case "ready":
        this.postConfig();
        break;
      case "pipeline:retry":
        vscode3.commands.executeCommand("sireen.runPipeline");
        break;
      case "report:export":
        this.exportReport(message.payload?.reportId);
        break;
      case "report:copy":
        this.copyReport(message.payload?.format);
        break;
      case "error":
        vscode3.window.showErrorMessage(message.payload?.message || "Sireen: An error occurred");
        break;
      default:
        console.warn(`[WarRoomProvider] Unhandled message type: ${message.type}`);
        break;
    }
  }
  postConfig() {
    const config = vscode3.workspace.getConfiguration("sireen");
    this.postMessage({
      type: "config",
      payload: {
        aiProvider: config.get("aiProvider"),
        aiModel: config.get("aiModel"),
        forgePath: config.get("forgePath"),
        dockerEnabled: config.get("dockerEnabled")
      }
    });
  }
  async exportReport(reportId) {
    if (!reportId) {
      vscode3.window.showErrorMessage("Sireen: No report ID provided for export");
      return;
    }
    const report = this.context.workspaceState.get(`report:${reportId}`);
    if (!report) {
      vscode3.window.showErrorMessage(`Sireen: Report "${reportId}" not found`);
      return;
    }
    const format = await vscode3.window.showQuickPick(
      ["Markdown", "HTML", "JSON"],
      { placeHolder: "Select export format" }
    );
    if (!format)
      return;
    const content = this.formatReport(report, format.toLowerCase());
    const doc = await vscode3.workspace.openTextDocument({
      content,
      language: format.toLowerCase()
    });
    await vscode3.window.showTextDocument(doc, { preview: false });
  }
  copyReport(format) {
    const keys = this.context.workspaceState.keys().filter((k) => k.startsWith("report:"));
    if (keys.length === 0) {
      vscode3.window.showWarningMessage("No reports available to copy");
      return;
    }
    const latestKey = keys.sort().pop();
    const report = this.context.workspaceState.get(latestKey);
    if (report) {
      const content = this.formatReport(report, format || "markdown");
      vscode3.env.clipboard.writeText(content);
      vscode3.window.showInformationMessage(`Report copied as ${format || "Markdown"}`);
    }
  }
  formatReport(report, format) {
    switch (format) {
      case "json":
        return JSON.stringify(report, null, 2);
      case "html":
        return this.reportToHtml(report);
      case "markdown":
      default:
        return this.reportToMarkdown(report);
    }
  }
  reportToMarkdown(report) {
    const findings = report.findings || [];
    const pocResults = report.pocResults || [];
    const honestSignal = report.honestSignal;
    return `# ${report.target?.name || "Contract"} \u2014 Exploit Verification Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Target:** ${report.target?.name || "Unknown"} (${report.target?.chain || "ethereum"})
**Verdict:** ${(report.verdict || "unknown").toUpperCase()}
**Confidence:** ${report.confidence ? `${Math.round(report.confidence * 100)}%` : "N/A"}

---

## Executive Summary

${report.summary || "No summary available."}

---

## Findings (${findings.length})

${findings.map((f, i) => this.findingToMarkdown(f, i + 1)).join("\n\n---\n\n")}

---

## Proof of Concept Results

${pocResults.map((p) => this.pocToMarkdown(p)).join("\n\n")}

---

## Honest Signal Validation

**Passed:** ${honestSignal?.passed ? "YES" : "NO"}
**Confidence:** ${honestSignal?.confidence ? `${Math.round(honestSignal.confidence * 100)}%` : "N/A"}
**Critique:** ${honestSignal?.critique || "No critique available"}

---

## Evidence

${report.evidence?.map((e) => `- [${e.type}] ${e.description} (${e.url || "N/A"})`).join("\n") || "No evidence recorded"}

---

*Report generated by Sireen \u2014 AI-Powered Smart Contract Exploit Verification*
`;
  }
  findingToMarkdown(f, index) {
    return `### ${index}. ${f.title || f.name || "Unnamed Finding"}

**Severity:** ${f.severity || "unknown".toUpperCase()}
**Category:** ${f.category || "unknown"}
**Location:** ${f.location || "N/A"}
**Confidence:** ${f.confidence ? `${Math.round(f.confidence * 100)}%` : "N/A"}

${f.description || "No description"}

**Attack Vector:** ${f.attackVector || "Not specified"}

**Remediation:** ${f.remediation || "Not specified"}
`;
  }
  pocToMarkdown(p) {
    return `#### PoC: ${p.findingId || p.name || "Unknown"}

**Status:** ${p.passed ? "PASSED \u2705" : "FAILED \u274C"}
**Gas Used:** ${p.gasUsed || "N/A"}
**Block Number:** ${p.blockNumber || "N/A"}

\`\`\`solidity
${p.code || "// No PoC code available"}
\`\`\`

**Execution Log:**
${p.logs?.join("\n") || "No logs available"}
`;
  }
  reportToHtml(report) {
    const md = this.reportToMarkdown(report);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    h1, h2, h3, h4 { color: #1a1a2e; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 4px; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    .verdict { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; }
    .verdict-true { background: #dcfce7; color: #166534; }
    .verdict-false { background: #fee2e2; color: #991b1b; }
    .verdict-inconclusive { background: #fef3c7; color: #92400e; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  </style>
</head>
<body>
${md.replace(/^# (.*$)/gm, "<h1>$1</h1>").replace(/^## (.*$)/gm, "<h2>$1</h2>").replace(/^### (.*$)/gm, "<h3>$1</h3>").replace(/^#### (.*$)/gm, "<h4>$1</h4>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n\n/g, "<p></p>").replace(/\n/g, "<br>").replace(/\`\`\`(\w+)?\n([\s\S]*?)\n\`\`\`/g, "<pre><code>$2</code></pre>").replace(/\`([^\`]+)\`/g, "<code>$1</code>")}
</body>
</html>`;
  }
};

// src/pipeline/PipelineManager.ts
var path3 = __toESM(require("path"));
var fs4 = __toESM(require("fs"));
var os2 = __toESM(require("os"));

// src/ai/AIClient.ts
var PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  openrouter: "https://openrouter.ai/api/v1"
};
var DEFAULT_MAX_TOKENS = 4096;
var DEFAULT_TEMPERATURE = 0.2;
var AIClient = class {
  constructor(config) {
    this.config = {
      provider: config.provider || "openrouter",
      apiKey: config.apiKey,
      model: config.model || "openai/o3-mini",
      baseUrl: config.baseUrl,
      maxTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE
    };
  }
  getBaseUrl() {
    return this.config.baseUrl || PROVIDER_BASE_URLS[this.config.provider];
  }
  /**
   * Send a chat completion request to the LLM.
   * Returns the text content of the response.
   */
  async chat(messages, options) {
    const url = `${this.getBaseUrl()}/chat/completions`;
    const body = {
      model: this.config.model,
      messages,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature
    };
    const headers = {
      "Content-Type": "application/json",
      ...this.config.provider === "anthropic" ? { "x-api-key": this.config.apiKey } : { Authorization: `Bearer ${this.config.apiKey}` }
    };
    if (this.config.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://sireen.dev";
      headers["X-Title"] = "Sireen";
    }
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown error");
      throw new Error(`AI API error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI API returned empty response");
    }
    return content;
  }
  /**
   * Simple prompt wrapper — sends a system message and user prompt.
   */
  async prompt(systemPrompt, userPrompt, options) {
    return this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      options
    );
  }
  /**
   * Extract JSON from LLM response, handling markdown fences.
   */
  static extractJSON(text) {
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(jsonStr);
  }
  /**
   * Extract Solidity code from LLM response, handling markdown fences.
   */
  static extractSolidity(text) {
    const solMatch = text.match(/```solidity\n([\s\S]*?)```/);
    if (solMatch)
      return solMatch[1].trim();
    const codeMatch = text.match(/```\n?([\s\S]*?)```/);
    if (codeMatch)
      return codeMatch[1].trim();
    return text.trim();
  }
};

// src/pipeline/PoCGenerator.ts
var fs2 = __toESM(require("fs"));
var os = __toESM(require("os"));
var path2 = __toESM(require("path"));
var import_child_process = require("child_process");
var POC_SYSTEM_PROMPT = `You are an expert Solidity security engineer generating Foundry PoC tests.

Generate a **self-contained Foundry test** that proves or disproves the attack hypothesis.

Requirements:
- Use pragma solidity ^0.8.19
- Import forge-std/Test.sol: import "forge-std/Test.sol";
- The contract MUST be named "PoC" and extend Test: contract PoC is Test {
- Include a setUp() function that deploys contracts and sets initial state
- Include a function named "testExploit()" that executes the attack
- Use forge-std cheats (vm.prank, vm.startPrank, vm.stopPrank, vm.deal, etc.)
- Use assert statements to verify the exploit outcome
- DO NOT use console.log \u2014 use assert-based verification
- Make the test DETERMINISTIC \u2014 no randomness, no block number dependency
- If forking, use vm.createSelectFork(forkUrl) in setUp()
- Include comprehensive assertions that check:
  1. The attacker's balance of the target token increased
  2. The protocol lost the expected amount
  3. Any relevant state changes

IMPORTANT: Output ONLY the Solidity code. No explanations, no markdown outside the code block.`;
var REPAIR_SYSTEM_PROMPT = `You are an expert Solidity debugger. The Foundry test below failed to compile.

Fix ALL compilation errors. Output the COMPLETE fixed test file.

Common issues to check:
- Missing imports (forge-std/Test.sol)
- Interface mismatches
- Wrong pragma version
- Missing semicolons
- Type mismatches
- Undefined variables or functions
- Wrong cheat syntax

Output ONLY the complete fixed Solidity code. No explanations.`;
var FORGE_STD_STUB = `// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface Vm {
    function createSelectFork(string calldata) external returns (uint256);
    function createFork(string calldata) external returns (uint256);
    function selectFork(uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function startPrank(address, address) external;
    function stopPrank() external;
    function deal(address, uint256) external;
    function warp(uint256) external;
    function roll(uint256) external;
    function expectRevert(bytes calldata) external;
    function expectRevert() external;
    function expectEmit(bool, bool, bool, bool) external;
    function record() external;
    function accesses(address, bytes32) external returns (bool, bool);
    function label(address, string calldata) external;
    function getBlockNumber() external returns (uint256);
    function getBlockTimestamp() external returns (uint256);
    function toString(address) external returns (string memory);
    function toString(uint256) external returns (string memory);
    function toString(bytes32) external returns (string memory);
    function assume(bool) external;
}

abstract contract StdAssertions {
    function assertTrue(bool c) public pure { require(c, "assertTrue"); }
    function assertTrue(bool c, string memory e) public pure { require(c, e); }
    function assertEq(uint256 a, uint256 b) public pure { require(a == b, "assertEq(uint256)"); }
    function assertEq(uint256 a, uint256 b, string memory e) public pure { require(a == b, e); }
    function assertEq(address a, address b) public pure { require(a == b, "assertEq(address)"); }
    function assertEq(address a, address b, string memory e) public pure { require(a == b, e); }
    function assertEq(bytes32 a, bytes32 b) public pure { require(a == b, "assertEq(bytes32)"); }
    function assertEq(string memory a, string memory b) public pure { require(keccak256(bytes(a)) == keccak256(bytes(b)), "assertEq(string)"); }
    function assertGt(uint256 a, uint256 b) public pure { require(a > b, "assertGt"); }
    function assertGe(uint256 a, uint256 b) public pure { require(a >= b, "assertGe"); }
    function assertLt(uint256 a, uint256 b) public pure { require(a < b, "assertLt"); }
    function assertLe(uint256 a, uint256 b) public pure { require(a <= b, "assertLe"); }
    function assertNotEq(uint256 a, uint256 b) public pure { require(a != b, "assertNotEq"); }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 tol) public pure { require(a >= b ? a - b <= tol : b - a <= tol, "assertApproxEqAbs"); }
}

abstract contract Test is StdAssertions {
    Vm public constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    uint256 internal constant DEFAULT_TEST_GAS = 1_000_000_000;

    function setUp() public virtual;
    function testExploit() public virtual;
}`;
var PoCGenerator = class {
  constructor(aiClient, forgePath, maxRetries = 3) {
    this.aiClient = aiClient;
    this.forgePath = forgePath;
    this.maxRetries = maxRetries;
  }
  /**
   * Generate a Foundry PoC test.sol from an attack hypothesis.
   * Compiles with forge and auto-repairs on failure.
   */
  async generate(request) {
    const userPrompt = this.buildGenerationPrompt(request);
    let sourceCode = await this.aiClient.prompt(POC_SYSTEM_PROMPT, userPrompt, {
      maxTokens: 4096,
      temperature: 0.1
      // Low temp for deterministic output
    });
    sourceCode = AIClient.extractSolidity(sourceCode);
    const workspaceDir = path2.join(
      os.tmpdir(),
      `sireen-poc-${Date.now()}`
    );
    const filePath = path2.join(workspaceDir, "test", "PoC.t.sol");
    const errors = [];
    let success = false;
    let attempts = 0;
    while (attempts < this.maxRetries && !success) {
      attempts++;
      this.writeForgeProject(workspaceDir, sourceCode);
      const compileResult = await this.tryCompile(workspaceDir);
      if (compileResult.success) {
        success = true;
      } else {
        errors.push(...compileResult.errors);
        if (attempts < this.maxRetries) {
          sourceCode = await this.repairPoC(sourceCode, compileResult.errors);
          sourceCode = AIClient.extractSolidity(sourceCode);
        }
      }
    }
    this.cleanup(workspaceDir);
    return {
      sourceCode,
      filePath,
      compilationAttempts: attempts,
      compilationSuccess: success,
      errors
    };
  }
  /**
   * Build the prompt for PoC generation.
   */
  buildGenerationPrompt(request) {
    const { hypothesis, targetCode, targetAddress, chain, forkUrl } = request;
    return `Generate a Foundry PoC for the following attack hypothesis:

## Vulnerability
- **Title:** ${hypothesis.title}
- **Type:** ${hypothesis.vulnerabilityType}
- **Severity:** ${hypothesis.severity}

## Affected Contracts
${hypothesis.affectedContracts.join(", ")}

## Attack Vector
${hypothesis.attackVector}

## Preconditions
${hypothesis.preconditions.map((p) => `- ${p}`).join("\n")}

## Expected Outcome
${hypothesis.expectedOutcome}

## Target Code
\`\`\`solidity
${targetCode}
\`\`\`

${targetAddress ? `## Target Address
${targetAddress}
` : ""}
${chain ? `## Chain
${chain}
` : ""}
${forkUrl ? `## Fork URL (use in setUp)
${forkUrl}
` : ""}

Generate a Foundry test that:
1. Sets up the environment in setUp() with the vulnerable contract
2. Executes the attack in testExploit() using the attack vector described
3. Asserts that the attacker gains the expected assets
4. Uses forge-std cheats (vm.prank, vm.deal, etc.)

Output ONLY the Solidity code in a single \`\`\`solidity block.`;
  }
  /**
   * Write the complete Foundry project structure to disk.
   */
  writeForgeProject(workspaceDir, sourceCode) {
    const testDir = path2.join(workspaceDir, "test");
    const libDir = path2.join(workspaceDir, "lib", "forge-std", "src");
    fs2.mkdirSync(libDir, { recursive: true });
    fs2.writeFileSync(
      path2.join(libDir, "Test.sol"),
      FORGE_STD_STUB,
      "utf-8"
    );
    fs2.writeFileSync(
      path2.join(testDir, "PoC.t.sol"),
      sourceCode,
      "utf-8"
    );
    fs2.writeFileSync(
      path2.join(workspaceDir, "foundry.toml"),
      '[profile.default]\nsrc = "test"\nlibs = ["lib"]\nsolc = "0.8.19"\n\n[profile.default.optimizer]\nenabled = true\nruns = 200\n',
      "utf-8"
    );
    fs2.writeFileSync(
      path2.join(workspaceDir, "remappings.txt"),
      "forge-std/=lib/forge-std/src/\n",
      "utf-8"
    );
  }
  /**
   * Try to compile the PoC with forge build.
   */
  async tryCompile(workspaceDir) {
    return new Promise((resolve) => {
      try {
        (0, import_child_process.execSync)(
          `${this.forgePath} build --root "${workspaceDir}" --via-ir`,
          {
            cwd: workspaceDir,
            timeout: 12e4,
            stdio: ["pipe", "pipe", "pipe"]
          }
        );
        resolve({ success: true, errors: [] });
      } catch (err) {
        const stderr = err.stderr?.toString() || "";
        const stdout = err.stdout?.toString() || "";
        const errorLines = (stderr + stdout).split("\n").filter(
          (l) => l.includes("Error") || l.includes("error") || l.includes("Warning") || l.includes("Compiler")
        );
        resolve({ success: false, errors: errorLines.length > 0 ? errorLines : [stderr] });
      }
    });
  }
  /**
   * Use AI to repair a failing PoC based on compiler errors.
   */
  async repairPoC(sourceCode, errors) {
    const repairPrompt = `The following Foundry test failed to compile:

\`\`\`solidity
${sourceCode}
\`\`\`

Compiler errors:
${errors.map((e) => `- ${e}`).join("\n")}

Fix ALL errors and output the COMPLETE fixed test file.`;
    return this.aiClient.prompt(REPAIR_SYSTEM_PROMPT, repairPrompt, {
      maxTokens: 4096,
      temperature: 0.1
    });
  }
  /**
   * Clean up the temp workspace.
   */
  cleanup(workspaceDir) {
    try {
      fs2.rmSync(workspaceDir, { recursive: true, force: true });
    } catch {
    }
  }
};

// src/pipeline/ForgeRunner.ts
var import_child_process2 = require("child_process");
var DEFAULT_FORGE_CONFIG = {
  forgePath: "forge",
  timeout: 18e4,
  verbose: true,
  dockerEnabled: false,
  dockerImage: "ghcr.io/foundry-rs/foundry:latest"
};
var ForgeRunner = class {
  constructor(config = {}) {
    this.config = { ...DEFAULT_FORGE_CONFIG, ...config };
  }
  /**
   * Run forge test in the given workspace directory.
   * Returns structured output with raw text and metadata.
   */
  async run(workspaceDir) {
    const startTime = Date.now();
    if (this.config.dockerEnabled) {
      return this.runInDocker(workspaceDir, startTime);
    }
    return this.runLocal(workspaceDir, startTime);
  }
  /**
   * Execute forge test locally.
   */
  async runLocal(workspaceDir, startTime) {
    return new Promise((resolve) => {
      try {
        const cmdParts = [
          this.config.forgePath,
          "test",
          "--match-test",
          "testExploit",
          "-vvv",
          "--root",
          `"${workspaceDir}"`
        ];
        if (this.config.forkUrl) {
          cmdParts.push("--fork-url", this.config.forkUrl);
        }
        cmdParts.push("--gas-report");
        const cmd = cmdParts.join(" ");
        const output = (0, import_child_process2.execSync)(cmd, {
          cwd: workspaceDir,
          timeout: this.config.timeout,
          stdio: ["pipe", "pipe", "pipe"],
          encoding: "utf-8",
          maxBuffer: 10 * 1024 * 1024
          // 10MB
        });
        const duration = Date.now() - startTime;
        const testResults = this.parseTestResults(output.toString());
        const gasReport = this.parseGasReport(output.toString());
        const compilationErrors = [];
        resolve({
          raw: output.toString(),
          testResults,
          gasReport: gasReport?.total ? gasReport : void 0,
          compilationErrors,
          exitCode: 0,
          duration
        });
      } catch (err) {
        const duration = Date.now() - startTime;
        const stderr = err.stderr?.toString() || "";
        const stdout = err.stdout?.toString() || "";
        const raw = stdout + stderr;
        const compilationErrors = this.extractCompilationErrors(raw);
        const testResults = this.parseTestResults(raw);
        const gasReport = this.parseGasReport(raw);
        resolve({
          raw,
          testResults,
          gasReport: gasReport?.total ? gasReport : void 0,
          compilationErrors,
          exitCode: err.status ?? 1,
          duration
        });
      }
    });
  }
  /**
   * Execute forge test inside a Docker container.
   */
  async runInDocker(workspaceDir, startTime) {
    try {
      const containerName = `sireen-forge-${Date.now()}`;
      (0, import_child_process2.execSync)("docker info", { timeout: 1e4, stdio: "pipe" });
      const mountDir = "/workspace";
      const runCmd = [
        "docker",
        "run",
        "--rm",
        "--name",
        containerName,
        "-v",
        `${workspaceDir}:${mountDir}`,
        "-w",
        mountDir,
        this.config.dockerImage,
        "forge",
        "test",
        "--match-test",
        "testExploit",
        "-vvv"
      ];
      if (this.config.forkUrl) {
        runCmd.push("--fork-url", this.config.forkUrl);
      }
      runCmd.push("--gas-report");
      const output = (0, import_child_process2.execSync)(runCmd.join(" "), {
        timeout: this.config.timeout,
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024
      });
      const duration = Date.now() - startTime;
      const raw = output.toString();
      const testResults = this.parseTestResults(raw);
      const gasReport = this.parseGasReport(raw);
      return {
        raw,
        testResults,
        gasReport: gasReport?.total ? gasReport : void 0,
        compilationErrors: [],
        exitCode: 0,
        duration
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const stderr = err.stderr?.toString() || "";
      const stdout = err.stdout?.toString() || "";
      const raw = stdout + stderr;
      const compilationErrors = this.extractCompilationErrors(raw);
      const testResults = this.parseTestResults(raw);
      return {
        raw,
        testResults,
        compilationErrors,
        exitCode: err.status ?? 1,
        duration
      };
    }
  }
  /**
   * Compile-only check (used by PoCGenerator during the repair loop).
   */
  compile(workspaceDir) {
    try {
      (0, import_child_process2.execSync)(
        `${this.config.forgePath} build --root "${workspaceDir}" --via-ir`,
        {
          cwd: workspaceDir,
          timeout: 12e4,
          stdio: ["pipe", "pipe", "pipe"],
          encoding: "utf-8"
        }
      );
      return { success: true, errors: [] };
    } catch (err) {
      const stderr = err.stderr?.toString() || "";
      const stdout = err.stdout?.toString() || "";
      const errorLines = this.extractCompilationErrors(stderr + stdout);
      return { success: false, errors: errorLines.length > 0 ? errorLines : [stderr] };
    }
  }
  // ─── Parsing Helpers ──────────────────────────────────────────────────────
  parseTestResults(raw) {
    const results = [];
    const passRegex = /\[PASS\]\s+(test\S+)\s+\(gas:\s*(\d+)\)/g;
    const failRegex = /\[FAIL\.\s*(Reason:\s*.*?)?\]\s+(test\S+)/g;
    let match;
    while ((match = passRegex.exec(raw)) !== null) {
      results.push({
        name: match[1],
        status: "pass",
        gasUsed: parseInt(match[2], 10)
      });
    }
    while ((match = failRegex.exec(raw)) !== null) {
      results.push({
        name: match[2],
        status: "fail",
        error: match[1] || void 0
      });
    }
    return results;
  }
  parseGasReport(raw) {
    const byFunction = {};
    let total = 0;
    const reportMatch = raw.match(/Gas Report:\s*([\s\S]*?)(?=\n\n|\n─|$)/);
    if (reportMatch) {
      const lines = reportMatch[1].split("\n");
      for (const line of lines) {
        const fnMatch = line.match(/\|(.+?)\|.*?\|\s*(\d+)\s*\|/);
        if (fnMatch) {
          const fnName = fnMatch[1].trim();
          const gas = parseInt(fnMatch[2], 10);
          byFunction[fnName] = gas;
          total += gas;
        }
      }
    }
    return { total, byFunction };
  }
  extractCompilationErrors(raw) {
    return raw.split("\n").filter(
      (l) => l.includes("Error") || l.includes("error") || l.includes("Compiler") || l.includes("compilation") || l.includes("Syntax") || l.includes("TypeError") || l.includes("DeclarationError") || l.includes("ParserError") || l.includes("Failing")
    ).filter((l) => !l.includes("forge-std"));
  }
};

// src/pipeline/OutputParser.ts
var OutputParser = class {
  /**
   * Parse raw forge output into structured exploit result.
   */
  parseExploitResult(forgeOutput, attackerAddress) {
    const raw = forgeOutput.raw;
    const testResults = forgeOutput.testResults;
    const exploitTest = testResults.find(
      (t) => t.name === "testExploit" || t.name.includes("testExploit")
    );
    const success = exploitTest?.status === "pass";
    const attackerProfit = this.extractAttackerProfit(raw, success);
    const profitToken = this.extractProfitToken(raw);
    const tokenBalances = this.extractTokenBalances(raw);
    const moneyFlow = this.extractMoneyFlow(raw);
    const revertedTransactions = this.extractRevertedTransactions(raw);
    const gasUsage = this.extractGasUsage(raw, testResults);
    const profitUSD = 0;
    return {
      success,
      attackerProfit: attackerProfit || (success ? "Unknown (test passed)" : "N/A"),
      profitToken,
      profitUSD,
      tokenBalances,
      moneyFlow,
      revertedTransactions,
      gasUsage
    };
  }
  /**
   * Extract attacker profit amount from output.
   * Looks for assert statements, balance checks, and log patterns.
   */
  extractAttackerProfit(raw, exploitSuccessful) {
    if (!exploitSuccessful)
      return "0";
    const balancePatterns = [
      /attacker.*?balance[:\s]*(\d+[.]?\d*)/i,
      /profit[:\s]*(\d+[.]?\d*)/i,
      /drained[:\s]*(\d+[.]?\d*)/i,
      /stolen[:\s]*(\d+[.]?\d*)/i,
      /gain[:\s]*(\d+[.]?\d*)/i
    ];
    for (const pattern of balancePatterns) {
      const match = raw.match(pattern);
      if (match)
        return match[1];
    }
    const assertMatch = raw.match(
      /assertEq.*?attacker.*?balance.*?(\d+[.]?\d*\s*(?:ether|wei)?)/i
    );
    if (assertMatch)
      return assertMatch[1].trim();
    return "See forge output for details";
  }
  /**
   * Extract the token symbol used in the profit.
   */
  extractProfitToken(raw) {
    const tokenPatterns = [
      /profit.*?token[:\s]*(\w+)/i,
      /in\s+(\w+)\s+token/i,
      /(\w+)\s+drained/i,
      /(\w+)\s+stolen/i
    ];
    for (const pattern of tokenPatterns) {
      const match = raw.match(pattern);
      if (match)
        return match[1].toUpperCase();
    }
    return "ETH";
  }
  /**
   * Extract token balances for all addresses mentioned.
   */
  extractTokenBalances(raw) {
    const balances = {};
    const balanceRegex = /(\w+(?:\[\d+\])?|0x[a-fA-F0-9]{40})\s+(\w+)\s+balance[:\s]*(\d+[.]?\d*)/gi;
    let match;
    while ((match = balanceRegex.exec(raw)) !== null) {
      const address = match[1].toLowerCase();
      const token = match[2].toUpperCase();
      const amount = match[3];
      if (!balances[address]) {
        balances[address] = {};
      }
      balances[address][token] = amount;
    }
    return balances;
  }
  /**
   * Extract money flow entries from forge output.
   * Looks for Transfer events, console.log statements, and call traces.
   */
  extractMoneyFlow(raw) {
    const flow = [];
    const transferRegex = /Transfer\(?\s*(?:from:\s*)?(\w+|0x[a-fA-F0-9]{40})\s*,?\s*(?:to:\s*)?(\w+|0x[a-fA-F0-9]{40})\s*,?\s*(?:value:\s*)?(\d+[.]?\d*)\s*(?:wei|ether)?\)?/gi;
    let match;
    while ((match = transferRegex.exec(raw)) !== null) {
      flow.push({
        from: match[1],
        to: match[2],
        token: "ETH",
        amount: match[3],
        type: "transfer"
      });
    }
    const logRegex = /(?:from|sender)[:\s]*(\w+|0x[a-fA-F0-9]{40})[\s,]+(?:to|receiver)[:\s]*(\w+|0x[a-fA-F0-9]{40})[\s,]+(?:amount|value)[:\s]*(\d+[.]?\d*)/gi;
    while ((match = logRegex.exec(raw)) !== null) {
      flow.push({
        from: match[1],
        to: match[2],
        token: "ETH",
        amount: match[3],
        type: "transfer"
      });
    }
    return flow;
  }
  /**
   * Extract reverted transactions from forge output.
   */
  extractRevertedTransactions(raw) {
    const reverted = [];
    const failRegex = /\[FAIL\.\s*Reason:\s*(.*?)\]\s*(\w+)?|Revert\s*(.*?)$|reverted\s*(?:with\s*)?(.*?)$/gim;
    let match;
    let index = 0;
    while ((match = failRegex.exec(raw)) !== null) {
      const reason = (match[1] || match[3] || match[4] || "Unknown").trim();
      reverted.push({
        index: index++,
        reason,
        gasUsed: 0
        // Will be updated if gas data is available
      });
    }
    return reverted;
  }
  /**
   * Extract gas usage from forge output and test results.
   */
  extractGasUsage(raw, testResults) {
    const byOperation = {};
    for (const test of testResults) {
      if (test.gasUsed) {
        byOperation[test.name] = test.gasUsed;
      }
    }
    const gasSection = raw.match(/Gas Report:[\s\S]*?(?=\n\n|\n─|$)/);
    if (gasSection) {
      const lines = gasSection[0].split("\n");
      for (const line of lines) {
        const fnMatch = line.match(/\|(.+?)\|.*?\|\s*(\d+)\s*\|/);
        if (fnMatch) {
          byOperation[fnMatch[1].trim()] = parseInt(fnMatch[2], 10);
        }
      }
    }
    const total = Object.values(byOperation).reduce((a, b) => a + b, 0);
    return { total, byOperation };
  }
  /**
   * Check if the forge output indicates compile errors vs test failures.
   */
  hasCompilationErrors(raw) {
    return raw.includes("Compiler run failed") || raw.includes("Error: Compiler") || raw.includes("ParserError:") || raw.includes("TypeError:") || raw.includes("DeclarationError:") || raw.includes("Error") && raw.includes("sol");
  }
  /**
   * Extract overall outcome summary from forge output.
   */
  extractOutcomeSummary(raw) {
    if (this.hasCompilationErrors(raw)) {
      return "compilation_error";
    }
    if (raw.includes("[PASS]")) {
      return raw.includes("[FAIL]") ? "partial" : "success";
    }
    return "failure";
  }
};

// src/pipeline/HonestSignal.ts
var HonestSignalEvaluator = class {
  /**
   * Evaluate whether the exploit is confirmed based on all evidence.
   */
  evaluate(input) {
    const conditions = [];
    const forgePassed = this.checkForgePassed(input.forgeOutput);
    conditions.push(forgePassed);
    const exploitConditions = this.checkExploitConditions(input);
    conditions.push(exploitConditions);
    const assetGain = this.checkAssetGain(input.exploitResult, input.hypothesis);
    conditions.push(assetGain);
    const allSatisfied = conditions.every((c) => c.satisfied);
    const confidence = this.calculateConfidence(conditions);
    const explanation = this.buildExplanation(conditions, allSatisfied);
    return {
      confirmed: allSatisfied,
      confidence,
      conditions,
      explanation
    };
  }
  /**
   * Condition 1: forge test passed with [PASS] for testExploit.
   */
  checkForgePassed(forgeOutput) {
    const exploitTest = forgeOutput.testResults.find(
      (t) => t.name === "testExploit" || t.name.includes("testExploit")
    );
    const passed = exploitTest?.status === "pass";
    return {
      name: "Foundry test passing",
      satisfied: passed,
      detail: passed ? `testExploit() passed${exploitTest?.gasUsed ? ` (gas: ${exploitTest.gasUsed})` : ""}` : forgeOutput.compilationErrors.length > 0 ? `Compilation failed: ${forgeOutput.compilationErrors.join("; ")}` : "testExploit() did not return [PASS] \u2014 exploit logic may be incorrect"
    };
  }
  /**
   * Condition 2: Exploit conditions are satisfied.
   * Checks that the test executed without reverts and assertions passed.
   */
  checkExploitConditions(input) {
    const { forgeOutput, exploitResult } = input;
    const { testResults } = forgeOutput;
    const exploitTest = testResults.find(
      (t) => t.name === "testExploit" || t.name.includes("testExploit")
    );
    if (!exploitTest) {
      return {
        name: "Exploit conditions met",
        satisfied: false,
        detail: "testExploit() function was not found in test results"
      };
    }
    const hasUnexpectedRevert = exploitTest.status === "fail" && exploitTest.error;
    const noUnexpectedAsserts = exploitTest.status === "pass";
    const satisfied = exploitTest.status === "pass" && !hasUnexpectedRevert;
    return {
      name: "Exploit conditions met",
      satisfied,
      detail: satisfied ? "testExploit() executed successfully \u2014 all assertions passed, no unexpected reverts" : hasUnexpectedRevert ? `testExploit() failed: ${exploitTest.error || "Unknown error"}` : "testExploit() did not pass \u2014 conditions not satisfied"
    };
  }
  /**
   * Condition 3: Attacker gained expected assets.
   * Checks profit > 0 or attacker balance increased for the target asset.
   */
  checkAssetGain(exploitResult, hypothesis) {
    const expectedOutcome = hypothesis.expectedOutcome.toLowerCase();
    const attackerProfit = exploitResult.attackerProfit;
    const profitValue = parseFloat(attackerProfit.replace(/[^0-9.]/g, ""));
    const hasProfit = !isNaN(profitValue) && profitValue > 0;
    const attackerFlows = exploitResult.moneyFlow.filter(
      (f) => f.to.toLowerCase() === "attacker" || f.to === exploitResult.attackerProfit
    );
    const hasIncomingFlow = attackerFlows.length > 0;
    const attackerBalances = exploitResult.tokenBalances["attacker"];
    const hasBalanceIncrease = attackerBalances && Object.values(attackerBalances).some(
      (v) => parseFloat(v) > 0
    );
    const satisfied = hasProfit || hasIncomingFlow || hasBalanceIncrease;
    const details = [];
    if (hasProfit)
      details.push(`Attacker profit: ${attackerProfit}`);
    if (hasIncomingFlow) {
      details.push(
        `Incoming transfers: ${attackerFlows.map((f) => `${f.amount} ${f.token} from ${f.from}`).join(", ")}`
      );
    }
    if (hasBalanceIncrease) {
      details.push(
        `Balance increase: ${Object.entries(attackerBalances || {}).map(([k, v]) => `${v} ${k}`).join(", ")}`
      );
    }
    if (expectedOutcome && satisfied) {
      details.push(`Expected outcome matches: "${hypothesis.expectedOutcome}"`);
    }
    const detail = satisfied ? details.join(". ") : `No evidence of asset gain. Profit: "${attackerProfit}". Expected: "${hypothesis.expectedOutcome}"`;
    return {
      name: "Attacker gained expected assets",
      satisfied,
      detail
    };
  }
  /**
   * Calculate confidence score (0–1) based on how many conditions are met
   * and the quality of evidence.
   */
  calculateConfidence(conditions) {
    if (conditions.length === 0)
      return 0;
    const satisfied = conditions.filter((c) => c.satisfied).length;
    const baseScore = satisfied / conditions.length;
    const detailQuality = conditions.filter((c) => c.satisfied).filter((c) => c.detail.includes("gas:") || c.detail.includes("profit")).length;
    const bonus = detailQuality * 0.05;
    return Math.min(1, baseScore + bonus);
  }
  /**
   * Build a human-readable explanation of the verdict.
   */
  buildExplanation(conditions, allSatisfied) {
    if (allSatisfied) {
      return `EXPLOIT CONFIRMED: All ${conditions.length} verification conditions are satisfied. The generated Foundry PoC successfully demonstrates the vulnerability with the attacker gaining the expected assets.`;
    }
    const failed = conditions.filter((c) => !c.satisfied).map((c) => `- ${c.name}: ${c.detail}`);
    return `EXPLOIT NOT CONFIRMED: ${failed.length} of ${conditions.length} conditions failed:
${failed.join("\n")}`;
  }
};

// src/pipeline/ReportBuilder.ts
var ReportBuilder = class {
  /**
   * Build a complete investigation report.
   */
  build(input) {
    const verdict = this.determineVerdict(input.honestSignal);
    const evidence = this.buildEvidence(input);
    const timeline = this.buildTimeline(input);
    const summary = this.buildSummary(input, verdict);
    return {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      target: input.target,
      targetAddress: input.targetAddress,
      chain: input.chain,
      hypothesis: input.hypothesis,
      poc: input.poc,
      forgeOutput: input.forgeOutput,
      exploitResult: input.exploitResult,
      honestSignal: input.honestSignal,
      moneyFlow: input.moneyFlow,
      evidence,
      timeline,
      verdict,
      summary,
      generatedAt: Date.now()
    };
  }
  /**
   * Export report in specified format.
   */
  export(report, format) {
    switch (format) {
      case "markdown":
        return this.toMarkdown(report);
      case "html":
        return this.toHtml(report);
      case "json":
        return JSON.stringify(report, null, 2);
      default:
        return this.toMarkdown(report);
    }
  }
  /**
   * Determine the final verdict based on honest signal.
   */
  determineVerdict(signal) {
    if (signal.confirmed)
      return "confirmed";
    if (signal.confidence > 0)
      return "inconclusive";
    return "not_confirmed";
  }
  /**
   * Build evidence items from pipeline results.
   */
  buildEvidence(input) {
    const evidence = [];
    const now = Date.now();
    evidence.push({
      id: `ev-poc-${now}`,
      type: "code",
      title: "Generated Exploit PoC",
      description: `Foundry test generated after ${input.poc.compilationAttempts} compilation attempts`,
      content: input.poc.sourceCode,
      tags: ["poc", "foundry", "solidity"],
      pinned: true,
      createdAt: now
    });
    evidence.push({
      id: `ev-forge-${now}`,
      type: "log",
      title: "Forge Test Output",
      description: `Exit code: ${input.forgeOutput.exitCode}, Duration: ${input.forgeOutput.duration}ms`,
      content: input.forgeOutput.raw.slice(0, 5e4),
      tags: ["forge", "test-output"],
      pinned: true,
      createdAt: now
    });
    if (input.moneyFlow.length > 0) {
      const flowContent = input.moneyFlow.map((f) => `[${f.type.toUpperCase()}] ${f.from} \u2192 ${f.to}: ${f.amount} ${f.token}`).join("\n");
      evidence.push({
        id: `ev-flow-${now}`,
        type: "trace",
        title: "Money Flow Trace",
        description: `${input.moneyFlow.length} transactions tracked`,
        content: flowContent,
        tags: ["money-flow", "trace"],
        pinned: true,
        createdAt: now
      });
    }
    evidence.push({
      id: `ev-verdict-${now}`,
      type: "other",
      title: `Verdict: ${input.honestSignal.confirmed ? "CONFIRMED" : "NOT CONFIRMED"}`,
      description: `Confidence: ${(input.honestSignal.confidence * 100).toFixed(0)}%`,
      content: input.honestSignal.explanation,
      tags: ["verdict", "honest-signal"],
      pinned: true,
      createdAt: now
    });
    return evidence;
  }
  /**
   * Build timeline of pipeline events.
   */
  buildTimeline(input) {
    const now = Date.now();
    const timeline = [];
    const baseTime = now - 6e4;
    timeline.push({
      id: `tl-start-${now}`,
      type: "investigation_start",
      title: "Investigation Started",
      description: `Target: ${input.target} on ${input.chain}`,
      timestamp: baseTime
    });
    timeline.push({
      id: `tl-hypothesis-${now}`,
      type: "finding_discovered",
      title: "Attack Hypothesis Formed",
      description: `${input.hypothesis.title} (${input.hypothesis.vulnerabilityType})`,
      timestamp: baseTime + 1e4,
      severity: input.hypothesis.severity
    });
    timeline.push({
      id: `tl-poc-${now}`,
      type: "exploit_simulated",
      title: "PoC Generated",
      description: `${input.poc.compilationSuccess ? "Compilation successful" : "Compilation failed"} after ${input.poc.compilationAttempts} attempt(s)`,
      timestamp: baseTime + 3e4
    });
    timeline.push({
      id: `tl-forge-${now}`,
      type: "exploit_simulated",
      title: "Forge Test Executed",
      description: `${input.forgeOutput.testResults.length} tests, exit code ${input.forgeOutput.exitCode}`,
      timestamp: baseTime + 45e3
    });
    timeline.push({
      id: `tl-verdict-${now}`,
      type: input.honestSignal.confirmed ? "finding_verified" : "analysis_complete",
      title: input.honestSignal.confirmed ? "Exploit Confirmed" : "Exploit Not Confirmed",
      description: input.honestSignal.explanation.slice(0, 200),
      timestamp: now,
      severity: input.honestSignal.confirmed ? "critical" : "none"
    });
    return timeline;
  }
  /**
   * Build a human-readable summary of the investigation.
   */
  buildSummary(input, verdict) {
    const parts = [];
    parts.push(`## Investigation Summary: ${input.hypothesis.title}`);
    parts.push("");
    parts.push(`**Target:** ${input.target}${input.targetAddress ? ` (${input.targetAddress})` : ""}`);
    parts.push(`**Chain:** ${input.chain}`);
    parts.push(`**Vulnerability Type:** ${input.hypothesis.vulnerabilityType}`);
    parts.push(`**Verdict:** ${verdict.toUpperCase()}`);
    parts.push(`**Confidence:** ${(input.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push("");
    if (input.poc.compilationSuccess) {
      parts.push(`**PoC:** \u2705 Compiled successfully after ${input.poc.compilationAttempts} attempt(s)`);
    } else {
      parts.push(`**PoC:** \u274C Compilation failed after ${input.poc.compilationAttempts} attempt(s)`);
      if (input.poc.errors.length > 0) {
        parts.push(`Errors: ${input.poc.errors.slice(0, 3).join("; ")}`);
      }
    }
    const passedTests = input.forgeOutput.testResults.filter((t) => t.status === "pass").length;
    const failedTests = input.forgeOutput.testResults.filter((t) => t.status === "fail").length;
    parts.push(`**Forge Test:** ${passedTests} passed, ${failedTests} failed (exit code: ${input.forgeOutput.exitCode})`);
    if (input.exploitResult.success) {
      parts.push(`**Exploit:** \u2705 Successful \u2014 Attacker profit: ${input.exploitResult.attackerProfit} ${input.exploitResult.profitToken}`);
    } else {
      parts.push(`**Exploit:** \u274C Not successful`);
    }
    if (input.moneyFlow.length > 0) {
      parts.push(`**Money Flow:** ${input.moneyFlow.length} transactions tracked`);
    }
    const satisfied = input.honestSignal.conditions.filter((c) => c.satisfied).length;
    const total = input.honestSignal.conditions.length;
    parts.push(`**Verification:** ${satisfied}/${total} conditions met`);
    parts.push("");
    parts.push(input.honestSignal.explanation);
    return parts.join("\n");
  }
  /**
   * Export to professional Markdown format.
   */
  toMarkdown(report) {
    const parts = [];
    parts.push(`# ${report.target} \u2014 Exploit Verification Report`);
    parts.push("");
    parts.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`);
    parts.push(`**Chain:** ${report.chain}`);
    parts.push(`**Verdict:** \`${report.verdict.toUpperCase()}\``);
    parts.push(`**Confidence:** ${(report.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push("");
    parts.push("## Executive Summary");
    parts.push("");
    parts.push(report.summary);
    parts.push("");
    parts.push("## Attack Hypothesis");
    parts.push("");
    parts.push(`**Title:** ${report.hypothesis.title}`);
    parts.push(`**Type:** ${report.hypothesis.vulnerabilityType}`);
    parts.push(`**Severity:** ${report.hypothesis.severity.toUpperCase()}`);
    parts.push(`**Confidence:** ${(report.hypothesis.confidence * 100).toFixed(0)}%`);
    parts.push("");
    parts.push(`**Attack Vector:** ${report.hypothesis.attackVector}`);
    parts.push("");
    parts.push("**Preconditions:**");
    report.hypothesis.preconditions.forEach((p) => parts.push(`- ${p}`));
    parts.push("");
    parts.push(`**Expected Outcome:** ${report.hypothesis.expectedOutcome}`);
    parts.push("");
    parts.push("## Remediation Guidance");
    parts.push("");
    parts.push(this.getRemediationGuidance(report.hypothesis.vulnerabilityType));
    parts.push("");
    parts.push("## Proof of Concept");
    parts.push("");
    parts.push(`**Compilation:** ${report.poc.compilationSuccess ? "\u2705 Success" : "\u274C Failed"} (${report.poc.compilationAttempts} attempts)`);
    if (!report.poc.compilationSuccess && report.poc.errors.length > 0) {
      parts.push("");
      parts.push("**Errors:**");
      report.poc.errors.forEach((e) => parts.push(`- ${e}`));
    }
    parts.push("");
    parts.push("```solidity");
    parts.push(report.poc.sourceCode);
    parts.push("```");
    parts.push("");
    parts.push("## Forge Test Execution");
    parts.push("");
    parts.push(`**Exit Code:** ${report.forgeOutput.exitCode}`);
    parts.push(`**Duration:** ${report.forgeOutput.duration}ms`);
    parts.push(`**Tests:** ${report.forgeOutput.testResults.length} total`);
    parts.push("");
    const passedTests = report.forgeOutput.testResults.filter((t) => t.status === "pass");
    const failedTests = report.forgeOutput.testResults.filter((t) => t.status === "fail");
    if (passedTests.length > 0) {
      parts.push("### Passing Tests");
      passedTests.forEach((t) => {
        parts.push(`- \`${t.name}\` ${t.gasUsed ? `(gas: ${t.gasUsed})` : ""}`);
      });
      parts.push("");
    }
    if (failedTests.length > 0) {
      parts.push("### Failing Tests");
      failedTests.forEach((t) => {
        parts.push(`- \`${t.name}\`: ${t.error || "Failed"}`);
      });
      parts.push("");
    }
    parts.push("## Exploit Result");
    parts.push("");
    if (report.exploitResult.success) {
      parts.push(`**Status:** \u2705 **SUCCESSFUL**`);
      parts.push(`**Attacker Profit:** ${report.exploitResult.attackerProfit} ${report.exploitResult.profitToken}`);
      if (report.exploitResult.profitUSD > 0) {
        parts.push(`**USD Value:** ~$${report.exploitResult.profitUSD.toLocaleString()}`);
      }
    } else {
      parts.push(`**Status:** \u274C Not Successful`);
    }
    parts.push("");
    if (report.moneyFlow.length > 0) {
      parts.push("## Money Flow");
      parts.push("");
      parts.push("| Type | From | To | Amount | Token |");
      parts.push("|------|------|-----|--------|-------|");
      report.moneyFlow.forEach((f) => {
        parts.push(`| ${f.type.toUpperCase()} | \`${f.from.slice(0, 10)}...\` | \`${f.to.slice(0, 10)}...\` | ${f.amount} | ${f.token} |`);
      });
      parts.push("");
    }
    parts.push("## Honest Signal Verification");
    parts.push("");
    parts.push(`**Confirmed:** ${report.honestSignal.confirmed ? "YES" : "NO"}`);
    parts.push(`**Confidence:** ${(report.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push("");
    parts.push("**Conditions:**");
    report.honestSignal.conditions.forEach((c) => {
      parts.push(`- ${c.satisfied ? "\u2705" : "\u274C"} **${c.name}**: ${c.detail}`);
    });
    parts.push("");
    parts.push(`**Explanation:** ${report.honestSignal.explanation}`);
    parts.push("");
    parts.push("## Evidence");
    parts.push("");
    report.evidence.forEach((e) => {
      parts.push(`### ${e.title}`);
      parts.push(`**Type:** ${e.type} | **Created:** ${new Date(e.createdAt).toLocaleString()}`);
      parts.push("");
      parts.push(e.description);
      parts.push("");
      if (e.content) {
        parts.push("```");
        parts.push(e.content.slice(0, 2e3));
        if (e.content.length > 2e3)
          parts.push("... (truncated)");
        parts.push("```");
        parts.push("");
      }
    });
    parts.push("## Timeline");
    parts.push("");
    report.timeline.forEach((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      parts.push(`- **${time}** \u2014 ${t.title}: ${t.description}`);
    });
    parts.push("");
    parts.push("---");
    parts.push(`*Report generated by Sireen \u2014 AI-Powered Smart Contract Exploit Verification*`);
    parts.push(`*Report ID: ${report.id}*`);
    return parts.join("\n");
  }
  /**
   * Export to HTML format with embedded styling.
   */
  toHtml(report) {
    const markdown = this.toMarkdown(report);
    let html = markdown.replace(/^# (.*)$/gm, "<h1>$1</h1>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\`\`\`(\w+)?\n([\s\S]*?)\n\`\`\`/g, '<pre><code class="language-$1">$2</code></pre>').replace(/\`([^\`]+)\`/g, "<code>$1</code>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.target} \u2014 Exploit Verification Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a2e; }
    h1, h2, h3 { color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: inherit; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; border: 1px solid #e5e7eb; text-align: left; }
    th { background: #f9fafb; }
    blockquote { border-left: 3px solid #3b82f6; padding-left: 1rem; color: #6b7280; margin: 1rem 0; }
    .verdict { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; }
    .verdict-confirmed { background: #dcfce7; color: #166534; }
    .verdict-inconclusive { background: #fef3c7; color: #92400e; }
    .verdict-not_confirmed { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }
  /**
   * Get remediation guidance based on vulnerability type.
   */
  getRemediationGuidance(vulnType) {
    const guidance = {
      "reentrancy": "Use the Checks-Effects-Interactions pattern. Apply a reentrancy guard (e.g., OpenZeppelin's ReentrancyGuard). Ensure state changes happen before external calls.",
      "access-control": "Implement proper role-based access control (OpenZeppelin AccessControl). Use ownership patterns with two-step transfer. Validate caller permissions on all sensitive functions.",
      "oracle-manipulation": "Use TWAP oracles instead of spot prices. Implement circuit breakers for price deviation. Use multiple oracle sources with consensus.",
      "flash-loan": "Add flash loan protection (e.g., block.timestamp checks, minimum deposit times). Use TWAP oracles. Limit single-transaction interactions.",
      "arithmetic": "Use SafeMath or Solidity 0.8+ built-in overflow checks. Validate all math operations. Use checked arithmetic for critical calculations.",
      "logic-error": "Comprehensive unit testing with edge cases. Formal verification for critical invariants. Invariant testing with tools like Echidna or Foundry.",
      "sandwich": "Use commit-reveal schemes for sensitive operations. Implement MEV protection (e.g., Flashbots Protect). Minimize transaction ordering dependence.",
      "front-running": "Use commit-reveal for sensitive operations. Implement transaction ordering protections. Consider using Flashbots for private transaction submission.",
      "delegatecall": "Avoid delegatecall to untrusted contracts. Use library patterns with strict version control. Validate delegatecall targets.",
      "unsafe-typecast": "Use explicit type conversions with validation. Avoid assembly type casts. Use OpenZeppelin's SafeCast library."
    };
    return guidance[vulnType.toLowerCase()] || "Review the code for the identified vulnerability pattern. Apply security best practices specific to the vulnerability type. Consider a formal audit for critical contracts.";
  }
};

// src/pipeline/DockerSandbox.ts
var fs3 = __toESM(require("fs"));
var import_child_process3 = require("child_process");
var DEFAULT_SANDBOX_CONFIG = {
  image: "ghcr.io/foundry-rs/foundry:latest",
  memoryLimit: "4g",
  cpuLimit: "2",
  networkDisabled: false,
  timeout: 18e4,
  tempDir: ""
};
var DockerSandbox = class {
  constructor(config = {}) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  }
  /**
   * Check if Docker is available on the host.
   */
  static async isAvailable() {
    try {
      (0, import_child_process3.execSync)("docker info", { timeout: 1e4, stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Execute a forge command inside the Docker sandbox.
   * Mounts the workspace directory and captures output.
   */
  async execute(workspaceDir, forgeArgs = ["test", "--match-test", "testExploit", "-vvv"]) {
    const startTime = Date.now();
    const containerName = this.config.containerName || `sireen-sandbox-${Date.now()}`;
    if (!fs3.existsSync(workspaceDir)) {
      return {
        success: false,
        output: "",
        containerName,
        duration: 0,
        error: `Workspace directory does not exist: ${workspaceDir}`
      };
    }
    try {
      try {
        (0, import_child_process3.execSync)(`docker image inspect ${this.config.image}`, {
          stdio: "pipe",
          timeout: 1e4
        });
      } catch {
        (0, import_child_process3.execSync)(`docker pull ${this.config.image}`, {
          timeout: 12e4,
          stdio: "pipe"
        });
      }
      const cmdParts = [
        "docker",
        "run",
        "--rm",
        "--name",
        containerName,
        "-m",
        this.config.memoryLimit,
        "--cpus",
        this.config.cpuLimit
      ];
      if (this.config.networkDisabled) {
        cmdParts.push("--network", "none");
      }
      const mountTarget = "/workspace";
      cmdParts.push(
        "-v",
        `${workspaceDir}:${mountTarget}`,
        "-w",
        mountTarget
      );
      cmdParts.push(this.config.image, "forge", ...forgeArgs);
      const cmd = cmdParts.join(" ");
      const output = (0, import_child_process3.execSync)(cmd, {
        timeout: this.config.timeout,
        stdio: ["pipe", "pipe", "pipe"],
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024
      });
      const duration = Date.now() - startTime;
      return {
        success: true,
        output: output.toString(),
        containerName,
        duration
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const stderr = err.stderr?.toString() || "";
      const stdout = err.stdout?.toString() || "";
      return {
        success: false,
        output: stdout + stderr,
        containerName,
        duration,
        error: err.message || "Docker execution failed"
      };
    }
  }
  /**
   * Execute forge build inside the sandbox.
   */
  async build(workspaceDir) {
    return this.execute(workspaceDir, ["build", "--via-ir"]);
  }
  /**
   * Execute forge test with fork enabled.
   */
  async testWithFork(workspaceDir, forkUrl) {
    return this.execute(workspaceDir, [
      "test",
      "--match-test",
      "testExploit",
      "-vvv",
      "--fork-url",
      forkUrl,
      "--gas-report"
    ]);
  }
  /**
   * Clean up any dangling containers from interrupted runs.
   */
  static async cleanup(containerName) {
    try {
      if (containerName) {
        (0, import_child_process3.execSync)(`docker rm -f ${containerName}`, {
          stdio: "pipe",
          timeout: 1e4
        });
      } else {
        try {
          const list = (0, import_child_process3.execSync)(
            'docker ps -a --filter "name=sireen-sandbox" -q',
            { stdio: "pipe", timeout: 1e4, encoding: "utf-8" }
          ).toString().trim();
          if (list) {
            const ids = list.split("\n").filter(Boolean);
            for (const id of ids) {
              try {
                (0, import_child_process3.execSync)(`docker rm -f ${id}`, { stdio: "pipe", timeout: 1e4 });
              } catch {
              }
            }
          }
        } catch {
        }
      }
    } catch {
    }
  }
};

// src/pipeline/PipelineManager.ts
var HYPOTHESIS_SYSTEM_PROMPT = `You are an expert smart contract security researcher. Analyze the given Solidity source code and produce a structured attack hypothesis.

Output ONLY valid JSON with this exact structure:
{
  "title": "Short exploit title",
  "vulnerabilityType": "reentrancy | access-control | oracle-manipulation | flash-loan | arithmetic | logic-error | sandwich | front-running | delegatecall | unsafe-typecast | other",
  "affectedContracts": ["ContractName"],
  "attackVector": "Step-by-step explanation of how the exploit works",
  "preconditions": ["Condition 1", "Condition 2"],
  "expectedOutcome": "What the attacker gains (e.g., 'Drain 1000 ETH from the vault')",
  "severity": "critical | high | medium | low",
  "confidence": 0.0-1.0
}

Be specific about the attack vector. Focus on real, exploitable vulnerabilities. Do NOT invent vulnerabilities that don't exist. If the code appears secure, set confidence to 0 and explain why.`;
var PipelineManager = class {
  constructor(config) {
    /** Current pipeline state */
    this._status = "idle";
    this._currentStage = "idle";
    this._sessionId = "";
    this._sessionSourceCode = "";
    this._stagesCompleted = [];
    this.config = config;
    this.aiClient = new AIClient({
      provider: config.aiProvider,
      apiKey: config.aiApiKey,
      model: config.aiModel
    });
    this.pocGenerator = new PoCGenerator(
      this.aiClient,
      config.forgePath,
      config.maxRetries
    );
    this.forgeRunner = new ForgeRunner({
      forgePath: config.forgePath,
      forkUrl: config.forkRpcUrl,
      dockerEnabled: config.dockerEnabled,
      dockerImage: config.dockerImage
    });
    this.outputParser = new OutputParser();
    this.honestSignal = new HonestSignalEvaluator();
    this.reportBuilder = new ReportBuilder();
    if (config.dockerEnabled) {
      this.dockerSandbox = new DockerSandbox({
        image: config.dockerImage,
        timeout: config.forgePath ? 18e4 : 12e4
      });
    }
  }
  get status() {
    return this._status;
  }
  get currentStage() {
    return this._currentStage;
  }
  get error() {
    return this._error;
  }
  /** Set VS Code extension context for session persistence */
  setContext(context) {
    this._context = context;
  }
  /**
   * Save current pipeline state to workspace state for resume capability.
   */
  async saveSession(session) {
    if (!this._context)
      return;
    try {
      await this._context.workspaceState.update(`pipeline:session:${session.id}`, session);
    } catch (err) {
      console.warn("[PipelineManager] Failed to save session:", err);
    }
  }
  /**
   * Load a saved session by ID.
   */
  async loadSession(sessionId) {
    if (!this._context)
      return void 0;
    try {
      return this._context.workspaceState.get(`pipeline:session:${sessionId}`);
    } catch {
      return void 0;
    }
  }
  /**
   * List all saved pipeline sessions.
   */
  async listSessions() {
    if (!this._context)
      return [];
    try {
      const keys = this._context.workspaceState.keys().filter((k) => k.startsWith("pipeline:session:"));
      const sessions = [];
      for (const key of keys) {
        const session = this._context.workspaceState.get(key);
        if (session)
          sessions.push(session);
      }
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }
  /**
   * Delete a saved session.
   */
  async deleteSession(sessionId) {
    if (!this._context)
      return;
    try {
      await this._context.workspaceState.update(`pipeline:session:${sessionId}`, void 0);
    } catch {
    }
  }
  /**
   * Run the full exploit verification pipeline.
   */
  async run(options) {
    this._status = "running";
    this._currentStage = "initializing";
    this._error = void 0;
    const { target, sourceCode, forkUrl, onEvent, signal } = options;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const workspaceDir = path3.join(
      this.config.workspaceDir || os2.tmpdir(),
      `sireen-pipeline-${Date.now()}`
    );
    const session = {
      id: sessionId,
      target,
      sourceCode,
      forkUrl,
      currentStage: "initializing",
      status: "running",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await this.saveSession(session);
    const updateSession = async (updates) => {
      Object.assign(session, updates, { updatedAt: Date.now() });
      await this.saveSession(session);
    };
    const maxRetries = this.config.maxRetries || 3;
    const retryDelay = (attempt) => Math.min(1e3 * 2 ** attempt, 1e4);
    const runStageWithRetry = async (stageName, fn, onRetry) => {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < maxRetries) {
            this.emit(onEvent, {
              stage: stageName,
              status: "failed",
              message: `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${retryDelay(attempt)}ms...`,
              data: { error: lastError.message, attempt: attempt + 1 },
              timestamp: Date.now()
            });
            onRetry?.(attempt + 1, lastError);
            await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
            if (signal?.aborted) {
              throw new Error("Pipeline cancelled during retry");
            }
            continue;
          }
          throw lastError;
        }
      }
      throw lastError;
    };
    try {
      this.emit(onEvent, {
        stage: "hypothesis",
        status: "running",
        message: "Analyzing target and forming attack hypothesis...",
        timestamp: Date.now()
      });
      this._currentStage = "hypothesis";
      await updateSession({ currentStage: "hypothesis" });
      const hypothesis = await runStageWithRetry(
        "hypothesis",
        () => this.generateHypothesis(sourceCode, target.name || target.value)
      );
      session.hypothesis = hypothesis;
      this.emit(onEvent, {
        stage: "hypothesis",
        status: "completed",
        message: `Hypothesis: ${hypothesis.title} (${hypothesis.vulnerabilityType})`,
        data: { hypothesis },
        timestamp: Date.now()
      });
      await updateSession({ currentStage: "hypothesis", status: "running", hypothesis });
      if (signal?.aborted) {
        return this.cancelRun();
      }
      this.emit(onEvent, {
        stage: "poc_generation",
        status: "running",
        message: "Generating Foundry PoC...",
        timestamp: Date.now()
      });
      this._currentStage = "poc_generation";
      await updateSession({ currentStage: "poc_generation" });
      const pocRequest = {
        hypothesis,
        targetCode: sourceCode,
        targetAddress: target.type === "contract_address" ? target.value : void 0,
        chain: target.chain,
        forkUrl: forkUrl || this.config.forkRpcUrl || void 0
      };
      const pocResult = await runStageWithRetry(
        "poc_generation",
        () => this.pocGenerator.generate(pocRequest)
      );
      session.pocResult = pocResult;
      if (!pocResult.compilationSuccess) {
        this.emit(onEvent, {
          stage: "poc_compilation",
          status: "failed",
          message: `PoC compilation failed after ${pocResult.compilationAttempts} attempts`,
          data: { errors: pocResult.errors },
          timestamp: Date.now()
        });
        const forgeOutput2 = {
          raw: pocResult.errors.join("\n"),
          testResults: [],
          compilationErrors: pocResult.errors,
          exitCode: 1,
          duration: 0
        };
        const exploitResult2 = {
          success: false,
          attackerProfit: "0",
          profitToken: "N/A",
          profitUSD: 0,
          tokenBalances: {},
          moneyFlow: [],
          revertedTransactions: [],
          gasUsage: { total: 0, byOperation: {} }
        };
        const hsInput = { forgeOutput: forgeOutput2, exploitResult: exploitResult2, hypothesis };
        const hs2 = this.honestSignal.evaluate(hsInput);
        const report2 = this.reportBuilder.build({
          target: target.value,
          targetAddress: target.type === "contract_address" ? target.value : void 0,
          chain: target.chain,
          hypothesis,
          poc: pocResult,
          forgeOutput: forgeOutput2,
          exploitResult: exploitResult2,
          honestSignal: hs2,
          moneyFlow: []
        });
        session.report = report2;
        this._status = "completed";
        this._currentStage = "failed";
        await updateSession({ currentStage: "failed", status: "failed", error: "PoC compilation failed", report: report2 });
        return { success: false, report: report2, error: "PoC compilation failed", stage: "poc_compilation" };
      }
      this.emit(onEvent, {
        stage: "poc_compilation",
        status: "completed",
        message: `PoC compiled successfully (${pocResult.compilationAttempts} attempt(s))`,
        data: { attempts: pocResult.compilationAttempts },
        timestamp: Date.now()
      });
      await updateSession({ currentStage: "poc_compilation", status: "running", pocResult });
      if (signal?.aborted) {
        return this.cancelRun();
      }
      this.emit(onEvent, {
        stage: "forge_execution",
        status: "running",
        message: "Executing forge test...",
        timestamp: Date.now()
      });
      this._currentStage = "forge_execution";
      await updateSession({ currentStage: "forge_execution" });
      const poCDir = path3.join(workspaceDir, "forge-poc");
      fs4.mkdirSync(path3.join(poCDir, "test"), { recursive: true });
      fs4.mkdirSync(path3.join(poCDir, "lib", "forge-std", "src"), { recursive: true });
      fs4.writeFileSync(
        path3.join(poCDir, "lib", "forge-std", "src", "Test.sol"),
        this.getForgeStdStub(),
        "utf-8"
      );
      fs4.writeFileSync(
        path3.join(poCDir, "test", "PoC.t.sol"),
        pocResult.sourceCode,
        "utf-8"
      );
      fs4.writeFileSync(
        path3.join(poCDir, "foundry.toml"),
        '[profile.default]\nsrc = "test"\nlibs = ["lib"]\nsolc = "0.8.19"\n\n[profile.default.optimizer]\nenabled = true\nruns = 200\n',
        "utf-8"
      );
      fs4.writeFileSync(
        path3.join(poCDir, "remappings.txt"),
        "forge-std/=lib/forge-std/src/\n",
        "utf-8"
      );
      const forgeOutput = await this.forgeRunner.run(poCDir);
      session.forgeOutput = forgeOutput;
      this.emit(onEvent, {
        stage: "forge_execution",
        status: forgeOutput.exitCode === 0 ? "completed" : "failed",
        message: `forge test exit code: ${forgeOutput.exitCode} (${forgeOutput.testResults.length} tests)`,
        data: { exitCode: forgeOutput.exitCode, testCount: forgeOutput.testResults.length },
        timestamp: Date.now()
      });
      await updateSession({ currentStage: "forge_execution", status: forgeOutput.exitCode === 0 ? "completed" : "failed", forgeOutput });
      if (signal?.aborted) {
        return this.cancelRun();
      }
      this.emit(onEvent, {
        stage: "output_parsing",
        status: "running",
        message: "Parsing forge output...",
        timestamp: Date.now()
      });
      this._currentStage = "output_parsing";
      await updateSession({ currentStage: "output_parsing" });
      const exploitResult = this.outputParser.parseExploitResult(forgeOutput);
      session.exploitResult = exploitResult;
      this.emit(onEvent, {
        stage: "output_parsing",
        status: "completed",
        message: `Exploit ${exploitResult.success ? "succeeded" : "failed"} \u2014 Profit: ${exploitResult.attackerProfit} ${exploitResult.profitToken}`,
        data: { exploitResult },
        timestamp: Date.now()
      });
      await updateSession({ currentStage: "output_parsing", status: "completed", exploitResult });
      if (signal?.aborted) {
        return this.cancelRun();
      }
      this.emit(onEvent, {
        stage: "verification",
        status: "running",
        message: "Evaluating honest signal...",
        timestamp: Date.now()
      });
      this._currentStage = "verification";
      await updateSession({ currentStage: "verification" });
      const hs = this.honestSignal.evaluate({
        forgeOutput,
        exploitResult,
        hypothesis
      });
      session.honestSignal = hs;
      this.emit(onEvent, {
        stage: "verification",
        status: "completed",
        message: hs.confirmed ? "EXPLOIT CONFIRMED" : "Exploit NOT confirmed",
        data: { honestSignal: hs },
        timestamp: Date.now()
      });
      await updateSession({ currentStage: "verification", status: "completed", honestSignal: hs });
      if (signal?.aborted) {
        return this.cancelRun();
      }
      this.emit(onEvent, {
        stage: "report_generation",
        status: "running",
        message: "Building investigation report...",
        timestamp: Date.now()
      });
      this._currentStage = "report_generation";
      await updateSession({ currentStage: "report_generation" });
      const report = this.reportBuilder.build({
        target: target.value,
        targetAddress: target.type === "contract_address" ? target.value : void 0,
        chain: target.chain,
        hypothesis,
        poc: pocResult,
        forgeOutput,
        exploitResult,
        honestSignal: hs,
        moneyFlow: exploitResult.moneyFlow
      });
      session.report = report;
      this.cleanup(workspaceDir);
      this._status = "completed";
      this._currentStage = "completed";
      this.emit(onEvent, {
        stage: "completed",
        status: "completed",
        message: `Pipeline complete \u2014 Verdict: ${report.verdict.toUpperCase()}`,
        data: { report },
        timestamp: Date.now()
      });
      await updateSession({ currentStage: "completed", status: "completed", report });
      return { success: true, report, stage: "completed" };
    } catch (err) {
      this._status = "failed";
      this._currentStage = "failed";
      this._error = err.message || "Unknown pipeline error";
      this.emit(onEvent, {
        stage: "failed",
        status: "failed",
        message: `Pipeline failed: ${this._error}`,
        data: { error: this._error },
        timestamp: Date.now()
      });
      await updateSession({ currentStage: "failed", status: "failed", error: this._error });
      this.cleanup(workspaceDir);
      return {
        success: false,
        error: this._error,
        stage: "failed"
      };
    }
  }
  /**
   * Generate an attack hypothesis from source code using AI.
   */
  async generateHypothesis(sourceCode, targetName) {
    const userPrompt = `Analyze this Solidity contract${targetName ? ` (${targetName})` : ""} for vulnerabilities:

\`\`\`solidity
${sourceCode.slice(0, 12e3)}
\`\`\`

Output a JSON attack hypothesis. If the code appears secure, set "confidence" to 0 and explain why.`;
    const response = await this.aiClient.prompt(
      HYPOTHESIS_SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 2048, temperature: 0.2 }
    );
    let hypothesis;
    try {
      hypothesis = AIClient.extractJSON(response);
    } catch {
      hypothesis = {
        title: `Analysis of ${targetName || "contract"}`,
        vulnerabilityType: "other",
        affectedContracts: [targetName || "Unknown"],
        attackVector: "AI analysis produced unparseable output. Manual review required.",
        preconditions: ["N/A"],
        expectedOutcome: "Unknown \u2014 AI output could not be parsed",
        severity: "medium",
        confidence: 0
      };
    }
    if (!hypothesis.title)
      hypothesis.title = `Analysis of ${targetName || "contract"}`;
    if (!hypothesis.vulnerabilityType)
      hypothesis.vulnerabilityType = "other";
    if (!hypothesis.affectedContracts || hypothesis.affectedContracts.length === 0) {
      hypothesis.affectedContracts = [targetName || "Unknown"];
    }
    if (!hypothesis.attackVector)
      hypothesis.attackVector = "Unknown attack vector";
    if (!hypothesis.preconditions)
      hypothesis.preconditions = [];
    if (!hypothesis.expectedOutcome)
      hypothesis.expectedOutcome = "Unknown outcome";
    if (!hypothesis.severity)
      hypothesis.severity = "medium";
    return hypothesis;
  }
  // ─── Event Helpers ───────────────────────────────────────────────────────
  emit(handler, event) {
    handler?.(event);
  }
  cancelRun() {
    this._status = "cancelled";
    this._currentStage = "completed";
    return { success: false, error: "Pipeline cancelled", stage: this._currentStage };
  }
  // ─── Cleanup ─────────────────────────────────────────────────────────────
  cleanup(dir) {
    try {
      fs4.rmSync(dir, { recursive: true, force: true });
    } catch {
    }
  }
  // ─── Forge Std Stub ──────────────────────────────────────────────────────
  getForgeStdStub() {
    return `// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface Vm {
    function createSelectFork(string calldata) external returns (uint256);
    function createFork(string calldata) external returns (uint256);
    function selectFork(uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function startPrank(address, address) external;
    function stopPrank() external;
    function deal(address, uint256) external;
    function warp(uint256) external;
    function roll(uint256) external;
    function expectRevert(bytes calldata) external;
    function expectRevert() external;
    function expectEmit(bool, bool, bool, bool) external;
    function record() external;
    function accesses(address, bytes32) external returns (bool, bool);
    function label(address, string calldata) external;
    function getBlockNumber() external returns (uint256);
    function getBlockTimestamp() external returns (uint256);
    function toString(address) external returns (string memory);
    function toString(uint256) external returns (string memory);
    function toString(bytes32) external returns (string memory);
    function assume(bool) external;
}

abstract contract StdAssertions {
    function assertTrue(bool c) public pure { require(c, "assertTrue"); }
    function assertTrue(bool c, string memory e) public pure { require(c, e); }
    function assertEq(uint256 a, uint256 b) public pure { require(a == b, "assertEq(uint256)"); }
    function assertEq(uint256 a, uint256 b, string memory e) public pure { require(a == b, e); }
    function assertEq(address a, address b) public pure { require(a == b, "assertEq(address)"); }
    function assertEq(address a, address b, string memory e) public pure { require(a == b, e); }
    function assertEq(bytes32 a, bytes32 b) public pure { require(a == b, "assertEq(bytes32)"); }
    function assertEq(string memory a, string memory b) public pure { require(keccak256(bytes(a)) == keccak256(bytes(b)), "assertEq(string)"); }
    function assertGt(uint256 a, uint256 b) public pure { require(a > b, "assertGt"); }
    function assertGe(uint256 a, uint256 b) public pure { require(a >= b, "assertGe"); }
    function assertLt(uint256 a, uint256 b) public pure { require(a < b, "assertLt"); }
    function assertLe(uint256 a, uint256 b) public pure { require(a <= b, "assertLe"); }
    function assertNotEq(uint256 a, uint256 b) public pure { require(a != b, "assertNotEq"); }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 tol) public pure { require(a >= b ? a - b <= tol : b - a <= tol, "assertApproxEqAbs"); }
}

abstract contract Test is StdAssertions {
    Vm public constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    function setUp() public virtual;
    function testExploit() public virtual;
}`;
  }
  /**
   * Validate that the pipeline config is complete enough to run.
   */
  validateConfig() {
    const errors = [];
    if (!this.config.aiApiKey) {
      errors.push("AI API key is not configured. Set sireen.aiApiKey in settings.");
    }
    if (!this.config.forgePath && !this.config.dockerEnabled) {
      errors.push("Forge path is not configured and Docker is disabled. Set sireen.forgePath or enable Docker.");
    }
    return errors;
  }
};

// src/pipeline/types.ts
var DEFAULT_PIPELINE_CONFIG = {
  aiProvider: "openrouter",
  aiApiKey: "",
  aiModel: "openai/o3-mini",
  forgePath: "forge",
  dockerImage: "ghcr.io/foundry-rs/foundry:latest",
  forkRpcUrl: "",
  maxRetries: 3,
  workspaceDir: "",
  dockerEnabled: false
};

// src/license/LicenseManager.ts
var vscode4 = __toESM(require("vscode"));
var TRIAL_DAYS = 14;
async function checkLicense(context) {
  const storedLicense = context.globalState.get("sireen.license");
  if (storedLicense) {
    const now2 = Date.now();
    if (storedLicense.expiresAt > now2) {
      return {
        type: "licensed",
        licenseKey: storedLicense.key,
        licenseExpiresAt: storedLicense.expiresAt,
        features: ["pipeline", "war-room", "reports", "export", "demo"]
      };
    }
    await context.globalState.update("sireen.license", void 0);
  }
  const trialStart = context.globalState.get("sireen.trialStart");
  const now = Date.now();
  if (!trialStart) {
    await context.globalState.update("sireen.trialStart", now);
    return {
      type: "trial",
      trialEndsAt: now + TRIAL_DAYS * 24 * 60 * 60 * 1e3,
      features: ["pipeline", "war-room", "reports", "export", "demo"]
    };
  }
  const trialEndsAt = trialStart + TRIAL_DAYS * 24 * 60 * 60 * 1e3;
  if (now < trialEndsAt) {
    return {
      type: "trial",
      trialEndsAt,
      features: ["pipeline", "war-room", "reports", "export", "demo"]
    };
  }
  return {
    type: "expired",
    trialEndsAt,
    features: ["demo"]
    // Only demo mode after trial
  };
}
function getTrialDaysRemaining(state) {
  if (state.type !== "trial" || !state.trialEndsAt)
    return 0;
  const remaining = Math.ceil((state.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1e3));
  return Math.max(0, remaining);
}
function getLicenseMessage(state) {
  switch (state.type) {
    case "licensed":
      if (state.licenseExpiresAt) {
        const days2 = Math.ceil((state.licenseExpiresAt - Date.now()) / (24 * 60 * 60 * 1e3));
        return `Licensed \u2014 ${days2} days remaining`;
      }
      return "Licensed";
    case "trial":
      const days = getTrialDaysRemaining(state);
      return `Trial \u2014 ${days} day${days !== 1 ? "s" : ""} remaining`;
    case "expired":
      return "Trial expired \u2014 Enter license key to continue";
    default:
      return "Unknown license state";
  }
}
function createLicenseStatusBarItem(context) {
  const item = vscode4.window.createStatusBarItem(vscode4.StatusBarAlignment.Right, 100);
  item.command = "sireen.license";
  item.tooltip = "Click to view/manage license";
  return item;
}
async function updateLicenseStatusBar(item, context) {
  const state = await checkLicense(context);
  const msg = getLicenseMessage(state);
  item.text = `$(shield) Sireen: ${msg}`;
  item.show();
}

// src/extension.ts
var sidebarProvider;
var warRoomProvider;
var pipelineManager;
var licenseStatusBar;
async function activate(context) {
  console.log("[Sireen] Activating extension...");
  warRoomProvider = new WarRoomProvider(context);
  licenseStatusBar = createLicenseStatusBarItem(context);
  context.subscriptions.push(licenseStatusBar);
  await updateLicenseStatusBar(licenseStatusBar, context);
  function initPipeline() {
    const config = vscode5.workspace.getConfiguration("sireen");
    const pipelineCfg = {
      ...DEFAULT_PIPELINE_CONFIG,
      aiProvider: config.get("aiProvider", "openrouter"),
      aiApiKey: config.get("aiApiKey", ""),
      aiModel: config.get("aiModel", "openai/o3-mini"),
      forgePath: config.get("forgePath", "forge"),
      dockerImage: config.get("dockerImage", "ghcr.io/foundry-rs/foundry:latest"),
      forkRpcUrl: config.get("forkRpcUrl", ""),
      maxRetries: config.get("maxRetries", 3),
      workspaceDir: config.get("workspaceDir", ""),
      dockerEnabled: config.get("dockerEnabled", false)
    };
    pipelineManager = new PipelineManager(pipelineCfg);
    pipelineManager.setContext(context);
    return pipelineManager;
  }
  sidebarProvider = new SidebarProvider(context);
  context.subscriptions.push(
    vscode5.window.registerWebviewViewProvider("sireen.sidebar", sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );
  const pm = initPipeline();
  sidebarProvider.setPipelineManager(pm);
  context.subscriptions.push(
    vscode5.commands.registerCommand("sireen.newInvestigation", () => {
      sidebarProvider?.postMessage({ type: "investigation:create", payload: {} });
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("sireen.runPipeline", async () => {
      const pm2 = initPipeline();
      const errors = pm2.validateConfig();
      if (errors.length > 0) {
        vscode5.window.showErrorMessage(`Sireen Pipeline: ${errors.join("; ")}`);
        return;
      }
      const editor = vscode5.window.activeTextEditor;
      let sourceCode = "";
      let targetName = "";
      if (editor) {
        sourceCode = editor.document.getText();
        targetName = editor.document.fileName.split(/[/\\]/).pop()?.replace(".sol", "") || "contract";
      }
      if (!sourceCode.trim()) {
        const input = await vscode5.window.showInputBox({
          prompt: "Enter contract address (0x...) or paste Solidity code",
          placeHolder: "0x123... or paste code here",
          ignoreFocusOut: true
        });
        if (!input)
          return;
        if (input.startsWith("0x") && input.length === 42) {
          vscode5.window.showErrorMessage("Contract address fetching not yet implemented. Please paste Solidity code or open a .sol file.");
          return;
        } else {
          sourceCode = input;
          targetName = "pasted-contract";
        }
      }
      const chain = await vscode5.window.showQuickPick(
        ["ethereum", "polygon", "arbitrum", "optimism", "bsc", "base"],
        { placeHolder: "Select chain", canPickMany: false }
      );
      if (!chain)
        return;
      const forkUrl = await vscode5.window.showInputBox({
        prompt: "Optional: RPC URL for mainnet forking (Alchemy, Infura, etc.)",
        placeHolder: "https://eth-mainnet.g.alchemy.com/v2/...",
        ignoreFocusOut: true
      });
      warRoomProvider.show();
      vscode5.window.withProgress(
        {
          location: vscode5.ProgressLocation.Notification,
          title: `Sireen Pipeline: ${targetName}`,
          cancellable: true
        },
        async (progress, token) => {
          const abortController = new AbortController();
          const cancelListener = token.onCancellationRequested(() => {
            abortController.abort();
            cancelListener.dispose();
            warRoomProvider.postMessage({
              type: "pipeline:status",
              payload: { stage: "cancelled", message: "Pipeline cancelled by user." }
            });
          });
          try {
            const result = await pm2.run({
              target: {
                type: "source_code",
                value: targetName,
                chain,
                name: targetName
              },
              sourceCode,
              forkUrl: forkUrl || void 0,
              onEvent: (event) => {
                const msg = `[${event.stage}] ${event.message}`;
                progress.report({ message: msg });
                warRoomProvider.postMessage({
                  type: "pipeline:status",
                  payload: { stage: event.stage, message: event.message, data: event.data }
                });
                sidebarProvider?.postMessage({
                  type: "chat:stream",
                  payload: {
                    message: {
                      role: "assistant",
                      content: msg,
                      status: "complete",
                      id: `pipeline-${event.stage}-${Date.now()}`,
                      timestamp: Date.now()
                    }
                  }
                });
              },
              signal: abortController.signal
            });
            if (result.success && result.report) {
              warRoomProvider.postMessage({
                type: "pipeline:complete",
                payload: { report: result.report }
              });
              sidebarProvider?.postMessage({
                type: "chat:stream",
                payload: {
                  message: {
                    role: "assistant",
                    content: `## Pipeline Complete

**Verdict:** ${result.report.verdict.toUpperCase()}

${result.report.summary}`,
                    status: "complete",
                    id: `pipeline-result-${Date.now()}`,
                    timestamp: Date.now()
                  }
                }
              });
              context.workspaceState.update(`report:${result.report.id}`, result.report);
            } else {
              warRoomProvider.postMessage({
                type: "pipeline:error",
                payload: { error: result.error || "Unknown error", stage: result.stage }
              });
              sidebarProvider?.postMessage({
                type: "chat:stream",
                payload: {
                  message: {
                    role: "assistant",
                    content: `## Pipeline Failed

**Error:** ${result.error || "Unknown error"}
**Stage:** ${result.stage}`,
                    status: "complete",
                    id: `pipeline-error-${Date.now()}`,
                    timestamp: Date.now()
                  }
                }
              });
            }
          } catch (err) {
            warRoomProvider.postMessage({
              type: "pipeline:error",
              payload: { error: err instanceof Error ? err.message : "Unknown error", stage: "exception" }
            });
          } finally {
            cancelListener.dispose();
          }
        }
      );
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("sireen.openWarRoom", () => {
      warRoomProvider.show();
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("sireen.openReportViewer", () => {
      warRoomProvider.show();
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("sireen.focusInput", () => {
      sidebarProvider?.postMessage({ type: "focus:input", payload: {} });
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("sireen.enterLicense", async () => {
      const key = await vscode5.window.showInputBox({
        prompt: "Enter your Sireen license key",
        placeHolder: "SIR-XXXX-XXXX-XXXX",
        ignoreFocusOut: true,
        password: false
      });
      if (key) {
        const valid = validateLicenseKey(key);
        if (valid) {
          await context.globalState.update("sireen.licenseKey", key);
          await context.globalState.update("sireen.licenseValidated", Date.now());
          vscode5.window.showInformationMessage("License validated successfully!");
        } else {
          vscode5.window.showErrorMessage("Invalid license key format");
        }
      }
    })
  );
  context.subscriptions.push(
    vscode5.commands.registerCommand("sireen.checkLicense", async () => {
      const key = context.globalState.get("sireen.licenseKey", "");
      const validated = context.globalState.get("sireen.licenseValidated", 0);
      if (key && validated) {
        vscode5.window.showInformationMessage(`License active: ${key.slice(0, 8)}...`);
      } else {
        vscode5.window.showInformationMessage("No valid license found. Free trial available.");
      }
    })
  );
  context.subscriptions.push(
    vscode5.window.onDidChangeActiveColorTheme((theme) => {
      sidebarProvider?.postMessage({
        type: "theme:change",
        payload: { kind: theme.kind }
      });
      warRoomProvider.postMessage({
        type: "theme:change",
        payload: { kind: theme.kind }
      });
    })
  );
  const hasRunBefore = context.globalState.get("sireen.hasRunBefore", false);
  if (!hasRunBefore) {
    await runFirstTimeSetup(context);
    context.globalState.update("sireen.hasRunBefore", true);
  }
  console.log("[Sireen] Extension activated successfully.");
}
async function runFirstTimeSetup(context) {
  const config = vscode5.workspace.getConfiguration("sireen");
  const aiApiKey = config.get("aiApiKey", "");
  if (!aiApiKey) {
    const action = await vscode5.window.showInformationMessage(
      "Welcome to Sireen! You need an LLM API key to run the exploit verification pipeline.",
      "Set API Key Now",
      "Later"
    );
    if (action === "Set API Key Now") {
      await vscode5.commands.executeCommand("workbench.action.openSettings", "sireen.aiApiKey");
    }
  }
  const dockerCheck = await checkDockerAndFoundry();
  if (!dockerCheck.docker) {
    vscode5.window.showWarningMessage(
      "Docker not detected. Pipeline will run in host mode (requires Foundry installed).",
      "Install Docker",
      "OK"
    ).then((selection) => {
      if (selection === "Install Docker") {
        vscode5.env.openExternal(vscode5.Uri.parse("https://www.docker.com/get-started"));
      }
    });
  }
  if (!dockerCheck.foundry) {
    vscode5.window.showWarningMessage(
      "Foundry (forge) not found in PATH. Install it for host mode execution.",
      "Install Foundry",
      "OK"
    ).then((selection) => {
      if (selection === "Install Foundry") {
        vscode5.env.openExternal(vscode5.Uri.parse("https://getfoundry.sh/"));
      }
    });
  }
}
async function checkDockerAndFoundry() {
  const { exec } = require("child_process");
  const util = require("util");
  const execAsync = util.promisify(exec);
  let docker = false;
  let foundry = false;
  try {
    await execAsync("docker --version", { timeout: 5e3 });
    docker = true;
  } catch {
  }
  try {
    await execAsync("forge --version", { timeout: 5e3 });
    foundry = true;
  } catch {
  }
  return { docker, foundry };
}
function validateLicenseKey(key) {
  const pattern = /^SIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key.toUpperCase());
}
function deactivate() {
  console.log("[Sireen] Extension deactivated.");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map

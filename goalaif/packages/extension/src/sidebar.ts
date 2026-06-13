import * as vscode from "vscode";
import { WebSocketClient } from "./websocket";

export class GoalAIFSidebarProvider implements vscode.WebviewViewProvider {
    public currentSessionId: string = "";
    private _view?: vscode.WebviewView;
    private _ws?: WebSocketClient;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtml();
        webviewView.webview.onDidReceiveMessage((msg) => {
            if (msg.type === "runAnalysis") {
                vscode.commands.executeCommand(msg.mode === "offensive" ? "goalaif.analyzeOffensive" : "goalaif.analyzeDefensive");
            }
        });
    }

    setSession(sessionId: string, ws: WebSocketClient) {
        this.currentSessionId = sessionId;
        this._ws = ws;
        this._post({ type: "session", sessionId });
    }

    showFindings(findings: any[]) {
        this._post({ type: "findings", findings });
    }

    showPoC(code: string) {
        this._post({ type: "poc", code });
    }

    showSandboxResult(result: any) {
        this._post({ type: "sandbox_result", ...result });
    }

    showReport(markdown: string) {
        this._post({ type: "report", markdown });
    }

    private _post(msg: any) {
        this._view?.webview.postMessage(msg);
    }

    private _getHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0a0a0a; color: #e0e0e0; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; padding: 12px; }
.header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.logo { color: #f59e0b; font-weight: 700; font-size: 16px; }
.badge { font-size: 10px; padding: 2px 6px; border-radius: 3px; }
.badge.def { background: #1e3a5f; color: #60a5fa; }
.badge.off { background: #5f1e1e; color: #f87171; }
.mode-toggle { display: flex; gap: 4px; margin-bottom: 12px; }
.mode-btn { flex: 1; padding: 6px; border: 1px solid #333; background: #141414; color: #808080; cursor: pointer; font-family: inherit; font-size: 11px; text-align: center; }
.mode-btn.active { border-color: #f59e0b; color: #f59e0b; }
.mode-btn.off.active { border-color: #ef4444; color: #ef4444; }
.stream { background: #0d0d0d; border: 1px solid #1e1e1e; border-radius: 4px; padding: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 12px; font-size: 11px; }
.thought { color: #94a3b8; margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #333; }
.thought .agent { color: #f59e0b; }
.finding { background: #141414; border: 1px solid #1e1e1e; border-radius: 4px; padding: 8px; margin-bottom: 8px; }
.finding-title { font-weight: 600; margin-bottom: 4px; }
.sev-critical { color: #ef4444; }
.sev-high { color: #f97316; }
.sev-medium { color: #eab308; }
.sev-low { color: #6b7280; }
.poc-panel { background: #0d0d0d; border: 1px solid #f59e0b; border-radius: 4px; padding: 8px; margin-bottom: 12px; }
.poc-panel pre { font-size: 10px; max-height: 200px; overflow: auto; white-space: pre-wrap; color: #a1a1aa; }
.report-panel { background: #0d0d0d; border: 1px solid #22c55e; border-radius: 4px; padding: 8px; margin-bottom: 12px; }
.report-panel h1, .report-panel h2, .report-panel h3 { color: #f59e0b; margin: 8px 0 4px; }
.report-panel code { background: #1e1e1e; padding: 1px 4px; border-radius: 2px; }
.btn { width: 100%; padding: 8px; background: #f59e0b; color: #000; border: none; font-family: inherit; font-weight: 700; font-size: 12px; cursor: pointer; margin-bottom: 8px; }
.btn:hover { background: #d97706; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #1e1e1e; font-size: 10px; color: #475569; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <span class="logo">GoalAIF</span>
  <span class="badge def" id="modeBadge">DEFENSIVE</span>
</div>
<div class="mode-toggle">
  <button class="mode-btn active" id="btnDef" onclick="setMode('defensive')">Shield</button>
  <button class="mode-btn off" id="btnOff" onclick="setMode('offensive')">Crosshair</button>
</div>
<button class="btn" id="btnAnalyze" onclick="analyze()">Analyze Selected Code</button>
<div id="stream" class="stream"></div>
<div id="findings"></div>
<div id="poc"></div>
<div id="report"></div>
<div class="footer">100% local. Your code never leaves this machine.</div>

<script>
const vscode = acquireVsCodeApi();
let currentMode = 'defensive';

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btnDef').className = 'mode-btn' + (mode === 'defensive' ? ' active' : '');
    document.getElementById('btnOff').className = 'mode-btn off' + (mode === 'offensive' ? ' active' : '');
    document.getElementById('modeBadge').textContent = mode === 'defensive' ? 'DEFENSIVE' : 'OFFENSIVE';
    document.getElementById('modeBadge').className = 'badge ' + (mode === 'defensive' ? 'def' : 'off');
}

function analyze() { vscode.postMessage({ type: 'runAnalysis', mode: currentMode }); }

function addThought(agent, content) {
    const el = document.getElementById('stream');
    const d = document.createElement('div');
    d.className = 'thought';
    d.innerHTML = '<span class="agent">[' + agent + ']</span> ' + content;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
}

function showFindings(findings) {
    const el = document.getElementById('findings');
    el.innerHTML = '<h3 style="color:#94a3b8;margin:8px 0;">Findings (' + findings.length + ')</h3>';
    findings.forEach(f => {
        const sev = (f.severity || '').toLowerCase();
        const div = document.createElement('div');
        div.className = 'finding';
        div.innerHTML = '<div class="finding-title"><span class="sev-' + sev + '">[' + (f.severity || 'N/A') + ']</span> ' + (f.title || 'Untitled') + '</div>' +
            '<div style="font-size:11px;color:#94a3b8;">' + (f.description || '') + '</div>';
        el.appendChild(div);
    });
}

function showPoC(code) {
    const el = document.getElementById('poc');
    el.innerHTML = '<div class="poc-panel"><h3 style="color:#f59e0b;margin-bottom:8px;">Exploit PoC</h3>' +
        '<pre>' + escapeHtml(code) + '</pre></div>';
}

function showReport(md) {
    const el = document.getElementById('report');
    el.innerHTML = '<div class="report-panel">' + md.replace(/\\n/g, '<br>') + '</div>';
}

function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.type === 'thought') addThought(msg.agent, msg.content);
    if (msg.type === 'findings') showFindings(msg.findings);
    if (msg.type === 'poc') showPoC(msg.code);
    if (msg.type === 'report') showReport(msg.markdown);
    if (msg.type === 'sandbox_result') {
        const el = document.getElementById('report');
        el.innerHTML = '<div class="poc-panel"><h3 style="color:' + (msg.success ? '#22c55e' : '#ef4444') + '">' +
            (msg.success ? 'EXPLOIT CONFIRMED' : 'Exploit Failed') + '</h3><pre>' + escapeHtml((msg.output || msg.error || '').slice(0, 500)) + '</pre></div>';
    }
});
</script>
</body>
</html>`;
    }
}

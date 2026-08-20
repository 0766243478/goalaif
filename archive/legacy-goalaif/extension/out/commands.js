"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const websocket_1 = require("./websocket");
function registerCommands(context, sidebar) {
    const getCode = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor");
            return "";
        }
        return editor.document.getText(editor.selection) || editor.document.getText();
    };
    const analyze = async (mode) => {
        const code = getCode();
        if (!code)
            return;
        const sessionId = `vs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ws = new websocket_1.WebSocketClient(sessionId, sidebar);
        ws.connect();
        sidebar.setSession(sessionId, ws);
        try {
            const resp = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, mode, session_id: sessionId }),
            });
            const data = await resp.json();
            sidebar.showFindings(data.findings || []);
            if (mode === "offensive") {
                for (const f of data.findings || []) {
                    if (f.poc_code)
                        sidebar.showPoC(f.poc_code);
                }
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`GoalAIF: ${e.message}`);
        }
    };
    context.subscriptions.push(vscode.commands.registerCommand("goalaif.analyzeDefensive", () => analyze("defensive")), vscode.commands.registerCommand("goalaif.analyzeOffensive", () => analyze("offensive")), vscode.commands.registerCommand("goalaif.runPoC", async () => {
        const code = getCode();
        if (!code)
            return;
        try {
            const resp = await fetch("http://localhost:8000/sandbox/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: "direct", poc_code: code }),
            });
            const result = await resp.json();
            sidebar.showSandboxResult(result);
        }
        catch (e) {
            vscode.window.showErrorMessage(`Sandbox error: ${e.message}`);
        }
    }), vscode.commands.registerCommand("goalaif.generateReport", async () => {
        const sessionId = sidebar.currentSessionId;
        if (!sessionId) {
            vscode.window.showErrorMessage("No session. Run analysis first.");
            return;
        }
        try {
            const resp = await fetch("http://localhost:8000/report/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId }),
            });
            const data = await resp.json();
            sidebar.showReport(data.report || "");
        }
        catch (e) {
            vscode.window.showErrorMessage(`Report error: ${e.message}`);
        }
    }), vscode.commands.registerCommand("goalaif.openSidebar", () => {
        vscode.commands.executeCommand("workbench.view.extension.goalaif-sidebar");
    }));
}

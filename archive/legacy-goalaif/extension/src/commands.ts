import * as vscode from "vscode";
import { GoalAIFSidebarProvider } from "./sidebar";
import { WebSocketClient } from "./websocket";

export function registerCommands(context: vscode.ExtensionContext, sidebar: GoalAIFSidebarProvider) {
    const getCode = (): string => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { vscode.window.showErrorMessage("No active editor"); return ""; }
        return editor.document.getText(editor.selection) || editor.document.getText();
    };

    const analyze = async (mode: "defensive" | "offensive") => {
        const code = getCode();
        if (!code) return;

        const sessionId = `vs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ws = new WebSocketClient(sessionId, sidebar);
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
                    if (f.poc_code) sidebar.showPoC(f.poc_code);
                }
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`GoalAIF: ${e.message}`);
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand("goalaif.analyzeDefensive", () => analyze("defensive")),
        vscode.commands.registerCommand("goalaif.analyzeOffensive", () => analyze("offensive")),
        vscode.commands.registerCommand("goalaif.runPoC", async () => {
            const code = getCode();
            if (!code) return;
            try {
                const resp = await fetch("http://localhost:8000/sandbox/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: "direct", poc_code: code }),
                });
                const result = await resp.json();
                sidebar.showSandboxResult(result);
            } catch (e: any) {
                vscode.window.showErrorMessage(`Sandbox error: ${e.message}`);
            }
        }),
        vscode.commands.registerCommand("goalaif.generateReport", async () => {
            const sessionId = sidebar.currentSessionId;
            if (!sessionId) { vscode.window.showErrorMessage("No session. Run analysis first."); return; }
            try {
                const resp = await fetch("http://localhost:8000/report/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: sessionId }),
                });
                const data = await resp.json();
                sidebar.showReport(data.report || "");
            } catch (e: any) {
                vscode.window.showErrorMessage(`Report error: ${e.message}`);
            }
        }),
        vscode.commands.registerCommand("goalaif.openSidebar", () => {
            vscode.commands.executeCommand("workbench.view.extension.goalaif-sidebar");
        })
    );
}

import * as vscode from "vscode";
import { GoalAIFSidebarProvider } from "./sidebar";
import { registerCommands } from "./commands";

export function activate(context: vscode.ExtensionContext) {
    console.log("[GoalAIF] Activating...");

    const sidebar = new GoalAIFSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider("goalaif.sidebar", sidebar)
    );

    registerCommands(context, sidebar);

    console.log("[GoalAIF] Active. Commands registered: analyzeDefensive, analyzeOffensive, runPoC, generateReport, openSidebar");
}

export function deactivate() {
    console.log("[GoalAIF] Deactivated");
}

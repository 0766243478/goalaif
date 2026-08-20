import * as vscode from 'vscode';

export interface TerminalExecution {
  id: string;
  sessionId: string;
  command: string;
  workingDirectory: string;
  startTime: number;
  endTime?: number;
  stdout: string;
  stderr: string;
  exitCode?: number;
  duration?: number;
  agentId?: string;
}

export class TerminalExecutor {
  private terminals: Map<string, vscode.Terminal> = new Map();
  private executions: Map<string, TerminalExecution> = new Map();

  async executeCommand(
    sessionId: string,
    command: string,
    workingDirectory?: string,
    agentId?: string
  ): Promise<TerminalExecution> {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: TerminalExecution = {
      id,
      sessionId,
      command,
      workingDirectory: workingDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
      startTime: Date.now(),
      stdout: '',
      stderr: '',
      agentId,
    };

    this.executions.set(id, execution);

    // Create or get terminal for session
    let terminal = this.terminals.get(sessionId);
    if (!terminal) {
      terminal = vscode.window.createTerminal({
        name: `SIREEN-${sessionId}`,
        cwd: execution.workingDirectory,
      });
      this.terminals.set(sessionId, terminal);
    }

    // Execute command
    terminal.sendText(command);
    
    // Note: Real terminal output capture requires more complex setup
    // For now, we track the execution metadata
    // In production, would use terminal.onDidChange... or custom process

    // Simulate execution completion (in real implementation, would wait for actual completion)
    setTimeout(() => {
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.exitCode = 0;
      execution.stdout = `Command executed: ${command}`;
    }, 1000);

    return execution;
  }

  async executeForgeTest(
    sessionId: string,
    testPattern: string,
    workingDirectory?: string,
    agentId?: string
  ): Promise<TerminalExecution> {
    const command = `forge test --match-test ${testPattern} -vvv`;
    return this.executeCommand(sessionId, command, workingDirectory, agentId);
  }

  async executeForgeBuild(
    sessionId: string,
    workingDirectory?: string,
    agentId?: string
  ): Promise<TerminalExecution> {
    const command = 'forge build';
    return this.executeCommand(sessionId, command, workingDirectory, agentId);
  }

  async executeSlither(
    sessionId: string,
    target: string,
    workingDirectory?: string,
    agentId?: string
  ): Promise<TerminalExecution> {
    const command = `slither ${target} --json -`;
    return this.executeCommand(sessionId, command, workingDirectory, agentId);
  }

  getExecution(id: string): TerminalExecution | undefined {
    return this.executions.get(id);
  }

  getExecutionsForSession(sessionId: string): TerminalExecution[] {
    return Array.from(this.executions.values()).filter(e => e.sessionId === sessionId);
  }

  getExecutionsForAgent(agentId: string): TerminalExecution[] {
    return Array.from(this.executions.values()).filter(e => e.agentId === agentId);
  }

  dispose(): void {
    for (const terminal of this.terminals.values()) {
      terminal.dispose();
    }
    this.terminals.clear();
    this.executions.clear();
  }
}

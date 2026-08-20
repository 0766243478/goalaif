import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';

export interface FileOperation {
  id: string;
  sessionId: string;
  agentId: string;
  operation: 'read' | 'write' | 'modify';
  filePath: string;
  timestamp: number;
  lines?: [number, number];
  content?: string;
  diff?: string;
  beforeContent?: string;
  afterContent?: string;
}

export class FileTracker {
  private operations: FileOperation[] = [];

  async readFile(
    sessionId: string,
    filePath: string,
    agentId: string,
    lines?: [number, number]
  ): Promise<{ content: string; operation: FileOperation }> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    const operation: FileOperation = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      agentId,
      operation: 'read',
      filePath,
      timestamp: Date.now(),
      lines,
      content: lines ? this.extractLines(content, lines) : content,
    };

    this.operations.push(operation);
    
    // Notify UI
    this.notifyFileOperation(operation);

    return { content, operation };
  }

  async writeFile(
    sessionId: string,
    filePath: string,
    content: string,
    agentId: string
  ): Promise<FileOperation> {
    const beforeContent = await this.readFileContent(filePath);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    const diff = this.generateDiff(beforeContent, content);
    
    const operation: FileOperation = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      agentId,
      operation: 'write',
      filePath,
      timestamp: Date.now(),
      content,
      diff,
      beforeContent,
      afterContent: content,
    };

    this.operations.push(operation);
    
    this.notifyFileOperation(operation);

    return operation;
  }

  async modifyFile(
    sessionId: string,
    filePath: string,
    modifications: { startLine: number; endLine: number; newContent: string },
    agentId: string
  ): Promise<FileOperation> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const beforeContent = content;
    
    // Apply modification
    lines.splice(modifications.startLine - 1, modifications.endLine - modifications.startLine + 1, modifications.newContent);
    const newContent = lines.join('\n');
    
    await fs.writeFile(filePath, newContent, 'utf-8');
    
    const diff = this.generateDiff(beforeContent, newContent);
    
    const operation: FileOperation = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      agentId,
      operation: 'modify',
      filePath,
      timestamp: Date.now(),
      lines: [modifications.startLine, modifications.endLine],
      content: newContent,
      diff,
      beforeContent,
      afterContent: newContent,
    };

    this.operations.push(operation);
    
    this.notifyFileOperation(operation);

    return operation;
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  private extractLines(content: string, lines: [number, number]): string {
    const allLines = content.split('\n');
    const start = Math.max(0, lines[0] - 1);
    const end = Math.min(allLines.length, lines[1]);
    return allLines.slice(start, end).join('\n');
  }

  private generateDiff(before: string, after: string): string {
    // Simple diff - in production would use proper diff library
    if (before === after) {
      return '';
    }
    
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    let diff = '';
    const maxLines = Math.max(beforeLines.length, afterLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const beforeLine = beforeLines[i] || '';
      const afterLine = afterLines[i] || '';
      
      if (beforeLine !== afterLine) {
        if (beforeLine) {
          diff += `- ${beforeLine}\n`;
        }
        if (afterLine) {
          diff += `+ ${afterLine}\n`;
        }
      } else if (beforeLine) {
        diff += `  ${beforeLine}\n`;
      }
    }
    
    return diff;
  }

  private notifyFileOperation(operation: FileOperation): void {
    // Notify UI via WebSocket or message bus
    console.log(`[FileTracker] ${operation.operation} ${operation.filePath} by ${operation.agentId}`);
  }

  getOperationsForSession(sessionId: string): FileOperation[] {
    return this.operations.filter(op => op.sessionId === sessionId);
  }

  getOperationsForAgent(agentId: string): FileOperation[] {
    return this.operations.filter(op => op.agentId === agentId);
  }

  getOperationsForFile(filePath: string): FileOperation[] {
    return this.operations.filter(op => op.filePath === filePath);
  }

  getReadOperations(sessionId: string): FileOperation[] {
    return this.operations.filter(op => op.sessionId === sessionId && op.operation === 'read');
  }

  getWriteOperations(sessionId: string): FileOperation[] {
    return this.operations.filter(op => op.sessionId === sessionId && op.operation === 'write');
  }

  getModifyOperations(sessionId: string): FileOperation[] {
    return this.operations.filter(op => op.sessionId === sessionId && op.operation === 'modify');
  }

  clear(): void {
    this.operations = [];
  }
}

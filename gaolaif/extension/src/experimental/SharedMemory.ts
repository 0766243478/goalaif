export interface Finding {
  id: string;
  contract: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  description: string;
  evidence: Evidence[];
  createdAt: number;
  status: 'open' | 'confirmed' | 'false_positive' | 'fixed';
}

export interface Hypothesis {
  id: string;
  statement: string;
  rationale: string;
  confidence: number;
  status: 'pending' | 'investigating' | 'confirmed' | 'rejected';
  evidence: Evidence[];
  createdAt: number;
  author: 'human' | 'agent';
}

export interface Evidence {
  id: string;
  type: 'code' | 'test' | 'simulation' | 'analysis';
  data: any;
  source: string;
  timestamp: number;
}

export interface FileAccess {
  filePath: string;
  operation: 'read' | 'write' | 'modify';
  agentId: string;
  timestamp: number;
  lines?: [number, number];
}

export interface CommandExecution {
  id: string;
  command: string;
  workingDirectory: string;
  startTime: number;
  endTime?: number;
  stdout: string;
  stderr: string;
  exitCode?: number;
  agentId: string;
}

export interface InvestigationPlan {
  attackSurfaces: any[];
  priorityAreas: any[];
  investigationSteps: any[];
  createdAt: number;
}

export interface ProjectKnowledgeGraph {
  architecture: any[];
  contracts: any[];
  functions: any[];
  dependencies: any[];
  trustBoundaries: any[];
  externalCalls: any[];
  privilegedRoles: any[];
  stateVariables: any[];
  upgradeability: any;
  tests: any[];
}

export class SharedMemory {
  public readonly sessionId: string;
  
  private findings: Map<string, Finding> = new Map();
  private hypotheses: Map<string, Hypothesis> = new Map();
  private evidence: Map<string, Evidence> = new Map();
  private fileAccess: FileAccess[] = [];
  private commands: CommandExecution[] = [];
  private investigationPlan?: InvestigationPlan;
  private projectKnowledge?: ProjectKnowledgeGraph;
  private agentDecisions: any[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  // Findings
  async addFinding(finding: Omit<Finding, 'id' | 'createdAt'>): Promise<Finding> {
    const id = `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newFinding: Finding = {
      ...finding,
      id,
      createdAt: Date.now(),
    };
    this.findings.set(id, newFinding);
    return newFinding;
  }

  async getFindings(): Promise<Finding[]> {
    return Array.from(this.findings.values());
  }

  async getFinding(id: string): Promise<Finding | undefined> {
    return this.findings.get(id);
  }

  async updateFinding(id: string, updates: Partial<Finding>): Promise<void> {
    const finding = this.findings.get(id);
    if (finding) {
      Object.assign(finding, updates);
    }
  }

  // Hypotheses
  async addHypothesis(hypothesis: Omit<Hypothesis, 'id' | 'createdAt'>): Promise<Hypothesis> {
    const id = `hyp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newHypothesis: Hypothesis = {
      ...hypothesis,
      id,
      createdAt: Date.now(),
    };
    this.hypotheses.set(id, newHypothesis);
    return newHypothesis;
  }

  async getHypotheses(): Promise<Hypothesis[]> {
    return Array.from(this.hypotheses.values());
  }

  async getHypothesis(id: string): Promise<Hypothesis | undefined> {
    return this.hypotheses.get(id);
  }

  async updateHypothesis(id: string, updates: Partial<Hypothesis>): Promise<void> {
    const hypothesis = this.hypotheses.get(id);
    if (hypothesis) {
      Object.assign(hypothesis, updates);
    }
  }

  // Evidence
  async addEvidence(evidence: Omit<Evidence, 'id'>): Promise<Evidence> {
    const id = `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEvidence: Evidence = {
      ...evidence,
      id,
    };
    this.evidence.set(id, newEvidence);
    return newEvidence;
  }

  async getEvidence(): Promise<Evidence[]> {
    return Array.from(this.evidence.values());
  }

  // File Access
  async addFileAccess(access: FileAccess): Promise<void> {
    this.fileAccess.push(access);
  }

  async getFileAccess(): Promise<FileAccess[]> {
    return this.fileAccess;
  }

  async getFileAccessForFile(filePath: string): Promise<FileAccess[]> {
    return this.fileAccess.filter(a => a.filePath === filePath);
  }

  // Commands
  async addCommandExecution(execution: Omit<CommandExecution, 'id'>): Promise<CommandExecution> {
    const id = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newExecution: CommandExecution = {
      ...execution,
      id,
    };
    this.commands.push(newExecution);
    return newExecution;
  }

  async getCommands(): Promise<CommandExecution[]> {
    return this.commands;
  }

  async getCommandsForAgent(agentId: string): Promise<CommandExecution[]> {
    return this.commands.filter(c => c.agentId === agentId);
  }

  // Investigation Plan
  async updateInvestigationPlan(plan: InvestigationPlan): Promise<void> {
    this.investigationPlan = plan;
  }

  async getInvestigationPlan(): Promise<InvestigationPlan | undefined> {
    return this.investigationPlan;
  }

  // Project Knowledge
  async updateProjectKnowledge(knowledge: ProjectKnowledgeGraph): Promise<void> {
    this.projectKnowledge = knowledge;
  }

  async getProjectKnowledge(): Promise<ProjectKnowledgeGraph | undefined> {
    return this.projectKnowledge;
  }

  // Agent Updates
  async updateFromAgent(agent: any, task: any, result: any): Promise<void> {
    this.agentDecisions.push({
      agentId: agent.id,
      agentType: agent.type,
      taskId: task.id,
      result,
      timestamp: Date.now(),
    });
  }

  // Memory Queries
  async queryFindings(filter: Partial<Finding>): Promise<Finding[]> {
    const findings = Array.from(this.findings.values());
    return findings.filter(f => {
      for (const [key, value] of Object.entries(filter)) {
        if ((f as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  async queryHypotheses(filter: Partial<Hypothesis>): Promise<Hypothesis[]> {
    const hypotheses = Array.from(this.hypotheses.values());
    return hypotheses.filter(h => {
      for (const [key, value] of Object.entries(filter)) {
        if ((h as any)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  // Statistics
  getStats(): {
    findings: number;
    hypotheses: number;
    evidence: number;
    fileAccess: number;
    commands: number;
  } {
    return {
      findings: this.findings.size,
      hypotheses: this.hypotheses.size,
      evidence: this.evidence.size,
      fileAccess: this.fileAccess.length,
      commands: this.commands.length,
    };
  }

  // Export
  export(): any {
    return {
      sessionId: this.sessionId,
      findings: Array.from(this.findings.values()),
      hypotheses: Array.from(this.hypotheses.values()),
      evidence: Array.from(this.evidence.values()),
      fileAccess: this.fileAccess,
      commands: this.commands,
      investigationPlan: this.investigationPlan,
      projectKnowledge: this.projectKnowledge,
      agentDecisions: this.agentDecisions,
    };
  }

  // Import
  import(data: any): void {
    if (data.findings) {
      for (const f of data.findings) {
        this.findings.set(f.id, f);
      }
    }
    if (data.hypotheses) {
      for (const h of data.hypotheses) {
        this.hypotheses.set(h.id, h);
      }
    }
    if (data.evidence) {
      for (const e of data.evidence) {
        this.evidence.set(e.id, e);
      }
    }
    if (data.fileAccess) {
      this.fileAccess = data.fileAccess;
    }
    if (data.commands) {
      this.commands = data.commands;
    }
    if (data.investigationPlan) {
      this.investigationPlan = data.investigationPlan;
    }
    if (data.projectKnowledge) {
      this.projectKnowledge = data.projectKnowledge;
    }
    if (data.agentDecisions) {
      this.agentDecisions = data.agentDecisions;
    }
  }
}

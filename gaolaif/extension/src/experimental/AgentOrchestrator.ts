 import { WorkspaceDiscovery, ProjectKnowledgeGraph } from '../workspace/WorkspaceDiscovery';
import { SharedMemory } from './SharedMemory';

export type AgentType = 
  | 'planner'
  | 'researcher'
  | 'repository_explorer'
  | 'static_analysis'
  | 'security_researcher'
  | 'attack_hypothesis'
  | 'exploit_validation'
  | 'simulation'
  | 'judge'
  | 'report';

export interface AgentTask {
  id: string;
  agentType: AgentType;
  sessionId: string;
  description: string;
  input: any;
  priority: number;
  createdAt: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface AgentEvent {
  sessionId: string;
  agentId: string;
  agentType: AgentType;
  type: 'task_started' | 'task_completed' | 'finding' | 'hypothesis' | 'evidence' | 'memory_update';
  payload: any;
  timestamp: number;
}

export interface Agent {
  id: string;
  type: AgentType;
  sessionId: string;
  status: 'idle' | 'running' | 'waiting' | 'complete' | 'error';
  currentTask: AgentTask | null;
  memory: SharedMemory;
  execute(task: AgentTask): Promise<AgentTask>;
}

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private events: AgentEvent[] = [];
  private workspaceDiscovery: WorkspaceDiscovery;
  private sharedMemory: SharedMemory;

  constructor(sessionId: string) {
    this.workspaceDiscovery = new WorkspaceDiscovery();
    this.sharedMemory = new SharedMemory(sessionId);
    this.initializeAgents(sessionId);
  }

  private initializeAgents(sessionId: string): void {
    const agentTypes: AgentType[] = [
      'planner',
      'researcher',
      'repository_explorer',
      'static_analysis',
      'security_researcher',
      'attack_hypothesis',
      'exploit_validation',
      'simulation',
      'judge',
      'report',
    ];

    for (const type of agentTypes) {
      const agent: Agent = {
        id: `${sessionId}-${type}-${Date.now()}`,
        type,
        sessionId,
        status: 'idle',
        currentTask: null,
        memory: this.sharedMemory,
        execute: async (task: AgentTask) => {
          return this.executeAgentTask(agent, task);
        },
      };
      this.agents.set(agent.id, agent);
    }
  }

  async startAudit(): Promise<void> {
    // Step 1: Discover workspace
    const discovery = await this.workspaceDiscovery.discover();
    
    // Step 2: Update shared memory with project knowledge
    await this.sharedMemory.updateProjectKnowledge(discovery.knowledgeGraph);
    
    // Step 3: Create initial tasks
    await this.createInitialTasks(discovery);
    
    // Step 4: Start agent execution
    await this.executeTasks();
  }

  private async createInitialTasks(discovery: any): Promise<void> {
    const tasks: AgentTask[] = [
      {
        id: `task-${Date.now()}-planner`,
        agentType: 'planner',
        sessionId: this.sharedMemory.sessionId,
        description: 'Map project architecture and identify attack surfaces',
        input: {
          knowledgeGraph: discovery.knowledgeGraph,
          projectStructure: discovery.projectStructure,
        },
        priority: 1,
        createdAt: Date.now(),
        status: 'pending',
      },
      {
        id: `task-${Date.now()}-explorer`,
        agentType: 'repository_explorer',
        sessionId: this.sharedMemory.sessionId,
        description: 'Explore repository structure and read key files',
        input: {
          files: discovery.projectStructure.files,
          contracts: discovery.projectStructure.contracts,
        },
        priority: 2,
        createdAt: Date.now(),
        status: 'pending',
      },
      {
        id: `task-${Date.now()}-static`,
        agentType: 'static_analysis',
        sessionId: this.sharedMemory.sessionId,
        description: 'Run static analysis on contracts',
        input: {
          contracts: discovery.projectStructure.contracts,
        },
        priority: 3,
        createdAt: Date.now(),
        status: 'pending',
      },
    ];

    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
  }

  private async executeTasks(): Promise<void> {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.priority - b.priority);

    for (const task of pendingTasks) {
      const agent = this.getAgentForTask(task);
      if (agent) {
        await this.executeAgentTask(agent, task);
      }
    }
  }

  private getAgentForTask(task: AgentTask): Agent | null {
    for (const agent of this.agents.values()) {
      if (agent.type === task.agentType && agent.status === 'idle') {
        return agent;
      }
    }
    return null;
  }

  private async executeAgentTask(agent: Agent, task: AgentTask): Promise<AgentTask> {
    agent.status = 'running';
    agent.currentTask = task;
    task.status = 'running';

    this.emitEvent({
      sessionId: agent.sessionId,
      agentId: agent.id,
      agentType: agent.type,
      type: 'task_started',
      payload: { taskId: task.id, description: task.description },
      timestamp: Date.now(),
    });

    try {
      const result = await this.runAgentLogic(agent, task);
      task.status = 'completed';
      task.result = result;
      agent.status = 'idle';
      agent.currentTask = null;

      this.emitEvent({
        sessionId: agent.sessionId,
        agentId: agent.id,
        agentType: agent.type,
        type: 'task_completed',
        payload: { taskId: task.id, result },
        timestamp: Date.now(),
      });

      // Update shared memory with results
      await this.sharedMemory.updateFromAgent(agent, task, result);

      return task;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      agent.status = 'error';
      agent.currentTask = null;

      this.emitEvent({
        sessionId: agent.sessionId,
        agentId: agent.id,
        agentType: agent.type,
        type: 'task_completed',
        payload: { taskId: task.id, error: task.error },
        timestamp: Date.now(),
      });

      return task;
    }
  }

  private async runAgentLogic(agent: Agent, task: AgentTask): Promise<any> {
    switch (agent.type) {
      case 'planner':
        return this.runPlanner(agent, task);
      case 'researcher':
        return this.runResearcher(agent, task);
      case 'repository_explorer':
        return this.runRepositoryExplorer(agent, task);
      case 'static_analysis':
        return this.runStaticAnalysis(agent, task);
      case 'security_researcher':
        return this.runSecurityResearcher(agent, task);
      case 'attack_hypothesis':
        return this.runAttackHypothesis(agent, task);
      case 'exploit_validation':
        return this.runExploitValidation(agent, task);
      case 'simulation':
        return this.runSimulation(agent, task);
      case 'judge':
        return this.runJudge(agent, task);
      case 'report':
        return this.runReport(agent, task);
      default:
        throw new Error(`Unknown agent type: ${agent.type}`);
    }
  }

  private async runPlanner(agent: Agent, task: AgentTask): Promise<any> {
    const knowledgeGraph = task.input.knowledgeGraph;
    
    // Identify attack surfaces
    const attackSurfaces = this.identifyAttackSurfaces(knowledgeGraph);
    
    // Create investigation plan
    const plan = {
      attackSurfaces,
      priorityAreas: this.prioritizeAreas(attackSurfaces),
      investigationSteps: this.createInvestigationSteps(attackSurfaces),
      createdAt: Date.now(),
    };

    await this.sharedMemory.updateInvestigationPlan(plan);
    
    return plan;
  }

  private async runRepositoryExplorer(agent: Agent, task: AgentTask): Promise<any> {
    const files = task.input.files;
    const contracts = task.input.contracts;
    
    const exploredFiles: any[] = [];
    
    for (const file of contracts.slice(0, 10)) { // Limit for demo
      // Simulate file read
      const fileInfo = {
        path: file.path,
        relativePath: file.relativePath,
        size: file.size,
        lastModified: file.lastModified,
        exploredAt: Date.now(),
      };
      exploredFiles.push(fileInfo);
      
      // Update memory
      await this.sharedMemory.addFileAccess({
        filePath: file.path,
        operation: 'read',
        agentId: agent.id,
        timestamp: Date.now(),
      });
    }

    return { exploredFiles, count: exploredFiles.length };
  }

  private async runStaticAnalysis(agent: Agent, task: AgentTask): Promise<any> {
    const contracts = task.input.contracts;
    
    const findings: any[] = [];
    
    for (const contract of contracts.slice(0, 5)) {
      // Simulate static analysis
      const finding = {
        contract: contract.path,
        issue: 'Potential reentrancy',
        severity: 'high' as const,
        line: 42,
        description: 'External call before state update',
        status: 'open' as const,
        evidence: [] as any[],
      };
      findings.push(finding);
      
      await this.sharedMemory.addFinding(finding);
    }

    return { findings, count: findings.length };
  }

  private async runSecurityResearcher(agent: Agent, task: AgentTask): Promise<any> {
    const findings = await this.sharedMemory.getFindings();
    
    const research: any[] = [];
    
    for (const finding of findings) {
      const researchItem = {
        findingId: finding.id,
        analysis: 'Investigating reentrancy pattern',
        evidence: [],
        confidence: 0.7,
      };
      research.push(researchItem);
    }

    return { research, count: research.length };
  }

  private async runAttackHypothesis(agent: Agent, task: AgentTask): Promise<any> {
    const hypotheses = [
      {
        id: `hyp-${Date.now()}`,
        statement: 'Reentrancy vulnerability in withdraw function',
        rationale: 'External call before state update',
        confidence: 0.8,
        status: 'pending' as const,
        evidence: [] as any[],
        author: 'agent' as const,
      },
    ];

    for (const hyp of hypotheses) {
      await this.sharedMemory.addHypothesis(hyp);
    }

    return { hypotheses };
  }

  private async runExploitValidation(agent: Agent, task: AgentTask): Promise<any> {
    const hypotheses = await this.sharedMemory.getHypotheses();
    
    const validations: any[] = [];
    
    for (const hyp of hypotheses) {
      const validation = {
        hypothesisId: hyp.id,
        validated: false,
        evidence: [],
        pocGenerated: false,
      };
      validations.push(validation);
    }

    return { validations };
  }

  private async runSimulation(agent: Agent, task: AgentTask): Promise<any> {
    return { simulated: true, results: [] };
  }

  private async runJudge(agent: Agent, task: AgentTask): Promise<any> {
    const findings = await this.sharedMemory.getFindings();
    
    const judgments = findings.map(f => ({
      findingId: f.id,
      verdict: 'needs_review',
      confidence: 0.7,
      evidence: [],
    }));

    return { judgments };
  }

  private async runReport(agent: Agent, task: AgentTask): Promise<any> {
    const findings = await this.sharedMemory.getFindings();
    const hypotheses = await this.sharedMemory.getHypotheses();
    
    return {
      findings,
      hypotheses,
      summary: `Audit complete with ${findings.length} findings`,
    };
  }

  private async runResearcher(agent: Agent, task: AgentTask): Promise<any> {
    return { researched: true };
  }

  private identifyAttackSurfaces(knowledgeGraph: ProjectKnowledgeGraph): any[] {
    return knowledgeGraph.contracts.map(c => ({
      contract: c.name,
      functions: c.functions,
      risk: 'medium',
    }));
  }

  private prioritizeAreas(surfaces: any[]): any[] {
    return surfaces.sort((a, b) => b.risk.localeCompare(a.risk));
  }

  private createInvestigationSteps(surfaces: any[]): any[] {
    return surfaces.map(s => ({
      contract: s.contract,
      step: 'Analyze external calls',
      priority: 'high',
    }));
  }

  private emitEvent(event: AgentEvent): void {
    this.events.push(event);
    // Emit to UI via WebSocket
    console.log(`[AgentOrchestrator] Event: ${event.type} from ${event.agentType}`);
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  getEvents(): AgentEvent[] {
    return this.events;
  }

  getSharedMemory(): SharedMemory {
    return this.sharedMemory;
  }
}

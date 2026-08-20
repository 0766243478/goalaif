# SIREEN Agentic Workspace Architecture

## Executive Summary

SIREEN is a persistent collaborative security workspace where multiple AI agents autonomously investigate software projects while human researchers observe, challenge, and redirect investigations. This document defines the architecture for transforming SIREEN from a chatbot UI into a real human+AI collaborative security engineering workspace.

## 1. Core Principles

### 1.1 Non-Negotiable Requirements

- **Real Execution**: Every terminal command, file read, and AI call must be real
- **Workspace Awareness**: Understand entire VS Code workspace, not just single files
- **Session Isolation**: 10+ concurrent sessions with zero cross-talk
- **Shared Memory**: Agents share authoritative project memory within sessions
- **Visible Execution**: Users see agents working in real-time
- **Human Control**: Researchers can intervene, redirect, and contribute hypotheses

### 1.2 What SIREEN Is NOT

- ❌ Chatbot UI
- ❌ ChatGPT inside VS Code
- ❌ Collection of buttons
- ❌ Single AI waiting for prompts
- ❌ UI wrapper around API

### 1.3 What SIREEN IS

- ✅ Persistent collaborative workspace
- ✅ Multiple AI agents autonomously investigating
- ✅ Human researcher observes and directs
- ✅ Real terminal execution
- ✅ Real file operations
- ✅ Evidence-based findings

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Sidebar      │  │ Webview      │  │ Workspace API    │  │
│  │ Provider     │  │ (React)      │  │ Discovery        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼──────────────────┼───────────────────┼───────────┘
          │                  │                   │
          │ WebSocket        │                   │
          │                  │                   │
┌─────────▼──────────────────▼───────────────────▼───────────┐
│                    Backend (FastAPI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Session      │  │ Agent        │  │ Workspace        │  │
│  │ Manager      │  │ Orchestrator │  │ Indexer          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                   │            │
│  ┌──────▼───────┐  ┌─────▼──────┐  ┌────────▼────────┐   │
│  │ SQLite       │  │ Shared     │  │ Terminal        │   │
│  │ Sessions     │  │ Memory     │  │ Executor        │   │
│  └──────────────┘  └────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 3. Workspace Discovery & Project Indexing

### 3.1 Workspace Discovery

When audit starts, SIREEN must discover the entire workspace:

```typescript
interface WorkspaceDiscovery {
  projectRoot: string;
  files: FileIndex[];
  structure: ProjectStructure;
  dependencies: DependencyGraph;
  tests: TestSuite[];
  config: ConfigFiles[];
}
```

**Discovery Process:**
1. Use VS Code workspace APIs to get all workspace folders
2. Build file index respecting `.gitignore`, `.vscodeignore`
3. Identify relevant files by extension and content
4. Build dependency graph
5. Identify test suites
6. Parse configuration files

### 3.2 Project Knowledge Graph

Persistent project context shared by all agents:

```typescript
interface ProjectKnowledgeGraph {
  architecture: ArchitectureNode[];
  contracts: ContractNode[];
  functions: FunctionNode[];
  dependencies: DependencyEdge[];
  trustBoundaries: TrustBoundary[];
  externalCalls: ExternalCall[];
  privilegedRoles: Role[];
  stateVariables: StateVariable[];
  upgradeability: UpgradeabilityInfo;
  tests: TestInfo[];
  previousFindings: Finding[];
  testedHypotheses: Hypothesis[];
  knownAssumptions: Assumption[];
}
```

## 4. Multi-Agent Architecture

### 4.1 Agent Definitions

Minimum conceptual agents:

1. **PLANNER** - Maps project architecture, identifies attack surfaces
2. **RESEARCHER** - Investigates code, searches for patterns
3. **REPOSITORY EXPLORER** - Reads files, builds understanding
4. **STATIC ANALYSIS AGENT** - Runs static analysis tools
5. **SECURITY RESEARCHER** - Analyzes security properties
6. **ATTACK/HYPOTHESIS AGENT** - Generates attack hypotheses
7. **EXPLOIT VALIDATION AGENT** - Validates hypotheses safely
8. **SIMULATION AGENT** - Runs isolated reproductions
9. **JUDGE** - Evaluates evidence
10. **REPORT AGENT** - Generates findings

### 4.2 Agent Lifecycle

```typescript
interface Agent {
  id: string;
  type: AgentType;
  sessionId: string;
  status: 'idle' | 'running' | 'waiting' | 'complete' | 'error';
  currentTask: Task | null;
  memory: SharedMemory;
  tools: Tool[];
  execute(task: Task): Promise<Result>;
}
```

### 4.3 Agent Orchestration

Agents communicate through structured state/events, not chat:

```typescript
interface AgentEvent {
  sessionId: string;
  agentId: string;
  type: 'task_started' | 'task_completed' | 'finding' | 'hypothesis' | 'evidence';
  payload: any;
  timestamp: number;
}
```

## 5. Shared Memory System

### 5.1 Memory Structure

All agents in a session share authoritative memory:

```typescript
interface SharedMemory {
  sessionId: string;
  projectArchitecture: ProjectKnowledgeGraph;
  currentInvestigation: Investigation[];
  findings: Finding[];
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  commandsExecuted: CommandExecution[];
  testResults: TestResult[];
  filesInspected: FileAccess[];
  filesModified: FileModification[];
  rejectedHypotheses: Hypothesis[];
  confirmedVulnerabilities: Vulnerability[];
  agentDecisions: AgentDecision[];
}
```

### 5.2 Memory Operations

- **Read**: Agents read shared memory
- **Write**: Agents write findings, hypotheses, evidence
- **Update**: Agents update investigation state
- **Query**: Agents query memory for context

## 6. Human Role & Intervention

### 6.1 Hypothesis Mechanism

Human researchers can introduce hypotheses:

```typescript
interface Hypothesis {
  id: string;
  sessionId: string;
  author: 'human' | 'agent';
  statement: string;
  rationale: string;
  createdAt: number;
  status: 'pending' | 'investigating' | 'confirmed' | 'rejected';
  evidence: Evidence[];
}
```

### 6.2 Intervention Points

Human can intervene at any time:
- Introduce new hypothesis
- Redirect investigation
- Approve/reject findings
- Provide context
- Stop/pause agents

## 7. Visible Agent Execution

### 7.1 Execution Workspace

Real-time view of agent activity:

```
┌─────────────────────────────────────────────┐
│ SIREEN RUNNING — SESSION #04                │
├─────────────────────────────────────────────┤
│                                             │
│ ● Planner                                   │
│   Mapping project architecture              │
│                                             │
│ ● Repository Explorer                       │
│   Reading contracts/TTSwap/...              │
│                                             │
│ ● Security Agent                            │
│   Investigating external call paths         │
│                                             │
│ ● Terminal                                  │
│   forge test --match-test testReentrancy    │
│                                             │
│ ● Simulation                                │
│   Executing isolated reproduction           │
│                                             │
│ ○ Judge                                     │
│   Waiting for evidence                      │
│                                             │
└─────────────────────────────────────────────┘
```

### 7.2 Activity Views

Users can open:
- **FILES** - Real file reads/writes with diffs
- **TERMINAL** - Real command execution with output
- **AGENTS** - Agent status and tasks
- **ACTIVITY** - Timeline of all actions
- **FINDINGS** - Evidence-based findings
- **MEMORY** - Shared memory state
- **EVIDENCE** - Collected evidence

## 8. Real Terminal Execution

### 8.1 Terminal Requirements

Every terminal action must be real:

```typescript
interface TerminalExecution {
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
}
```

### 8.2 Terminal Integration

- Use VS Code Terminal API
- Execute real commands
- Capture real output
- Show real exit codes
- No simulation

## 9. Real File Operations

### 9.1 File Activity Tracking

When agents read/modify files:

```typescript
interface FileAccess {
  sessionId: string;
  agentId: string;
  filePath: string;
  operation: 'read' | 'write' | 'modify';
  lines?: [number, number];
  timestamp: number;
  diff?: string;
}
```

### 9.2 File Operations

- Real file reads via VS Code workspace API
- Real file writes with diff tracking
- Show what was read/modified
- Allow inspection

## 10. Autonomous Workflow

Normal audit workflow:

1. **Discover workspace** - Index entire project
2. **Build project index** - Create knowledge graph
3. **Understand architecture** - Map components
4. **Identify attack surfaces** - Find entry points
5. **Delegate investigations** - Assign to agents
6. **Run static analysis** - Automated checks
7. **Generate hypotheses** - AI-driven
8. **Investigate hypotheses** - Agent execution
9. **Generate safe reproduction** - Isolated tests
10. **Execute validation** - Real execution
11. **Collect evidence** - Gather proof
12. **Judge** - Evaluate evidence
13. **Record findings** - Evidence-based
14. **Generate report** - Comprehensive

## 11. Session Isolation

### 11.1 Concurrent Sessions

10+ sessions must run concurrently with zero cross-talk:

```typescript
interface Session {
  id: string;
  project: string;
  agents: Agent[];
  memory: SharedMemory;
  terminal: Terminal[];
  files: FileAccess[];
  findings: Finding[];
  // No cross-session access
}
```

### 11.2 Isolation Guarantees

- Separate memory per session
- Separate terminal per session
- Separate file operations per session
- Separate AI context per session
- No message leakage

## 12. AI Provider System

### 12.1 Provider Abstraction

```typescript
interface AIProvider {
  name: string;
  call(prompt: string, context: Context): Promise<Response>;
  isAvailable(): boolean;
}
```

### 12.2 Fallback Chain

Primary → Fallback → Another → Local model

### 12.3 Error Handling

- Real errors displayed
- No fake "AI working" messages
- Timeouts handled
- Retries with backoff
- Provider failure visible

## 13. Zero-Hallucination Execution

### 13.1 Evidence Requirements

NEVER claim without evidence:
- "I read the file" → File must be actually read
- "I ran forge" → Forge must actually run
- "AI found vulnerability" → Evidence required
- "Audit complete" → All work done

### 13.2 Verification

- Log all actions
- Verify execution
- Track evidence
- No fabrication

## 14. Security Boundaries

### 14.1 Sandbox Execution

- Isolated execution environment
- No unauthorized file access
- No network access without approval
- Safe reproduction only

### 14.2 Human Approval

- Critical actions require approval
- Destructive operations blocked
- Audit trail maintained

## 15. Implementation Phases

### Phase 1: Foundation
- Workspace discovery
- Project indexing
- Session isolation
- Shared memory

### Phase 2: Agents
- Agent orchestration
- Agent execution
- Memory sharing
- Human intervention

### Phase 3: Execution
- Real terminal
- Real file ops
- Visible execution
- Evidence collection

### Phase 4: Testing
- 10 concurrent sessions
- Real AI tests
- Provider fallback
- End-to-end audit

## 16. Acceptance Criteria

SIREEN is complete when:

- [ ] Understands complete VS Code workspace
- [ ] Indexes project
- [ ] Audits multiple files
- [ ] Audits entire project
- [ ] Multiple agents execute
- [ ] Agents share memory
- [ ] Agents communicate via state/events
- [ ] Terminal actions real
- [ ] Terminal output real
- [ ] File reads real
- [ ] File modifications real
- [ ] Diffs visible
- [ ] AI execution visible
- [ ] Human hypotheses redirect agents
- [ ] Sessions real
- [ ] 10 sessions concurrent
- [ ] No cross-talk
- [ ] AI provider works
- [ ] Provider fallback works
- [ ] Failures visible
- [ ] No fake completion
- [ ] Findings contain evidence
- [ ] Complete audit works end-to-end

## 17. Documentation Requirements

Create:
1. `SIREEN_AGENTIC_WORKSPACE_ARCHITECTURE.md` (this file)
2. `SIREEN_REAL_RUNTIME_TEST.md` - Actual commands, tests, outputs
3. `SIREEN_AGENT_LIFECYCLE.md` - Agent lifecycle details
4. `SIREEN_SHARED_MEMORY_SPEC.md` - Memory specification
5. `SIREEN_WORKSPACE_DISCOVERY.md` - Discovery process

---

**Final Rule**: SIREEN is finished only when a real human can open a real VS Code workspace and observe SIREEN autonomously working on the project, reading files, understanding architecture, delegating agents, running terminal commands, testing hypotheses, sharing discoveries, performing validation, showing evidence, and collaborating with the human researcher.

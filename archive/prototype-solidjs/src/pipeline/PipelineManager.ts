// ============================================================================
// SIREEN — Pipeline Manager
// ============================================================================
// Orchestrates the entire exploit verification pipeline with bulletproof
// state machine, auto-fix compilation retries, and proper cancellation.
//
// Pipeline Flow:
//
//   Target
//     ↓
//   HYPOTHESIS           (AI analyzes contract → AttackHypothesis)
//     ↓
//   POC_GENERATION      (AI generates Foundry test.sol → PoCResult)
//     ↓
//   POC_COMPILATION     (forge build → PoCResult.state = compiled|compilation_failed)
//     ↓                      ↓
//     └─→ AUTO_FIX  ←──────┘  (max 3 retries: analyze error → LLM fix → recompile)
//     ↓
//   FORGE_EXECUTION     (forge test --json → ForgeOutput)
//     ↓
//   OUTPUT_PARSING      (parse JSON → test results, traces, gas)
//     ↓
//   VERIFICATION        (HonestSignal: 6 conditions ALL must pass)
//     ↓
//   REPORT_GENERATION   (build report with evidence, money flow)
//     ↓
//   COMPLETED / FAILED / CANCELLED
//
// Key Principles:
// 1. NEVER collapse states — each transition is explicit
// 2. Auto-fix has strict retry limit (config.maxRetries, default 3)
// 3. Cancellation via AbortSignal at every await point
// 4. State persisted for resume capability
// 5. HonestSignal.confirmed = true ONLY if all 6 conditions satisfied

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { AIClient } from '../ai/AIClient';
import { PoCGenerator } from './PoCGenerator';
import { ForgeRunner, type ForgeRunnerConfig } from './ForgeRunner';
import { OutputParser } from './OutputParser';
import { HonestSignalEvaluator } from './HonestSignal';
import { ReportBuilder } from './ReportBuilder';
import { DockerSandbox } from './DockerSandbox';
import type {
  PipelineConfig,
  PipelineStage,
  PipelineStatus,
  PipelineEvent,
  PipelineEventHandler,
  PipelineTarget,
  AttackHypothesis,
  PoCGenerationRequest,
  ForgeOutput,
  ExploitResult,
  HonestSignal,
  InvestigationReport,
  MoneyFlowEntry,
  PipelineSession,
  PoCState,
  PoCStateTransition,
  PoCResult,
} from './types';

const HYPOTHESIS_SYSTEM_PROMPT = `You are an expert smart contract security researcher. Analyze the given Solidity source code and produce a structured attack hypothesis.

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

const POC_FIX_SYSTEM_PROMPT = `You are an expert Foundry/Solidity developer. The user will provide a Solidity test file that failed to compile, along with the compiler error output.

Your task: Fix the compilation errors and return the corrected Solidity code.

Rules:
- ONLY return the fixed Solidity code wrapped in \`\`\`solidity ... \`\`\` fences
- Do NOT change the test logic — only fix syntax, imports, type errors, missing definitions
- Preserve all test logic, assertions, and exploit mechanics
- Use Foundry std library (forge-std) and cheatcodes (vm.) appropriately
- Target Solidity ^0.8.20
- Ensure the test contract inherits from "Test" and has a "testExploit" function`;

interface PipelineRunOptions {
  target: PipelineTarget;
  sourceCode: string;
  forkUrl?: string;
  onEvent?: PipelineEventHandler;
  signal?: AbortSignal;
}

interface PipelineRunResult {
  success: boolean;
  report?: InvestigationReport;
  error?: string;
  stage: PipelineStage;
}

export class PipelineManager {
  private config: PipelineConfig;
  private aiClient: AIClient;
  private pocGenerator: PoCGenerator;
  private forgeRunner: ForgeRunner;
  private outputParser: OutputParser;
  private honestSignal: HonestSignalEvaluator;
  private reportBuilder: ReportBuilder;
  private dockerSandbox?: DockerSandbox;

  /** Current pipeline state */
  private _status: PipelineStatus = 'idle';
  private _currentStage: PipelineStage = 'idle';
  private _error?: string;
  private _sessionId: string = '';
  private _sessionTarget?: PipelineTarget;
  private _sessionSourceCode = '';
  private _sessionForkUrl?: string;
  private _stagesCompleted: PipelineStage[] = [];
  
  /** Abort controller for cancellation */
  private _abortController: AbortController | null = null;

  /** Optional VS Code context for session persistence */
  private _context?: vscode.ExtensionContext;

  get status(): PipelineStatus {
    return this._status;
  }
  get currentStage(): PipelineStage {
    return this._currentStage;
  }
  get error(): string | undefined {
    return this._error;
  }
  get isRunning(): boolean {
    return this._status === 'running';
  }
  get abortSignal(): AbortSignal | undefined {
    return this._abortController?.signal;
  }

  constructor(config: PipelineConfig) {
    this.config = config;
    this.aiClient = new AIClient({
      provider: config.aiProvider,
      apiKey: config.aiApiKey,
      model: config.aiModel,
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
      dockerImage: config.dockerImage,
    });
    this.outputParser = new OutputParser();
    this.honestSignal = new HonestSignalEvaluator();
    this.reportBuilder = new ReportBuilder();

    if (config.dockerEnabled) {
      this.dockerSandbox = new DockerSandbox({
        image: config.dockerImage,
        timeout: 180_000,
      });
    }
  }

  /** Set VS Code extension context for session persistence */
  setContext(context: vscode.ExtensionContext): void {
    this._context = context;
  }

  /** Cancel a running pipeline */
  cancel(): void {
    if (this._abortController && this._status === 'running') {
      this._abortController.abort();
      this._status = 'cancelled';
      this._error = 'Pipeline cancelled by user';
      this._currentStage = 'cancelled';
    }
  }

  /**
   * Save current pipeline state to workspace state for resume capability.
   */
  private async saveSession(session: PipelineSession): Promise<void> {
    if (!this._context) return;
    try {
      await this._context.workspaceState.update(`pipeline:session:${session.id}`, session);
    } catch (err) {
      console.warn('[PipelineManager] Failed to save session:', err);
    }
  }

  /**
   * Load a saved session by ID.
   */
  async loadSession(sessionId: string): Promise<PipelineSession | undefined> {
    if (!this._context) return undefined;
    try {
      return this._context.workspaceState.get<PipelineSession>(`pipeline:session:${sessionId}`);
    } catch {
      return undefined;
    }
  }

  /**
   * List all saved pipeline sessions.
   */
  async listSessions(): Promise<PipelineSession[]> {
    if (!this._context) return [];
    try {
      const keys = this._context.workspaceState.keys().filter((k) => k.startsWith('pipeline:session:'));
      const sessions: PipelineSession[] = [];
      for (const key of keys) {
        const session = this._context.workspaceState.get<PipelineSession>(key);
        if (session) sessions.push(session);
      }
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  /**
   * Delete a saved session.
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this._context) return;
    try {
      await this._context.workspaceState.update(`pipeline:session:${sessionId}`, undefined);
    } catch {
      // ignore
    }
  }

  /**
   * Run the full exploit verification pipeline with bulletproof state machine.
   */
  async run(options: PipelineRunOptions): Promise<PipelineRunResult> {
    // Create new abort controller for this run
    this._abortController = new AbortController();
    const signal = options.signal || this._abortController.signal;

    this._status = 'running';
    this._currentStage = 'initializing';
    this._error = undefined;

    const { target, sourceCode, forkUrl, onEvent } = options;
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const workspaceDir = path.join(
      this.config.workspaceDir || os.tmpdir(),
      `sireen-pipeline-${Date.now()}`
    );

    // Initialize session
    const session: PipelineSession = {
      id: sessionId,
      target,
      sourceCode,
      forkUrl,
      currentStage: 'initializing',
      status: 'running',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stagesCompleted: [],
    };
    await this.saveSession(session);

    const updateSession = async (updates: Partial<PipelineSession>) => {
      Object.assign(session, updates, { updatedAt: Date.now() });
      await this.saveSession(session);
    };

    const emit = async (event: Omit<PipelineEvent, 'timestamp'>) => {
      const fullEvent: PipelineEvent = { ...event, timestamp: Date.now() };
      onEvent?.(fullEvent);
      
      // Also update session with current stage
      if (event.stage !== this._currentStage) {
        this._currentStage = event.stage;
        await updateSession({ currentStage: event.stage });
      }
    };

    // Retry configuration
    const maxRetries = this.config.maxRetries || 3;
    const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 10000);

    // Helper: check abort signal
    const checkAbort = () => {
      if (signal?.aborted) {
        throw new Error('Pipeline cancelled');
      }
    };

    // Helper: run a stage with retries and abort checking
    const runStageWithRetry = async <T>(
      stageName: PipelineStage,
      fn: () => Promise<T>,
      onRetry?: (attempt: number, error: Error) => void
    ): Promise<T> => {
      let lastError: Error;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        checkAbort();
        try {
          return await fn();
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          
          if (attempt < maxRetries) {
            await emit({
              stage: stageName,
              status: 'failed',
              message: `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${retryDelay(attempt)}ms...`,
              data: { error: lastError.message, attempt: attempt + 1 },
            });
            
            onRetry?.(attempt + 1, lastError);
            
            await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
            checkAbort();
            continue;
          }
          throw lastError;
        }
      }
      throw lastError!;
    };

    // Helper: transition PoC state
    const transitionPoCState = (pocResult: PoCResult, from: PoCState, to: PoCState, metadata?: Record<string, unknown>) => {
      const transition: PoCStateTransition = { from, to, timestamp: Date.now(), metadata };
      pocResult.state = to;
      pocResult.stateHistory.push(transition);
    };

    try {
      // ═══════════════════════════════════════════════════════════════════
      // STAGE 1: HYPOTHESIS
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'hypothesis',
        status: 'running',
        message: 'Analyzing target and forming attack hypothesis...',
      });
      this._currentStage = 'hypothesis';
      await updateSession({ currentStage: 'hypothesis' });

      const hypothesis = await runStageWithRetry('hypothesis', () =>
        this.generateHypothesis(sourceCode, target.name || target.value)
      );
      session.hypothesis = hypothesis;

      await emit({
        stage: 'hypothesis',
        status: 'completed',
        message: `Hypothesis: ${hypothesis.title} (${hypothesis.vulnerabilityType})`,
        data: { hypothesis },
      });
      this._stagesCompleted.push('hypothesis');
      await updateSession({ stagesCompleted: this._stagesCompleted, hypothesis });

      checkAbort();

      // ═══════════════════════════════════════════════════════════════════
      // STAGE 2: PoC GENERATION
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'poc_generation',
        status: 'running',
        message: 'Generating Foundry PoC...',
      });
      this._currentStage = 'poc_generation';
      await updateSession({ currentStage: 'poc_generation' });

      const pocRequest: PoCGenerationRequest = {
        hypothesis,
        targetCode: sourceCode,
        targetAddress: target.type === 'contract_address' ? target.value : undefined,
        chain: target.chain,
        forkUrl: forkUrl || this.config.forkRpcUrl || undefined,
      };

      let pocResult = await runStageWithRetry('poc_generation', () =>
        this.pocGenerator.generate(pocRequest)
      );
      
      // Initialize PoC state machine
      pocResult.state = 'generated';
      pocResult.stateHistory = [
        { from: 'pending', to: 'generating', timestamp: Date.now() },
        { from: 'generating', to: 'generated', timestamp: Date.now() },
      ];
      
      session.pocResult = pocResult;

      await emit({
        stage: 'poc_generation',
        status: 'completed',
        message: 'PoC generated successfully',
        data: { pocGenerated: true },
      });
      this._stagesCompleted.push('poc_generation');
      await updateSession({ stagesCompleted: this._stagesCompleted, pocResult });

      checkAbort();

      // ═══════════════════════════════════════════════════════════════════
      // STAGE 3: PoC COMPILATION (with auto-fix retry loop)
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'poc_compilation',
        status: 'running',
        message: 'Compiling PoC with Foundry...',
      });
      this._currentStage = 'poc_compilation';
      await updateSession({ currentStage: 'poc_compilation' });

      // Compilation with auto-fix
      pocResult = await this.compileWithAutoFix(pocResult, sourceCode, target, forkUrl, maxRetries, checkAbort, emit, updateSession);

      session.pocResult = pocResult;

      if (!pocResult.compilationSuccess) {
        // All retries exhausted — build failure report
        await this.buildFailureReport(session, pocResult, 'PoC compilation failed after all retries', 'poc_compilation');
        return { success: false, error: 'PoC compilation failed', stage: 'poc_compilation' };
      }

      checkAbort();

      // ═══════════════════════════════════════════════════════════════════
      // STAGE 4: FORGE EXECUTION
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'forge_execution',
        status: 'running',
        message: 'Running forge test in sandbox...',
      });
      this._currentStage = 'forge_execution';
      await updateSession({ currentStage: 'forge_execution' });

      const forgeOutput = await runStageWithRetry('forge_execution', () =>
        this.forgeRunner.runTest(pocResult.filePath, {
          forkUrl: forkUrl || this.config.forkRpcUrl,
          dockerEnabled: this.config.dockerEnabled,
          dockerImage: this.config.dockerImage,
        })
      );
      session.forgeOutput = forgeOutput;

      await emit({
        stage: 'forge_execution',
        status: 'completed',
        message: `Forge exit code: ${forgeOutput.exitCode}`,
        data: { exitCode: forgeOutput.exitCode, testCount: forgeOutput.testResults.length },
      });
      this._stagesCompleted.push('forge_execution');
      await updateSession({ stagesCompleted: this._stagesCompleted, forgeOutput });

      checkAbort();

      // ═══════════════════════════════════════════════════════════════════
      // STAGE 5: OUTPUT PARSING
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'output_parsing',
        status: 'running',
        message: 'Parsing forge output and extracting traces...',
      });
      this._currentStage = 'output_parsing';
      await updateSession({ currentStage: 'output_parsing' });

      const parsed = await this.outputParser.parse(forgeOutput);
      // Build the real ExploitResult from the raw forge output. This is the
      // authoritative source for exploit success, attacker profit, token
      // balances and money flow — it MUST be fed into HonestSignal and the
      // report (previously it was never called, so `exploitResult` was
      // always undefined and `confirmed` could never become true).
      const realExploitResult = this.outputParser.parseExploitResult(forgeOutput);
      // Store parsed traces in session for verification
      (session as any).parsedTraces = parsed.traces;
      (session as any).stateChanges = parsed.stateChanges;
      (session as any).transfers = parsed.transfers;

      await emit({
        stage: 'output_parsing',
        status: 'completed',
        message: 'Output parsed successfully',
        data: { tracesFound: parsed.traces?.length || 0, transfersFound: parsed.transfers?.length || 0 },
      });
      this._stagesCompleted.push('output_parsing');
      await updateSession({ stagesCompleted: this._stagesCompleted });

      checkAbort();

      // ═══════════════════════════════════════════════════════════════════
      // STAGE 6: HONEST SIGNAL VERIFICATION
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'verification',
        status: 'running',
        message: 'Running Honest Signal verification...',
      });
      this._currentStage = 'verification';
      await updateSession({ currentStage: 'verification' });

      const exploitResult = await this.honestSignal.evaluate({
        hypothesis,
        forgeOutput,
        pocResult,
        exploitResult: realExploitResult,
        parsedTraces: (session as any).parsedTraces,
        stateChanges: (session as any).stateChanges,
        transfers: (session as any).transfers,
      });
      session.exploitResult = exploitResult;
      session.honestSignal = exploitResult;

      await emit({
        stage: 'verification',
        status: 'completed',
        message: `Honest Signal: ${exploitResult.honestSignal.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED'} (${(exploitResult.honestSignal.confidence * 100).toFixed(0)}%)`,
        data: { 
          confirmed: exploitResult.honestSignal.confirmed,
          confidence: exploitResult.honestSignal.confidence,
          conditions: exploitResult.honestSignal.conditions 
        },
      });
      this._stagesCompleted.push('verification');
      await updateSession({ stagesCompleted: this._stagesCompleted, exploitResult, honestSignal: exploitResult.honestSignal });

      checkAbort();

      // ═══════════════════════════════════════════════════════════════════
      // STAGE 7: REPORT GENERATION
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'report_generation',
        status: 'running',
        message: 'Building investigation report...',
      });
      this._currentStage = 'report_generation';
      await updateSession({ currentStage: 'report_generation' });

      const report = await this.reportBuilder.build({
        sessionId,
        target,
        hypothesis,
        pocResult,
        forgeOutput,
        exploitResult: realExploitResult,
        honestSignal: exploitResult.honestSignal,
        moneyFlow: realExploitResult.moneyFlow,
        evidence: [],
        timeline: this.buildTimeline(session),
      });
      session.report = report;

      await emit({
        stage: 'report_generation',
        status: 'completed',
        message: 'Report generated successfully',
        data: { reportId: report.id },
      });
      this._stagesCompleted.push('report_generation');
      await updateSession({ stagesCompleted: this._stagesCompleted, report });

      // ═══════════════════════════════════════════════════════════════════
      // COMPLETED
      // ═══════════════════════════════════════════════════════════════════
      this._status = 'completed';
      this._currentStage = 'completed';
      await updateSession({ status: 'completed', currentStage: 'completed', completedAt: Date.now() });

      await emit({
        stage: 'completed',
        status: 'completed',
        message: `Pipeline complete — Verdict: ${report.verdict.toUpperCase()}`,
        data: { verdict: report.verdict, reportId: report.id },
      });

      return { success: true, report, stage: 'completed' };

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (error.message === 'Pipeline cancelled') {
        this._status = 'cancelled';
        this._currentStage = 'cancelled';
        await updateSession({ status: 'cancelled', currentStage: 'cancelled', error: 'Cancelled by user', completedAt: Date.now() });
        
        await emit({
          stage: this._currentStage as PipelineStage,
          status: 'failed',
          message: 'Pipeline cancelled by user',
          data: { cancelled: true },
        });
        
        return { success: false, error: 'Pipeline cancelled', stage: 'cancelled' };
      }

      this._status = 'failed';
      this._error = error.message;
      this._currentStage = 'failed';
      
      await updateSession({ status: 'failed', currentStage: 'failed', error: error.message, completedAt: Date.now() });
      
      await emit({
        stage: 'failed',
        status: 'failed',
        message: `Pipeline failed: ${error.message}`,
        data: { error: error.message, stage: this._currentStage },
      });

      return { success: false, error: error.message, stage: this._currentStage };
    }
  }

  /**
   * Compile PoC with auto-fix retry loop.
   * State transitions: generated → compiling → compiled | compilation_failed → (retry) → compiling
   */
  private async compileWithAutoFix(
    pocResult: PoCResult,
    sourceCode: string,
    target: PipelineTarget,
    forkUrl: string | undefined,
    maxRetries: number,
    checkAbort: () => void,
    emit: (event: Omit<PipelineEvent, 'timestamp'>) => Promise<void>,
    updateSession: (updates: Partial<PipelineSession>) => Promise<void>
  ): Promise<PoCResult> {
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      checkAbort();
      
      // Transition to compiling
      transitionPoCState(pocResult, pocResult.state, 'compiling', { attempt: attempt + 1 });
      
      await emit({
        stage: 'poc_compilation',
        status: 'running',
        message: `Compiling PoC (attempt ${attempt + 1}/${maxRetries + 1})...`,
        data: { attempt: attempt + 1, maxRetries: maxRetries + 1 },
      });

      const compileResult = await this.pocGenerator.compile(pocResult.filePath, {
        forgePath: this.config.forgePath,
        dockerEnabled: this.config.dockerEnabled,
        dockerImage: this.config.dockerImage,
      });

      pocResult.compilationAttempts = attempt + 1;
      pocResult.errors = compileResult.errors;

      if (compileResult.success) {
        // Success!
        pocResult.compilationSuccess = true;
        transitionPoCState(pocResult, 'compiling', 'compiled', { attempt: attempt + 1 });
        
        await emit({
          stage: 'poc_compilation',
          status: 'completed',
          message: `PoC compiled successfully on attempt ${attempt + 1}`,
          data: { compilationSuccess: true, attempts: attempt + 1 },
        });
        
        return pocResult;
      }

      // Compilation failed
      transitionPoCState(pocResult, 'compiling', 'compilation_failed', { 
        attempt: attempt + 1, 
        errors: compileResult.errors 
      });
      
      pocResult.lastError = compileResult.errors.join('\n');

      await emit({
        stage: 'poc_compilation',
        status: 'failed',
        message: `Compilation failed (attempt ${attempt + 1}): ${compileResult.errors[0]}`,
        data: { errors: compileResult.errors, attempt: attempt + 1 },
      });

      // If this was the last attempt, give up
      if (attempt >= maxRetries) {
        pocResult.compilationSuccess = false;
        return pocResult;
      }

      // ═══════════════════════════════════════════════════════════════════
      // AUTO-FIX: Use LLM to fix compilation errors
      // ═══════════════════════════════════════════════════════════════════
      await emit({
        stage: 'poc_compilation',
        status: 'running',
        message: `Auto-fixing compilation errors (attempt ${attempt + 1})...`,
        data: { autoFix: true, attempt: attempt + 1 },
      });

      checkAbort();

      try {
        const fixedCode = await this.autoFixPoC(
          pocResult.sourceCode,
          compileResult.errors,
          sourceCode,
          target,
          forkUrl
        );
        
        // Write fixed code
        fs.writeFileSync(pocResult.filePath, fixedCode);
        pocResult.sourceCode = fixedCode;
        
        await emit({
          stage: 'poc_compilation',
          status: 'running',
          message: 'Auto-fix applied, recompiling...',
          data: { autoFixApplied: true },
        });
        
      } catch (fixErr) {
        // Auto-fix failed — log and continue to next attempt
        console.warn('[PipelineManager] Auto-fix failed:', fixErr);
        await emit({
          stage: 'poc_compilation',
          status: 'failed',
          message: `Auto-fix failed: ${fixErr instanceof Error ? fixErr.message : 'Unknown error'}`,
          data: { autoFixFailed: true },
        });
      }
    }

    return pocResult;
  }

  /**
   * Use LLM to fix compilation errors in the PoC.
   */
  private async autoFixPoC(
    pocCode: string,
    errors: string[],
    targetCode: string,
    target: PipelineTarget,
    forkUrl: string | undefined
  ): Promise<string> {
    const errorText = errors.join('\n');
    
    const fixPrompt = `The following Foundry test file failed to compile. Fix the errors.

=== COMPILER ERRORS ===
${errorText}

=== FAILED TEST CODE ===
${pocCode}

=== TARGET CONTRACT (for context) ===
${targetCode}

=== TARGET INFO ===
Address: ${target.value}
Chain: ${target.chain}
Fork URL: ${forkUrl || 'not provided'}

Return ONLY the fixed Solidity code in a \`\`\`solidity code block.`;

    const fixedResponse = await this.aiClient.prompt(POC_FIX_SYSTEM_PROMPT, fixPrompt, {
      temperature: 0.1,
      maxTokens: 8000,
    });

    // Extract Solidity code from response
    const solMatch = fixedResponse.match(/```solidity\n([\s\S]*?)```/i);
    if (solMatch) {
      return solMatch[1].trim();
    }
    
    // Fallback: try generic code block
    const codeMatch = fixedResponse.match(/```\n?([\s\S]*?)```/i);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    
    throw new Error('Failed to extract fixed Solidity code from LLM response');
  }

  /**
   * Generate attack hypothesis from target code.
   */
  private async generateHypothesis(sourceCode: string, targetName: string): Promise<AttackHypothesis> {
    const prompt = `Analyze this Solidity contract for exploitable vulnerabilities.

Target: ${targetName}

=== SOURCE CODE ===
${sourceCode}

Return ONLY the JSON hypothesis as specified.`;

    const response = await this.aiClient.prompt(HYPOTHESIS_SYSTEM_PROMPT, prompt, {
      temperature: 0.2,
      maxTokens: 4000,
    });

    try {
      const hypothesis = AIClient.extractJSON<AttackHypothesis>(response);
      // Validate required fields
      if (!hypothesis.title || !hypothesis.vulnerabilityType || !hypothesis.attackVector) {
        throw new Error('Invalid hypothesis structure from LLM');
      }
      return hypothesis;
    } catch (err) {
      throw new Error(`Failed to parse hypothesis: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Build failure report when pipeline fails early.
   */
  private async buildFailureReport(
    session: PipelineSession,
    pocResult: PoCResult,
    errorMessage: string,
    failedStage: PipelineStage
  ): Promise<void> {
    const hypothesis = session.hypothesis || { title: 'Unknown', vulnerabilityType: 'unknown', attackVector: 'N/A', severity: 'low' as any, confidence: 0, affectedContracts: [], preconditions: [], expectedOutcome: '' };
    
    const forgeOutput: ForgeOutput = {
      raw: pocResult.errors.join('\n'),
      testResults: [],
      compilationErrors: pocResult.errors,
      exitCode: 1,
      duration: 0,
    };

    const exploitResult: ExploitResult = {
      success: false,
      attackerProfit: '0',
      profitToken: 'N/A',
      profitUSD: 0,
      tokenBalances: {},
      moneyFlow: [],
      revertedTransactions: [],
      gasUsage: { total: 0, byOperation: {} },
    };

    const honestSignal: HonestSignal = {
      confirmed: false,
      confidence: 0,
      conditions: [
        { name: 'poc_generated', satisfied: !!session.pocResult?.sourceCode, detail: session.pocResult?.sourceCode ? 'PoC was generated' : 'PoC generation failed' },
        { name: 'poc_compiled', satisfied: pocResult.compilationSuccess, detail: pocResult.compilationSuccess ? 'PoC compiled successfully' : `Compilation failed: ${pocResult.errors[0] || 'Unknown error'}` },
        { name: 'forge_executed', satisfied: false, detail: 'Forge not executed due to compilation failure' },
        { name: 'exploit_reproduced', satisfied: false, detail: 'Exploit not executed' },
        { name: 'state_change_verified', satisfied: false, detail: 'State change not verified' },
        { name: 'attacker_gain_verified', satisfied: false, detail: 'Attacker gain not verified' },
      ],
      explanation: `Pipeline failed at ${failedStage}: ${errorMessage}`,
      pocGenerated: !!session.pocResult?.sourceCode,
      pocCompiled: pocResult.compilationSuccess,
      forgeExecuted: false,
      exploitReproduced: false,
      stateChangeVerified: false,
      attackerGainVerified: false,
    };

    const report = await this.reportBuilder.build({
      sessionId: session.id,
      target: session.target,
      hypothesis,
      pocResult,
      forgeOutput,
      exploitResult,
      honestSignal,
      moneyFlow: [],
      evidence: [],
      timeline: this.buildTimeline(session),
    });
    session.report = report;
  }

  /**
   * Build timeline from session stages.
   */
  private buildTimeline(session: PipelineSession): Array<{ type: string; title: string; description: string; timestamp: number }> {
    const timeline: Array<{ type: string; title: string; description: string; timestamp: number }> = [];
    
    timeline.push({ type: 'investigation_start', title: 'Investigation Started', description: `Target: ${session.target.value}`, timestamp: session.createdAt });
    
    if (session.hypothesis) {
      timeline.push({ type: 'finding_discovered', title: 'Hypothesis Formed', description: session.hypothesis.title, timestamp: session.updatedAt });
    }
    if (session.pocResult) {
      timeline.push({ type: 'finding_discovered', title: 'PoC Generated', description: `Compilation: ${session.pocResult.compilationSuccess ? 'Success' : 'Failed'}`, timestamp: session.updatedAt });
    }
    if (session.forgeOutput) {
      timeline.push({ type: 'exploit_simulated', title: 'Forge Test Executed', description: `Exit code: ${session.forgeOutput.exitCode}`, timestamp: session.updatedAt });
    }
    if (session.honestSignal) {
      timeline.push({ type: 'finding_verified', title: 'Honest Signal', description: session.honestSignal.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED', timestamp: session.updatedAt });
    }
    if (session.report) {
      timeline.push({ type: 'report_generated', title: 'Report Generated', description: session.report.verdict, timestamp: session.updatedAt });
    }
    
    return timeline;
  }

  /**
   * Validate that the pipeline config is complete enough to run.
   */
  validateConfig(): string[] {
    const errors: string[] = [];
    if (!this.config.aiApiKey) {
      errors.push('AI API key is not configured. Set sireen.aiApiKey in settings.');
    }
    if (!this.config.forgePath && !this.config.dockerEnabled) {
      errors.push('Forge path is not configured and Docker is disabled. Set sireen.forgePath or enable Docker.');
    }
    return errors;
  }

  // Helper for PoC state transitions
  private transitionPoCState(
    pocResult: PoCResult,
    from: PoCState,
    to: PoCState,
    metadata?: Record<string, unknown>
  ): void {
    const transition: PoCStateTransition = { from, to, timestamp: Date.now(), metadata };
    pocResult.state = to;
    pocResult.stateHistory.push(transition);
  }
}
// ============================================================================
// SIREEN — Pipeline Manager
// ============================================================================
// Orchestrates the entire exploit verification pipeline:
//
//   Target → Hypothesis → PoC Generation → Compilation Retry →
//   Forge Test → Output Parsing → Honest Signal → Report
//
// Emits events at each stage for progress tracking in the UI.

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
} from './types';

/**
 * Session state for persistence and resume capability.
 */
export interface PipelineSession {
  id: string;
  target: PipelineTarget;
  sourceCode: string;
  forkUrl?: string;
  currentStage: PipelineStage;
  status: PipelineStatus;
  error?: string;
  hypothesis?: AttackHypothesis;
  pocResult?: any;
  forgeOutput?: ForgeOutput;
  exploitResult?: ExploitResult;
  honestSignal?: HonestSignal;
  report?: InvestigationReport;
  createdAt: number;
  updatedAt: number;
}

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

/**
 * Options for running the pipeline.
 */
export interface PipelineRunOptions {
  target: PipelineTarget;
  sourceCode: string;
  forkUrl?: string;
  onEvent?: PipelineEventHandler;
  signal?: AbortSignal;
}

/**
 * Result of a pipeline run.
 */
export interface PipelineRunResult {
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
        timeout: config.forgePath ? 180_000 : 120_000,
      });
    }
  }

  /** Set VS Code extension context for session persistence */
  setContext(context: vscode.ExtensionContext): void {
    this._context = context;
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
   * Run the full exploit verification pipeline.
   */
  async run(options: PipelineRunOptions): Promise<PipelineRunResult> {
    this._status = 'running';
    this._currentStage = 'initializing';
    this._error = undefined;

    const { target, sourceCode, forkUrl, onEvent, signal } = options;
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
    };
    await this.saveSession(session);

    const updateSession = async (updates: Partial<PipelineSession>) => {
      Object.assign(session, updates, { updatedAt: Date.now() });
      await this.saveSession(session);
    };

    // Retry configuration
    const maxRetries = this.config.maxRetries || 3;
    const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 10000);

    // Helper to run a stage with retries
    const runStageWithRetry = async <T>(
      stageName: PipelineStage,
      fn: () => Promise<T>,
      onRetry?: (attempt: number, error: Error) => void
    ): Promise<T> => {
      let lastError: Error;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          
          if (attempt < maxRetries) {
            this.emit(onEvent, {
              stage: stageName,
              status: 'failed',
              message: `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${retryDelay(attempt)}ms...`,
              data: { error: lastError.message, attempt: attempt + 1 },
              timestamp: Date.now(),
            });
            
            onRetry?.(attempt + 1, lastError);
            
            await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
            
            if (signal?.aborted) {
              throw new Error('Pipeline cancelled during retry');
            }
            continue;
          }
          throw lastError;
        }
      }
      throw lastError!;
    };

    try {
      // ─── Stage 1: Hypothesis ──────────────────────────────────────────
      this.emit(onEvent, {
        stage: 'hypothesis',
        status: 'running',
        message: 'Analyzing target and forming attack hypothesis...',
        timestamp: Date.now(),
      });
      this._currentStage = 'hypothesis';
      await updateSession({ currentStage: 'hypothesis' });

      const hypothesis = await runStageWithRetry('hypothesis', () =>
        this.generateHypothesis(sourceCode, target.name || target.value)
      );
      session.hypothesis = hypothesis;

      this.emit(onEvent, {
        stage: 'hypothesis',
        status: 'completed',
        message: `Hypothesis: ${hypothesis.title} (${hypothesis.vulnerabilityType})`,
        data: { hypothesis },
        timestamp: Date.now(),
      });
      await updateSession({ currentStage: 'hypothesis', status: 'running', hypothesis });

      if (signal?.aborted) {
        return this.cancelRun();
      }

      // ─── Stage 2: PoC Generation ──────────────────────────────────────
      this.emit(onEvent, {
        stage: 'poc_generation',
        status: 'running',
        message: 'Generating Foundry PoC...',
        timestamp: Date.now(),
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

      const pocResult = await runStageWithRetry('poc_generation', () =>
        this.pocGenerator.generate(pocRequest)
      );
      session.pocResult = pocResult;

      if (!pocResult.compilationSuccess) {
        this.emit(onEvent, {
          stage: 'poc_compilation',
          status: 'failed',
          message: `PoC compilation failed after ${pocResult.compilationAttempts} attempts`,
          data: { errors: pocResult.errors },
          timestamp: Date.now(),
        });

        // Build report with failed state
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

        const hsInput = { forgeOutput, exploitResult, hypothesis };
        const hs = this.honestSignal.evaluate(hsInput);
        const report = this.reportBuilder.build({
          target: target.value,
          targetAddress: target.type === 'contract_address' ? target.value : undefined,
          chain: target.chain,
          hypothesis,
          poc: pocResult,
          forgeOutput,
          exploitResult,
          honestSignal: hs,
          moneyFlow: [],
        });
        session.report = report;

        this._status = 'completed';
        this._currentStage = 'failed';
        await updateSession({ currentStage: 'failed', status: 'failed', error: 'PoC compilation failed', report });
        return { success: false, report, error: 'PoC compilation failed', stage: 'poc_compilation' };
      }

      this.emit(onEvent, {
        stage: 'poc_compilation',
        status: 'completed',
        message: `PoC compiled successfully (${pocResult.compilationAttempts} attempt(s))`,
        data: { attempts: pocResult.compilationAttempts },
        timestamp: Date.now(),
      });
      await updateSession({ currentStage: 'poc_compilation', status: 'running', pocResult });

      if (signal?.aborted) {
        return this.cancelRun();
      }

      // ─── Stage 3: Forge Execution ─────────────────────────────────────
      this.emit(onEvent, {
        stage: 'forge_execution',
        status: 'running',
        message: 'Executing forge test...',
        timestamp: Date.now(),
      });
      this._currentStage = 'forge_execution';
      await updateSession({ currentStage: 'forge_execution' });

      // Write the PoC to a Foundry project structure
      const poCDir = path.join(workspaceDir, 'forge-poc');
      fs.mkdirSync(path.join(poCDir, 'test'), { recursive: true });
      fs.mkdirSync(path.join(poCDir, 'lib', 'forge-std', 'src'), { recursive: true });

      // Write forge-std stub
      fs.writeFileSync(
        path.join(poCDir, 'lib', 'forge-std', 'src', 'Test.sol'),
        this.getForgeStdStub(),
        'utf-8'
      );

      // Write PoC
      fs.writeFileSync(
        path.join(poCDir, 'test', 'PoC.t.sol'),
        pocResult.sourceCode,
        'utf-8'
      );

      // Write config files
      fs.writeFileSync(
        path.join(poCDir, 'foundry.toml'),
        '[profile.default]\nsrc = "test"\nlibs = ["lib"]\nsolc = "0.8.19"\n\n[profile.default.optimizer]\nenabled = true\nruns = 200\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(poCDir, 'remappings.txt'),
        'forge-std/=lib/forge-std/src/\n',
        'utf-8'
      );

      const forgeOutput = await this.forgeRunner.run(poCDir);
      session.forgeOutput = forgeOutput;

      this.emit(onEvent, {
        stage: 'forge_execution',
        status: forgeOutput.exitCode === 0 ? 'completed' : 'failed',
        message: `forge test exit code: ${forgeOutput.exitCode} (${forgeOutput.testResults.length} tests)`,
        data: { exitCode: forgeOutput.exitCode, testCount: forgeOutput.testResults.length },
        timestamp: Date.now(),
      });
      await updateSession({ currentStage: 'forge_execution', status: forgeOutput.exitCode === 0 ? 'completed' : 'failed', forgeOutput });

      if (signal?.aborted) {
        return this.cancelRun();
      }

      // ─── Stage 4: Output Parsing ──────────────────────────────────────
      this.emit(onEvent, {
        stage: 'output_parsing',
        status: 'running',
        message: 'Parsing forge output...',
        timestamp: Date.now(),
      });
      this._currentStage = 'output_parsing';
      await updateSession({ currentStage: 'output_parsing' });

      const exploitResult = this.outputParser.parseExploitResult(forgeOutput);
      session.exploitResult = exploitResult;

      this.emit(onEvent, {
        stage: 'output_parsing',
        status: 'completed',
        message: `Exploit ${exploitResult.success ? 'succeeded' : 'failed'} — Profit: ${exploitResult.attackerProfit} ${exploitResult.profitToken}`,
        data: { exploitResult },
        timestamp: Date.now(),
      });
      await updateSession({ currentStage: 'output_parsing', status: 'completed', exploitResult });

      if (signal?.aborted) {
        return this.cancelRun();
      }

      // ─── Stage 5: Honest Signal ───────────────────────────────────────
      this.emit(onEvent, {
        stage: 'verification',
        status: 'running',
        message: 'Evaluating honest signal...',
        timestamp: Date.now(),
      });
      this._currentStage = 'verification';
      await updateSession({ currentStage: 'verification' });

      const hs = this.honestSignal.evaluate({
        forgeOutput,
        exploitResult,
        hypothesis,
      });
      session.honestSignal = hs;

      this.emit(onEvent, {
        stage: 'verification',
        status: 'completed',
        message: hs.confirmed
          ? 'EXPLOIT CONFIRMED'
          : 'Exploit NOT confirmed',
        data: { honestSignal: hs },
        timestamp: Date.now(),
      });
      await updateSession({ currentStage: 'verification', status: 'completed', honestSignal: hs });

      if (signal?.aborted) {
        return this.cancelRun();
      }

      // ─── Stage 6: Report Generation ───────────────────────────────────
      this.emit(onEvent, {
        stage: 'report_generation',
        status: 'running',
        message: 'Building investigation report...',
        timestamp: Date.now(),
      });
      this._currentStage = 'report_generation';
      await updateSession({ currentStage: 'report_generation' });

      const report = this.reportBuilder.build({
        target: target.value,
        targetAddress: target.type === 'contract_address' ? target.value : undefined,
        chain: target.chain,
        hypothesis,
        poc: pocResult,
        forgeOutput,
        exploitResult,
        honestSignal: hs,
        moneyFlow: exploitResult.moneyFlow,
      });
      session.report = report;

      // ─── Cleanup ──────────────────────────────────────────────────────
      this.cleanup(workspaceDir);

      this._status = 'completed';
      this._currentStage = 'completed';

      this.emit(onEvent, {
        stage: 'completed',
        status: 'completed',
        message: `Pipeline complete — Verdict: ${report.verdict.toUpperCase()}`,
        data: { report },
        timestamp: Date.now(),
      });
      await updateSession({ currentStage: 'completed', status: 'completed', report });

      return { success: true, report, stage: 'completed' };
    } catch (err: any) {
      this._status = 'failed';
      this._currentStage = 'failed';
      this._error = err.message || 'Unknown pipeline error';

      this.emit(onEvent, {
        stage: 'failed',
        status: 'failed',
        message: `Pipeline failed: ${this._error}`,
        data: { error: this._error },
        timestamp: Date.now(),
      });
      await updateSession({ currentStage: 'failed', status: 'failed', error: this._error });

      this.cleanup(workspaceDir);

      return {
        success: false,
        error: this._error,
        stage: 'failed',
      };
    }
  }

  /**
   * Generate an attack hypothesis from source code using AI.
   */
  private async generateHypothesis(
    sourceCode: string,
    targetName?: string
  ): Promise<AttackHypothesis> {
    const userPrompt = `Analyze this Solidity contract${targetName ? ` (${targetName})` : ''} for vulnerabilities:

\`\`\`solidity
${sourceCode.slice(0, 12_000)}
\`\`\`

Output a JSON attack hypothesis. If the code appears secure, set "confidence" to 0 and explain why.`;

    const response = await this.aiClient.prompt(
      HYPOTHESIS_SYSTEM_PROMPT,
      userPrompt,
      { maxTokens: 2048, temperature: 0.2 }
    );

    // Parse JSON from response
    let hypothesis: AttackHypothesis;
    try {
      hypothesis = AIClient.extractJSON<AttackHypothesis>(response);
    } catch {
      // If JSON parsing fails, create a default hypothesis
      hypothesis = {
        title: `Analysis of ${targetName || 'contract'}`,
        vulnerabilityType: 'other',
        affectedContracts: [targetName || 'Unknown'],
        attackVector: 'AI analysis produced unparseable output. Manual review required.',
        preconditions: ['N/A'],
        expectedOutcome: 'Unknown — AI output could not be parsed',
        severity: 'medium',
        confidence: 0,
      };
    }

    // Validate required fields
    if (!hypothesis.title) hypothesis.title = `Analysis of ${targetName || 'contract'}`;
    if (!hypothesis.vulnerabilityType) hypothesis.vulnerabilityType = 'other';
    if (!hypothesis.affectedContracts || hypothesis.affectedContracts.length === 0) {
      hypothesis.affectedContracts = [targetName || 'Unknown'];
    }
    if (!hypothesis.attackVector) hypothesis.attackVector = 'Unknown attack vector';
    if (!hypothesis.preconditions) hypothesis.preconditions = [];
    if (!hypothesis.expectedOutcome) hypothesis.expectedOutcome = 'Unknown outcome';
    if (!hypothesis.severity) hypothesis.severity = 'medium';

    return hypothesis;
  }

  // ─── Event Helpers ───────────────────────────────────────────────────────

  private emit(
    handler: PipelineEventHandler | undefined,
    event: {
      stage: PipelineStage;
      status: 'running' | 'completed' | 'failed';
      message: string;
      data?: Record<string, unknown>;
      timestamp: number;
    }
  ): void {
    handler?.(event as PipelineEvent);
  }

  private cancelRun(): PipelineRunResult {
    this._status = 'cancelled';
    this._currentStage = 'completed';
    return { success: false, error: 'Pipeline cancelled', stage: this._currentStage };
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  private cleanup(dir: string): void {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  // ─── Forge Std Stub ──────────────────────────────────────────────────────

  private getForgeStdStub(): string {
    return `// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface Vm {
    function createSelectFork(string calldata) external returns (uint256);
    function createFork(string calldata) external returns (uint256);
    function selectFork(uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function startPrank(address, address) external;
    function stopPrank() external;
    function deal(address, uint256) external;
    function warp(uint256) external;
    function roll(uint256) external;
    function expectRevert(bytes calldata) external;
    function expectRevert() external;
    function expectEmit(bool, bool, bool, bool) external;
    function record() external;
    function accesses(address, bytes32) external returns (bool, bool);
    function label(address, string calldata) external;
    function getBlockNumber() external returns (uint256);
    function getBlockTimestamp() external returns (uint256);
    function toString(address) external returns (string memory);
    function toString(uint256) external returns (string memory);
    function toString(bytes32) external returns (string memory);
    function assume(bool) external;
}

abstract contract StdAssertions {
    function assertTrue(bool c) public pure { require(c, "assertTrue"); }
    function assertTrue(bool c, string memory e) public pure { require(c, e); }
    function assertEq(uint256 a, uint256 b) public pure { require(a == b, "assertEq(uint256)"); }
    function assertEq(uint256 a, uint256 b, string memory e) public pure { require(a == b, e); }
    function assertEq(address a, address b) public pure { require(a == b, "assertEq(address)"); }
    function assertEq(address a, address b, string memory e) public pure { require(a == b, e); }
    function assertEq(bytes32 a, bytes32 b) public pure { require(a == b, "assertEq(bytes32)"); }
    function assertEq(string memory a, string memory b) public pure { require(keccak256(bytes(a)) == keccak256(bytes(b)), "assertEq(string)"); }
    function assertGt(uint256 a, uint256 b) public pure { require(a > b, "assertGt"); }
    function assertGe(uint256 a, uint256 b) public pure { require(a >= b, "assertGe"); }
    function assertLt(uint256 a, uint256 b) public pure { require(a < b, "assertLt"); }
    function assertLe(uint256 a, uint256 b) public pure { require(a <= b, "assertLe"); }
    function assertNotEq(uint256 a, uint256 b) public pure { require(a != b, "assertNotEq"); }
    function assertApproxEqAbs(uint256 a, uint256 b, uint256 tol) public pure { require(a >= b ? a - b <= tol : b - a <= tol, "assertApproxEqAbs"); }
}

abstract contract Test is StdAssertions {
    Vm public constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    function setUp() public virtual;
    function testExploit() public virtual;
}`;
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
}

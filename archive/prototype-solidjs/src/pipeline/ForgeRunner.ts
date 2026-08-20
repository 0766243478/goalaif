// ============================================================================
// SIREEN — Forge Runner
// ============================================================================
// Executes forge test against a generated PoC, capturing stdout/stderr and
// returning raw output for parsing. Supports local execution and Docker sandbox.

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { ForgeOutput, ForgeTestResult } from './types';

export interface ForgeRunnerConfig {
  forgePath: string;
  forkUrl?: string;
  timeout: number;
  verbose: boolean;
  dockerEnabled: boolean;
  dockerImage: string;
}

export const DEFAULT_FORGE_CONFIG: ForgeRunnerConfig = {
  forgePath: 'forge',
  timeout: 180_000,
  verbose: true,
  dockerEnabled: false,
  dockerImage: 'ghcr.io/foundry-rs/foundry:latest',
};

export class ForgeRunner {
  private config: ForgeRunnerConfig;

  constructor(config: Partial<ForgeRunnerConfig> = {}) {
    this.config = { ...DEFAULT_FORGE_CONFIG, ...config };
  }

  /**
   * Run forge test in the given workspace directory.
   * Returns structured output with raw text and metadata.
   */
  async run(workspaceDir: string): Promise<ForgeOutput> {
    // Legacy method - delegates to runTest with default options
    const testFilePath = path.join(workspaceDir, 'test', 'PoC.t.sol');
    return this.runTest(testFilePath, {
      forkUrl: this.config.forkUrl,
      dockerEnabled: this.config.dockerEnabled,
      dockerImage: this.config.dockerImage,
    });
  }

  /**
   * Run a specific test file (e.g., a generated PoC) against a fork.
   * Returns structured ForgeOutput for parsing.
   */
  async runTest(
    testFilePath: string,
    options: { forkUrl?: string; dockerEnabled: boolean; dockerImage: string }
  ): Promise<ForgeOutput> {
    const workspaceDir = path.dirname(path.dirname(testFilePath));
    const startTime = Date.now();

    if (options.dockerEnabled) {
      return this.runInDocker(workspaceDir, startTime, options);
    }
    return this.runLocal(workspaceDir, startTime, options);
  }

  /**
   * Execute forge test locally with specific options.
   */
  private async runLocal(
    workspaceDir: string,
    startTime: number,
    options: { forkUrl?: string; dockerEnabled: boolean; dockerImage: string }
  ): Promise<ForgeOutput> {
    return new Promise((resolve) => {
      try {
        const cmdParts = [
          this.config.forgePath,
          'test',
          '--match-test', 'testExploit',
          '-vvv',
          '--root', `"${workspaceDir}"`,
        ];

        if (options.forkUrl) {
          cmdParts.push('--fork-url', options.forkUrl);
        }

        cmdParts.push('--gas-report');

        const cmd = cmdParts.join(' ');
        const output = execSync(cmd, {
          cwd: workspaceDir,
          timeout: this.config.timeout,
          stdio: ['pipe', 'pipe', 'pipe'],
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        });

        const duration = Date.now() - startTime;
        const raw = output.toString();
        const testResults = this.parseTestResults(raw);
        const gasReport = this.parseGasReport(raw);
        const compilationErrors: string[] = [];

        resolve({
          raw,
          testResults,
          gasReport: gasReport?.total ? gasReport : undefined,
          compilationErrors,
          exitCode: 0,
          duration,
        });
      } catch (err: any) {
        const duration = Date.now() - startTime;
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        const raw = stdout + stderr;

        const compilationErrors = this.extractCompilationErrors(raw);
        const testResults = this.parseTestResults(raw);
        const gasReport = this.parseGasReport(raw);

        resolve({
          raw,
          testResults,
          gasReport: gasReport?.total ? gasReport : undefined,
          compilationErrors,
          exitCode: err.status ?? 1,
          duration,
        });
      }
    });
  }

  /**
   * Execute forge test inside a Docker container.
   */
  private async runInDocker(
    workspaceDir: string,
    startTime: number,
    options: { forkUrl?: string; dockerEnabled: boolean; dockerImage: string }
  ): Promise<ForgeOutput> {
    try {
      const containerName = `sireen-forge-${Date.now()}`;

      // Ensure docker is available
      execSync('docker info', { timeout: 10_000, stdio: 'pipe' });

      const mountDir = '/workspace';
      const runCmd = [
        'docker', 'run', '--rm',
        '--name', containerName,
        '-v', `${workspaceDir}:${mountDir}`,
        '-w', mountDir,
        options.dockerImage,
        'forge', 'test',
        '--match-test', 'testExploit',
        '-vvv',
      ];

      if (options.forkUrl) {
        runCmd.push('--fork-url', options.forkUrl);
      }

      runCmd.push('--gas-report');

      const output = execSync(runCmd.join(' '), {
        timeout: this.config.timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });

      const duration = Date.now() - startTime;
      const raw = output.toString();
      const testResults = this.parseTestResults(raw);
      const gasReport = this.parseGasReport(raw);

      return {
        raw,
        testResults,
        gasReport: gasReport?.total ? gasReport : undefined,
        compilationErrors: [],
        exitCode: 0,
        duration,
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const stderr = err.stderr?.toString() || '';
      const stdout = err.stdout?.toString() || '';
      const raw = stdout + stderr;
      const compilationErrors = this.extractCompilationErrors(raw);
      const testResults = this.parseTestResults(raw);

      return {
        raw,
        testResults,
        compilationErrors,
        exitCode: err.status ?? 1,
        duration,
      };
    }
  }

  /**
   * Compile-only check (used by PoCGenerator during the repair loop).
   */
  compile(workspaceDir: string): { success: boolean; errors: string[] } {
    try {
      execSync(
        `${this.config.forgePath} build --root "${workspaceDir}" --via-ir`,
        {
          cwd: workspaceDir,
          timeout: 120_000,
          stdio: ['pipe', 'pipe', 'pipe'],
          encoding: 'utf-8',
        }
      );
      return { success: true, errors: [] };
    } catch (err: any) {
      const stderr = err.stderr?.toString() || '';
      const stdout = err.stdout?.toString() || '';
      const errorLines = this.extractCompilationErrors(stderr + stdout);
      return { success: false, errors: errorLines.length > 0 ? errorLines : [stderr] };
    }
  }

  // ─── Parsing Helpers ──────────────────────────────────────────────────────

  private parseTestResults(raw: string): ForgeTestResult[] {
    const results: ForgeTestResult[] = [];

    // Match both [PASS] and [FAIL] lines
    const passRegex = /\[PASS\]\s+(test\S+)\s+\(gas:\s*(\d+)\)/g;
    const failRegex = /\[FAIL\.\s*(Reason:\s*.*?)?\]\s+(test\S+)/g;

    let match: RegExpExecArray | null;
    while ((match = passRegex.exec(raw)) !== null) {
      results.push({
        name: match[1],
        status: 'pass',
        gasUsed: parseInt(match[2], 10),
      });
    }

    while ((match = failRegex.exec(raw)) !== null) {
      results.push({
        name: match[2],
        status: 'fail',
        error: match[1] || undefined,
      });
    }

    return results;
  }

  private parseGasReport(raw: string): { total: number; byFunction: Record<string, number> } {
    const byFunction: Record<string, number> = {};
    let total = 0;

    // Find "Gas Report:" section
    const reportMatch = raw.match(/Gas Report:\s*([\s\S]*?)(?=\n\n|\n─|$)/);
    if (reportMatch) {
      const lines = reportMatch[1].split('\n');
      for (const line of lines) {
        const fnMatch = line.match(/\|(.+?)\|.*?\|\s*(\d+)\s*\|/);
        if (fnMatch) {
          const fnName = fnMatch[1].trim();
          const gas = parseInt(fnMatch[2], 10);
          byFunction[fnName] = gas;
          total += gas;
        }
      }
    }

    return { total, byFunction };
  }

  private extractCompilationErrors(raw: string): string[] {
    return raw
      .split('\n')
      .filter((l) =>
        l.includes('Error') ||
        l.includes('error') ||
        l.includes('Compiler') ||
        l.includes('compilation') ||
        l.includes('Syntax') ||
        l.includes('TypeError') ||
        l.includes('DeclarationError') ||
        l.includes('ParserError') ||
        l.includes('Failing')
      )
      .filter((l) => !l.includes('forge-std')); // filter internal errors
  }
}
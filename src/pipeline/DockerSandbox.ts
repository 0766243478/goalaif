// ============================================================================
// SIREEN — Docker Sandbox
// ============================================================================
// Manages Docker-based sandbox for secure PoC execution inside a Foundry
// container. Handles container lifecycle, project mounting, and output capture.

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface DockerSandboxConfig {
  image: string;
  containerName?: string;
  memoryLimit: string;
  cpuLimit: string;
  networkDisabled: boolean;
  timeout: number;
  tempDir: string;
}

export const DEFAULT_SANDBOX_CONFIG: DockerSandboxConfig = {
  image: 'ghcr.io/foundry-rs/foundry:latest',
  memoryLimit: '4g',
  cpuLimit: '2',
  networkDisabled: false,
  timeout: 180_000,
  tempDir: '',
};

export interface SandboxResult {
  success: boolean;
  output: string;
  containerName: string;
  duration: number;
  error?: string;
}

export class DockerSandbox {
  private config: DockerSandboxConfig;

  constructor(config: Partial<DockerSandboxConfig> = {}) {
    this.config = { ...DEFAULT_SANDBOX_CONFIG, ...config };
  }

  /**
   * Check if Docker is available on the host.
   */
  static async isAvailable(): Promise<boolean> {
    try {
      execSync('docker info', { timeout: 10_000, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute a forge command inside the Docker sandbox.
   * Mounts the workspace directory and captures output.
   */
  async execute(
    workspaceDir: string,
    forgeArgs: string[] = ['test', '--match-test', 'testExploit', '-vvv']
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const containerName =
      this.config.containerName || `sireen-sandbox-${Date.now()}`;

    if (!fs.existsSync(workspaceDir)) {
      return {
        success: false,
        output: '',
        containerName,
        duration: 0,
        error: `Workspace directory does not exist: ${workspaceDir}`,
      };
    }

    try {
      // Pull the image if not present (silent)
      try {
        execSync(`docker image inspect ${this.config.image}`, {
          stdio: 'pipe',
          timeout: 10_000,
        });
      } catch {
        // Image not found locally, pull it
        execSync(`docker pull ${this.config.image}`, {
          timeout: 120_000,
          stdio: 'pipe',
        });
      }

      // Build docker run command
      const cmdParts = [
        'docker', 'run', '--rm',
        '--name', containerName,
        '-m', this.config.memoryLimit,
        '--cpus', this.config.cpuLimit,
      ];

      if (this.config.networkDisabled) {
        cmdParts.push('--network', 'none');
      }

      // Mount workspace
      const mountTarget = '/workspace';
      cmdParts.push(
        '-v',
        `${workspaceDir}:${mountTarget}`,
        '-w',
        mountTarget
      );

      // The forge command
      cmdParts.push(this.config.image, 'forge', ...forgeArgs);

      const cmd = cmdParts.join(' ');

      const output = execSync(cmd, {
        timeout: this.config.timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });

      const duration = Date.now() - startTime;

      return {
        success: true,
        output: output.toString(),
        containerName,
        duration,
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const stderr = err.stderr?.toString() || '';
      const stdout = err.stdout?.toString() || '';

      return {
        success: false,
        output: stdout + stderr,
        containerName,
        duration,
        error: err.message || 'Docker execution failed',
      };
    }
  }

  /**
   * Execute forge build inside the sandbox.
   */
  async build(workspaceDir: string): Promise<SandboxResult> {
    return this.execute(workspaceDir, ['build', '--via-ir']);
  }

  /**
   * Execute forge test with fork enabled.
   */
  async testWithFork(
    workspaceDir: string,
    forkUrl: string
  ): Promise<SandboxResult> {
    return this.execute(workspaceDir, [
      'test',
      '--match-test', 'testExploit',
      '-vvv',
      '--fork-url', forkUrl,
      '--gas-report',
    ]);
  }

  /**
   * Clean up any dangling containers from interrupted runs.
   */
  static async cleanup(containerName?: string): Promise<void> {
    try {
      if (containerName) {
        execSync(`docker rm -f ${containerName}`, {
          stdio: 'pipe',
          timeout: 10_000,
        });
      } else {
        // Remove all sireen-sandbox containers — cross-platform iteration
        try {
          const list = execSync(
            'docker ps -a --filter "name=sireen-sandbox" -q',
            { stdio: 'pipe', timeout: 10_000, encoding: 'utf-8' }
          ).toString().trim();
          if (list) {
            const ids = list.split('\n').filter(Boolean);
            for (const id of ids) {
              try {
                execSync(`docker rm -f ${id}`, { stdio: 'pipe', timeout: 10_000 });
              } catch { /* per-container ignore */ }
            }
          }
        } catch { /* list failure ignore */ }
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

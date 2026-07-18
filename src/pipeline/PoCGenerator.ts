/// ============================================================================
// SIREEN — PoC Generator
// ============================================================================
// AI-powered Foundry PoC generation with automatic compilation retry.
// Uses LLM to generate test.sol based on attack hypothesis, then compiles
// with forge and repairs until successful or retry limit reached.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { AIClient } from '../ai/AIClient';
import type { AttackHypothesis, PoCGenerationRequest, PoCResult } from './types';

// System prompt for PoC generation — instructs the LLM to produce
// a deterministic, self-contained Foundry test.
const POC_SYSTEM_PROMPT = `You are an expert Solidity security engineer generating Foundry PoC tests.

Generate a **self-contained Foundry test** that proves or disproves the attack hypothesis.

Requirements:
- Use pragma solidity ^0.8.19
- Import forge-std/Test.sol: import "forge-std/Test.sol";
- The contract MUST be named "PoC" and extend Test: contract PoC is Test {
- Include a setUp() function that deploys contracts and sets initial state
- Include a function named "testExploit()" that executes the attack
- Use forge-std cheats (vm.prank, vm.startPrank, vm.stopPrank, vm.deal, etc.)
- Use assert statements to verify the exploit outcome
- DO NOT use console.log — use assert-based verification
- Make the test DETERMINISTIC — no randomness, no block number dependency
- If forking, use vm.createSelectFork(forkUrl) in setUp()
- Include comprehensive assertions that check:
  1. The attacker's balance of the target token increased
  2. The protocol lost the expected amount
  3. Any relevant state changes

IMPORTANT: Output ONLY the Solidity code. No explanations, no markdown outside the code block.`;

// System prompt for compilation error repair
const REPAIR_SYSTEM_PROMPT = `You are an expert Solidity debugger. The Foundry test below failed to compile.

Fix ALL compilation errors. Output the COMPLETE fixed test file.

Common issues to check:
- Missing imports (forge-std/Test.sol)
- Interface mismatches
- Wrong pragma version
- Missing semicolons
- Type mismatches
- Undefined variables or functions
- Wrong cheat syntax

Output ONLY the complete fixed Solidity code. No explanations.`;

const FORGE_STD_STUB = `// SPDX-License-Identifier: MIT
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
    uint256 internal constant DEFAULT_TEST_GAS = 1_000_000_000;

    function setUp() public virtual;
    function testExploit() public virtual;
}`;

export class PoCGenerator {
  private aiClient: AIClient;
  private forgePath: string;
  private maxRetries: number;

  constructor(aiClient: AIClient, forgePath: string, maxRetries: number = 3) {
    this.aiClient = aiClient;
    this.forgePath = forgePath;
    this.maxRetries = maxRetries;
  }

  /**
   * Generate a Foundry PoC test.sol from an attack hypothesis.
   * Compiles with forge and auto-repairs on failure.
   */
  async generate(request: PoCGenerationRequest): Promise<PoCResult> {
    const userPrompt = this.buildGenerationPrompt(request);
    let sourceCode = await this.aiClient.prompt(POC_SYSTEM_PROMPT, userPrompt, {
      maxTokens: 4096,
      temperature: 0.1, // Low temp for deterministic output
    });

    sourceCode = AIClient.extractSolidity(sourceCode);

    // Create a temp workspace for compilation
    const workspaceDir = path.join(
      os.tmpdir(),
      `sireen-poc-${Date.now()}`
    );
    const filePath = path.join(workspaceDir, 'test', 'PoC.t.sol');
    const errors: string[] = [];

    // Write and compile with retries
    let success = false;
    let attempts = 0;

    while (attempts < this.maxRetries && !success) {
      attempts++;
      this.writeForgeProject(workspaceDir, sourceCode);

      const compileResult = await this.tryCompile(workspaceDir);

      if (compileResult.success) {
        success = true;
      } else {
        errors.push(...compileResult.errors);
        if (attempts < this.maxRetries) {
          sourceCode = await this.repairPoC(sourceCode, compileResult.errors);
          sourceCode = AIClient.extractSolidity(sourceCode);
        }
      }
    }

    // Clean up temp workspace
    this.cleanup(workspaceDir);

    return {
      sourceCode,
      filePath,
      compilationAttempts: attempts,
      compilationSuccess: success,
      errors,
    };
  }

  /**
   * Build the prompt for PoC generation.
   */
  private buildGenerationPrompt(request: PoCGenerationRequest): string {
    const { hypothesis, targetCode, targetAddress, chain, forkUrl } = request;

    return `Generate a Foundry PoC for the following attack hypothesis:

## Vulnerability
- **Title:** ${hypothesis.title}
- **Type:** ${hypothesis.vulnerabilityType}
- **Severity:** ${hypothesis.severity}

## Affected Contracts
${hypothesis.affectedContracts.join(', ')}

## Attack Vector
${hypothesis.attackVector}

## Preconditions
${hypothesis.preconditions.map((p) => `- ${p}`).join('\n')}

## Expected Outcome
${hypothesis.expectedOutcome}

## Target Code
\`\`\`solidity
${targetCode}
\`\`\`

${targetAddress ? `## Target Address\n${targetAddress}\n` : ''}
${chain ? `## Chain\n${chain}\n` : ''}
${forkUrl ? `## Fork URL (use in setUp)\n${forkUrl}\n` : ''}

Generate a Foundry test that:
1. Sets up the environment in setUp() with the vulnerable contract
2. Executes the attack in testExploit() using the attack vector described
3. Asserts that the attacker gains the expected assets
4. Uses forge-std cheats (vm.prank, vm.deal, etc.)

Output ONLY the Solidity code in a single \`\`\`solidity block.`;
  }

  /**
   * Write the complete Foundry project structure to disk.
   */
  private writeForgeProject(workspaceDir: string, sourceCode: string): void {
    const testDir = path.join(workspaceDir, 'test');
    const libDir = path.join(workspaceDir, 'lib', 'forge-std', 'src');

    fs.mkdirSync(libDir, { recursive: true });

    // Write forge-std stub (for offline compilation)
    fs.writeFileSync(
      path.join(libDir, 'Test.sol'),
      FORGE_STD_STUB,
      'utf-8'
    );

    // Write PoC test
    fs.writeFileSync(
      path.join(testDir, 'PoC.t.sol'),
      sourceCode,
      'utf-8'
    );

    // Write foundry.toml
    fs.writeFileSync(
      path.join(workspaceDir, 'foundry.toml'),
      '[profile.default]\nsrc = "test"\nlibs = ["lib"]\nsolc = "0.8.19"\n\n[profile.default.optimizer]\nenabled = true\nruns = 200\n',
      'utf-8'
    );

    // Write remappings
    fs.writeFileSync(
      path.join(workspaceDir, 'remappings.txt'),
      'forge-std/=lib/forge-std/src/\n',
      'utf-8'
    );
  }

  /**
   * Try to compile the PoC with forge build.
   */
  private async tryCompile(
    workspaceDir: string
  ): Promise<{ success: boolean; errors: string[] }> {
    return new Promise((resolve) => {
      try {
        execSync(
          `${this.forgePath} build --root "${workspaceDir}" --via-ir`,
          {
            cwd: workspaceDir,
            timeout: 120_000,
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );
        resolve({ success: true, errors: [] });
      } catch (err: any) {
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        const errorLines = (stderr + stdout)
          .split('\n')
          .filter((l: string) =>
            l.includes('Error') ||
            l.includes('error') ||
            l.includes('Warning') ||
            l.includes('Compiler')
          );
        resolve({ success: false, errors: errorLines.length > 0 ? errorLines : [stderr] });
      }
    });
  }

  /**
   * Use AI to repair a failing PoC based on compiler errors.
   */
  private async repairPoC(
    sourceCode: string,
    errors: string[]
  ): Promise<string> {
    const repairPrompt = `The following Foundry test failed to compile:

\`\`\`solidity
${sourceCode}
\`\`\`

Compiler errors:
${errors.map((e) => `- ${e}`).join('\n')}

Fix ALL errors and output the COMPLETE fixed test file.`;

    return this.aiClient.prompt(REPAIR_SYSTEM_PROMPT, repairPrompt, {
      maxTokens: 4096,
      temperature: 0.1,
    });
  }

  /**
   * Clean up the temp workspace.
   */
  cleanup(workspaceDir: string): void {
    try {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Compile an existing PoC file at the given path.
   * Used by PipelineManager for the auto-fix loop.
   */
  async compile(
    filePath: string,
    options: { forgePath: string; dockerEnabled: boolean; dockerImage: string }
  ): Promise<{ success: boolean; errors: string[] }> {
    const workspaceDir = path.dirname(path.dirname(filePath));
    
    return new Promise((resolve) => {
      try {
        const forgeCmd = options.dockerEnabled
          ? `docker run --rm -v "${workspaceDir}:/project" -w /project ${options.dockerImage} forge build --via-ir`
          : `${options.forgePath} build --root "${workspaceDir}" --via-ir`;

        execSync(forgeCmd, {
          cwd: workspaceDir,
          timeout: 120_000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        resolve({ success: true, errors: [] });
      } catch (err: any) {
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        const errorLines = (stderr + stdout)
          .split('\n')
          .filter((l: string) =>
            l.includes('Error') ||
            l.includes('error') ||
            l.includes('Warning') ||
            l.includes('Compiler')
          );
        resolve({ success: false, errors: errorLines.length > 0 ? errorLines : [stderr] });
      }
    });
  }
}

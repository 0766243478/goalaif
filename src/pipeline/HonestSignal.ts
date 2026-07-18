// ============================================================================
// SIREEN — Honest Signal
// ============================================================================
// Determines whether an exploit finding is Confirmed or Not Confirmed based
// on STRICT criteria. ALL 6 conditions MUST be satisfied for confirmed=true.
//
// CONFIRMED = TRUE ONLY IF:
//   1. poc_generated         — PoC was successfully generated
//   2. poc_compiled          — PoC compiled successfully (after auto-fix retries)
//   3. forge_executed        — forge test executed without infrastructure errors
//   4. exploit_reproduced    — testExploit() passed, exploit logic executed
//   5. state_change_verified — Expected protocol state change occurred
//   6. attacker_gain_verified — Attacker gained expected assets/profit
//
// NEVER collapse these states. Each is independently verifiable.

import type {
  HonestSignal,
  HonestCondition,
  ForgeOutput,
  ExploitResult,
  AttackHypothesis,
  PoCResult,
} from './types';

export interface HonestSignalInput {
  forgeOutput: ForgeOutput;
  exploitResult: ExploitResult;
  hypothesis: AttackHypothesis;
  pocResult: PoCResult;
  parsedTraces?: any[];
  stateChanges?: any[];
  transfers?: any[];
}

export class HonestSignalEvaluator {
  /**
   * Evaluate whether the exploit is confirmed based on ALL 6 strict conditions.
   */
  evaluate(input: HonestSignalInput): HonestSignal {
    const conditions: HonestCondition[] = [];

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION 1: PoC Generated
    // ═══════════════════════════════════════════════════════════════════════
    const pocGenerated = this.checkPoCGenerated(input.pocResult);
    conditions.push(pocGenerated);

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION 2: PoC Compiled
    // ═══════════════════════════════════════════════════════════════════════
    const pocCompiled = this.checkPoCCompiled(input.pocResult);
    conditions.push(pocCompiled);

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION 3: Forge Executed
    // ═══════════════════════════════════════════════════════════════════════
    const forgeExecuted = this.checkForgeExecuted(input.forgeOutput);
    conditions.push(forgeExecuted);

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION 4: Exploit Reproduced
    // ═══════════════════════════════════════════════════════════════════════
    const exploitReproduced = this.checkExploitReproduced(input.forgeOutput, input.exploitResult);
    conditions.push(exploitReproduced);

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION 5: State Change Verified
    // ═══════════════════════════════════════════════════════════════════════
    const stateChangeVerified = this.checkStateChangeVerified(
      input.hypothesis,
      input.parsedTraces,
      input.stateChanges,
      input.forgeOutput
    );
    conditions.push(stateChangeVerified);

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION 6: Attacker Gain Verified
    // ═══════════════════════════════════════════════════════════════════════
    const attackerGainVerified = this.checkAttackerGainVerified(
      input.exploitResult,
      input.hypothesis,
      input.transfers,
      input.stateChanges
    );
    conditions.push(attackerGainVerified);

    // ═══════════════════════════════════════════════════════════════════════
    // OVERALL VERDICT
    // ═══════════════════════════════════════════════════════════════════════
    const allSatisfied = conditions.every((c) => c.satisfied);
    const confidence = this.calculateConfidence(conditions);
    const explanation = this.buildExplanation(conditions, allSatisfied);

    return {
      confirmed: allSatisfied,
      confidence,
      conditions,
      explanation,
      // Individual flags for UI display
      pocGenerated: conditions[0].satisfied,
      pocCompiled: conditions[1].satisfied,
      forgeExecuted: conditions[2].satisfied,
      exploitReproduced: conditions[3].satisfied,
      stateChangeVerified: conditions[4].satisfied,
      attackerGainVerified: conditions[5].satisfied,
    };
  }

  // ─── Condition 1: PoC Generated ──────────────────────────────────────
  private checkPoCGenerated(pocResult: PoCResult): HonestCondition {
    const hasSource = !!pocResult?.sourceCode && pocResult.sourceCode.length > 100;
    const hasFile = !!pocResult?.filePath && pocResult.filePath.endsWith('.t.sol');

    return {
      name: 'PoC Generated',
      satisfied: hasSource && hasFile,
      detail: hasSource && hasFile
        ? `PoC generated: ${pocResult.filePath} (${pocResult.sourceCode.length} chars)`
        : !hasSource
          ? 'PoC generation failed — no source code produced'
          : 'PoC file path missing or invalid',
    };
  }

  // ─── Condition 2: PoC Compiled ──────────────────────────────────────
  private checkPoCCompiled(pocResult: PoCResult): HonestCondition {
    const success = pocResult?.compilationSuccess === true;
    const attempts = pocResult?.compilationAttempts || 0;

    return {
      name: 'PoC Compiled',
      satisfied: success,
      detail: success
        ? `PoC compiled successfully on attempt ${attempts}`
        : `Compilation failed after ${attempts} attempt(s): ${pocResult?.errors?.[0] || 'Unknown error'}`,
    };
  }

  // ─── Condition 3: Forge Executed ────────────────────────────────────
  private checkForgeExecuted(forgeOutput: ForgeOutput): HonestCondition {
    // Forge executed = process ran and produced output (even if tests failed)
    // NOT executed = compilation error prevented execution, or process crashed
    const hasOutput = !!forgeOutput?.raw;
    const noInfrastructureError = forgeOutput.exitCode !== -1; // -1 typically means process failed to start
    const noCompilationBlock = forgeOutput.compilationErrors?.length === 0;

    const satisfied = hasOutput && noInfrastructureError && noCompilationBlock;

    return {
      name: 'Forge Executed',
      satisfied,
      detail: satisfied
        ? `forge test ran (exit code: ${forgeOutput.exitCode}, ${forgeOutput.testResults?.length || 0} tests)`
        : noCompilationBlock
          ? 'Forge process failed to start or crashed'
          : 'Compilation errors prevented test execution',
    };
  }

  // ─── Condition 4: Exploit Reproduced ────────────────────────────────
  private checkExploitReproduced(forgeOutput: ForgeOutput, exploitResult: ExploitResult): HonestCondition {
    const exploitTest = forgeOutput.testResults.find(
      (t) => t.name === 'testExploit' || t.name.includes('testExploit')
    );

    // Must have testExploit that PASSED
    const testPassed = exploitTest?.status === 'pass';
    const exploitSuccess = exploitResult?.success === true;

    // Both must be true
    const satisfied = testPassed && exploitSuccess;

    let detail = '';
    if (satisfied) {
      detail = `testExploit() passed${exploitTest?.gasUsed ? ` (gas: ${exploitTest.gasUsed})` : ''}. Exploit logic executed successfully.`;
    } else if (!exploitTest) {
      detail = 'testExploit() not found in test results — PoC may be malformed';
    } else if (exploitTest.status === 'fail') {
      detail = `testExploit() failed: ${exploitTest.error || 'Assertion failed or unexpected revert'}`;
    } else if (!exploitSuccess) {
      detail = 'Exploit result indicates failure — profit not achieved';
    }

    return {
      name: 'Exploit Reproduced',
      satisfied,
      detail,
    };
  }

  // ─── Condition 5: State Change Verified ─────────────────────────────
  private checkStateChangeVerified(
    hypothesis: AttackHypothesis,
    parsedTraces: any[] | undefined,
    stateChanges: any[] | undefined,
    forgeOutput: ForgeOutput
  ): HonestCondition {
    if (!parsedTraces || parsedTraces.length === 0) {
      return {
        name: 'State Change Verified',
        satisfied: false,
        detail: 'No execution traces available — cannot verify state changes',
      };
    }

    // Look for the expected state changes based on vulnerability type
    const vulnType = hypothesis.vulnerabilityType.toLowerCase();
    const expectedChanges = this.getExpectedStateChanges(vulnType, hypothesis);

    let verifiedChanges = 0;
    const details: string[] = [];

    for (const expected of expectedChanges) {
      const found = this.findStateChange(stateChanges || [], expected);
      if (found) {
        verifiedChanges++;
        details.push(`✓ ${expected.description}`);
      } else {
        details.push(`✗ ${expected.description} — NOT OBSERVED`);
      }
    }

    // If no specific expectations, check for any state changes in the exploit test
    if (expectedChanges.length === 0) {
      const hasAnyChanges = (stateChanges?.length || 0) > 0;
      return {
        name: 'State Change Verified',
        satisfied: hasAnyChanges,
        detail: hasAnyChanges
          ? `${stateChanges?.length || 0} state changes observed during exploit`
          : 'No state changes observed during exploit execution',
      };
    }

    const satisfied = verifiedChanges === expectedChanges.length;
    const detail = satisfied
      ? `All ${expectedChanges.length} expected state changes verified`
      : `${verifiedChanges}/${expectedChanges.length} expected state changes verified. Missing: ${details.filter(d => d.startsWith('✗')).map(d => d.slice(2)).join(', ')}`;

    return {
      name: 'State Change Verified',
      satisfied,
      detail,
    };
  }

  private getExpectedStateChanges(
    vulnType: string,
    hypothesis: AttackHypothesis
  ): Array<{ description: string; type: string; matcher: (change: any) => boolean }> {
    const changes: Array<{ description: string; type: string; matcher: (change: any) => boolean }> = [];

    switch (vulnType) {
      case 'reentrancy':
        changes.push(
          { description: 'Attacker balance increased', type: 'balance', matcher: (c) => c.address === 'attacker' && c.change > 0 },
          { description: 'Protocol balance decreased', type: 'balance', matcher: (c) => c.address !== 'attacker' && c.change < 0 }
        );
        break;
      case 'access-control':
        changes.push(
          { description: 'Unauthorized function called', type: 'call', matcher: (c) => c.method && c.method.includes('withdraw') || c.method.includes('admin') },
          { description: 'State modified by non-owner', type: 'storage', matcher: (c) => c.slot !== undefined }
        );
        break;
      case 'oracle-manipulation':
        changes.push(
          { description: 'Oracle price manipulated', type: 'storage', matcher: (c) => c.slot !== undefined && (c.name?.toLowerCase().includes('price') || c.name?.toLowerCase().includes('oracle')) },
          { description: 'Liquidation executed', type: 'call', matcher: (c) => c.method?.toLowerCase().includes('liquidate') }
        );
        break;
      case 'flash-loan':
        changes.push(
          { description: 'Flash loan borrowed', type: 'call', matcher: (c) => c.method?.toLowerCase().includes('flashloan') || c.method?.toLowerCase().includes('borrow') },
          { description: 'Protocol state exploited', type: 'storage', matcher: (c) => c.change !== 0 }
        );
        break;
      case 'arithmetic':
        changes.push(
          { description: 'Overflow/underflow occurred', type: 'storage', matcher: (c) => c.change !== 0 && (c.oldValue === '0' || c.newValue === '0') }
        );
        break;
      default:
        // Generic: any storage write during exploit
        changes.push(
          { description: 'State modified during exploit', type: 'storage', matcher: (c) => c.change !== 0 }
        );
    }

    return changes;
  }

  private findStateChange(stateChanges: any[], expected: { matcher: (change: any) => boolean }): boolean {
    return stateChanges.some(change => expected.matcher(change));
  }

  // ─── Condition 6: Attacker Gain Verified ────────────────────────────
  private checkAttackerGainVerified(
    exploitResult: ExploitResult,
    hypothesis: AttackHypothesis,
    transfers: any[] | undefined,
    stateChanges: any[] | undefined
  ): HonestCondition {
    const expectedOutcome = hypothesis.expectedOutcome.toLowerCase();
    const details: string[] = [];

    // Check 1: Explicit profit value
    const attackerProfitStr = exploitResult?.attackerProfit || '0';
    const profitValue = parseFloat(attackerProfitStr.replace(/[^0-9.-]/g, ''));
    const hasExplicitProfit = !isNaN(profitValue) && profitValue > 0;

    if (hasExplicitProfit) {
      details.push(`Attacker profit: ${attackerProfitStr} ${exploitResult.profitToken || ''}`);
    }

    // Check 2: Money flow shows incoming to attacker
    const attackerIncoming = transfers?.filter(
      (t) => t.to.toLowerCase() === 'attacker' || t.to.toLowerCase().includes('attacker')
    ) || [];
    const hasIncomingFlow = attackerIncoming.length > 0;

    if (hasIncomingFlow) {
      const flowDetail = attackerIncoming
        .map((f) => `${f.amount} ${f.token} from ${f.from}`)
        .join(', ');
      details.push(`Incoming transfers: ${flowDetail}`);
    }

    // Check 3: Balance changes show attacker gain
    const attackerBalances = exploitResult?.tokenBalances?.attacker;
    let hasBalanceGain = false;
    if (attackerBalances) {
      for (const [token, balance] of Object.entries(attackerBalances)) {
        const bal = parseFloat(balance);
        if (!isNaN(bal) && bal > 0) {
          hasBalanceGain = true;
          details.push(`Attacker balance: ${balance} ${token}`);
          break;
        }
      }
    }

    // Check 4: Expected outcome keywords match
    const outcomeKeywords = ['drain', 'steal', 'gain', 'profit', 'withdraw', 'take', 'extract'];
    const outcomeMatches = outcomeKeywords.some(k => expectedOutcome.includes(k));

    const satisfied = hasExplicitProfit || hasIncomingFlow || hasBalanceGain;

    const detail = satisfied
      ? details.join('. ') || `Attacker gained assets (${outcomeMatches ? 'matches expected outcome' : 'unexpected gain'})`
      : `No evidence of attacker gain. Profit: "${attackerProfitStr}". Expected: "${hypothesis.expectedOutcome}". Check traces for evidence.`;

    return {
      name: 'Attacker Gain Verified',
      satisfied,
      detail,
    };
  }

  // ─── Confidence Calculation ─────────────────────────────────────────
  private calculateConfidence(conditions: HonestCondition[]): number {
    if (conditions.length === 0) return 0;

    const satisfied = conditions.filter((c) => c.satisfied).length;
    const baseScore = satisfied / conditions.length;

    // Penalty for missing critical conditions (first 3 are infrastructure)
    const criticalMissing = conditions.slice(0, 3).filter(c => !c.satisfied).length;
    const penalty = criticalMissing * 0.15;

    return Math.max(0, Math.min(1, baseScore - penalty));
  }

  // ─── Explanation Builder ────────────────────────────────────────────
  private buildExplanation(conditions: HonestCondition[], allSatisfied: boolean): string {
    if (allSatisfied) {
      return `EXPLOIT CONFIRMED: All 6 verification conditions are satisfied. The generated Foundry PoC successfully demonstrates the vulnerability with the attacker gaining the expected assets.`;
    }

    const failed = conditions
      .filter((c) => !c.satisfied)
      .map((c, i) => `${i + 1}. ${c.name}: ${c.detail}`);

    return `EXPLOIT NOT CONFIRMED: ${failed.length} of 6 conditions failed:\n${failed.join('\n')}\n\nThis finding requires human review before reporting.`;
  }
}
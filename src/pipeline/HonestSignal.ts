// ============================================================================
// SIREEN — Honest Signal
// ============================================================================
// Determines whether an exploit finding is Confirmed or Not Confirmed based
// on strict criteria:
//
// Confirmed = True ONLY if:
//   1. forge test passes (testExploit returns [PASS])
//   2. Exploit conditions are satisfied (attacker gained assets, state changed)
//   3. Attacker gains expected assets (profit > 0 or balance increase)
//
// Otherwise: Confirmed = False with clear explanation.

import type {
  HonestSignal,
  HonestCondition,
  ForgeOutput,
  ExploitResult,
  AttackHypothesis,
} from './types';

export interface HonestSignalInput {
  forgeOutput: ForgeOutput;
  exploitResult: ExploitResult;
  hypothesis: AttackHypothesis;
}

export class HonestSignalEvaluator {
  /**
   * Evaluate whether the exploit is confirmed based on all evidence.
   */
  evaluate(input: HonestSignalInput): HonestSignal {
    const conditions: HonestCondition[] = [];

    // ─── Condition 1: Forge test passes ─────────────────────────────────
    const forgePassed = this.checkForgePassed(input.forgeOutput);
    conditions.push(forgePassed);

    // ─── Condition 2: Exploit conditions satisfied ──────────────────────
    const exploitConditions = this.checkExploitConditions(input);
    conditions.push(exploitConditions);

    // ─── Condition 3: Attacker gained expected assets ───────────────────
    const assetGain = this.checkAssetGain(input.exploitResult, input.hypothesis);
    conditions.push(assetGain);

    // ─── Overall verdict ────────────────────────────────────────────────
    const allSatisfied = conditions.every((c) => c.satisfied);
    const confidence = this.calculateConfidence(conditions);

    // Build explanation
    const explanation = this.buildExplanation(conditions, allSatisfied);

    return {
      confirmed: allSatisfied,
      confidence,
      conditions,
      explanation,
    };
  }

  /**
   * Condition 1: forge test passed with [PASS] for testExploit.
   */
  private checkForgePassed(forgeOutput: ForgeOutput): HonestCondition {
    const exploitTest = forgeOutput.testResults.find(
      (t) => t.name === 'testExploit' || t.name.includes('testExploit')
    );

    const passed = exploitTest?.status === 'pass';

    return {
      name: 'Foundry test passing',
      satisfied: passed,
      detail: passed
        ? `testExploit() passed${exploitTest?.gasUsed ? ` (gas: ${exploitTest.gasUsed})` : ''}`
        : forgeOutput.compilationErrors.length > 0
          ? `Compilation failed: ${forgeOutput.compilationErrors.join('; ')}`
          : 'testExploit() did not return [PASS] — exploit logic may be incorrect',
    };
  }

  /**
   * Condition 2: Exploit conditions are satisfied.
   * Checks that the test executed without reverts and assertions passed.
   */
  private checkExploitConditions(input: HonestSignalInput): HonestCondition {
    const { forgeOutput, exploitResult } = input;
    const { testResults } = forgeOutput;

    // Check for reverts in the exploit test
    const exploitTest = testResults.find(
      (t) => t.name === 'testExploit' || t.name.includes('testExploit')
    );

    if (!exploitTest) {
      return {
        name: 'Exploit conditions met',
        satisfied: false,
        detail: 'testExploit() function was not found in test results',
      };
    }

    // Check if the test result is clean
    const hasUnexpectedRevert = exploitTest.status === 'fail' && exploitTest.error;
    const noUnexpectedAsserts = exploitTest.status === 'pass';

    const satisfied = exploitTest.status === 'pass' && !hasUnexpectedRevert;

    return {
      name: 'Exploit conditions met',
      satisfied,
      detail: satisfied
        ? 'testExploit() executed successfully — all assertions passed, no unexpected reverts'
        : hasUnexpectedRevert
          ? `testExploit() failed: ${exploitTest.error || 'Unknown error'}`
          : 'testExploit() did not pass — conditions not satisfied',
    };
  }

  /**
   * Condition 3: Attacker gained expected assets.
   * Checks profit > 0 or attacker balance increased for the target asset.
   */
  private checkAssetGain(
    exploitResult: ExploitResult,
    hypothesis: AttackHypothesis
  ): HonestCondition {
    const expectedOutcome = hypothesis.expectedOutcome.toLowerCase();
    const attackerProfit = exploitResult.attackerProfit;

    // Check if profit is explicitly a positive value
    const profitValue = parseFloat(attackerProfit.replace(/[^0-9.]/g, ''));
    const hasProfit = !isNaN(profitValue) && profitValue > 0;

    // Check if money flow shows assets moving to attacker
    const attackerFlows = exploitResult.moneyFlow.filter(
      (f) => f.to.toLowerCase() === 'attacker' || f.to === exploitResult.attackerProfit
    );
    const hasIncomingFlow = attackerFlows.length > 0;

    // Check if token balances show attacker gained
    const attackerBalances = exploitResult.tokenBalances['attacker'];
    const hasBalanceIncrease =
      attackerBalances &&
      Object.values(attackerBalances).some(
        (v) => parseFloat(v) > 0
      );

    const satisfied = hasProfit || hasIncomingFlow || hasBalanceIncrease;

    // Build detailed explanation
    const details: string[] = [];
    if (hasProfit) details.push(`Attacker profit: ${attackerProfit}`);
    if (hasIncomingFlow) {
      details.push(
        `Incoming transfers: ${attackerFlows
          .map((f) => `${f.amount} ${f.token} from ${f.from}`)
          .join(', ')}`
      );
    }
    if (hasBalanceIncrease) {
      details.push(
        `Balance increase: ${Object.entries(attackerBalances || {})
          .map(([k, v]) => `${v} ${k}`)
          .join(', ')}`
      );
    }
    if (expectedOutcome && satisfied) {
      details.push(`Expected outcome matches: "${hypothesis.expectedOutcome}"`);
    }

    const detail = satisfied
      ? details.join('. ')
      : `No evidence of asset gain. Profit: "${attackerProfit}". Expected: "${hypothesis.expectedOutcome}"`;

    return {
      name: 'Attacker gained expected assets',
      satisfied,
      detail,
    };
  }

  /**
   * Calculate confidence score (0–1) based on how many conditions are met
   * and the quality of evidence.
   */
  private calculateConfidence(conditions: HonestCondition[]): number {
    if (conditions.length === 0) return 0;

    const satisfied = conditions.filter((c) => c.satisfied).length;
    const baseScore = satisfied / conditions.length;

    // Bonus for strong evidence (explicit profit values, clean test pass)
    const detailQuality = conditions
      .filter((c) => c.satisfied)
      .filter((c) => c.detail.includes('gas:') || c.detail.includes('profit')).length;

    const bonus = detailQuality * 0.05;

    return Math.min(1, baseScore + bonus);
  }

  /**
   * Build a human-readable explanation of the verdict.
   */
  private buildExplanation(
    conditions: HonestCondition[],
    allSatisfied: boolean
  ): string {
    if (allSatisfied) {
      return `EXPLOIT CONFIRMED: All ${conditions.length} verification conditions are satisfied. The generated Foundry PoC successfully demonstrates the vulnerability with the attacker gaining the expected assets.`;
    }

    const failed = conditions
      .filter((c) => !c.satisfied)
      .map((c) => `- ${c.name}: ${c.detail}`);

    return `EXPLOIT NOT CONFIRMED: ${failed.length} of ${conditions.length} conditions failed:\n${failed.join('\n')}`;
  }
}

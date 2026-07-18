// ============================================================================
// SIREEN — Output Parser
// ============================================================================
// Parses raw forge test output to extract exploit success, attacker profit,
// token balances, money flow, reverted transactions, and gas usage.

import type {
  ForgeOutput,
  ExploitResult,
  TokenBalances,
  MoneyFlowEntry,
  RevertedTx,
  GasUsage,
  ForgeTestResult,
} from './types';

export class OutputParser {
  /**
   * Parse raw forge output into structured exploit result.
   */
  parseExploitResult(
    forgeOutput: ForgeOutput,
    attackerAddress?: string
  ): ExploitResult {
    const raw = forgeOutput.raw;
    const testResults = forgeOutput.testResults;

    // Determine exploit success from test results
    const exploitTest = testResults.find(
      (t) => t.name === 'testExploit' || t.name.includes('testExploit')
    );

    const success = exploitTest?.status === 'pass';

    // Extract attacker profit from assertions and logs
    const attackerProfit = this.extractAttackerProfit(raw, success);
    const profitToken = this.extractProfitToken(raw);

    // Extract token balances
    const tokenBalances = this.extractTokenBalances(raw);

    // Extract money flow
    const moneyFlow = this.extractMoneyFlow(raw);

    // Extract reverted transactions
    const revertedTransactions = this.extractRevertedTransactions(raw);

    // Extract gas usage
    const gasUsage = this.extractGasUsage(raw, testResults);

    // Calculate approximate USD value (placeholder — no price feed in test)
    const profitUSD = 0;

    return {
      success,
      attackerProfit: attackerProfit || (success ? 'Unknown (test passed)' : 'N/A'),
      profitToken,
      profitUSD,
      tokenBalances,
      moneyFlow,
      revertedTransactions,
      gasUsage,
    };
  }

  /**
   * Extract attacker profit amount from output.
   * Looks for assert statements, balance checks, and log patterns.
   */
  private extractAttackerProfit(raw: string, exploitSuccessful: boolean): string {
    if (!exploitSuccessful) return '0';

    // Pattern: "Balance: attacker = X TOKEN"
    const balancePatterns = [
      /attacker.*?balance[:\s]*(\d+[.]?\d*)/i,
      /profit[:\s]*(\d+[.]?\d*)/i,
      /drained[:\s]*(\d+[.]?\d*)/i,
      /stolen[:\s]*(\d+[.]?\d*)/i,
      /gain[:\s]*(\d+[.]?\d*)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = raw.match(pattern);
      if (match) return match[1];
    }

    // Try to extract from assertEq(attacker.balance, X) patterns
    // These are common in PoC tests
    const assertMatch = raw.match(
      /assertEq.*?attacker.*?balance.*?(\d+[.]?\d*\s*(?:ether|wei)?)/i
    );
    if (assertMatch) return assertMatch[1].trim();

    return 'See forge output for details';
  }

  /**
   * Extract the token symbol used in the profit.
   */
  private extractProfitToken(raw: string): string {
    const tokenPatterns = [
      /profit.*?token[:\s]*(\w+)/i,
      /in\s+(\w+)\s+token/i,
      /(\w+)\s+drained/i,
      /(\w+)\s+stolen/i,
    ];

    for (const pattern of tokenPatterns) {
      const match = raw.match(pattern);
      if (match) return match[1].toUpperCase();
    }

    return 'ETH';
  }

  /**
   * Extract token balances for all addresses mentioned.
   */
  private extractTokenBalances(raw: string): TokenBalances {
    const balances: TokenBalances = {};

    // Pattern: "address token balance: value"
    // e.g., "0x... ETH balance: 100.0" or "attacker DAI balance: 50000"
    const balanceRegex = /(\w+(?:\[\d+\])?|0x[a-fA-F0-9]{40})\s+(\w+)\s+balance[:\s]*(\d+[.]?\d*)/gi;

    let match: RegExpExecArray | null;
    while ((match = balanceRegex.exec(raw)) !== null) {
      const address = match[1].toLowerCase();
      const token = match[2].toUpperCase();
      const amount = match[3];

      if (!balances[address]) {
        balances[address] = {};
      }
      balances[address][token] = amount;
    }

    return balances;
  }

  /**
   * Extract money flow entries from forge output.
   * Looks for Transfer events, console.log statements, and call traces.
   */
  private extractMoneyFlow(raw: string): MoneyFlowEntry[] {
    const flow: MoneyFlowEntry[] = [];

    // Pattern: Transfer(from, to, amount) events
    const transferRegex =
      /Transfer\(?\s*(?:from:\s*)?(\w+|0x[a-fA-F0-9]{40})\s*,?\s*(?:to:\s*)?(\w+|0x[a-fA-F0-9]{40})\s*,?\s*(?:value:\s*)?(\d+[.]?\d*)\s*(?:wei|ether)?\)?/gi;

    let match: RegExpExecArray | null;
    while ((match = transferRegex.exec(raw)) !== null) {
      flow.push({
        from: match[1],
        to: match[2],
        token: 'ETH',
        amount: match[3],
        type: 'transfer',
      });
    }

    // Pattern: console.log money flow
    const logRegex = /(?:from|sender)[:\s]*(\w+|0x[a-fA-F0-9]{40})[\s,]+(?:to|receiver)[:\s]*(\w+|0x[a-fA-F0-9]{40})[\s,]+(?:amount|value)[:\s]*(\d+[.]?\d*)/gi;

    while ((match = logRegex.exec(raw)) !== null) {
      flow.push({
        from: match[1],
        to: match[2],
        token: 'ETH',
        amount: match[3],
        type: 'transfer',
      });
    }

    return flow;
  }

  /**
   * Extract reverted transactions from forge output.
   */
  private extractRevertedTransactions(raw: string): RevertedTx[] {
    const reverted: RevertedTx[] = [];

    // Pattern: [FAIL. Reason: ...] or "revert" messages
    const failRegex =
      /\[FAIL\.\s*Reason:\s*(.*?)\]\s*(\w+)?|Revert\s*(.*?)$|reverted\s*(?:with\s*)?(.*?)$/gim;

    let match: RegExpExecArray | null;
    let index = 0;
    while ((match = failRegex.exec(raw)) !== null) {
      const reason = (match[1] || match[3] || match[4] || 'Unknown').trim();
      reverted.push({
        index: index++,
        reason,
        gasUsed: 0, // Will be updated if gas data is available
      });
    }

    return reverted;
  }

  /**
   * Extract gas usage from forge output and test results.
   */
  private extractGasUsage(raw: string, testResults: ForgeTestResult[]): GasUsage {
    const byOperation: Record<string, number> = {};

    // Get gas from test results
    for (const test of testResults) {
      if (test.gasUsed) {
        byOperation[test.name] = test.gasUsed;
      }
    }

    // Parse gas report section
    const gasSection = raw.match(/Gas Report:[\s\S]*?(?=\n\n|\n─|$)/);
    if (gasSection) {
      const lines = gasSection[0].split('\n');
      for (const line of lines) {
        const fnMatch = line.match(/\|(.+?)\|.*?\|\s*(\d+)\s*\|/);
        if (fnMatch) {
          byOperation[fnMatch[1].trim()] = parseInt(fnMatch[2], 10);
        }
      }
    }

    const total = Object.values(byOperation).reduce((a, b) => a + b, 0);

    return { total, byOperation };
  }

  /**
   * Check if the forge output indicates compile errors vs test failures.
   */
  hasCompilationErrors(raw: string): boolean {
    return (
      raw.includes('Compiler run failed') ||
      raw.includes('Error: Compiler') ||
      raw.includes('ParserError:') ||
      raw.includes('TypeError:') ||
      raw.includes('DeclarationError:') ||
      (raw.includes('Error') && raw.includes('sol'))
    );
  }

  /**
   * Extract overall outcome summary from forge output.
   */
  extractOutcomeSummary(raw: string): string {
    if (this.hasCompilationErrors(raw)) {
      return 'compilation_error';
    }
    if (raw.includes('[PASS]')) {
      return raw.includes('[FAIL]') ? 'partial' : 'success';
    }
    return 'failure';
  }

  /**
   * Parse forge output into structured data including traces, state changes, and transfers.
   * Used by HonestSignal for strict verification.
   */
  parse(forgeOutput: ForgeOutput): {
    traces: any[];
    stateChanges: any[];
    transfers: any[];
  } {
    const raw = forgeOutput.raw;
    const traces: any[] = [];
    const stateChanges: any[] = [];
    const transfers: any[] = [];

    // Extract call traces from forge output (traces are shown with -vvv)
    // Pattern: "call <address>.<method>() returned <value>"
    const callTraceRegex = /\[(?:TRACE|CALL|STATICCALL|DELEGATECALL)\]\s+(?:from\s+)?(0x[a-fA-F0-9]{40}|\w+)\s+(?:to\s+)?(0x[a-fA-F0-9]{40}|\w+)\s+([^\s]+)\([^)]*\)\s+(?:returned|reverted)?\s*([^\n]*)/gi;
    
    let match: RegExpExecArray | null;
    while ((match = callTraceRegex.exec(raw)) !== null) {
      traces.push({
        from: match[1],
        to: match[2],
        method: match[3],
        result: match[4] || 'success',
        timestamp: Date.now(),
      });
    }

    // Extract storage changes (state changes)
    // Pattern: "slot <slot> changed from <old> to <new>"
    const storageChangeRegex = /slot\s+(0x[a-fA-F0-9]{64}|\d+)\s+changed\s+from\s+(\S+)\s+to\s+(\S+)/gi;
    while ((match = storageChangeRegex.exec(raw)) !== null) {
      stateChanges.push({
        slot: match[1],
        oldValue: match[2],
        newValue: match[3],
        change: match[3] !== match[2],
        timestamp: Date.now(),
      });
    }

    // Extract Transfer events from logs
    // Pattern: "Transfer(from, to, value)"
    const transferEventRegex = /Transfer\s*\(\s*(?:from:\s*)?(0x[a-fA-F0-9]{40}|\w+)\s*,\s*(?:to:\s*)?(0x[a-fA-F0-9]{40}|\w+)\s*,\s*(?:value:\s*)?(\d+)\s*\)/gi;
    while ((match = transferEventRegex.exec(raw)) !== null) {
      transfers.push({
        from: match[1],
        to: match[2],
        amount: match[3],
        token: 'ETH', // default, could be ERC20
        type: 'transfer',
        timestamp: Date.now(),
      });
    }

    // Also parse from money flow extraction (existing logic)
    const moneyFlow = this.extractMoneyFlow(raw);
    transfers.push(...moneyFlow);

    return { traces, stateChanges, transfers };
  }
}

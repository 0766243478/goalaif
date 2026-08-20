"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// e2e_poc/harness_entry.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));

// src/pipeline/OutputParser.ts
var OutputParser = class {
  /**
   * Parse raw forge output into structured exploit result.
   */
  parseExploitResult(forgeOutput2, attackerAddress) {
    const raw2 = forgeOutput2.raw;
    const testResults2 = forgeOutput2.testResults;
    const exploitTest = testResults2.find(
      (t) => t.name === "testExploit" || t.name.includes("testExploit")
    );
    const success = exploitTest?.status === "pass";
    const attackerProfit = this.extractAttackerProfit(raw2, success);
    const profitToken = this.extractProfitToken(raw2);
    const tokenBalances = this.extractTokenBalances(raw2);
    const moneyFlow = this.extractMoneyFlow(raw2);
    const revertedTransactions = this.extractRevertedTransactions(raw2);
    const gasUsage = this.extractGasUsage(raw2, testResults2);
    const profitUSD = 0;
    return {
      success,
      attackerProfit: attackerProfit || (success ? "Unknown (test passed)" : "N/A"),
      profitToken,
      profitUSD,
      tokenBalances,
      moneyFlow,
      revertedTransactions,
      gasUsage
    };
  }
  /**
   * Extract attacker profit amount from output.
   * Looks for assert statements, balance checks, and log patterns.
   */
  extractAttackerProfit(raw2, exploitSuccessful) {
    if (!exploitSuccessful)
      return "0";
    const balancePatterns = [
      /attacker.*?balance[:\s]*(\d+[.]?\d*)/i,
      /profit[:\s]*(\d+[.]?\d*)/i,
      /drained[:\s]*(\d+[.]?\d*)/i,
      /stolen[:\s]*(\d+[.]?\d*)/i,
      /gain[:\s]*(\d+[.]?\d*)/i
    ];
    for (const pattern of balancePatterns) {
      const match = raw2.match(pattern);
      if (match)
        return match[1];
    }
    const assertMatch = raw2.match(
      /assertEq.*?attacker.*?balance.*?(\d+[.]?\d*\s*(?:ether|wei)?)/i
    );
    if (assertMatch)
      return assertMatch[1].trim();
    return "See forge output for details";
  }
  /**
   * Extract the token symbol used in the profit.
   */
  extractProfitToken(raw2) {
    const tokenPatterns = [
      /profit.*?token[:\s]*(\w+)/i,
      /in\s+(\w+)\s+token/i,
      /(\w+)\s+drained/i,
      /(\w+)\s+stolen/i
    ];
    for (const pattern of tokenPatterns) {
      const match = raw2.match(pattern);
      if (match)
        return match[1].toUpperCase();
    }
    return "ETH";
  }
  /**
   * Extract token balances for all addresses mentioned.
   */
  extractTokenBalances(raw2) {
    const balances = {};
    const balanceRegex = /(\w+(?:\[\d+\])?|0x[a-fA-F0-9]{40})\s+(\w+)\s+balance[:\s]*(\d+[.]?\d*)/gi;
    let match;
    while ((match = balanceRegex.exec(raw2)) !== null) {
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
  extractMoneyFlow(raw2) {
    const flow = [];
    const transferRegex = /Transfer\(?\s*(?:from:\s*)?(\w+|0x[a-fA-F0-9]{40})\s*,?\s*(?:to:\s*)?(\w+|0x[a-fA-F0-9]{40})\s*,?\s*(?:value:\s*)?(\d+[.]?\d*)\s*(?:wei|ether)?\)?/gi;
    let match;
    while ((match = transferRegex.exec(raw2)) !== null) {
      flow.push({
        from: match[1],
        to: match[2],
        token: "ETH",
        amount: match[3],
        type: "transfer"
      });
    }
    const logRegex = /(?:from|sender)[:\s]*(\w+|0x[a-fA-F0-9]{40})[\s,]+(?:to|receiver)[:\s]*(\w+|0x[a-fA-F0-9]{40})[\s,]+(?:amount|value)[:\s]*(\d+[.]?\d*)/gi;
    while ((match = logRegex.exec(raw2)) !== null) {
      flow.push({
        from: match[1],
        to: match[2],
        token: "ETH",
        amount: match[3],
        type: "transfer"
      });
    }
    return flow;
  }
  /**
   * Extract reverted transactions from forge output.
   */
  extractRevertedTransactions(raw2) {
    const reverted = [];
    const failRegex = /\[FAIL\.\s*Reason:\s*(.*?)\]\s*(\w+)?|Revert\s*(.*?)$|reverted\s*(?:with\s*)?(.*?)$/gim;
    let match;
    let index = 0;
    while ((match = failRegex.exec(raw2)) !== null) {
      const reason = (match[1] || match[3] || match[4] || "Unknown").trim();
      reverted.push({
        index: index++,
        reason,
        gasUsed: 0
        // Will be updated if gas data is available
      });
    }
    return reverted;
  }
  /**
   * Extract gas usage from forge output and test results.
   */
  extractGasUsage(raw2, testResults2) {
    const byOperation = {};
    for (const test of testResults2) {
      if (test.gasUsed) {
        byOperation[test.name] = test.gasUsed;
      }
    }
    const gasSection = raw2.match(/Gas Report:[\s\S]*?(?=\n\n|\n─|$)/);
    if (gasSection) {
      const lines = gasSection[0].split("\n");
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
  hasCompilationErrors(raw2) {
    return raw2.includes("Compiler run failed") || raw2.includes("Error: Compiler") || raw2.includes("ParserError:") || raw2.includes("TypeError:") || raw2.includes("DeclarationError:") || raw2.includes("Error") && raw2.includes("sol");
  }
  /**
   * Extract overall outcome summary from forge output.
   */
  extractOutcomeSummary(raw2) {
    if (this.hasCompilationErrors(raw2)) {
      return "compilation_error";
    }
    if (raw2.includes("[PASS]")) {
      return raw2.includes("[FAIL]") ? "partial" : "success";
    }
    return "failure";
  }
  /**
   * Parse forge output into structured data including traces, state changes, and transfers.
   * Used by HonestSignal for strict verification.
   */
  parse(forgeOutput2) {
    const raw2 = forgeOutput2.raw;
    const traces = [];
    const stateChanges = [];
    const transfers = [];
    const callTraceRegex = /\[(?:TRACE|CALL|STATICCALL|DELEGATECALL)\]\s+(?:from\s+)?(0x[a-fA-F0-9]{40}|\w+)\s+(?:to\s+)?(0x[a-fA-F0-9]{40}|\w+)\s+([^\s]+)\([^)]*\)\s+(?:returned|reverted)?\s*([^\n]*)/gi;
    const treeTraceRegex = /[├└]─\s*\[\d+\]\s+(0x[a-fA-F0-9]{40}|\w+)\s*::\s*(\w+)\s*\(([^)]*)\)/gi;
    let match;
    while ((match = callTraceRegex.exec(raw2)) !== null) {
      traces.push({
        from: match[1],
        to: match[2],
        method: match[3],
        result: match[4] || "success",
        timestamp: Date.now()
      });
    }
    while ((match = treeTraceRegex.exec(raw2)) !== null) {
      traces.push({
        from: "unknown",
        to: match[1],
        method: match[2],
        result: "success",
        timestamp: Date.now()
      });
    }
    const storageChangeRegex = /slot\s+(0x[a-fA-F0-9]{64}|\d+)\s+changed\s+from\s+(\S+)\s+to\s+(\S+)/gi;
    while ((match = storageChangeRegex.exec(raw2)) !== null) {
      stateChanges.push({
        slot: match[1],
        oldValue: match[2],
        newValue: match[3],
        change: match[3] !== match[2],
        timestamp: Date.now()
      });
    }
    const transferEventRegex = /Transfer\s*\(\s*(?:from:\s*)?(0x[a-fA-F0-9]{40}|\w+)\s*,\s*(?:to:\s*)?(0x[a-fA-F0-9]{40}|\w+)\s*,\s*(?:value:\s*)?(\d+)\s*\)/gi;
    while ((match = transferEventRegex.exec(raw2)) !== null) {
      transfers.push({
        from: match[1],
        to: match[2],
        amount: match[3],
        token: "ETH",
        // default, could be ERC20
        type: "transfer",
        timestamp: Date.now()
      });
    }
    const moneyFlow = this.extractMoneyFlow(raw2);
    transfers.push(...moneyFlow);
    for (const entry of moneyFlow) {
      const amount = parseFloat(entry.amount) || 0;
      if (amount <= 0)
        continue;
      stateChanges.push({
        address: entry.to,
        change: -amount,
        oldValue: "unknown",
        newValue: "decreased",
        timestamp: Date.now()
      });
      stateChanges.push({
        address: entry.from,
        change: amount,
        oldValue: "unknown",
        newValue: "increased",
        timestamp: Date.now()
      });
    }
    const balRegex = /attacker\s+(\w+)\s+balance:\s*(\d+[.]?\d*)/gi;
    while ((match = balRegex.exec(raw2)) !== null) {
      const token = match[1].toUpperCase();
      const amount = parseFloat(match[2]) || 0;
      if (amount <= 0)
        continue;
      stateChanges.push({
        address: "attacker",
        change: amount,
        oldValue: "0",
        newValue: String(amount),
        token,
        timestamp: Date.now()
      });
    }
    return { traces, stateChanges, transfers };
  }
};

// src/pipeline/HonestSignal.ts
var HonestSignalEvaluator = class {
  /**
   * Evaluate whether the exploit is confirmed based on ALL 6 strict conditions.
   */
  evaluate(input) {
    const conditions = [];
    const pocGenerated = this.checkPoCGenerated(input.pocResult);
    conditions.push(pocGenerated);
    const pocCompiled = this.checkPoCCompiled(input.pocResult);
    conditions.push(pocCompiled);
    const forgeExecuted = this.checkForgeExecuted(input.forgeOutput);
    conditions.push(forgeExecuted);
    const exploitReproduced = this.checkExploitReproduced(input.forgeOutput, input.exploitResult);
    conditions.push(exploitReproduced);
    const stateChangeVerified = this.checkStateChangeVerified(
      input.hypothesis,
      input.parsedTraces,
      input.stateChanges,
      input.forgeOutput
    );
    conditions.push(stateChangeVerified);
    const attackerGainVerified = this.checkAttackerGainVerified(
      input.exploitResult,
      input.hypothesis,
      input.transfers,
      input.stateChanges
    );
    conditions.push(attackerGainVerified);
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
      attackerGainVerified: conditions[5].satisfied
    };
  }
  // ─── Condition 1: PoC Generated ──────────────────────────────────────
  checkPoCGenerated(pocResult2) {
    const hasSource = !!pocResult2?.sourceCode && pocResult2.sourceCode.length > 100;
    const hasFile = !!pocResult2?.filePath && pocResult2.filePath.endsWith(".t.sol");
    return {
      name: "PoC Generated",
      satisfied: hasSource && hasFile,
      detail: hasSource && hasFile ? `PoC generated: ${pocResult2.filePath} (${pocResult2.sourceCode.length} chars)` : !hasSource ? "PoC generation failed \u2014 no source code produced" : "PoC file path missing or invalid"
    };
  }
  // ─── Condition 2: PoC Compiled ──────────────────────────────────────
  checkPoCCompiled(pocResult2) {
    const success = pocResult2?.compilationSuccess === true;
    const attempts = pocResult2?.compilationAttempts || 0;
    return {
      name: "PoC Compiled",
      satisfied: success,
      detail: success ? `PoC compiled successfully on attempt ${attempts}` : `Compilation failed after ${attempts} attempt(s): ${pocResult2?.errors?.[0] || "Unknown error"}`
    };
  }
  // ─── Condition 3: Forge Executed ────────────────────────────────────
  checkForgeExecuted(forgeOutput2) {
    const hasOutput = !!forgeOutput2?.raw;
    const noInfrastructureError = forgeOutput2.exitCode !== -1;
    const noCompilationBlock = forgeOutput2.compilationErrors?.length === 0;
    const satisfied = hasOutput && noInfrastructureError && noCompilationBlock;
    return {
      name: "Forge Executed",
      satisfied,
      detail: satisfied ? `forge test ran (exit code: ${forgeOutput2.exitCode}, ${forgeOutput2.testResults?.length || 0} tests)` : noCompilationBlock ? "Forge process failed to start or crashed" : "Compilation errors prevented test execution"
    };
  }
  // ─── Condition 4: Exploit Reproduced ────────────────────────────────
  checkExploitReproduced(forgeOutput2, exploitResult2) {
    const exploitTest = forgeOutput2.testResults.find(
      (t) => t.name === "testExploit" || t.name.includes("testExploit")
    );
    const testPassed = exploitTest?.status === "pass";
    const exploitSuccess = exploitResult2?.success === true;
    const satisfied = testPassed && exploitSuccess;
    let detail = "";
    if (satisfied) {
      detail = `testExploit() passed${exploitTest?.gasUsed ? ` (gas: ${exploitTest.gasUsed})` : ""}. Exploit logic executed successfully.`;
    } else if (!exploitTest) {
      detail = "testExploit() not found in test results \u2014 PoC may be malformed";
    } else if (exploitTest.status === "fail") {
      detail = `testExploit() failed: ${exploitTest.error || "Assertion failed or unexpected revert"}`;
    } else if (!exploitSuccess) {
      detail = "Exploit result indicates failure \u2014 profit not achieved";
    }
    return {
      name: "Exploit Reproduced",
      satisfied,
      detail
    };
  }
  // ─── Condition 5: State Change Verified ─────────────────────────────
  checkStateChangeVerified(hypothesis2, parsedTraces, stateChanges, forgeOutput2) {
    if ((!parsedTraces || parsedTraces.length === 0) && (!stateChanges || stateChanges.length === 0)) {
      return {
        name: "State Change Verified",
        satisfied: false,
        detail: "No execution traces or state changes available \u2014 cannot verify state changes"
      };
    }
    const vulnType = hypothesis2.vulnerabilityType.toLowerCase();
    const expectedChanges = this.getExpectedStateChanges(vulnType, hypothesis2);
    let verifiedChanges = 0;
    const details = [];
    for (const expected of expectedChanges) {
      const found = this.findStateChange(stateChanges || [], expected);
      if (found) {
        verifiedChanges++;
        details.push(`\u2713 ${expected.description}`);
      } else {
        details.push(`\u2717 ${expected.description} \u2014 NOT OBSERVED`);
      }
    }
    if (expectedChanges.length === 0) {
      const hasAnyChanges = (stateChanges?.length || 0) > 0;
      return {
        name: "State Change Verified",
        satisfied: hasAnyChanges,
        detail: hasAnyChanges ? `${stateChanges?.length || 0} state changes observed during exploit` : "No state changes observed during exploit execution"
      };
    }
    const satisfied = verifiedChanges === expectedChanges.length;
    const detail = satisfied ? `All ${expectedChanges.length} expected state changes verified` : `${verifiedChanges}/${expectedChanges.length} expected state changes verified. Missing: ${details.filter((d) => d.startsWith("\u2717")).map((d) => d.slice(2)).join(", ")}`;
    return {
      name: "State Change Verified",
      satisfied,
      detail
    };
  }
  getExpectedStateChanges(vulnType, hypothesis2) {
    const changes = [];
    switch (vulnType) {
      case "reentrancy":
        changes.push(
          { description: "Attacker balance increased", type: "balance", matcher: (c) => c.address === "attacker" && c.change > 0 },
          { description: "Protocol balance decreased", type: "balance", matcher: (c) => c.address !== "attacker" && c.change < 0 }
        );
        break;
      case "access-control":
        changes.push(
          { description: "Unauthorized function called", type: "call", matcher: (c) => c.method && c.method.includes("withdraw") || c.method.includes("admin") },
          { description: "State modified by non-owner", type: "storage", matcher: (c) => c.slot !== void 0 }
        );
        break;
      case "oracle-manipulation":
        changes.push(
          { description: "Oracle price manipulated", type: "storage", matcher: (c) => c.slot !== void 0 && (c.name?.toLowerCase().includes("price") || c.name?.toLowerCase().includes("oracle")) },
          { description: "Liquidation executed", type: "call", matcher: (c) => c.method?.toLowerCase().includes("liquidate") }
        );
        break;
      case "flash-loan":
        changes.push(
          { description: "Flash loan borrowed", type: "call", matcher: (c) => c.method?.toLowerCase().includes("flashloan") || c.method?.toLowerCase().includes("borrow") },
          { description: "Protocol state exploited", type: "storage", matcher: (c) => c.change !== 0 }
        );
        break;
      case "arithmetic":
        changes.push(
          { description: "Overflow/underflow occurred", type: "storage", matcher: (c) => c.change !== 0 && (c.oldValue === "0" || c.newValue === "0") }
        );
        break;
      default:
        changes.push(
          { description: "State modified during exploit", type: "storage", matcher: (c) => c.change !== 0 }
        );
    }
    return changes;
  }
  findStateChange(stateChanges, expected) {
    return stateChanges.some((change) => expected.matcher(change));
  }
  // ─── Condition 6: Attacker Gain Verified ────────────────────────────
  checkAttackerGainVerified(exploitResult2, hypothesis2, transfers, stateChanges) {
    const expectedOutcome = hypothesis2.expectedOutcome.toLowerCase();
    const details = [];
    const attackerProfitStr = exploitResult2?.attackerProfit || "0";
    const profitValue = parseFloat(attackerProfitStr.replace(/[^0-9.-]/g, ""));
    const hasExplicitProfit = !isNaN(profitValue) && profitValue > 0;
    if (hasExplicitProfit) {
      details.push(`Attacker profit: ${attackerProfitStr} ${exploitResult2.profitToken || ""}`);
    }
    const attackerIncoming = transfers?.filter(
      (t) => t.to.toLowerCase() === "attacker" || t.to.toLowerCase().includes("attacker")
    ) || [];
    const hasIncomingFlow = attackerIncoming.length > 0;
    if (hasIncomingFlow) {
      const flowDetail = attackerIncoming.map((f) => `${f.amount} ${f.token} from ${f.from}`).join(", ");
      details.push(`Incoming transfers: ${flowDetail}`);
    }
    const attackerBalances = exploitResult2?.tokenBalances?.attacker;
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
    const outcomeKeywords = ["drain", "steal", "gain", "profit", "withdraw", "take", "extract"];
    const outcomeMatches = outcomeKeywords.some((k) => expectedOutcome.includes(k));
    const satisfied = hasExplicitProfit || hasIncomingFlow || hasBalanceGain;
    const detail = satisfied ? details.join(". ") || `Attacker gained assets (${outcomeMatches ? "matches expected outcome" : "unexpected gain"})` : `No evidence of attacker gain. Profit: "${attackerProfitStr}". Expected: "${hypothesis2.expectedOutcome}". Check traces for evidence.`;
    return {
      name: "Attacker Gain Verified",
      satisfied,
      detail
    };
  }
  // ─── Confidence Calculation ─────────────────────────────────────────
  calculateConfidence(conditions) {
    if (conditions.length === 0)
      return 0;
    const satisfied = conditions.filter((c) => c.satisfied).length;
    const baseScore = satisfied / conditions.length;
    const criticalMissing = conditions.slice(0, 3).filter((c) => !c.satisfied).length;
    const penalty = criticalMissing * 0.15;
    return Math.max(0, Math.min(1, baseScore - penalty));
  }
  // ─── Explanation Builder ────────────────────────────────────────────
  buildExplanation(conditions, allSatisfied) {
    if (allSatisfied) {
      return `EXPLOIT CONFIRMED: All 6 verification conditions are satisfied. The generated Foundry PoC successfully demonstrates the vulnerability with the attacker gaining the expected assets.`;
    }
    const failed = conditions.filter((c) => !c.satisfied).map((c, i) => `${i + 1}. ${c.name}: ${c.detail}`);
    return `EXPLOIT NOT CONFIRMED: ${failed.length} of 6 conditions failed:
${failed.join("\n")}

This finding requires human review before reporting.`;
  }
};

// src/pipeline/ReportBuilder.ts
var ReportBuilder = class {
  /**
   * Build a complete investigation report.
   */
  build(input) {
    const verdict = this.determineVerdict(input.honestSignal);
    const evidence = this.buildEvidence(input);
    const timeline = this.buildTimeline(input);
    const summary = this.buildSummary(input, verdict);
    return {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      target: input.target,
      targetAddress: input.targetAddress,
      chain: input.chain,
      hypothesis: input.hypothesis,
      poc: input.poc,
      forgeOutput: input.forgeOutput,
      exploitResult: input.exploitResult,
      honestSignal: input.honestSignal,
      moneyFlow: input.moneyFlow,
      evidence,
      timeline,
      verdict,
      summary,
      generatedAt: Date.now()
    };
  }
  /**
   * Export report in specified format.
   */
  export(report2, format) {
    switch (format) {
      case "markdown":
        return this.toMarkdown(report2);
      case "html":
        return this.toHtml(report2);
      case "json":
        return JSON.stringify(report2, null, 2);
      default:
        return this.toMarkdown(report2);
    }
  }
  /**
   * Determine the final verdict based on honest signal.
   */
  determineVerdict(signal) {
    if (signal.confirmed)
      return "confirmed";
    if (signal.confidence > 0)
      return "inconclusive";
    return "not_confirmed";
  }
  /**
   * Build evidence items from pipeline results.
   */
  buildEvidence(input) {
    const evidence = [];
    const now = Date.now();
    evidence.push({
      id: `ev-poc-${now}`,
      type: "code",
      title: "Generated Exploit PoC",
      description: `Foundry test generated after ${input.poc.compilationAttempts} compilation attempts`,
      content: input.poc.sourceCode,
      tags: ["poc", "foundry", "solidity"],
      pinned: true,
      createdAt: now
    });
    evidence.push({
      id: `ev-forge-${now}`,
      type: "log",
      title: "Forge Test Output",
      description: `Exit code: ${input.forgeOutput.exitCode}, Duration: ${input.forgeOutput.duration}ms`,
      content: input.forgeOutput.raw.slice(0, 5e4),
      tags: ["forge", "test-output"],
      pinned: true,
      createdAt: now
    });
    if (input.moneyFlow.length > 0) {
      const flowContent = input.moneyFlow.map((f) => `[${f.type.toUpperCase()}] ${f.from} \u2192 ${f.to}: ${f.amount} ${f.token}`).join("\n");
      evidence.push({
        id: `ev-flow-${now}`,
        type: "trace",
        title: "Money Flow Trace",
        description: `${input.moneyFlow.length} transactions tracked`,
        content: flowContent,
        tags: ["money-flow", "trace"],
        pinned: true,
        createdAt: now
      });
    }
    evidence.push({
      id: `ev-verdict-${now}`,
      type: "other",
      title: `Verdict: ${input.honestSignal.confirmed ? "CONFIRMED" : "NOT CONFIRMED"}`,
      description: `Confidence: ${(input.honestSignal.confidence * 100).toFixed(0)}%`,
      content: input.honestSignal.explanation,
      tags: ["verdict", "honest-signal"],
      pinned: true,
      createdAt: now
    });
    return evidence;
  }
  /**
   * Build timeline of pipeline events.
   */
  buildTimeline(input) {
    const now = Date.now();
    const timeline = [];
    const baseTime = now - 6e4;
    timeline.push({
      id: `tl-start-${now}`,
      type: "investigation_start",
      title: "Investigation Started",
      description: `Target: ${input.target} on ${input.chain}`,
      timestamp: baseTime
    });
    timeline.push({
      id: `tl-hypothesis-${now}`,
      type: "finding_discovered",
      title: "Attack Hypothesis Formed",
      description: `${input.hypothesis.title} (${input.hypothesis.vulnerabilityType})`,
      timestamp: baseTime + 1e4,
      severity: input.hypothesis.severity
    });
    timeline.push({
      id: `tl-poc-${now}`,
      type: "exploit_simulated",
      title: "PoC Generated",
      description: `${input.poc.compilationSuccess ? "Compilation successful" : "Compilation failed"} after ${input.poc.compilationAttempts} attempt(s)`,
      timestamp: baseTime + 3e4
    });
    timeline.push({
      id: `tl-forge-${now}`,
      type: "exploit_simulated",
      title: "Forge Test Executed",
      description: `${input.forgeOutput.testResults.length} tests, exit code ${input.forgeOutput.exitCode}`,
      timestamp: baseTime + 45e3
    });
    timeline.push({
      id: `tl-verdict-${now}`,
      type: input.honestSignal.confirmed ? "finding_verified" : "analysis_complete",
      title: input.honestSignal.confirmed ? "Exploit Confirmed" : "Exploit Not Confirmed",
      description: input.honestSignal.explanation.slice(0, 200),
      timestamp: now,
      severity: input.honestSignal.confirmed ? "critical" : "none"
    });
    return timeline;
  }
  /**
   * Build a human-readable summary of the investigation.
   */
  buildSummary(input, verdict) {
    const parts = [];
    parts.push(`## Investigation Summary: ${input.hypothesis.title}`);
    parts.push("");
    parts.push(`**Target:** ${input.target}${input.targetAddress ? ` (${input.targetAddress})` : ""}`);
    parts.push(`**Chain:** ${input.chain}`);
    parts.push(`**Vulnerability Type:** ${input.hypothesis.vulnerabilityType}`);
    parts.push(`**Verdict:** ${verdict.toUpperCase()}`);
    parts.push(`**Confidence:** ${(input.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push("");
    if (input.poc.compilationSuccess) {
      parts.push(`**PoC:** \u2705 Compiled successfully after ${input.poc.compilationAttempts} attempt(s)`);
    } else {
      parts.push(`**PoC:** \u274C Compilation failed after ${input.poc.compilationAttempts} attempt(s)`);
      if (input.poc.errors.length > 0) {
        parts.push(`Errors: ${input.poc.errors.slice(0, 3).join("; ")}`);
      }
    }
    const passedTests = input.forgeOutput.testResults.filter((t) => t.status === "pass").length;
    const failedTests = input.forgeOutput.testResults.filter((t) => t.status === "fail").length;
    parts.push(`**Forge Test:** ${passedTests} passed, ${failedTests} failed (exit code: ${input.forgeOutput.exitCode})`);
    if (input.exploitResult.success) {
      parts.push(`**Exploit:** \u2705 Successful \u2014 Attacker profit: ${input.exploitResult.attackerProfit} ${input.exploitResult.profitToken}`);
    } else {
      parts.push(`**Exploit:** \u274C Not successful`);
    }
    if (input.moneyFlow.length > 0) {
      parts.push(`**Money Flow:** ${input.moneyFlow.length} transactions tracked`);
    }
    const satisfied = input.honestSignal.conditions.filter((c) => c.satisfied).length;
    const total = input.honestSignal.conditions.length;
    parts.push(`**Verification:** ${satisfied}/${total} conditions met`);
    parts.push("");
    parts.push(input.honestSignal.explanation);
    return parts.join("\n");
  }
  /**
   * Export to professional Markdown format.
   */
  toMarkdown(report2) {
    const parts = [];
    parts.push(`# ${report2.target} \u2014 Exploit Verification Report`);
    parts.push("");
    parts.push(`**Generated:** ${new Date(report2.generatedAt).toLocaleString()}`);
    parts.push(`**Chain:** ${report2.chain}`);
    parts.push(`**Verdict:** \`${report2.verdict.toUpperCase()}\``);
    parts.push(`**Confidence:** ${(report2.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push("");
    parts.push("## Executive Summary");
    parts.push("");
    parts.push(report2.summary);
    parts.push("");
    parts.push("## Attack Hypothesis");
    parts.push("");
    parts.push(`**Title:** ${report2.hypothesis.title}`);
    parts.push(`**Type:** ${report2.hypothesis.vulnerabilityType}`);
    parts.push(`**Severity:** ${report2.hypothesis.severity.toUpperCase()}`);
    parts.push(`**Confidence:** ${(report2.hypothesis.confidence * 100).toFixed(0)}%`);
    parts.push("");
    parts.push(`**Attack Vector:** ${report2.hypothesis.attackVector}`);
    parts.push("");
    parts.push("**Preconditions:**");
    report2.hypothesis.preconditions.forEach((p) => parts.push(`- ${p}`));
    parts.push("");
    parts.push(`**Expected Outcome:** ${report2.hypothesis.expectedOutcome}`);
    parts.push("");
    parts.push("## Remediation Guidance");
    parts.push("");
    parts.push(this.getRemediationGuidance(report2.hypothesis.vulnerabilityType));
    parts.push("");
    parts.push("## Proof of Concept");
    parts.push("");
    parts.push(`**Compilation:** ${report2.poc.compilationSuccess ? "\u2705 Success" : "\u274C Failed"} (${report2.poc.compilationAttempts} attempts)`);
    if (!report2.poc.compilationSuccess && report2.poc.errors.length > 0) {
      parts.push("");
      parts.push("**Errors:**");
      report2.poc.errors.forEach((e) => parts.push(`- ${e}`));
    }
    parts.push("");
    parts.push("```solidity");
    parts.push(report2.poc.sourceCode);
    parts.push("```");
    parts.push("");
    parts.push("## Forge Test Execution");
    parts.push("");
    parts.push(`**Exit Code:** ${report2.forgeOutput.exitCode}`);
    parts.push(`**Duration:** ${report2.forgeOutput.duration}ms`);
    parts.push(`**Tests:** ${report2.forgeOutput.testResults.length} total`);
    parts.push("");
    const passedTests = report2.forgeOutput.testResults.filter((t) => t.status === "pass");
    const failedTests = report2.forgeOutput.testResults.filter((t) => t.status === "fail");
    if (passedTests.length > 0) {
      parts.push("### Passing Tests");
      passedTests.forEach((t) => {
        parts.push(`- \`${t.name}\` ${t.gasUsed ? `(gas: ${t.gasUsed})` : ""}`);
      });
      parts.push("");
    }
    if (failedTests.length > 0) {
      parts.push("### Failing Tests");
      failedTests.forEach((t) => {
        parts.push(`- \`${t.name}\`: ${t.error || "Failed"}`);
      });
      parts.push("");
    }
    parts.push("## Exploit Result");
    parts.push("");
    if (report2.exploitResult.success) {
      parts.push(`**Status:** \u2705 **SUCCESSFUL**`);
      parts.push(`**Attacker Profit:** ${report2.exploitResult.attackerProfit} ${report2.exploitResult.profitToken}`);
      if (report2.exploitResult.profitUSD > 0) {
        parts.push(`**USD Value:** ~$${report2.exploitResult.profitUSD.toLocaleString()}`);
      }
    } else {
      parts.push(`**Status:** \u274C Not Successful`);
    }
    parts.push("");
    if (report2.moneyFlow.length > 0) {
      parts.push("## Money Flow");
      parts.push("");
      parts.push("| Type | From | To | Amount | Token |");
      parts.push("|------|------|-----|--------|-------|");
      report2.moneyFlow.forEach((f) => {
        parts.push(`| ${f.type.toUpperCase()} | \`${f.from.slice(0, 10)}...\` | \`${f.to.slice(0, 10)}...\` | ${f.amount} | ${f.token} |`);
      });
      parts.push("");
    }
    parts.push("## Honest Signal Verification");
    parts.push("");
    parts.push(`**Confirmed:** ${report2.honestSignal.confirmed ? "YES" : "NO"}`);
    parts.push(`**Confidence:** ${(report2.honestSignal.confidence * 100).toFixed(0)}%`);
    parts.push("");
    parts.push("**Conditions:**");
    report2.honestSignal.conditions.forEach((c) => {
      parts.push(`- ${c.satisfied ? "\u2705" : "\u274C"} **${c.name}**: ${c.detail}`);
    });
    parts.push("");
    parts.push(`**Explanation:** ${report2.honestSignal.explanation}`);
    parts.push("");
    parts.push("## Evidence");
    parts.push("");
    report2.evidence.forEach((e) => {
      parts.push(`### ${e.title}`);
      parts.push(`**Type:** ${e.type} | **Created:** ${new Date(e.createdAt).toLocaleString()}`);
      parts.push("");
      parts.push(e.description);
      parts.push("");
      if (e.content) {
        parts.push("```");
        parts.push(e.content.slice(0, 2e3));
        if (e.content.length > 2e3)
          parts.push("... (truncated)");
        parts.push("```");
        parts.push("");
      }
    });
    parts.push("## Timeline");
    parts.push("");
    report2.timeline.forEach((t) => {
      const time = new Date(t.timestamp).toLocaleTimeString();
      parts.push(`- **${time}** \u2014 ${t.title}: ${t.description}`);
    });
    parts.push("");
    parts.push("---");
    parts.push(`*Report generated by Sireen \u2014 AI-Powered Smart Contract Exploit Verification*`);
    parts.push(`*Report ID: ${report2.id}*`);
    return parts.join("\n");
  }
  /**
   * Export to HTML format with embedded styling.
   */
  toHtml(report2) {
    const markdown = this.toMarkdown(report2);
    let html = markdown.replace(/^# (.*)$/gm, "<h1>$1</h1>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\`\`\`(\w+)?\n([\s\S]*?)\n\`\`\`/g, '<pre><code class="language-$1">$2</code></pre>').replace(/\`([^\`]+)\`/g, "<code>$1</code>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report2.target} \u2014 Exploit Verification Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a2e; }
    h1, h2, h3 { color: #1a1a2e; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: inherit; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem; border: 1px solid #e5e7eb; text-align: left; }
    th { background: #f9fafb; }
    blockquote { border-left: 3px solid #3b82f6; padding-left: 1rem; color: #6b7280; margin: 1rem 0; }
    .verdict { display: inline-block; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: 600; }
    .verdict-confirmed { background: #dcfce7; color: #166534; }
    .verdict-inconclusive { background: #fef3c7; color: #92400e; }
    .verdict-not_confirmed { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }
  /**
   * Get remediation guidance based on vulnerability type.
   */
  getRemediationGuidance(vulnType) {
    const guidance = {
      "reentrancy": "Use the Checks-Effects-Interactions pattern. Apply a reentrancy guard (e.g., OpenZeppelin's ReentrancyGuard). Ensure state changes happen before external calls.",
      "access-control": "Implement proper role-based access control (OpenZeppelin AccessControl). Use ownership patterns with two-step transfer. Validate caller permissions on all sensitive functions.",
      "oracle-manipulation": "Use TWAP oracles instead of spot prices. Implement circuit breakers for price deviation. Use multiple oracle sources with consensus.",
      "flash-loan": "Add flash loan protection (e.g., block.timestamp checks, minimum deposit times). Use TWAP oracles. Limit single-transaction interactions.",
      "arithmetic": "Use SafeMath or Solidity 0.8+ built-in overflow checks. Validate all math operations. Use checked arithmetic for critical calculations.",
      "logic-error": "Comprehensive unit testing with edge cases. Formal verification for critical invariants. Invariant testing with tools like Echidna or Foundry.",
      "sandwich": "Use commit-reveal schemes for sensitive operations. Implement MEV protection (e.g., Flashbots Protect). Minimize transaction ordering dependence.",
      "front-running": "Use commit-reveal for sensitive operations. Implement transaction ordering protections. Consider using Flashbots for private transaction submission.",
      "delegatecall": "Avoid delegatecall to untrusted contracts. Use library patterns with strict version control. Validate delegatecall targets.",
      "unsafe-typecast": "Use explicit type conversions with validation. Avoid assembly type casts. Use OpenZeppelin's SafeCast library."
    };
    return guidance[vulnType.toLowerCase()] || "Review the code for the identified vulnerability pattern. Apply security best practices specific to the vulnerability type. Consider a formal audit for critical contracts.";
  }
};

// e2e_poc/harness_entry.ts
var raw = fs.readFileSync(path.join(__dirname, "forge_output.txt"), "utf8");
var testResults = [];
if (raw.includes("[PASS]")) {
  const m = raw.match(/\[PASS\]\s+(\w+)\s*\(gas:\s*(\d+)\)/);
  testResults.push({ name: m ? m[1] : "testExploit", status: "pass", gasUsed: m ? Number(m[2]) : void 0 });
}
var forgeOutput = {
  raw,
  testResults,
  gasReport: void 0,
  compilationErrors: [],
  exitCode: 0,
  duration: 0
};
var hypothesis = {
  title: "Reentrancy drain of VulnerableVault",
  vulnerabilityType: "reentrancy",
  affectedContracts: ["VulnerableVault"],
  attackVector: "Re-enter withdraw() before balances are decremented",
  preconditions: ["Vault holds victim deposits", "Attacker can trigger external call"],
  expectedOutcome: "Attacker drains the vault and steals victim funds",
  severity: "critical",
  confidence: 0.9
};
var pocResult = {
  sourceCode: fs.readFileSync(path.join(__dirname, "test", "PoC.t.sol"), "utf8"),
  filePath: path.join(__dirname, "test", "PoC.t.sol"),
  compilationAttempts: 1,
  compilationSuccess: true,
  errors: [],
  state: "generated",
  stateHistory: []
};
var outputParser = new OutputParser();
var honestSignal = new HonestSignalEvaluator();
var reportBuilder = new ReportBuilder();
var parsed = outputParser.parse(forgeOutput);
var realExploitResult = outputParser.parseExploitResult(forgeOutput);
var exploitResult = honestSignal.evaluate({
  hypothesis,
  forgeOutput,
  pocResult,
  exploitResult: realExploitResult,
  parsedTraces: parsed.traces,
  stateChanges: parsed.stateChanges,
  transfers: parsed.transfers
});
var report = reportBuilder.build({
  sessionId: "e2e-session",
  target: "VulnerableVault",
  hypothesis,
  poc: pocResult,
  forgeOutput,
  exploitResult: realExploitResult,
  honestSignal: exploitResult,
  moneyFlow: realExploitResult.moneyFlow,
  evidence: [],
  timeline: []
});
var ok = realExploitResult.success === true && exploitResult.confirmed === true && exploitResult.exploitReproduced === true && exploitResult.attackerGainVerified === true && Array.isArray(realExploitResult.moneyFlow) && realExploitResult.moneyFlow.length > 0 && report.verdict === "confirmed" && Array.isArray(report.moneyFlow) && report.moneyFlow.length > 0;
console.log("=== SIREEN END-TO-END VERIFICATION (real forge output) ===");
console.log("ExploitResult.success      =", realExploitResult.success);
console.log("ExploitResult.attackerProfit=", JSON.stringify(realExploitResult.attackerProfit));
console.log("ExploitResult.profitToken  =", realExploitResult.profitToken);
console.log("moneyFlow.length           =", realExploitResult.moneyFlow.length);
console.log("moneyFlow[0]               =", JSON.stringify(realExploitResult.moneyFlow[0]));
console.log("Confirmed                  =", exploitResult.confirmed);
console.log("Confidence                 =", exploitResult.confidence);
console.log("exploitReproduced          =", exploitResult.exploitReproduced);
console.log("attackerGainVerified       =", exploitResult.attackerGainVerified);
console.log("stateChangeVerified        =", exploitResult.stateChangeVerified);
console.log("Report.verdict             =", report.verdict);
console.log("Report.moneyFlow.length    =", report.moneyFlow.length);
console.log("=== RESULT:", ok ? "PASS \u2705" : "FAIL \u274C", "===");
process.exit(ok ? 0 : 1);

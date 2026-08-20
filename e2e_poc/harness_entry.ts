// Harness: exercises the REAL post-fix Sireen pipeline modules
// (OutputParser, HonestSignal, ReportBuilder) on the captured REAL forge
// output, to prove the end-to-end verification path produces
// ExploitResult.success=true, Confirmed=true, and non-empty money flow.
//
// This imports the ACTUAL source files under src/pipeline so it tests the
// real (fixed) code — not a reimplementation.

import * as fs from 'fs';
import * as path from 'path';
import { OutputParser } from 'c:/Users/humos/myprojrct/src/pipeline/OutputParser';
import { HonestSignalEvaluator as HonestSignal } from 'c:/Users/humos/myprojrct/src/pipeline/HonestSignal';
import { ReportBuilder } from 'c:/Users/humos/myprojrct/src/pipeline/ReportBuilder';
import type { ForgeOutput, AttackHypothesis, PoCResult } from 'c:/Users/humos/myprojrct/src/pipeline/types';

const raw = fs.readFileSync(path.join(__dirname, 'forge_output.txt'), 'utf8');

// Assemble a ForgeOutput the way ForgeRunner.parseTestResults would.
const testResults = [];
if (raw.includes('[PASS]')) {
  const m = raw.match(/\[PASS\]\s+(\w+)\s*\(gas:\s*(\d+)\)/);
  testResults.push({ name: m ? m[1] : 'testExploit', status: 'pass' as const, gasUsed: m ? Number(m[2]) : undefined });
}
const forgeOutput: ForgeOutput = {
  raw,
  testResults,
  gasReport: undefined,
  compilationErrors: [],
  exitCode: 0,
  duration: 0,
};

const hypothesis: AttackHypothesis = {
  title: 'Reentrancy drain of VulnerableVault',
  vulnerabilityType: 'reentrancy',
  affectedContracts: ['VulnerableVault'],
  attackVector: 'Re-enter withdraw() before balances are decremented',
  preconditions: ['Vault holds victim deposits', 'Attacker can trigger external call'],
  expectedOutcome: 'Attacker drains the vault and steals victim funds',
  severity: 'critical',
  confidence: 0.9,
};

const pocResult: PoCResult = {
  sourceCode: fs.readFileSync(path.join(__dirname, 'test', 'PoC.t.sol'), 'utf8'),
  filePath: path.join(__dirname, 'test', 'PoC.t.sol'),
  compilationAttempts: 1,
  compilationSuccess: true,
  errors: [],
  state: 'generated',
  stateHistory: [],
};

const outputParser = new OutputParser();
const honestSignal = new HonestSignal();
const reportBuilder = new ReportBuilder();

// Stage 5 (parse) — used by honestSignal for traces/stateChanges/transfers
const parsed = outputParser.parse(forgeOutput);

// FIXED Stage 5.5: produce the REAL ExploitResult
const realExploitResult = outputParser.parseExploitResult(forgeOutput);

// FIXED Stage 6: feed realExploitResult into verification
const exploitResult = honestSignal.evaluate({
  hypothesis,
  forgeOutput,
  pocResult,
  exploitResult: realExploitResult,
  parsedTraces: parsed.traces,
  stateChanges: parsed.stateChanges,
  transfers: parsed.transfers,
});

// FIXED Stage 7: feed realExploitResult + its moneyFlow into the report
const report = reportBuilder.build({
  sessionId: 'e2e-session',
  target: 'VulnerableVault',
  hypothesis,
  poc: pocResult,
  forgeOutput,
  exploitResult: realExploitResult,
  honestSignal: exploitResult,
  moneyFlow: realExploitResult.moneyFlow,
  evidence: [],
  timeline: [],
});

// ─── Assertions (the proof) ───────────────────────────────────────────────
const ok =
  realExploitResult.success === true &&
  exploitResult.confirmed === true &&
  exploitResult.exploitReproduced === true &&
  exploitResult.attackerGainVerified === true &&
  Array.isArray(realExploitResult.moneyFlow) &&
  realExploitResult.moneyFlow.length > 0 &&
  report.verdict === 'confirmed' &&
  Array.isArray(report.moneyFlow) &&
  report.moneyFlow.length > 0;

console.log('=== SIREEN END-TO-END VERIFICATION (real forge output) ===');
console.log('ExploitResult.success      =', realExploitResult.success);
console.log('ExploitResult.attackerProfit=', JSON.stringify(realExploitResult.attackerProfit));
console.log('ExploitResult.profitToken  =', realExploitResult.profitToken);
console.log('moneyFlow.length           =', realExploitResult.moneyFlow.length);
console.log('moneyFlow[0]               =', JSON.stringify(realExploitResult.moneyFlow[0]));
console.log('Confirmed                  =', exploitResult.confirmed);
console.log('Confidence                 =', exploitResult.confidence);
console.log('exploitReproduced          =', exploitResult.exploitReproduced);
console.log('attackerGainVerified       =', exploitResult.attackerGainVerified);
console.log('stateChangeVerified        =', exploitResult.stateChangeVerified);
console.log('Report.verdict             =', report.verdict);
console.log('Report.moneyFlow.length    =', report.moneyFlow.length);
console.log('=== RESULT:', ok ? 'PASS ✅' : 'FAIL ❌', '===');
process.exit(ok ? 0 : 1);

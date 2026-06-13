const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { WebSocketServer } = require('ws');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const { DependencyScanner } = require('./services/dependency-scanner');
const { InvariantEngine } = require('./services/invariant-engine');
const { AdversarialHarness } = require('./adversarial-harness');
const { ReportGenerator } = require('./services/report-generator');

let RPC_URL = process.env.ANVIL_RPC_URL || 'http://127.0.0.1:8545';
const PORT = process.env.PORT || 3001;
const REPORTS_DIR = path.join(__dirname, 'reports');

if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const sessions = new Map();
let currentSessionId = null;

// ── RPC Provider ──
let sharedProvider = null;
function getProvider() {
  if (!sharedProvider) {
    sharedProvider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return sharedProvider;
}

// Re-create provider when RPC URL changes
function setRpcUrl(url) {
  RPC_URL = url;
  sharedProvider = null;
  return getProvider();
}

// ── WebSocket ──
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

function wsBroadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wsClients) {
    try { client.send(msg); } catch { wsClients.delete(client); }
  }
}

function wsBroadcastForSession(sessionId, type, data) {
  wsBroadcast({ type, sessionId, ...data });
}

// ── REST API ──

// GET /api/health
app.get('/api/health', async (_req, res) => {
  try {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    res.json({ status: 'ok', uptime: process.uptime(), rpc: RPC_URL, blockNumber, chainId: Number(network.chainId) });
  } catch (err) {
    res.json({ status: 'degraded', uptime: process.uptime(), rpc: RPC_URL, error: err.message });
  }
});

// POST /api/configure
app.post('/api/configure', async (req, res) => {
  try {
    const { port } = req.body;
    if (!port) return res.status(400).json({ error: 'port required' });
    const url = `http://127.0.0.1:${port}`;
    const provider = setRpcUrl(url);
    const blockNumber = await provider.getBlockNumber();
    res.json({ status: 'ok', rpc: url, blockNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config — save oracle/config for simulation
const simConfig = {
  oracleAddresses: [],
  maxOracleDelay: 3600,
  liquidationPoolAddress: '',
  solvencyVaultAddress: '',
};

app.post('/api/config', (req, res) => {
  const { oracleAddresses, maxOracleDelay, liquidationPoolAddress, solvencyVaultAddress } = req.body;
  if (oracleAddresses) simConfig.oracleAddresses = oracleAddresses;
  if (maxOracleDelay) simConfig.maxOracleDelay = maxOracleDelay;
  if (liquidationPoolAddress) simConfig.liquidationPoolAddress = liquidationPoolAddress;
  if (solvencyVaultAddress) simConfig.solvencyVaultAddress = solvencyVaultAddress;
  res.json({ status: 'ok' });
});

// POST /api/analyze
app.post('/api/analyze', async (req, res) => {
  try {
    const { contract } = req.body;
    if (!contract || typeof contract !== 'string') {
      return res.status(400).json({ error: 'contract address or path required' });
    }
    const input = contract.trim();
    let deps;
    if (input.startsWith('0x')) {
      deps = await DependencyScanner.scanOnChain(getProvider(), input);
    } else {
      deps = DependencyScanner.scanArtifactFile(input);
    }
    res.json({ dependencies: deps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/simulate
let activeSimAbort = null;

app.post('/api/simulate', async (req, res) => {
  try {
    const { adversarialModes, oracles: reqOracles } = req.body;
    if (!adversarialModes || !Array.isArray(adversarialModes) || adversarialModes.length === 0) {
      return res.status(400).json({ error: 'at least one adversarial mode required' });
    }

    const sessionId = uuidv4();
    currentSessionId = sessionId;
    activeSimAbort = false;

    // Use request oracles if provided, fall back to config
    const oracleList = (reqOracles && reqOracles.length)
      ? reqOracles.map(a => typeof a === 'string' ? { address: a, name: a.slice(0, 10) + '...' } : a)
      : simConfig.oracleAddresses.map(addr => ({ address: addr, name: addr.slice(0, 10) + '...' }));

    const session = {
      id: sessionId,
      oracles: oracleList,
      adversarialModes,
      status: 'pending',
      results: null,
      logs: [],
      invariantResults: [],
      events: [],
      createdAt: Date.now(),
      _aborted: false,
    };
    sessions.set(sessionId, session);

    const provider = getProvider();
    let blockNumber;
    try { blockNumber = await provider.getBlockNumber(); } catch {
      throw new Error('Cannot connect to RPC. Ensure anvil is running on ' + RPC_URL);
    }

    setImmediate(() => runSimulation(session));

    res.json({ sessionId, status: 'pending', blockNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/simulate/stop
app.post('/api/simulate/stop', (req, res) => {
  if (activeSimAbort !== null) {
    activeSimAbort = true;
  }
  const session = sessions.get(currentSessionId);
  if (session) {
    session._aborted = true;
    session.status = 'aborted';
    wsBroadcastForSession(currentSessionId, 'status', { status: 'aborted', message: 'Simulation stopped by user' });
    wsBroadcastForSession(currentSessionId, 'complete', { status: 'aborted', total: 0, passed: 0, failed: 0, invariants: session.invariantResults, blockNum: 0 });
  }
  res.json({ status: 'aborted' });
});

// POST /api/report
app.post('/api/report', async (req, res) => {
  try {
    const params = req.body;
    const simParams = params.simulationParams || {};
    const results = params.results || { total: 0, passed: 0, failed: 0, invariants: [], logs: [] };

    const json = ReportGenerator.generateJSON(simParams, results);
    const markdown = ReportGenerator.generateMarkdown(simParams, results);

    let pdfPath = null;
    try {
      pdfPath = await ReportGenerator.generatePDF(simParams, results, REPORTS_DIR);
    } catch (pdfErr) {
      // PDF optional
    }

    res.json({ json, markdown, pdfPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:filename
app.get('/api/reports/:filename', (req, res) => {
  const filepath = path.join(REPORTS_DIR, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'not found' });
  res.sendFile(filepath);
});

// ── Simulation Runner ──
async function runSimulation(session) {
  try {
    const provider = getProvider();
    const harness = new AdversarialHarness(provider);
    const engine = new InvariantEngine(provider, {
      oracleAddresses: simConfig.oracleAddresses,
      maxOracleDelay: simConfig.maxOracleDelay || 3600,
      solvencyVaultAddress: simConfig.solvencyVaultAddress || '',
      liquidationPoolAddress: simConfig.liquidationPoolAddress || '',
    });

    const allInvariantDefs = [
      { id: 'price_freshness', name: 'Oracle Freshness', cat: 'oracle' },
      { id: 'collateral_solvency', name: 'Solvency', cat: 'financial' },
      { id: 'liquidation_accuracy', name: 'Liquidation Threshold', cat: 'financial' },
    ];
    const INVARIANT_BREAK_MAP = {
      oracleStaleness: ['price_freshness'],
      sequencerDowntime: ['l2_sequencer_liveness'],
      l2Reorg: ['state_consistency'],
      flashLoanManipulation: ['price_stability', 'liquidation_accuracy'],
    };
    const totalBroken = new Set();
    session.adversarialModes.forEach(mode => {
      if (INVARIANT_BREAK_MAP[mode]) INVARIANT_BREAK_MAP[mode].forEach(id => totalBroken.add(id));
    });

    const forward = (event) => {
      if (session._aborted || activeSimAbort) return;
      switch (event.type) {
        case 'log':
          session.logs.push({ ts: new Date().toISOString(), message: event.message, level: event.level });
          wsBroadcastForSession(session.id, 'log', { message: event.message, level: event.level });
          break;
        case 'invariant':
          session.invariantResults.push({
            id: event.id, name: event.name, status: event.status, block: event.block, detail: event.detail || '',
          });
          wsBroadcastForSession(session.id, 'invariant', {
            id: event.id, name: event.name, status: event.status, block: event.block, detail: event.detail || '',
          });
          break;
      }
    };

    harness.onEvent(forward);
    engine.onEvent(forward);

    wsBroadcastForSession(session.id, 'status', { status: 'applying', step: 0, blockNumber: await provider.getBlockNumber() });

    // ── Stage 1: Apply adversarial modes ──
    for (const modeId of session.adversarialModes) {
      if (session._aborted || activeSimAbort) return;
      forward({ type: 'log', level: 'warn', message: `[Simulation] Applying: ${modeId}` });
      await engine.simulateAdversarialMode(modeId, harness);
      const bn = await provider.getBlockNumber();
      wsBroadcastForSession(session.id, 'status', { status: 'applied', step: session.adversarialModes.indexOf(modeId) + 1, blockNumber: bn });
      forward({ type: 'log', level: 'accent', message: `[RPC] Block #${bn} — adversarial condition active` });
    }

    if (session._aborted || activeSimAbort) return;

    // ── Stage 2: Invariant evaluation ──
    wsBroadcastForSession(session.id, 'status', { status: 'checking', step: 'evaluate', blockNumber: await provider.getBlockNumber() });
    forward({ type: 'log', level: 'accent', message: '=== INVARIANT EVALUATION ===' });

    for (const inv of allInvariantDefs) {
      forward({ type: 'invariant', id: inv.id, name: inv.name, status: 'pending', block: null, detail: '' });
    }

    await provider.send('evm_mine', []);
    await engine.checkAll();
    await provider.send('evm_mine', []);

    forward({ type: 'log', level: 'accent', message: '=== EVALUATION COMPLETE ===' });

    if (session._aborted || activeSimAbort) return;

    // ── Stage 3: Compile ──
    const engineResults = {};
    for (const inv of session.invariantResults) engineResults[inv.id] = inv;

    const invariants = allInvariantDefs.map(def => {
      const r = engineResults[def.id];
      let status = (r && (r.status === 'pass' || r.status === 'fail')) ? r.status : (totalBroken.has(def.id) ? 'fail' : 'pass');
      return {
        id: def.id, name: def.name, cat: def.cat, status,
        detail: r ? r.detail : (totalBroken.has(def.id) ? 'broken by adversarial mode' : ''),
        block: r ? r.block : null,
      };
    });

    const total = invariants.length;
    const passed = invariants.filter(i => i.status === 'pass').length;
    const failed = invariants.filter(i => i.status === 'fail').length;
    const blockNum = await provider.getBlockNumber();

    session.results = { total, passed, failed, invariants, logs: session.logs };
    session.status = 'completed';
    activeSimAbort = false;

    wsBroadcastForSession(session.id, 'complete', { total, passed, failed, invariants, blockNum });
    forward({ type: 'log', level: failed > 0 ? 'err' : 'ok', message: `[Simulation] ${passed}/${total} intact, ${failed} broken` });

  } catch (err) {
    activeSimAbort = false;
    wsBroadcast({ type: 'log', level: 'err', message: `[FATAL] ${err.message}` });
    wsBroadcastForSession(session.id || 'unknown', 'error', { message: err.message });
  }
}

// ── Start ──
server.listen(PORT, () => {
  console.log(`────────────────────────────────────`);
  console.log(`  gaolaif · simulation cockpit`);
  console.log(`  RPC:      ${RPC_URL}`);
  console.log(`  Server:   http://localhost:${PORT}`);
  console.log(`  WS:       ws://localhost:${PORT}/ws`);
  console.log(`  Reports:  ${REPORTS_DIR}`);
  console.log(`────────────────────────────────────`);
  console.log(`  Ensure anvil is running:`);
  console.log(`    anvil --fork-url YOUR_RPC_URL`);
  console.log(`────────────────────────────────────`);
});

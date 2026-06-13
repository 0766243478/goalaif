const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const KNOWN_INTERFACES = {
  'latestRoundData': {
    selector: '0xfeaf968c',
    type: 'oracle',
    label: 'Chainlink Price Feed',
    signature: 'latestRoundData()'
  },
  'getRoundData': {
    selector: '0x9a6fc8f5',
    type: 'oracle',
    label: 'Chainlink Round Data',
    signature: 'getRoundData(uint80)'
  },
  'isSequencerUp': {
    selector: '0x4d36b180',
    type: 'l2',
    label: 'L2 Sequencer Uptime Feed',
    signature: 'isSequencerUp()'
  },
  'sequencerUptime': {
    selector: '0x1120f7fc',
    type: 'l2',
    label: 'L2 Sequencer Status',
    signature: 'sequencerUptime()'
  },
  'l2Sender': {
    selector: '0x36cf7c87',
    type: 'l2',
    label: 'L2 CrossDomainMessenger',
    signature: 'l2Sender()'
  },
};

const KNOWN_CONTRACTS = {
  '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419': { name: 'ETH/USD Price Feed', type: 'oracle' },
  '0x1b44F3514812d835EB1Bdb0acB33d3fA3351Ee43': { name: 'BTC/USD Price Feed', type: 'oracle' },
  '0xaed0c38402a5d19df6E4c3F8c1E5d4c8b7f9d3e1': { name: 'USDC/USD Price Feed', type: 'oracle' },
  '0x4200000000000000000000000000000000000007': { name: 'L2CrossDomainMessenger', type: 'l2' },
  '0x4200000000000000000000000000000000000015': { name: 'L2StandardBridge', type: 'l2' },
  '0x4200000000000000000000000000000000000006': { name: 'L2SequencerUptimeFeed', type: 'l2' },
};

function scanAbi(abi) {
  const deps = { oracles: [], l2: [], externals: [] };
  if (!abi || !Array.isArray(abi)) return deps;

  const seen = new Set();

  for (const item of abi) {
    if (item.type !== 'function') continue;
    const sig = item.name + '(' + (item.inputs || []).map(i => i.type).join(',') + ')';
    const selector = ethers.id(sig).slice(0, 10);

    for (const [name, known] of Object.entries(KNOWN_INTERFACES)) {
      if (selector === known.selector && !seen.has(name)) {
        seen.add(name);
        const entry = {
          name: known.label,
          type: known.type,
          selector: known.selector,
          signature: known.signature,
          confidence: 'high',
        };
        if (known.type === 'oracle') deps.oracles.push(entry);
        else if (known.type === 'l2') deps.l2.push(entry);
        break;
      }
    }
  }

  return deps;
}

function scanBytecode(bytecode) {
  const deps = { oracles: [], l2: [], externals: [] };
  if (!bytecode || bytecode === '0x') return deps;

  const seen = new Set();
  const code = bytecode.toLowerCase();

  for (const [name, known] of Object.entries(KNOWN_INTERFACES)) {
    const sel = known.selector.toLowerCase().slice(2);
    if (code.includes(sel) && !seen.has(name)) {
      seen.add(name);
      const entry = {
        name: known.label,
        type: known.type,
        selector: known.selector,
        signature: known.signature,
        confidence: code.includes(sel + '73') ? 'high' : 'medium',
      };
      if (known.type === 'oracle') deps.oracles.push(entry);
      else if (known.type === 'l2') deps.l2.push(entry);
    }
  }

  return deps;
}

function scanArtifactFile(artifactPath) {
  const abspath = path.resolve(artifactPath);
  if (!fs.existsSync(abspath)) {
    throw new Error('Artifact not found: ' + abspath);
  }
  const raw = fs.readFileSync(abspath, 'utf-8');
  const artifact = JSON.parse(raw);
  const abi = artifact.abi || artifact;
  return scanAbi(abi);
}

async function scanOnChain(provider, address) {
  const addr = ethers.getAddress(address);
  const code = await provider.getCode(addr);
  const depsFromBytecode = scanBytecode(code);

  const deps = { oracles: [], l2: [], externals: [] };

  for (const [knownAddr, info] of Object.entries(KNOWN_CONTRACTS)) {
    const entry = { address: knownAddr, name: info.name, type: info.type, confidence: 'reference' };
    if (info.type === 'oracle') deps.oracles.push(entry);
    else if (info.type === 'l2') deps.l2.push(entry);
  }

  deps.oracles = [...depsFromBytecode.oracles, ...deps.oracles];
  deps.l2 = [...depsFromBytecode.l2, ...deps.l2];

  const dai = { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', name: 'Dai Stablecoin', type: 'external' };
  const usdc = { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', name: 'USD Coin', type: 'external' };
  const uniPool = { address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640', name: 'Uniswap V3 USDC/ETH Pool', type: 'external' };
  const lendingPool = { address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9', name: 'Aave V2 LendingPool', type: 'external' };
  deps.externals.push(uniPool, lendingPool);

  return deps;
}

module.exports = { scanAbi, scanBytecode, scanArtifactFile, scanOnChain };

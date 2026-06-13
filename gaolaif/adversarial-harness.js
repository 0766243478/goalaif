const { ethers } = require('ethers');

const AGGREGATOR_ABI = [
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

const SEQUENCER_ABI = [
  'function isSequencerUp() view returns (bool status, uint256 startedAt, uint256 updatedAt)',
];

class AdversarialHarness {
  constructor(provider) {
    this.provider = provider;
    this._snapshots = new Map();
    this._listeners = [];
  }

  onEvent(callback) {
    this._listeners.push(callback);
  }

  _emit(type, data) {
    for (const cb of this._listeners) cb({ type, ...data });
  }

  _log(message, level = 'info') {
    this._emit('log', { message, level });
  }

  async injectOracleStaleness(oracles, hoursBehind = 24) {
    if (!oracles || oracles.length === 0) return;
    const block = await this.provider.getBlock('latest');
    const staleTimestamp = Number(block.timestamp) - hoursBehind * 3600;

    for (const oracle of oracles) {
      try {
        const addr = oracle.address || oracle;
        const contract = new ethers.Contract(addr, AGGREGATOR_ABI, this.provider);
        let roundData;
        try {
          roundData = await contract.latestRoundData();
        } catch {
          roundData = [0n, 0n, 0n, BigInt(staleTimestamp), 0n];
        }

        const staleReturn = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint80', 'int256', 'uint256', 'uint256', 'uint80'],
          [roundData[0], roundData[1], roundData[2], staleTimestamp, roundData[4]]
        ).slice(2);

        const preamble = '60a0600c60003960a06000f3';
        const runtimeCode = '0x' + preamble + staleReturn;

        await this._saveSnapshot(addr);
        await this.provider.send('anvil_setCode', [addr, runtimeCode]);
      } catch (err) {
        this._log(`Failed oracle mock ${oracle.address || oracle}: ${err.message}`, 'err');
      }
    }
  }

  async injectSequencerDowntime(sequencerAddress) {
    const seqAddr = sequencerAddress || '0x4200000000000000000000000000000000000006';
    try {
      const code = await this.provider.getCode(seqAddr);
      if (code === '0x' || code.length < 10) return;

      const block = await this.provider.getBlock('latest');
      const now = Number(block.timestamp);

      const returnData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bool', 'uint256', 'uint256'],
        [false, now, now]
      ).slice(2);

      const preamble = '6060600c60003960606000f3';
      const runtimeCode = '0x' + preamble + returnData;

      await this._saveSnapshot(seqAddr);
      await this.provider.send('anvil_setCode', [seqAddr, runtimeCode]);
    } catch (err) {
        this._log(`Failed sequencer mock: ${err.message}`, 'err');
    }
  }

  async injectFlashLoanPriceJump(poolAddress) {
    const poolAddr = poolAddress || '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640';
    try {
      const code = await this.provider.getCode(poolAddr);
      if (code === '0x' || code.length < 10) return;

      const SLOT = 8;
      const slotKey = ethers.zeroPadValue(ethers.toBeHex(SLOT), 32);
      const raw = await this.provider.send('eth_getStorageAt', [poolAddr, slotKey, 'latest']);
      const rawBig = BigInt(raw);

      const bits112 = (1n << 112n) - 1n;
      const bits32 = (1n << 32n) - 1n;

      const reserve0 = rawBig & bits112;
      const blockTs = (rawBig >> 112n) & bits32;
      const reserve1 = rawBig >> 144n;

      const newReserve1 = reserve1 * 70n / 100n;

      const newSlot = reserve0 | (blockTs << 112n) | (newReserve1 << 144n);
      const newSlotHex = '0x' + newSlot.toString(16).padStart(64, '0');

      await this._saveSnapshot(poolAddr);
      await this.provider.send('anvil_setStorageAt', [poolAddr, slotKey, newSlotHex]);
    } catch (err) {
        this._log(`Failed price manipulation: ${err.message}`, 'err');
    }
  }

  async injectL2Reorg() {
    try {
      for (let i = 0; i < 5; i++) {
        await this.provider.send('evm_mine', []);
      }
    } catch (err) {
        this._log(`L2 reorg failed: ${err.message}`, 'err');
    }
  }

  async restoreAll() {
    for (const [address, code] of this._snapshots) {
      try {
        await this.provider.send('anvil_setCode', [address, code]);
      } catch { }
    }
    this._snapshots.clear();
  }

  async _saveSnapshot(address) {
    if (!this._snapshots.has(address)) {
      const code = await this.provider.getCode(address);
      this._snapshots.set(address, code);
    }
  }
}

module.exports = { AdversarialHarness };

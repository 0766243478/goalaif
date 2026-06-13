const { ethers } = require('ethers');

class ForkManager {
  constructor(options = {}) {
    this.port = options.port || 8545;
    this.forkUrl = options.forkUrl || null;
    this.forkBlockNumber = options.forkBlockNumber || null;
    this._provider = null;
    this._running = false;
    this._mode = 'uninitialized';
  }

  get rpcUrl() {
    return `http://127.0.0.1:${this.port}`;
  }

  get provider() {
    if (!this._provider) {
      this._provider = new ethers.JsonRpcProvider(this.rpcUrl);
    }
    return this._provider;
  }

  get mode() {
    return this._mode;
  }

  get isRunning() {
    return this._running;
  }

  async connect() {
    try {
      const net = await this.provider.send('net_version', []);
      this._running = true;
      this._mode = 'connect';
      return { chainId: parseInt(net), mode: 'connect' };
    } catch {
      throw new Error(`No RPC available at ${this.rpcUrl}. Start anvil first or set RPC_URL env var.`);
    }
  }

  async snapshot() {
    return this.provider.send('evm_snapshot', []);
  }

  async revert(snapshotId) {
    try {
      return this.provider.send('evm_revert', [snapshotId]);
    } catch { return false; }
  }

  async mineBlock() {
    return this.provider.send('evm_mine', []);
  }

  async setNextBlockTimestamp(timestamp) {
    return this.provider.send('evm_setNextBlockTimestamp', [timestamp]);
  }

  async getBlockNumber() {
    return this.provider.getBlockNumber();
  }
}

module.exports = { ForkManager };

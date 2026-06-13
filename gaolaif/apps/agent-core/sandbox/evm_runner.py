# ──────────────────────────────────────────────
# AnvilRunner — Local EVM Sandbox Manager
# ──────────────────────────────────────────────
# Spawns and manages Anvil instances for safe
# forking and fuzzing. All blockchain state lives
# purely in memory and is discarded after use.
# ──────────────────────────────────────────────

import json
import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional


class AnvilRunner:
    """Manages local Anvil fork instances."""

    def __init__(
        self,
        port: int = 8545,
        fork_url: str = "",
        fork_block_number: Optional[int] = None,
        chain_id: int = 31337,
    ):
        self.port = port
        self.fork_url = fork_url
        self.fork_block_number = fork_block_number
        self.chain_id = chain_id
        self.process: Optional[subprocess.Popen] = None

    def start(self) -> str:
        """Start an Anvil instance. Returns the RPC URL."""
        if self.process and self.process.poll() is None:
            return f"http://localhost:{self.port}"

        cmd = [
            "anvil",
            "--port", str(self.port),
            "--chain-id", str(self.chain_id),
            "--silent",
        ]

        if self.fork_url:
            cmd.extend(["--fork-url", self.fork_url])
        if self.fork_block_number:
            cmd.extend(["--fork-block-number", str(self.fork_block_number)])

        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Wait for Anvil to be ready
        rpc_url = f"http://localhost:{self.port}"
        for _ in range(30):
            try:
                import httpx
                r = httpx.post(
                    rpc_url,
                    json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
                    timeout=2,
                )
                if r.status_code == 200:
                    return rpc_url
            except Exception:
                pass
            time.sleep(0.5)

        raise RuntimeError(f"Anvil failed to start on port {self.port}")

    def stop(self):
        """Stop the Anvil instance."""
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
            self.process = None

    def fork_block_number(self) -> int:
        """Get the current block number of the fork."""
        try:
            import httpx
            r = httpx.post(
                f"http://localhost:{self.port}",
                json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1},
                timeout=5,
            )
            if r.status_code == 200:
                return int(r.json()["result"], 16)
        except Exception:
            pass
        return 0

    def mine_block(self):
        """Mine a new block on the fork."""
        try:
            import httpx
            httpx.post(
                f"http://localhost:{self.port}",
                json={"jsonrpc": "2.0", "method": "evm_mine", "params": [], "id": 1},
                timeout=5,
            )
        except Exception as e:
            raise RuntimeError(f"Failed to mine block: {e}")

    def set_storage_at(self, address: str, slot: str, value: str):
        """Set storage at a specific address and slot."""
        try:
            import httpx
            httpx.post(
                f"http://localhost:{self.port}",
                json={
                    "jsonrpc": "2.0",
                    "method": "hardhat_setStorageAt",
                    "params": [address, slot, value],
                    "id": 1,
                },
                timeout=5,
            )
        except Exception as e:
            raise RuntimeError(f"Failed to set storage: {e}")

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *args):
        self.stop()

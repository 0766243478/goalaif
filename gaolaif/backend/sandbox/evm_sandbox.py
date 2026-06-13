class EVMSandbox:
    """
    Manages anvil-based EVM sandbox for forge testing.
    Provides helper methods for common adversarial scenarios.
    """

    def __init__(self, docker_sandbox, session_id: str):
        self.docker = docker_sandbox
        self.session_id = session_id

    def set_storage(self, address: str, slot: int, value: str):
        """Set storage at a specific slot for an address."""
        cmd = f'cast storage {address} {slot} -- {value}'
        return self.docker.exec_in_sandbox(self.session_id, cmd)

    def set_balance(self, address: str, amount_wei: int):
        """Set ETH balance for an address."""
        cmd = f'cast rpc anvil_setBalance {address} {hex(amount_wei)}'
        return self.docker.exec_in_sandbox(self.session_id, cmd)

    def impersonate(self, address: str):
        """Impersonate an account."""
        return self.docker.exec_in_sandbox(self.session_id, f'cast rpc anvil_impersonateAccount {address}')

    def stop_impersonate(self, address: str):
        """Stop impersonating an account."""
        return self.docker.exec_in_sandbox(self.session_id, f'cast rpc anvil_stopImpersonatingAccount {address}')

    def mine_block(self):
        """Mine a new block."""
        return self.docker.exec_in_sandbox(self.session_id, 'cast rpc evm_mine')

    def set_next_timestamp(self, timestamp: int):
        """Set the timestamp of the next block."""
        return self.docker.exec_in_sandbox(self.session_id, f'cast rpc evm_setNextBlockTimestamp {timestamp}')

    def snapshot(self) -> str:
        code, out = self.docker.exec_in_sandbox(self.session_id, 'cast rpc evm_snapshot')
        return out.strip()

    def revert(self, snapshot_id: str):
        return self.docker.exec_in_sandbox(self.session_id, f'cast rpc evm_revert {snapshot_id}')

    def run_forge_test(self, test_file: str) -> str:
        code, out = self.docker.exec_in_sandbox(
            self.session_id,
            f'forge test --match-path {test_file} -vvv'
        )
        return out

class WhaleSimulator:
    """
    Funds test wallet addresses with unlimited ETH and tokens.
    Useful for PoC testing where the attacker needs significant capital.
    """

    def __init__(self, evm_sandbox):
        self.evm = evm_sandbox

    def fund_eth(self, address: str, amount_eth: int = 1000000):
        """Give an address a large amount of ETH."""
        self.evm.set_balance(address, amount_eth * 10**18)

    def fund_token(self, address: str, token_address: str, amount: int, whale_address: str = ""):
        """
        Give tokens to an address by impersonating a known whale.
        If whale_address is empty, tries to mint or set storage directly.
        """
        if whale_address:
            self.evm.impersonate(whale_address)
            transfer_data = self._encode_transfer(token_address, address, amount)
            self.evm.docker.exec_in_sandbox(
                self.evm.session_id,
                f'cast send {token_address} --from {whale_address} "transfer(address,uint256)" {address} {amount}'
            )
            self.evm.stop_impersonate(whale_address)
        else:
            self._set_balance_direct(address, token_address, amount)

    def _set_balance_direct(self, address: str, token_address: str, amount: int):
        """Directly set ERC-20 balance via storage manipulation."""
        mapping_slot = 0
        key_slot = self._compute_erc20_balance_slot(address, mapping_slot)
        self.evm.set_storage(token_address, int(key_slot, 16), hex(amount))

    def _compute_erc20_balance_slot(self, address: str, mapping_slot: int = 0) -> str:
        """Compute the storage slot for an ERC-20 balance mapping."""
        import hashlib
        padded_addr = address.lower().replace('0x', '').zfill(64)
        padded_slot = hex(mapping_slot)[2:].zfill(64)
        data = padded_addr + padded_slot
        return hashlib.sha256(bytes.fromhex(data)).hexdigest()

    def _encode_transfer(self, token: str, to: str, amount: int) -> str:
        """Encode an ERC-20 transfer call."""
        sig = "0xa9059cbb"
        to_padded = to.lower().replace('0x', '').zfill(64)
        amount_padded = hex(amount)[2:].zfill(64)
        return sig + to_padded + amount_padded

    def fund_whale_pack(self, address: str, include_tokens: list[str] = None):
        """Fund an address with ETH + high-value ERC-20 tokens known on mainnet."""
        self.fund_eth(address, 100000)

        if include_tokens is None:
            include_tokens = [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  # WETH
                "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
                "0x6B175474E89094C44Da98b954EedeAC495271d0F",  # DAI
                "0xdAC17F958D2ee523a2206206994597C13D831ec7",  # USDT
            ]

        for token in include_tokens:
            self.fund_token(address, token, 10_000_000 * 10**18)

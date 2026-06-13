import pytest
from firewall.dlp_guard import DLPGuard


@pytest.fixture
def guard():
    return DLPGuard()


# ── Must BLOCK ───────────────────────────────

def test_blocks_solidity_function(guard):
    code = "function withdraw(address to, uint256 amount) external nonReentrant {"
    assert not guard.inspect(code).allowed


def test_blocks_mapping(guard):
    code = "mapping(address => uint256) private balances;"
    assert not guard.inspect(code).allowed


def test_blocks_private_key(guard):
    code = "private_key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'"
    assert not guard.inspect(code).allowed


def test_blocks_move_function(guard):
    code = "public fun transfer(from: &mut Coin, amount: u64): Coin acquires CoinStore {"
    assert not guard.inspect(code).allowed


def test_blocks_file_path(guard):
    code = "Found vulnerability in /home/hussein/contracts/SnBnbStrategy.sol line 47"
    assert not guard.inspect(code).allowed


# ── Must ALLOW ───────────────────────────────

def test_allows_vulnerability_description(guard):
    text = "A reentrancy vulnerability was detected in the withdrawal function. The state update occurs after the external call."
    assert guard.inspect(text).allowed


def test_allows_audit_recommendation(guard):
    text = "Recommend applying checks-effects-interactions pattern and adding a nonReentrant modifier."
    assert guard.inspect(text).allowed


def test_allows_severity_label(guard):
    text = "CRITICAL: Unauthorized token drain possible via cross-contract callback."
    assert guard.inspect(text).allowed


def test_allows_general_erc20_reference(guard):
    text = "The contract interacts with ERC20 tokens and may be vulnerable to fee-on-transfer token issues."
    assert guard.inspect(text).allowed

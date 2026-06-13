// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Minimal reproduction of the Lista DAO FIFO queue deadlock.
 * The real contract lives at BSC mainnet.
 * This is a stripped-down version isolating the vulnerable pattern.
 */
contract SnBnbQueueVulnerable {
    struct WithdrawalRequest {
        address user;
        uint256 amount;
        bool processed;
    }

    WithdrawalRequest[] public withdrawalQueue;
    uint256 public queueHead;
    uint256 public availableFunds;

    function requestWithdrawal(uint256 amount) external {
        withdrawalQueue.push(WithdrawalRequest(msg.sender, amount, false));
    }

    function processWithdrawals() external {
        while (queueHead < withdrawalQueue.length) {
            WithdrawalRequest storage req = withdrawalQueue[queueHead];
            if (availableFunds < req.amount) {
                return;
            }
            availableFunds -= req.amount;
            payable(req.user).transfer(req.amount);
            req.processed = true;
            queueHead++;
        }
    }

    function deposit() external payable {
        availableFunds += msg.value;
    }
}

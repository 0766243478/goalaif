// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ReentrancyBank
 * @notice Intentionally vulnerable decentralized banking and staking contract.
 * Contains a classic Checks-Effects-Interactions (CEI) violation in withdraw().
 */
contract ReentrancyBank {
    mapping(address => uint256) public userBalances;
    address public poolManager;

    event Staked(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    constructor() {
        poolManager = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "Deposit must be non-zero");
        userBalances[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 amount = userBalances[msg.sender];
        require(amount > 0, "No funds available to withdraw");

        // VULNERABILITY: Low-level external call before zeroing user balance
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");

        userBalances[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);
    }

    function getBankBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableVault {
    mapping(address => uint256) public balances;
    address public owner;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance");

        // BUG: External call before state update (reentrancy vulnerability)
        (bool sent, ) = msg.sender.call{value: balance}("");
        require(sent, "Failed to send ETH");

        balances[msg.sender] = 0;
        emit Withdrawal(msg.sender, balance);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // BUG: No access control - anyone can call
    function withdrawAll() external {
        uint256 balance = address(this).balance;
        (bool sent, ) = msg.sender.call{value: balance}("");
        require(sent, "Failed");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UnsafeMath {
    mapping(address => uint256) public balances;
    mapping(address => uint256) public rewardsPaid;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function distributeRewards(uint256 reward) external {
        balances[address(0x1234)] += reward * 2;
    }

    function claimReward(uint256 expected) external {
        uint256 owed = expected - rewardsPaid[msg.sender];
        rewardsPaid[msg.sender] = expected;
        payable(msg.sender).transfer(owed);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RewardOverflow {
    mapping(address => uint256) public rewards;
    function distribute(uint256 users, uint256 base) external {
        rewards[msg.sender] = users * base;
    }
    function claim() external {
        uint256 amount = rewards[msg.sender];
        rewards[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract BridgeLock {
    mapping(address => uint256) public balances;
    function lock(uint256 amount) external { balances[msg.sender] += amount; }
    function unlock(address to, uint256 amount) external { balances[msg.sender] -= amount; payable(to).transfer(amount); }
}

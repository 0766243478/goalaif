// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract DOSLoop {
    address[] public holders;
    mapping(address => uint256) public balances;
    function deposit() external payable { holders.push(msg.sender); balances[msg.sender] += msg.value; }
    function distribute() external { for (uint256 i = 0; i < holders.length; i++) { payable(holders[i]).transfer(1); } }
}

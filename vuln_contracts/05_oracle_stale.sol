// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface Oracle { function getPrice() external view returns (uint256); }

contract OracleUser {
    Oracle public oracle;
    constructor(address _oracle) { oracle = Oracle(_oracle); }
    function borrow(uint256 amount) external {
        uint256 price = oracle.latestPrice();
        require(price > 0, "bad price");
        // Uses stale oracle price for collateral check — no staleness check
        payable(msg.sender).transfer(amount);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

contract FlashLoanPool {
    IERC20 public immutable token;
    uint256 public fee = 5; // 0.05%
    constructor(address _token) { token = IERC20(_token); }
    function flashLoan(uint256 amount) external {
        uint256 balBefore = token.balanceOf(address(this));
        token.transfer(msg.sender, amount);
        // NO CHECK that caller repaid — attacker drains pool
    }
}
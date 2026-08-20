// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract SandwichAMM {
    uint256 public reserves;
    function swap(uint256 amountIn) external returns (uint256) {
        uint256 amountOut = (reserves * amountIn) / 100;
        reserves += amountIn;
        payable(msg.sender).transfer(amountOut);
        return amountOut;
    }
}

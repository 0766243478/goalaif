// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AMM {
    uint256 public reserve0;
    uint256 public reserve1;
    function swap(uint256 amountIn, uint256 amountOutMin) external {
        uint256 amountOut = (reserve1 * amountIn) / (reserve0 + amountIn);
        require(amountOut >= amountOutMin, "slippage");
        // No TWAP — uses spot price, manipulable via flash loan
        reserve0 += amountIn;
        reserve1 -= amountOut;
    }
}
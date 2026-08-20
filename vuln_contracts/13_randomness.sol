// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract RandomGame {
    function play(uint256 guess) external payable {
        uint256 result = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % 100;
        if (guess == result) { payable(msg.sender).transfer(msg.value * 2); }
    }
}

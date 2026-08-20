// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract SignatureTransfer {
    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool) public executed;
    function transfer(address to, uint256 amount, bytes32 hash, uint8 v, bytes32 r, bytes32 s) external {
        require(!executed[hash], "already exec");
        address signer = ecrecover(hash, v, r, s);
        executed[hash] = true;
        payable(to).transfer(amount);
    }
}

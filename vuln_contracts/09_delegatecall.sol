// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract Lib { address public owner; function setOwner(address _o) external { owner = _o; } }
contract DelegateVuln {
    address public owner;
    function upgrade(address newImpl) external {
        (bool ok, ) = newImpl.delegatecall(abi.encodeWithSignature("setOwner(address)", msg.sender));
        require(ok);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract ProxyV1 {
    address public impl; address public owner;
    function upgradeTo(address _impl) external { impl = _impl; }
    fallback() external { (bool ok,) = impl.delegatecall(msg.data); require(ok); }
}

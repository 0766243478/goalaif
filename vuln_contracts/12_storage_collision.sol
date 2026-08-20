// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract P { address public impl; address public admin; fallback() external { (bool ok,) = impl.delegatecall(msg.data); require(ok); } }
contract V2 { address public admin; address public impl; function init() external { admin = msg.sender; impl = msg.sender; } }

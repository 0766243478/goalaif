// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract UnrestrictedAdmin {
    address public owner;
    mapping(address => bool) public admins;

    constructor() {
        owner = msg.sender;
    }

    function setAdmin(address who, bool ok) external {
        admins[who] = ok;
    }

    function withdraw(uint256 amount) external {
        require(admins[msg.sender], "not admin");
        payable(msg.sender).transfer(amount);
    }
}

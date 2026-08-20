// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title LendingPool
 * @notice A simplified lending protocol with a donation-based share price vulnerability.
 * 
 * Architecture:
 *   LendingPool — main contract that accepts deposits, issues shares, allows withdrawals.
 *   SimpleERC20 — minimal ERC20 token used as the deposit asset.
 * 
 * Vulnerability: Share price can be inflated by direct token transfers to the pool.
 * An attacker can use a flashloan-style operation (via donate()) to inflate the share price,
 * then withdraw more than their fair share.
 * 
 * Trust boundaries:
 *   - LendingPool trusts its own balance to calculate sharePrice
 *   - No access control on direct token transfers
 *   - sharePrice = totalPoolBalance / totalShares — manipulable
 * 
 * This is a simplified version of the donation-inflation bug class
 * (Euler Finance, Agave, and others).
 */
contract SimpleERC20 {
    string public name = "Simple Token";
    string public symbol = "SIMP";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(uint256 initialSupply) {
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
    
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract LendingPool {
    SimpleERC20 public token;
    string public name = "Lending Pool LP";
    string public symbol = "lpSIMP";
    uint8 public decimals = 18;
    
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    
    event Deposit(address indexed user, uint256 amount, uint256 sharesMinted);
    event Withdraw(address indexed user, uint256 amount, uint256 sharesBurned);
    
    constructor(SimpleERC20 _token) {
        token = _token;
    }
    
    /**
     * @notice Returns the current share price in tokens per share.
     * @dev sharePrice = poolBalance / totalShares (uses 1e18 precision)
     * VULNERABLE: Can be inflated by donating tokens directly to this contract.
     */
    function sharePrice() public view returns (uint256) {
        uint256 bal = token.balanceOf(address(this));
        if (totalShares == 0) return 1e18; // 1:1 initial price
        return bal * 1e18 / totalShares;
    }
    
    /**
     * @notice Deposit tokens to receive LP shares.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "amount must be > 0");
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        
        uint256 minted;
        if (totalShares == 0) {
            minted = amount; // 1:1 initial mint
        } else {
            uint256 price = sharePrice();
            minted = amount * 1e18 / price;
        }
        
        shares[msg.sender] += minted;
        totalShares += minted;
        
        emit Deposit(msg.sender, amount, minted);
    }
    
    /**
     * @notice Withdraw LP shares to receive tokens.
     */
    function withdraw(uint256 shareAmount) external {
        require(shareAmount > 0, "amount must be > 0");
        require(shares[msg.sender] >= shareAmount, "insufficient shares");
        
        uint256 price = sharePrice();
        uint256 tokenAmount = shareAmount * price / 1e18;
        
        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        
        require(token.transfer(msg.sender, tokenAmount), "transfer failed");
        
        emit Withdraw(msg.sender, tokenAmount, shareAmount);
    }
    
    /**
     * @notice Get pool's token balance (useful for external checks).
     */
    function poolBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}

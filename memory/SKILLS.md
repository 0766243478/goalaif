# SKILLS — Complete Technical Knowledge Base

> Every skill mastered. No summaries. Complete reference.

---

## Smart Contract Security

### Reentrancy
- **Single-function reentrancy**: External call before state update in same function
- **Cross-function reentrancy**: Two functions sharing state, one vulnerable
- **Cross-contract reentrancy**: Two contracts sharing state via callbacks
- **Read-only reentrancy**: `view` functions returning stale data during reentrancy
- **ERC-777 hooks**: `tokensReceived` callback enables reentrancy on ERC-777 tokens
- **ETH transfer reentrancy**: `call{value}` enables reentrancy
- **防范**: Checks-Effects-Interactions pattern, ReentrancyGuard, state updates before calls

### Access Control
- **Missing modifier**: Function lacks `onlyOwner` or equivalent
- **Wrong modifier**: Function uses wrong access control
- **Front-running governance**: Attacker frontruns governance proposal
- **Privilege escalation**: Low-privilege user gains high-privilege access
- **Centralization risk**: Single point of failure in access control
- **防范**: OpenZeppelin AccessControl, role-based access, timelock

### Integer Overflow/Underflow
- **Arithmetic overflow**: Value exceeds maximum, wraps to 0
- **Arithmetic underflow**: Value goes below 0, wraps to max
- **Solidity 0.8+**: Built-in overflow checks (revert on overflow)
- **Unchecked blocks**: `unchecked { }` disables overflow checks
- **Assembly**: No automatic overflow checks
- **防范**: Solidity 0.8+, SafeMath, checked arithmetic

### Precision Loss
- **Division before multiplication**: `(a / b) * c` loses precision vs `(a * c) / b`
- **Rounding direction**: Protocol rounding vs user rounding
- **Small amounts**: Dust amounts may be lost
- **Token decimals**: Different tokens have different decimals (18, 6, 8)
- **防范**: Multiply before divide, fixed-point math, libraries like ABDKMath

### Flash Loan Attacks
- **Oracle manipulation**: Manipulate price via flash loan
- **Governance attack**: Borrow tokens, vote, repay
- **Liquidity manipulation**: Add/remove liquidity to manipulate prices
- **防范**: TWAP oracles, time-weighted averages, flash loan resistance

### Oracle Manipulation
- **Spot price oracle**: Single-block price is manipulable
- **TWAP oracle**: Time-weighted average price resists manipulation
- **Multi-oracle**: Multiple price sources reduce manipulation risk
- **Chainlink**: Decentralized oracle network
- **防范**: TWAP, multi-oracle, Chainlink, circuit breakers

### MEV (Miner Extractable Value)
- **Sandwich attack**: Front-run + back-run for profit
- **Front-running**: See pending transaction, execute first
- **Back-running**: Execute after victim for profit
- **防范**: Commit-reveal, MEV-protect, private mempools

### Denial of Service
- **Block gas limit**: Function exceeds block gas limit
- **Unbounded loops**: Loops that grow without bound
- **External call DoS**: External call that reverts blocks function
- **Token transfer DoS**: Token transfer that fails blocks function
- **防范**: Pull over push, bounded loops, gas limits

### Griefing
- **Attacker loses, victim loses more**: Economic damage without profit
- **Front-running griefing**: Block legitimate transactions
- **Storage griefing**: Fill storage to increase costs
- **防范**: Economic incentives, deposit requirements

---

## Cross-chain Security

### Bridge Vulnerabilities
- **Double spending**: Same asset on two chains simultaneously
- **Oracle manipulation**: Manipulate cross-chain oracle
- **Relay manipulation**: Fake relay messages
- **Validator compromise**: Compromise bridge validators
- **Replay attacks**: Replay valid transaction on different chain
- **防范**: Nonce tracking, validator sets, fraud proofs

### L2-Specific
- **Sequencer MEV**: MEV on L2 sequencer
- **Force inclusion**: Force transactions via L1
- **Batch manipulation**: Manipulate transaction batching
- **State root manipulation**: Fake state roots
- **防范**: Decentralized sequencer, force inclusion, validity proofs

### Cross-L2 Communication
- **Message passing**: Messages between L2s
- **Asset bridging**: Assets moving between L2s
- **State verification**: Verifying state from other L2s
- **防范**: Light client verification, fraud proofs

---

## Upgradeability

### Proxy Patterns
- **Transparent Proxy**: Admin calls go to proxy, others to implementation
- **UUPS (Universal Upgradeable Proxy Standard)**: Upgrade logic in implementation
- **Beacon Proxy**: Multiple proxies share one beacon
- **Diamond Proxy**: Multiple implementations via facets
- **防范**: Storage layout verification, initialization checks

### Storage Collision
- **Proxy storage**: Proxy uses storage slots 0-1
- **Implementation storage**: Implementation uses slots 2+
- **Collision**: Same slot used by proxy and implementation
- **防范**: EIP-1967 storage slots, unstructured storage, storage gaps

### Initialization
- **Uninitialized proxy**: Proxy can be initialized by anyone
- **Double initialization**: Proxy can be initialized multiple times
- **Constructor vs initializer**: Constructors don't work on proxies
- **防范**: `initializer` modifier, `initializer` guard, constructor checks

### Implementation Risks
- **Self-destruct**: Implementation can be self-destructed
- **Delegatecall to arbitrary**: Implementation can delegatecall anywhere
- **Storage manipulation**: Implementation can corrupt proxy storage
- **防范**: Disable self-destruct, immutable admin, storage gaps

---

## Storage Layout

### Solidity Storage Rules
- **State variables**: Packed sequentially in storage slots
- **Structs**: Packed if possible, otherwise separate slots
- **Mappings**: `keccak256(key . slot)` location
- **Dynamic arrays**: Length at slot, elements at `keccak256(slot)`
- **Strings/bytes**: Short strings stored in slot, long strings at `keccak256(slot)`

### Storage Gaps
- **Purpose**: Reserve space for future state variables
- **Pattern**: `uint256[50] private __gap;`
- **Size**: Must be large enough for future upgrades
- **防范**: Always include gaps, verify gap size

### Variable Ordering
- **Least significant**: First variables in storage
- **Most significant**: Last variables in storage
- **Packing**: Variables packed into single slot if possible
- **防范**: Order variables by size, verify packing

---

## Proxy Patterns

### Transparent Proxy
- **Admin calls**: Routed to proxy implementation
- **User calls**: Routed to implementation
- **Upgrade**: Admin calls `upgradeTo()`
- **Storage**: Proxy storage separate from implementation

### UUPS
- **Upgrade logic**: In implementation contract
- **Admin**: Can be any address
- **Upgrade**: Implementation calls `upgradeTo()`
- **Storage**: Implementation storage in proxy

### Beacon Proxy
- **Beacon**: Contains implementation address
- **Multiple proxies**: Share one beacon
- **Upgrade**: Upgrade beacon, all proxies upgrade
- **Storage**: Each proxy has own storage

### Diamond Proxy
- **Facets**: Multiple implementation contracts
- **Selectors**: Function selectors mapped to facets
- **Storage**: Shared storage across facets
- **Cuts**: Add/remove facets dynamically

---

## Replay Protection

### Nonce Tracking
- **Purpose**: Prevent transaction replay
- **Pattern**: `nonce[sender]++` on every transaction
- **Cross-chain**: Nonce must be chain-specific
- **防范**: Unique nonces per chain, nonce tracking

### Chain ID
- **EIP-155**: Includes chain ID in signed transaction
- **Prevents**: Cross-chain replay
- **防范**: Include chain ID in signatures

### Signature Replay
- **Same signature**: Can be submitted multiple times
- **防范**: Nonce in signature, expiration, single-use

### Cross-chain Replay
- **Same transaction**: Valid on multiple chains
- **防范**: Chain ID in signatures, chain-specific nonces

---

## State Machine Analysis

### State Mapping
1. **Identify all state variables**
2. **Map all state transitions**
3. **Identify valid transitions**
4. **Identify invalid transitions**
5. **Test invalid transitions**

### State Transition Attacks
- **Invalid transition**: Force invalid state change
- **Missing transition**: Skip required state change
- **Replay transition**: Repeat valid transition
- **Out-of-order transition**: Execute transitions in wrong order

### Invariant Checking
- **State invariants**: Properties that must always hold
- **Transition invariants**: Properties that must hold after transitions
- **Temporal invariants**: Properties that depend on time

---

## Economic Attacks

### Flash Loan Attacks
1. **Oracle manipulation**: Manipulate price, exploit protocol
2. **Governance attack**: Borrow tokens, vote, repay
3. **Liquidity manipulation**: Add/remove liquidity to manipulate prices
4. **Collateralization ratio**: Manipulate ratio to borrow more

### Sandwich Attacks
1. **Front-run**: Buy before victim
2. **Victim transaction**: Executes at worse price
3. **Back-run**: Sell after victim
4. **Profit**: Price difference

### Governance Attacks
1. **Token accumulation**: Borrow/buy governance tokens
2. **Proposal creation**: Create malicious proposal
3. **Vote**: Vote with accumulated tokens
4. **Execution**: Execute proposal
5. **Exit**: Dump tokens

### Oracle Manipulation
1. **Spot price**: Manipulate single-block price
2. **TWAP manipulation**: Manipulate over time
3. **Multi-oracle manipulation**: Manipulate multiple oracles
4. **防范**: TWAP, multi-oracle, circuit breakers

---

## Mathematical Proofs

### Overflow/Underflow
- **uint256**: 0 to 2^256 - 1
- **int256**: -2^255 to 2^255 - 1
- **Solidity 0.8+**: Reverts on overflow
- **unchecked**: No overflow check

### Precision
- **Fixed-point**: 18 decimal places
- **ABDKMath**: 64.64 fixed-point library
- **PRBMath**: Fixed-point math library
- **防范**: Multiply before divide, fixed-point math

### Rounding
- **Round down**: Favors protocol
- **Round up**: Favors user
- **Round to nearest**: Neutral
- **防范**: Consistent rounding direction

### Edge Cases
- **Zero**: Division by zero, zero amounts
- **Max**: Maximum values, overflow
- **Min**: Minimum values, underflow
- **One**: Common edge case

---

## Cryptographic Assumptions

### Hash Functions
- **keccak256**: Ethereum standard
- **SHA-256**: Bitcoin standard
- **Pre-image resistance**: Cannot find input from hash
- **Collision resistance**: Cannot find two inputs with same hash

### Signatures
- **ECDSA**: Elliptic Curve Digital Signature Algorithm
- **EIP-712**: Typed structured data hashing
- **Schnorr**: Alternative signature scheme
- **防范**: Signature malleability, replay protection

### Randomness
- **blockhash**: predictable (miners know)
- **block.timestamp**: predictable (miners influence)
- **Chainlink VRF**: Verifiable random function
- **防范**: Use VRF for randomness

---

## Formal Verification

### Properties
- **Safety**: Nothing bad happens
- **Liveness**: Something good eventually happens
- **Authorization**: Only authorized users can act
- **Integrity**: State transitions are valid
- **Conservation**: Invariants maintained

### Tools
- **Certora**: Formal verification platform
- **Halmos**: Symbolic testing for Solidity
- **HEVM**: Haskell EVM for testing
- **SMT solvers**: Z3, CVC5

### Proof Techniques
- **Induction**: Base case + inductive step
- **Contradiction**: Assume true, find contradiction
- **Exhaustive search**: Check all states
- **Model checking**: Verify all paths

---

## Attack Surface Enumeration

### Function Analysis
1. **External functions**: Can be called by anyone
2. **Public functions**: Can be called by anyone
3. **Internal functions**: Only callable by contract
4. **Private functions**: Only callable within contract
5. **View functions**: Read-only, but may have side effects via reentrancy

### State Analysis
1. **Mutable state**: Can be changed
2. **Immutable state**: Cannot be changed after deployment
3. **Constant state**: Compile-time constant
4. **Transient state**: EIP-1153, cleared after transaction

### Access Control Analysis
1. **No access control**: Anyone can call
2. **Owner only**: Only owner can call
3. **Role-based**: Specific roles can call
4. **Time-based**: Only during specific time
5. **Amount-based**: Only with minimum amount

---

## Proof of Concept Engineering

### PoC Structure
1. **Setup**: Deploy contracts, set initial state
2. **Action**: Execute attack
3. **Verification**: Check state after attack
4. **Cleanup**: Optional, for readability

### Foundry Testing
```solidity
function test_exploit() public {
    // Setup
    // Action
    // Verification
}
```

### Hardhat Testing
```javascript
it("should exploit", async () => {
    // Setup
    // Action
    // Verification
});
```

### PoC Quality
- **Working**: Actually executes successfully
- **Minimal**: Minimal code to demonstrate vulnerability
- **Clear**: Easy to understand
- **Complete**: Shows full attack chain
- **Reproducible**: Anyone can run it

---

## Report Writing

### Structure
1. **Title**: Clear, descriptive
2. **Summary**: One paragraph overview
3. **Root Cause**: Technical explanation
4. **Impact**: Dollar amount, not vague
5. **PoC**: Working code
6. **Recommendation**: Fix suggestion

### Severity Assessment
- **Critical**: Direct loss of funds, no limitations
- **High**: Direct loss with limitations, indirect loss > $1M
- **Medium**: Temporary freezing, griefing
- **Low**: Unwanted behavior, minor impact

### Common Mistakes
- **Vague impact**: "loss of funds" without dollar amount
- **Theoretical**: Cannot be exploited in practice
- **Missing PoC**: Described but not demonstrated
- **Wrong severity**: Doesn't match Immunefi matrix
- **Out of scope**: Not covered by bug bounty

---

## Immunefi Review Simulation

### Reviewer Checklist
1. **Is the vulnerability real?** Not theoretical
2. **Is the impact accurate?** Dollar amount
3. **Is the PoC working?** Actually executes
4. **Is the severity correct?** Matches matrix
5. **Is the report clear?** No ambiguity
6. **Is this in scope?** Matches bug bounty

### Rejection Criteria
1. **Theoretical**: Cannot be exploited in practice
2. **Missing PoC**: Described but not demonstrated
3. **Wrong severity**: Doesn't match matrix
4. **Out of scope**: Not covered by bug bounty
5. **Known issue**: Already documented
6. **Acceptable risk**: Protocol accepts this risk
7. **Mitigated**: Existing code prevents exploitation
8. **Economically irrational**: Attack costs more than profit

### Acceptance Criteria
1. **Real vulnerability**: Can be exploited
2. **Accurate impact**: Dollar amount provided
3. **Working PoC**: Actually executes
4. **Correct severity**: Matches matrix
5. **In scope**: Covered by bug bounty
6. **Clear report**: No ambiguity
7. **Novel**: Not previously reported
8. **Actionable**: Fix is possible

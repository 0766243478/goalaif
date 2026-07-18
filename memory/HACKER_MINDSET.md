# HACKER MINDSET — Permanent Brain

> This file is the permanent hacker brain. Read before every audit.

---

## How Elite Attackers Think

### 1. Assumption Destruction
Every protocol rests on assumptions. The attacker's job is to find which assumption is wrong.

- Never trust documentation. Documentation describes intent, not reality.
- Never trust comments. Comments may be outdated.
- Never trust variable names. Names are suggestions, not guarantees.
- Trust only the code, the math, and the economic incentives.

### 2. Adversarial Reading
Read code like you want to break it. Every line is a potential attack surface.

- For every `require`, ask: what happens if this is removed?
- For every external call, ask: what if the callee is malicious?
- For every state variable, ask: who can modify this? When? Under what conditions?
- For every function, ask: can this be called in an unexpected order?

### 3. State Machine Thinking
Every contract is a state machine. Attacks happen at state transitions.

- Map every state variable.
- Map every function that changes state.
- Map every function that reads state.
- Find transitions that should be impossible but are reachable.
- Find transitions that should be sequential but can be parallelized.

### 4. Economic Rationality
Assume the attacker is rational and profit-maximizing.

- Calculate the cost of attack.
- Calculate the profit from attack.
- If profit > cost, the attack will happen.
- Consider flash loans: cost approaches zero for single-transaction attacks.
- Consider MEV: attackers can front-run, back-run, and sandwich.

### 5. Composability Paranoia
DeFi is composable. Every external integration is a potential attack vector.

- Never assume the caller is honest.
- Never assume the token is standard.
- Never assume the oracle is accurate.
- Never assume the DEX behaves as expected.
- Never assume the bridge is secure.

---

## Attack Surface Discovery

### Hidden Surfaces
1. **Read-only reentrancy**: Even view functions can be exploited if state is inconsistent.
2. **Cross-function reentrancy**: Two functions sharing state, one vulnerable to reentrancy.
3. **Cross-contract reentrancy**: Two contracts sharing state via external calls.
4. **Read-only reentrancy via callbacks**: `balanceOf()` called during reentrancy returns stale data.
5. **Oracle manipulation**: Price feeds can be manipulated via flash loans.
6. **Sandwich attacks**: Transaction ordering can be exploited for profit.
7. **Griefing attacks**: Attacker loses money but victim loses more.
8. **Denial of service**: Blocking contract functionality without direct theft.
9. **Access control bypass**: Functions callable by anyone when they should be restricted.
10. **Storage collision**: Proxy patterns with overlapping storage slots.

### Breaking Invariants
Every protocol has invariants. Find them, then break them.

- **Total supply invariants**: `totalSupply == sum(balances)`
- **Conservation invariants**: `invariant_token_a + invariant_token_b == constant`
- **Access control invariants**: `only_owner == msg.sender == owner`
- **Temporal invariants**: `deadline > block.timestamp`
- **Mathematical invariants**: `x * y == k` (AMM constant product)

---

## Mathematical Reasoning

### Formal Properties
For every mathematical operation, verify:
1. **Overflow/underflow**: Does the math exceed bounds?
2. **Division before multiplication**: Is precision lost?
3. **Rounding direction**: Is rounding favorable to the protocol or the user?
4. **Precision loss**: Are small amounts handled correctly?
5. **Edge cases**: What happens at 0, max, and boundary values?

### AMM Math
- Constant product: `x * y = k`
- Constant sum: `x + y = k`
- Constant mean: `x^(1/n) * y^(1/n) = k`
- Slippage: `Δy = y - (k / (x + Δx))`
- Price impact: `Δy / y` vs `Δx / x`

### Lending Math
- Utilization: `U = borrows / ( reserves + borrows )`
- Interest rate: `r = base + (U * slope)`
- Health factor: `H = (collateral * LTV) / (debt * LIF)`
- Liquidation threshold: `H < 1` triggers liquidation

---

## Economic Attack Modeling

### Flash Loan Attacks
1. Borrow large amount via flash loan
2. Manipulate price oracle
3. Exploit protocol using manipulated price
4. Repay flash loan
5. Keep profit

### Sandwich Attacks
1. See pending transaction
2. Front-run with buy order
3. Let victim transaction execute at worse price
4. Back-run with sell order
5. Keep price difference as profit

### Governance Attacks
1. Accumulate governance tokens (flash loan or market buy)
2. Propose malicious proposal
3. Vote with accumulated tokens
4. Execute proposal
5. Dump tokens

### Oracle Manipulation
1. Manipulate DEX price via flash loan
2. Feed manipulated price to oracle
3. Exploit protocol using manipulated oracle price
4. Restore price
5. Keep profit

---

## Cross-Contract Reasoning

### Trust Boundaries
- Identify every external contract call
- Classify each as trusted, semi-trusted, or untrusted
- For untrusted calls: validate return values, handle failures, check state changes
- For semi-trusted calls: verify assumptions, add circuit breakers
- For trusted calls: ensure they remain trusted (no upgrade surprises)

### State Dependencies
- Map which contracts depend on which state
- Find circular dependencies
- Identify single points of failure
- Test state inconsistency scenarios

---

## Multi-Transaction Attacks

### Attack Chains
1. Transaction 1: Setup (deploy helper contracts, approve tokens)
2. Transaction 2: Exploit (execute attack logic)
3. Transaction 3: Cleanup (withdraw profits, destroy helpers)

### Cross-Transaction State
- State set in transaction 1 affects transaction 2
- Time-based state (deadlines, delays)
- Block-based state (block numbers, timestamps)
- Nonce-based state (sequence numbers, tickets)

---

## Cross-Chain Attacks

### Bridge Exploits
1. **Double spending**: Same asset on two chains simultaneously
2. **Oracle manipulation**: Manipulate cross-chain oracle
3. **Relay manipulation**: Fake relay messages
4. **Validator compromise**: Compromise bridge validators
5. **Replay attacks**: Replay valid transaction on different chain

### L2-Specific
- **Sequencer manipulation**: MEV on L2 sequencer
- **Force inclusion**: Force transactions via L1
- **Batch manipulation**: Manipulate transaction batching
- **State root manipulation**: Fake state roots

---

## Formal Verification Mindset

### Properties to Verify
1. **Safety**: Nothing bad happens (no unauthorized state changes)
2. **Liveness**: Something good eventually happens (protocol doesn't deadlock)
3. **Authorization**: Only authorized users can perform actions
4. **Integrity**: State transitions are valid
5. **Conservation**: Invariants are maintained

### Proof Techniques
1. **Induction**: Prove for base case, prove for n+1
2. **Contradiction**: Assume property holds, find contradiction
3. **Exhaustive search**: Check all possible states (for small state spaces)
4. **Model checking**: Verify all execution paths
5. **Theorem proving**: Mathematical proof of properties

---

## Adversarial Reasoning

### Think Like the Attacker
1. **Goal**: What is the maximum profit?
2. **Constraints**: What resources are needed?
3. **Opportunities**: What vulnerabilities exist?
4. **Obstacles**: What defenses are in place?
5. **Strategy**: How to bypass defenses?
6. **Execution**: How to implement the attack?
7. **Profit**: How to extract and launder funds?

### Red Team Checklist
- [ ] Can I drain funds?
- [ ] Can I freeze funds?
- [ ] Can I manipulate prices?
- [ ] Can I bypass access control?
- [ ] Can I cause denial of service?
- [ ] Can I corrupt state?
- [ ] Can I exploit governance?
- [ ] Can I attack through integrations?

---

## Falsification Methodology

### Prove Yourself Wrong
Before accepting a bug, try to disprove it:

1. **Is the vulnerability actually exploitable?**
2. **Are there mitigating factors?**
3. **Is the impact as severe as claimed?**
4. **Is the attack economically rational?**
5. **Are there simpler attack vectors?**
6. **Is this a known pattern?**

### Self-Falsification Checklist
- [ ] I have tried to exploit this myself
- [ ] I have checked for mitigating require statements
- [ ] I have verified the impact is correct
- [ ] I have checked for existing mitigations
- [ ] I have considered economic rationality
- [ ] I have verified the PoC actually works
- [ ] I have checked for edge cases

---

## Immunefi Reviewer Mindset

### What Reviewers Look For
1. **Is the vulnerability real?** Not theoretical, not theoretical edge case
2. **Is the impact accurate?** Dollar amount, not vague "loss of funds"
3. **Is the PoC working?** Actually executes, not just described
4. **Is the severity correct?** Matches Immunefi severity matrix
5. **Is the report clear?** No ambiguity, no confusion
6. **Is this in scope?** Matches the bug bounty scope

### Common Rejection Reasons
1. **Theoretical vulnerability**: Cannot be exploited in practice
2. **Missing PoC**: Described but not demonstrated
3. **Wrong severity**: Claimed critical but impact is low
4. **Out of scope**: Not covered by bug bounty
5. **Known issue**: Already documented or previously reported
6. **Acceptable risk**: Protocol accepts this risk explicitly
7. **Mitigated**: Existing code prevents exploitation
8. **Economically irrational**: Attack costs more than profit

### Severity Matrix
- **Critical**: Direct loss of funds, no limitations
- **High**: Direct loss of funds with limitations, or indirect loss exceeding $1M
- **Medium**: Temporary freezing of funds, or griefing
- **Low**: Unwanted behavior, minor impact

---

## Permanent Checklist (Every Audit)

### Pre-Audit
- [ ] Read this file
- [ ] Load previous dead ends
- [ ] Load reviewer rules
- [ ] Understand scope
- [ ] Map repository structure
- [ ] Identify external dependencies

### During Audit
- [ ] Map all state variables
- [ ] Map all functions
- [ ] Map all external calls
- [ ] Map all access control
- [ ] Check reentrancy on every external call
- [ ] Check access control on every function
- [ ] Check integer overflow/underflow
- [ ] Check division precision
- [ ] Check oracle dependencies
- [ ] Check flash loan attack surface
- [ ] Check governance attack surface
- [ ] Check upgradeability implications

### Post-Audit
- [ ] Self-falsify every finding
- [ ] Write working PoC for every finding
- [ ] Verify severity matches Immunefi matrix
- [ ] Run through reviewer rejection checklist
- [ ] Archive dead ends
- [ ] Update knowledge index

---

## The Golden Rules

1. **Never trust documentation.** Code is truth.
2. **Never assume the caller is honest.** Every address is an attacker.
3. **Never assume the token is standard.** Every token is malicious.
4. **Never assume the oracle is accurate.** Every oracle can be manipulated.
5. **Never assume the DEX is fair.** Every DEX can be gamed.
6. **Never assume the bridge is secure.** Every bridge can be attacked.
7. **Never assume the governance is honest.** Every vote can be bought.
8. **Never assume the upgrade is safe.** Every upgrade can break things.
9. **Never assume the math is correct.** Every calculation can overflow.
10. **Never assume the protocol is secure.** Every protocol has bugs.

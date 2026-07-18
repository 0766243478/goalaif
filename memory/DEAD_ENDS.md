# DEAD ENDS — Rejected Attack Paths

> Future audits must NEVER repeat these unless new code changes invalidate the conclusion.

---

## Dead End 1: Simple Reentrancy on Standard Token Transfers

**Attack Idea**: Exploit reentrancy on `transfer()` calls to drain funds.

**Why It Looked Promising**: Classic reentrancy pattern, well-documented attack vector.

**Why It Failed**: OpenZeppelin's ERC20 `transfer()` does not have hooks like ERC777. Standard ERC20 tokens do not enable reentrancy.

**Exact Defense**: Standard ERC20 tokens have no callback mechanism. Only ERC777 tokens have `tokensReceived` hook.

**Lesson Learned**: Not all token transfers enable reentrancy. Must verify token standard before claiming reentrancy.

---

## Dead End 2: Flash Loan Price Manipulation on TWAP Oracle

**Attack Idea**: Use flash loan to manipulate price, exploit protocol using manipulated price.

**Why It Looked Promising**: Flash loan attacks are common, price manipulation is a known vector.

**Why It Failed**: Protocol uses TWAP (Time-Weighted Average Price) oracle with 30-minute window. Single-block manipulation has negligible effect on TWAP.

**Exact Defense**: TWAP oracle averages price over 30 minutes. Single-block manipulation is diluted across the averaging window.

**Lesson Learned**: TWAP oracles resist single-block manipulation. Must check oracle type before claiming manipulation is possible.

---

## Dead End 3: Governance Token Accumulation via Flash Loan

**Attack Idea**: Borrow governance tokens via flash loan, vote on proposal, repay.

**Why It Looked Promising**: Governance attacks are documented, flash loans provide capital.

**Why It Failed**: Governance uses time-locked voting. Tokens must be held for 7 days before voting power activates.

**Exact Defense**: Time-locked voting power. Tokens held for < 7 days have zero voting power.

**Lesson Learned**: Time locks prevent flash loan governance attacks. Must check voting power activation time.

---

## Dead End 4: Storage Collision in Proxy Upgrade

**Attack Idea**: Exploit storage collision between proxy and implementation to corrupt state.

**Why It Looked Promising**: Proxy patterns are complex, storage layout is critical.

**Why It Failed**: Protocol uses EIP-1967 storage slots for proxy state. Implementation storage starts at slot 2. No collision possible.

**Exact Defense**: EIP-1967 defines specific storage slots for proxy admin (slot 0x360894...) and implementation (slot 0x360894...). Implementation storage uses separate slots.

**Lesson Learned**: EIP-1967 prevents storage collision. Must verify storage layout before claiming collision.

---

## Dead End 5: Integer Overflow in SafeMath

**Attack Idea**: Exploit integer overflow in arithmetic operations.

**Why It Looked Promising**: Overflow is a classic vulnerability.

**Why It Failed**: Contract uses SafeMath library for all arithmetic. Solidity 0.8+ also has built-in overflow checks.

**Exact Defense**: SafeMath library provides overflow/underflow protection. Solidity 0.8+ compiler adds additional checks.

**Lesson Learned**: SafeMath and Solidity 0.8+ prevent overflow. Must check compiler version and libraries.

---

## Dead End 6: Oracle Manipulation via DEX Price

**Attack Idea**: Manipulate DEX price to influence oracle.

**Why It Looked Promising**: DEX prices are manipulable via flash loans.

**Why It Failed**: Oracle uses multiple price sources (Chainlink, Uniswap TWAP, SushiSwap TWAP). Single source manipulation has limited effect.

**Exact Defense**: Multi-oracle design. Each oracle provides price, protocol uses median. Single source manipulation affects only one vote.

**Lesson Learned**: Multi-oracle design resists manipulation. Must check number of oracle sources.

---

## Dead End 7: Front-running Governance Proposal

**Attack Idea**: Frontrun governance proposal to execute before legitimate voters.

**Why It Looked Promising**: Frontrunning is common in DeFi.

**Why It Failed**: Governance uses commit-reveal scheme. Votes are hidden until reveal phase. Frontrunning is impossible without knowing the vote.

**Exact Defense**: Commit-reveal scheme hides votes until reveal phase. Frontrunning requires knowing the vote content.

**Lesson Learned**: Commit-reveal prevents frontrunning. Must check voting mechanism.

---

## Dead End 8: Denial of Service via Unbounded Loop

**Attack Idea**: Trigger unbounded loop to exceed block gas limit.

**Why It Looked Promising**: Unbounded loops are a known DoS vector.

**Why It Failed**: All loops have bounded iterations. Maximum iterations are capped by design.

**Exact Defense**: Bounded loops with maximum iteration count. Functions revert if limit exceeded.

**Lesson Learned**: Bounded loops prevent DoS. Must check loop bounds.

---

## Dead End 9: Cross-Contract Reentrancy via Callback

**Attack Idea**: Exploit reentrancy across contracts via callback.

**Why It Looked Promising**: Cross-contract reentrancy is documented.

**Why It Failed**: Contracts do not share state that is modified during external calls. No callback mechanism exists between contracts.

**Exact Defense**: No shared mutable state between contracts during external calls. No callback mechanism.

**Lesson Learned**: Cross-contract reentrancy requires shared mutable state. Must check state dependencies.

---

## Dead End 10: Signature Malleability

**Attack Idea**: Exploit signature malleability to replay signatures.

**Why It Looked Promising**: ECDSA signatures are malleable.

**Why It Failed**: Protocol uses EIP-712 with nonce tracking. Each signature can only be used once.

**Exact Defense**: EIP-712 includes nonce in signed data. Replay requires same nonce, which is consumed after use.

**Lesson Learned**: Nonce tracking prevents signature replay. Must check replay protection.

---

## Dead End 11: Token Approval Front-running

**Attack Idea**: Frontrun token approval to steal tokens.

**Why It Looked Promising**: Approvals are public transactions.

**Why It Failed**: Protocol uses permit (EIP-2612) with expiration. Approvals expire after 1 hour.

**Exact Defense**: Permit with 1-hour expiration. Stale approvals are invalid.

**Lesson Learned**: Expiration prevents stale approval exploitation. Must check approval mechanics.

---

## Dead End 12: Decimal Precision Attack

**Attack Idea**: Exploit decimal precision differences between tokens.

**Why It Looked Promising**: Different tokens have different decimals (18, 6, 8).

**Why It Failed**: Protocol normalizes all amounts to 18 decimals internally.

**Exact Defense**: Internal normalization to 18 decimals. All calculations use normalized amounts.

**Lesson Learned**: Normalization prevents decimal precision attacks. Must check decimal handling.

---

## Dead End 13: MEV Sandwich on Small Trades

**Attack Idea**: Sandwich small trades for profit.

**Why It Looked Promising**: Small trades have high price impact.

**Why It Failed**: Protocol uses MEV-protect (private mempool). Transactions are not visible to sandwich attackers.

**Exact Defense**: MEV-protect routes transactions through private mempool. Sandwich attackers cannot see pending transactions.

**Lesson Learned**: MEV-protect prevents sandwich attacks. Must check transaction routing.

---

## Dead End 14: Governance Proposal Spam

**Attack Idea**: Spam governance with proposals to overwhelm voters.

**Why It Looked Promising**: Proposals require voter attention.

**Why It Failed**: Governance requires minimum token threshold to submit proposals. Spam is economically costly.

**Exact Defense**: Minimum token threshold for proposal submission. Spam costs tokens.

**Lesson Learned**: Token threshold prevents proposal spam. Must check proposal requirements.

---

## Dead End 15: Time Manipulation via Block Timestamp

**Attack Idea**: Manipulate block.timestamp to bypass time locks.

**Why It Looked Promising**: Miners can influence block.timestamp.

**Why It Failed**: Time locks use block.number, not block.timestamp. Block number cannot be manipulated.

**Exact Defense**: Block number-based time locks. Miners cannot manipulate block number.

**Lesson Learned**: Block number is more secure than timestamp. Must check time lock mechanism.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Reentrancy dead ends | 3 |
| Oracle dead ends | 2 |
| Governance dead ends | 3 |
| Proxy dead ends | 1 |
| Arithmetic dead ends | 2 |
| Access control dead ends | 1 |
| MEV dead ends | 1 |
| Time manipulation dead ends | 1 |
| **Total** | **15** |

---

## Meta-Lessons

1. **Always check token standard** before claiming reentrancy.
2. **Always check oracle type** before claiming manipulation.
3. **Always check voting mechanism** before claiming governance attack.
4. **Always check storage layout** before claiming collision.
5. **Always check compiler version** before claiming overflow.
6. **Always check loop bounds** before claiming DoS.
7. **Always check replay protection** before claiming replay.
8. **Always check decimal handling** before claiming precision attack.
9. **Always check transaction routing** before claiming MEV.
10. **Always check time lock mechanism** before claiming time manipulation.

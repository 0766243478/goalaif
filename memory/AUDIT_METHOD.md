# AUDIT METHOD — Systematic Audit Process

> Repeatable process for every audit. No shortcuts.

---

## Phase 0: Pre-Audit Setup (30 minutes)

### 1. Understand the Protocol
- Read all documentation (whitepaper, docs, README)
- Identify core contracts and their relationships
- Map external dependencies (OpenZeppelin, other protocols)
- Understand the economic model (token flows, incentives)
- Identify entry points (user-facing functions)

### 2. Scope Definition
- List all contracts in scope
- List all contracts out of scope
- Identify contract versions (Solidity version)
- Check for proxy patterns (upgradeable?)
- Check for cross-chain components

### 3. Tool Setup
- Install dependencies (`npm install`, `forge install`)
- Compile contracts (`forge build`)
- Run existing tests (`forge test`)
- Set up slither (`slither .`)
- Set up mythril (`myth analyze`)

---

## Phase 1: Automated Analysis (1 hour)

### 1. Static Analysis
Run slither with all detectors:
```bash
slither . --detect all
```
Focus on:
- High confidence findings
- Medium confidence findings with clear impact
- Low confidence findings that match known patterns

### 2. Symbolic Execution
Run mythril on main contracts:
```bash
myth analyze contract.sol --execution-timeout 90
```
Focus on:
- Reentrancy
- Integer overflow/underflow
- Transaction-ordering dependence

### 3. Manual Review of Results
- Remove false positives
- Prioritize by impact
- Document remaining findings

---

## Phase 2: Manual Code Review (4-8 hours)

### 1. Function-Level Review
For each external/public function:
1. **Access control**: Who can call this?
2. **Input validation**: Are inputs validated?
3. **State changes**: What state is modified?
4. **External calls**: Are there external calls?
5. **Return values**: Are return values checked?

### 2. State Machine Analysis
1. **Map all states**: What are the possible states?
2. **Map transitions**: How do states change?
3. **Identify invalid transitions**: Can invalid transitions occur?
4. **Test transitions**: Can states be skipped or replayed?

### 3. Access Control Review
1. **Identify roles**: What roles exist?
2. **Map permissions**: What can each role do?
3. **Check modifiers**: Are modifiers correct?
4. **Test escalation**: Can roles be escalated?

### 4. External Call Review
1. **Identify calls**: Where are external calls made?
2. **Check patterns**: Are CEI patterns followed?
3. **Check reentrancy**: Is ReentrancyGuard used?
4. **Check return values**: Are return values checked?

### 5. Arithmetic Review
1. **Identify operations**: Where is arithmetic done?
2. **Check overflow**: Can overflow occur?
3. **Check underflow**: Can underflow occur?
4. **Check precision**: Is precision lost?

### 6. Token Flow Analysis
1. **Map token flows**: Where do tokens go?
2. **Check balances**: Are balances updated correctly?
3. **Check allowances**: Are allowances checked?
4. **Check decimals**: Are decimals handled?

---

## Phase 3: Attack Modeling (2-4 hours)

### 1. Entry Point Analysis
For each entry point:
1. **Who can call?** (access control)
2. **What parameters?** (input validation)
3. **What state changes?** (state mutation)
4. **What external calls?** (call effects)
5. **What can go wrong?** (failure modes)

### 2. Attack Tree Construction
For each potential vulnerability:
1. **Attack goal**: What does attacker want?
2. **Prerequisites**: What must be true?
3. **Attack steps**: What steps are needed?
4. **Defenses**: What prevents this?
5. **Bypasses**: Can defenses be bypassed?

### 3. Economic Attack Modeling
For each economic function:
1. **Incentive alignment**: Do incentives align?
2. **Flash loan resistance**: Is the function flash-loan resistant?
3. **MEV resistance**: Is the function MEV resistant?
4. **Oracle dependency**: Does it depend on oracles?
5. **Price impact**: What is the price impact?

### 4. Cross-Chain Analysis
For each cross-chain component:
1. **Message passing**: How are messages passed?
2. **Validation**: How are messages validated?
3. **Replay protection**: Is replay protected?
4. **Bridge security**: Is the bridge secure?

---

## Phase 4: Proof of Concept Development (2-4 hours)

### 1. PoC Setup
1. **Deploy contracts**: Set up test environment
2. **Configure state**: Set initial state
3. **Prepare accounts**: Set up attacker/victim accounts
4. **Prepare tokens**: Set up token balances

### 2. PoC Execution
1. **Execute attack**: Run the attack
2. **Verify impact**: Check state after attack
3. **Measure impact**: Calculate dollar amount
4. **Document steps**: Record all steps

### 3. PoC Refinement
1. **Minimize code**: Remove unnecessary code
2. **Add comments**: Explain each step
3. **Test edge cases**: Test different scenarios
4. **Verify reproducibility**: Can others run it?

---

## Phase 5: Report Writing (2-4 hours)

### 1. Title
- Clear and descriptive
- Include vulnerability type
- Include affected contract

### 2. Summary
- One paragraph overview
- Include impact and severity

### 3. Root Cause
- Technical explanation
- Include code references
- Explain why it's vulnerable

### 4. Impact
- Dollar amount (not vague)
- Include calculation
- Include worst case

### 5. Proof of Concept
- Working code
- Clear comments
- Step-by-step explanation

### 6. Recommendation
- Fix suggestion
- Include code example
- Include best practices

---

## Phase 6: Quality Assurance (1 hour)

### 1. Report Review
- Check for typos
- Check for clarity
- Check for completeness
- Check for accuracy

### 2. PoC Verification
- Run PoC again
- Verify impact
- Verify reproducibility

### 3. Severity Verification
- Check against Immunefi matrix
- Verify impact matches severity
- Check scope

### 4. Final Check
- All findings documented
- All PoCs working
- All recommendations clear
- All references included

---

## Checklist

### Pre-Audit
- [ ] All documentation read
- [ ] All contracts identified
- [ ] All dependencies mapped
- [ ] All tools installed
- [ ] All contracts compiled
- [ ] All tests passing

### Automated Analysis
- [ ] Slither run with all detectors
- [ ] Mythril run on main contracts
- [ ] False positives removed
- [ ] Findings prioritized

### Manual Review
- [ ] All functions reviewed
- [ ] All state machines mapped
- [ ] All access control checked
- [ ] All external calls reviewed
- [ ] All arithmetic checked
- [ ] All token flows analyzed

### Attack Modeling
- [ ] All entry points analyzed
- [ ] All attack trees constructed
- [ ] All economic attacks modeled
- [ ] All cross-chain components analyzed

### PoC Development
- [ ] All PoCs working
- [ ] All PoCs minimal
- [ ] All PoCs documented
- [ ] All PoCs reproducible

### Report Writing
- [ ] All findings documented
- [ ] All impacts calculated
- [ ] All recommendations clear
- [ ] All references included

### Quality Assurance
- [ ] Report reviewed
- [ ] PoCs verified
- [ ] Severity verified
- [ ] Final check passed

---

## Time Allocation

| Phase | Time | Percentage |
|-------|------|------------|
| Phase 0: Pre-Audit | 30 min | 6% |
| Phase 1: Automated Analysis | 1 hour | 12% |
| Phase 2: Manual Code Review | 4-8 hours | 50% |
| Phase 3: Attack Modeling | 2-4 hours | 25% |
| Phase 4: PoC Development | 2-4 hours | 25% |
| Phase 5: Report Writing | 2-4 hours | 25% |
| Phase 6: Quality Assurance | 1 hour | 12% |
| **Total** | **12-22 hours** | **100%** |

---

## Quality Metrics

### Vulnerability Detection
- **True positive rate**: > 90%
- **False positive rate**: < 10%
- **Coverage**: > 95% of attack surface

### Report Quality
- **Clarity score**: > 8/10
- **Completeness score**: > 9/10
- **Accuracy score**: > 95%

### PoC Quality
- **Working rate**: 100%
- **Minimal rate**: > 90%
- **Reproducible rate**: 100%

---

## Continuous Improvement

### After Each Audit
1. **What went well?** (keep doing)
2. **What went poorly?** (improve)
3. **What was missed?** (learn)
4. **What was wasted?** (eliminate)

### Update Process
1. **Update checklist** based on learnings
2. **Update time allocation** based on experience
3. **Update quality metrics** based on standards
4. **Update tools** based on effectiveness

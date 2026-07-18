# KNOWLEDGE INDEX — Cross-Reference System

> Find related files instantly. No search needed.

---

## By Vulnerability Type

### Reentrancy
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Reentrancy"
- `memory/SKILLS.md` → "Reentrancy" section
- `memory/DEAD_ENDS.md` → Dead End 1, 9
- `memory/AUDIT_METHOD.md` → Phase 2: External Call Review

### Access Control
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Access Control"
- `memory/SKILLS.md` → "Access Control" section
- `memory/DEAD_ENDS.md` → Dead End 8
- `memory/AUDIT_METHOD.md` → Phase 2: Access Control Review

### Integer Overflow/Underflow
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Integer Overflow"
- `memory/SKILLS.md` → "Integer Overflow/Underflow" section
- `memory/DEAD_ENDS.md` → Dead End 5
- `memory/AUDIT_METHOD.md` → Phase 2: Arithmetic Review

### Precision Loss
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Precision Loss"
- `memory/SKILLS.md` → "Precision Loss" section
- `memory/DEAD_ENDS.md` → Dead End 12
- `memory/AUDIT_METHOD.md` → Phase 2: Arithmetic Review

### Flash Loan Attacks
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Flash Loan"
- `memory/SKILLS.md` → "Flash Loan Attacks" section
- `memory/DEAD_ENDS.md` → Dead End 2, 3
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

### Oracle Manipulation
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Oracle Manipulation"
- `memory/SKILLS.md` → "Oracle Manipulation" section
- `memory/DEAD_ENDS.md` → Dead End 6
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

### MEV (Miner Extractable Value)
- `memory/HACKER_MINDSET.md` → "Attack Pattern: MEV"
- `memory/SKILLS.md` → "MEV (Miner Extractable Value)" section
- `memory/DEAD_ENDS.md` → Dead End 13
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

### Denial of Service
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Denial of Service"
- `memory/SKILLS.md` → "Denial of Service" section
- `memory/DEAD_ENDS.md` → Dead End 8
- `memory/AUDIT_METHOD.md` → Phase 2: State Machine Analysis

### Griefing
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Griefing"
- `memory/SKILLS.md` → "Griefing" section
- `memory/DEAD_ENDS.md` → (none)
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

---

## By Protocol Component

### Token System
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Token Manipulation"
- `memory/SKILLS.md` → "Token Flow Analysis" section
- `memory/AUDIT_METHOD.md` → Phase 2: Token Flow Analysis
- `memory/DEAD_ENDS.md` → Dead End 1, 11, 12

### Governance
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Governance Attack"
- `memory/SKILLS.md` → "Governance Attacks" section
- `memory/DEAD_ENDS.md` → Dead End 3, 7, 14
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

### Oracle
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Oracle Manipulation"
- `memory/SKILLS.md` → "Oracle Manipulation" section
- `memory/DEAD_ENDS.md` → Dead End 2, 6
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

### Proxy/Upgradeable
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Proxy Vulnerability"
- `memory/SKILLS.md` → "Upgradeability" section
- `memory/DEAD_ENDS.md` → Dead End 4
- `memory/AUDIT_METHOD.md` → Phase 2: State Machine Analysis

### Bridge/Cross-chain
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Bridge Vulnerability"
- `memory/SKILLS.md` → "Cross-chain Security" section
- `memory/DEAD_ENDS.md` → (none)
- `memory/AUDIT_METHOD.md` → Phase 3: Cross-Chain Analysis

### DEX/AMM
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Flash Loan"
- `memory/SKILLS.md` → "Flash Loan Attacks" section
- `memory/DEAD_ENDS.md` → Dead End 2, 6
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

### Lending/Borrowing
- `memory/HACKER_MINDSET.md` → "Attack Pattern: Oracle Manipulation"
- `memory/SKILLS.md` → "Oracle Manipulation" section
- `memory/DEAD_ENDS.md` → Dead End 2, 6
- `memory/AUDIT_METHOD.md` → Phase 3: Economic Attack Modeling

---

## By Audit Phase

### Pre-Audit (Phase 0)
- `memory/AUDIT_METHOD.md` → Phase 0: Pre-Audit Setup
- `memory/HACKER_MINDSET.md` → "Mindset: Question Everything"
- `memory/SKILLS.md` → "Attack Surface Enumeration" section

### Automated Analysis (Phase 1)
- `memory/AUDIT_METHOD.md` → Phase 1: Automated Analysis
- `memory/SKILLS.md` → "Formal Verification" section

### Manual Review (Phase 2)
- `memory/AUDIT_METHOD.md` → Phase 2: Manual Code Review
- `memory/SKILLS.md` → "State Machine Analysis" section
- `memory/DEAD_ENDS.md` → All dead ends

### Attack Modeling (Phase 3)
- `memory/AUDIT_METHOD.md` → Phase 3: Attack Modeling
- `memory/SKILLS.md` → "Economic Attacks" section
- `memory/DEAD_ENDS.md` → All dead ends

### PoC Development (Phase 4)
- `memory/AUDIT_METHOD.md` → Phase 4: PoC Development
- `memory/SKILLS.md` → "Proof of Concept Engineering" section
- `memory/HACKER_MINDSET.md` → "Mindset: Think Like an Attacker"

### Report Writing (Phase 5)
- `memory/AUDIT_METHOD.md` → Phase 5: Report Writing
- `memory/SKILLS.md` → "Report Writing" section
- `memory/REVIEWER_RULES.md` → All rules

### Quality Assurance (Phase 6)
- `memory/AUDIT_METHOD.md` → Phase 6: Quality Assurance
- `memory/REVIEWER_RULES.md` → Decision Matrix

---

## By Severity

### Critical
- `memory/REVIEWER_RULES.md` → "Critical (CVSS 9.0-10.0)"
- `memory/SKILLS.md` → "Severity Assessment" section
- `memory/AUDIT_METHOD.md` → Phase 5: Report Writing

### High
- `memory/REVIEWER_RULES.md` → "High (CVSS 7.0-8.9)"
- `memory/SKILLS.md` → "Severity Assessment" section
- `memory/AUDIT_METHOD.md` → Phase 5: Report Writing

### Medium
- `memory/REVIEWER_RULES.md` → "Medium (CVSS 4.0-6.9)"
- `memory/SKILLS.md` → "Severity Assessment" section
- `memory/AUDIT_METHOD.md` → Phase 5: Report Writing

### Low
- `memory/REVIEWER_RULES.md` → "Low (CVSS 0.1-3.9)"
- `memory/SKILLS.md` → "Severity Assessment" section
- `memory/AUDIT_METHOD.md` → Phase 5: Report Writing

---

## By Tool

### Foundry
- `memory/SKILLS.md` → "Foundry Testing" section
- `memory/AUDIT_METHOD.md` → Phase 0: Tool Setup
- `memory/AUDIT_METHOD.md` → Phase 4: PoC Development

### Slither
- `memory/SKILLS.md` → "Formal Verification" section
- `memory/AUDIT_METHOD.md` → Phase 1: Automated Analysis

### Mythril
- `memory/SKILLS.md` → "Formal Verification" section
- `memory/AUDIT_METHOD.md` → Phase 1: Automated Analysis

### Hardhat
- `memory/SKILLS.md` → "Hardhat Testing" section
- `memory/AUDIT_METHOD.md` → Phase 4: PoC Development

### Certora
- `memory/SKILLS.md` → "Formal Verification" section
- `memory/AUDIT_METHOD.md` → Phase 1: Automated Analysis

### Halmos
- `memory/SKILLS.md` → "Formal Verification" section
- `memory/AUDIT_METHOD.md` → Phase 1: Automated Analysis

---

## By File

### `memory/HACKER_MINDSET.md`
- Core hacker mindset principles
- Attack patterns
- Red flags
- State analysis
- Cross-references: SKILLS.md, DEAD_ENDS.md

### `memory/SKILLS.md`
- Complete technical knowledge
- All vulnerability types
- All protocol components
- Cross-references: HACKER_MINDSET.md, DEAD_ENDS.md, AUDIT_METHOD.md

### `memory/DEAD_ENDS.md`
- Rejected attack paths
- 15 dead ends with reasons
- Meta-lessons
- Cross-references: HACKER_MINDSET.md, SKILLS.md

### `memory/AUDIT_METHOD.md`
- Systematic audit process
- 6 phases
- Checklists
- Time allocation
- Cross-references: SKILLS.md, DEAD_ENDS.md

### `memory/REVIEWER_RULES.md`
- What gets reports accepted
- 10 rules
- Decision matrix
- Quality standards
- Cross-references: AUDIT_METHOD.md

---

## Quick Reference

### Need to find a vulnerability type?
→ `memory/SKILLS.md` → By Vulnerability Type section

### Need to find a protocol component?
→ `memory/SKILLS.md` → By Protocol Component section

### Need to find an audit phase?
→ `memory/AUDIT_METHOD.md` → By Audit Phase section

### Need to find a severity?
→ `memory/REVIEWER_RULES.md` → By Severity section

### Need to find a tool?
→ `memory/SKILLS.md` → By Tool section

### Need to find a dead end?
→ `memory/DEAD_ENDS.md` → By Vulnerability Type section

### Need to find a rejection reason?
→ `memory/REVIEWER_RULES.md` → Common Rejection Reasons section

### Need to find a quality standard?
→ `memory/REVIEWER_RULES.md` → Quality Standards section

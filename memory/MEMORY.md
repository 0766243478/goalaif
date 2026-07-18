# MEMORY — Audit Knowledge System Index

> Master index for all audit knowledge. Start here.

---

## Quick Navigation

| File | Purpose | When to Use |
|------|---------|-------------|
| `HACKER_MINDSET.md` | Core mindset, attack patterns, red flags | Start of every audit |
| `SKILLS.md` | Complete technical knowledge base | When you need technical reference |
| `DEAD_ENDS.md` | Rejected attack paths | Before pursuing any attack path |
| `AUDIT_METHOD.md` | Systematic audit process | During every audit phase |
| `REVIEWER_RULES.md` | What gets reports accepted | Before submitting any report |
| `KNOWLEDGE_INDEX.md` | Cross-reference system | Finding related information |

---

## File Descriptions

### `HACKER_MINDSET.md`
- Core hacker mindset principles
- 8 attack patterns with examples
- 10 red flags to watch for
- State machine analysis framework
- Cross-contract relationship mapping

### `SKILLS.md`
- Complete technical knowledge base
- All vulnerability types (reentrancy, access control, overflow, etc.)
- All protocol components (token, governance, oracle, proxy, bridge, DEX, lending)
- All tools (Foundry, Slither, Mythril, Hardhat, Certora, Halmos)
- Mathematical proofs and cryptographic assumptions
- Formal verification techniques
- Attack surface enumeration
- Proof of concept engineering
- Report writing standards
- Immunefi review simulation

### `DEAD_ENDS.md`
- 15 rejected attack paths with reasons
- Each includes: attack idea, why it looked promising, why it failed, exact defense, lesson learned
- Meta-lessons for future audits
- Statistics by category

### `AUDIT_METHOD.md`
- 6-phase systematic audit process
- Phase 0: Pre-Audit Setup (30 minutes)
- Phase 1: Automated Analysis (1 hour)
- Phase 2: Manual Code Review (4-8 hours)
- Phase 3: Attack Modeling (2-4 hours)
- Phase 4: PoC Development (2-4 hours)
- Phase 5: Report Writing (2-4 hours)
- Phase 6: Quality Assurance (1 hour)
- Checklists for each phase
- Time allocation table
- Quality metrics
- Continuous improvement process

### `REVIEWER_RULES.md`
- 10 rules for report acceptance
- Decision matrix (auto-accept, auto-reject, borderline)
- Common rejection reasons with fixes
- Reviewer simulation checklist
- Quality standards
- Final check before submission

### `KNOWLEDGE_INDEX.md`
- Cross-reference system by:
  - Vulnerability type
  - Protocol component
  - Audit phase
  - Severity
  - Tool
  - File
- Quick reference guide

---

## Usage Workflow

### Starting a New Audit
1. Read `HACKER_MINDSET.md` → Get in attacker mindset
2. Read `AUDIT_METHOD.md` → Understand the process
3. Read `KNOWLEDGE_INDEX.md` → Find relevant resources

### During the Audit
1. Reference `SKILLS.md` → Technical knowledge
2. Check `DEAD_ENDS.md` → Avoid rejected paths
3. Follow `AUDIT_METHOD.md` → Systematic process

### Before Submitting
1. Read `REVIEWER_RULES.md` → Simulate reviewer
2. Check all rules → Ensure acceptance
3. Final check → Professional quality

---

## Cross-References

### By Vulnerability Type
- Reentrancy: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Access Control: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Integer Overflow: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Precision Loss: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Flash Loan: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Oracle Manipulation: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- MEV: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Denial of Service: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Griefing: `HACKER_MINDSET.md`, `SKILLS.md`

### By Protocol Component
- Token System: `HACKER_MINDSET.md`, `SKILLS.md`, `AUDIT_METHOD.md`
- Governance: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Oracle: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Proxy/Upgradeable: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Bridge/Cross-chain: `HACKER_MINDSET.md`, `SKILLS.md`
- DEX/AMM: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Lending/Borrowing: `HACKER_MINDSET.md`, `SKILLS.md`, `DEAD_ENDS.md`

### By Audit Phase
- Pre-Audit: `AUDIT_METHOD.md`, `HACKER_MINDSET.md`, `SKILLS.md`
- Automated Analysis: `AUDIT_METHOD.md`, `SKILLS.md`
- Manual Review: `AUDIT_METHOD.md`, `SKILLS.md`, `DEAD_ENDS.md`
- Attack Modeling: `AUDIT_METHOD.md`, `SKILLS.md`, `DEAD_ENDS.md`
- PoC Development: `AUDIT_METHOD.md`, `SKILLS.md`, `HACKER_MINDSET.md`
- Report Writing: `AUDIT_METHOD.md`, `SKILLS.md`, `REVIEWER_RULES.md`
- Quality Assurance: `AUDIT_METHOD.md`, `REVIEWER_RULES.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-04 | Initial creation of all 6 memory files |

---

## Maintenance

### After Each Audit
1. Update `DEAD_ENDS.md` with new rejected paths
2. Update `SKILLS.md` with new technical knowledge
3. Update `KNOWLEDGE_INDEX.md` with new cross-references
4. Update `AUDIT_METHOD.md` with process improvements

### Monthly Review
1. Review all files for accuracy
2. Update outdated information
3. Add new patterns and techniques
4. Remove obsolete content

---

## Related Files

- `SEI_INFRASTRUCTURE_MAP.md` → Sei Network specific audit state machine
- `VulnerableVault.sol` → Test contract with known vulnerabilities
- `runtime_verification/` → Verification results and scripts

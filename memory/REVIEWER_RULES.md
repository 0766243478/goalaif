# REVIEWER RULES — What Gets Reports Accepted

> Simulate the Immunefi reviewer. Every report must survive this filter.

---

## Rule 1: Vulnerability Must Be Real

### Accept
- Actual code that can be exploited
- Working proof of concept
- Clear attack path

### Reject
- Theoretical vulnerabilities
- "Could happen if..." scenarios
- Code that doesn't exist

### Test
- Can I run the PoC and see the exploit?
- Does the vulnerability exist in the actual code?
- Is the attack path realistic?

---

## Rule 2: Impact Must Be Quantified

### Accept
- Dollar amount: "Attacker steals $X"
- Token amount: "Attacker steals X tokens"
- Percentage: "Attacker steals X% of pool"

### Reject
- "Loss of funds" (no amount)
- "Could be exploited" (no proof)
- "May cause issues" (no impact)

### Test
- What is the exact dollar amount?
- Can I verify the calculation?
- Is the impact realistic?

---

## Rule 3: PoC Must Work

### Accept
- Code that actually executes
- Clear setup and execution
- Verifiable results

### Reject
- Pseudocode
- Incomplete code
- Code that doesn't run

### Test
- Can I copy-paste and run it?
- Does it produce the claimed impact?
- Is it reproducible?

---

## Rule 4: Severity Must Match Matrix

### Critical (CVSS 9.0-10.0)
- Direct loss of funds
- No limitations required
- No external conditions
- Permanent loss

### High (CVSS 7.0-8.9)
- Direct loss with limitations
- Indirect loss > $1M
- Temporary freezing > 1 week
- Griefing > $1M

### Medium (CVSS 4.0-6.9)
- Temporary freezing < 1 week
- Griefing < $1M
- Temporary loss
- Unwanted behavior

### Low (CVSS 0.1-3.9)
- Minor impact
- Unwanted behavior
- Minor inconvenience

### Test
- Does the impact match the severity?
- Is the calculation accurate?
- Does this match the Immunefi matrix?

---

## Rule 5: Report Must Be Clear

### Accept
- Clear title
- Clear summary
- Clear root cause
- Clear impact
- Clear PoC
- Clear recommendation

### Reject
- Vague description
- Missing sections
- Confusing explanation
- No code references

### Test
- Can a non-technical person understand the impact?
- Can a developer understand the root cause?
- Can a reviewer verify the PoC?

---

## Rule 6: Must Be In Scope

### Accept
- Listed in bug bounty scope
- Covered by immunefi policy
- In scope contract

### Reject
- Out of scope contracts
- Deprecated code
- Test files
- Dependencies

### Test
- Is this contract in scope?
- Is this code path in scope?
- Is this vulnerability type in scope?

---

## Rule 7: Must Be Novel

### Accept
- New vulnerability type
- New attack vector
- New impact
- New combination

### Reject
- Known issues
- Previously reported
- Documented risks
- Acceptable risks

### Test
- Has this been reported before?
- Is this documented as a risk?
- Is this a new finding?

---

## Rule 8: Must Be Actionable

### Accept
- Fix is possible
- Fix is clear
- Fix is practical
- Fix is complete

### Reject
- No fix possible
- Fix is unclear
- Fix is impractical
- Fix is incomplete

### Test
- Can the developer fix this?
- Is the fix clear?
- Is the fix practical?

---

## Rule 9: Must Be Timely

### Accept
- Reported during bounty period
- No duplicate reports
- First report

### Reject
- Late reports
- Duplicate reports
- Already fixed

### Test
- Is this within the bounty period?
- Has this been reported before?
- Is this already fixed?

---

## Rule 10: Must Be Professional

### Accept
- Clear language
- Respectful tone
- Constructive feedback
- Professional format

### Reject
- Unclear language
- Disrespectful tone
- Destructive feedback
- Unprofessional format

### Test
- Is this professional?
- Would I accept this report?
- Is this respectful?

---

## Decision Matrix

### Auto-Accept
- Real vulnerability
- Quantified impact
- Working PoC
- Correct severity
- Clear report
- In scope
- Novel
- Actionable
- Timely
- Professional

### Auto-Reject
- Theoretical vulnerability
- No quantified impact
- Broken PoC
- Wrong severity
- Unclear report
- Out of scope
- Known issue
- Not actionable
- Late report
- Unprofessional

### Borderline
- Reviewer discretion
- May ask for clarification
- May ask for additional PoC
- May adjust severity

---

## Common Rejection Reasons

### 1. "Theoretical Vulnerability"
- **Why**: No working PoC
- **Fix**: Provide working PoC
- **Example**: "Attacker could call function X" → "Attacker calls function X, steals Y tokens"

### 2. "Missing Impact"
- **Why**: No dollar amount
- **Fix**: Calculate exact impact
- **Example**: "Loss of funds" → "Attacker steals 100 ETH ($200,000)"

### 3. "Out of Scope"
- **Why**: Not covered by bug bounty
- **Fix**: Check scope first
- **Example**: Test file → Production code

### 4. "Known Issue"
- **Why**: Already documented
- **Fix**: Check documentation first
- **Example**: Centralization risk → New vulnerability

### 5. "Not Actionable"
- **Why**: No clear fix
- **Fix**: Provide clear recommendation
- **Example**: "This is bad" → "Use ReentrancyGuard"

### 6. "Wrong Severity"
- **Why**: Doesn't match matrix
- **Fix**: Recalculate severity
- **Example**: Low severity reported as Critical

### 7. "Duplicate Report"
- **Why**: Already reported
- **Fix**: Check existing reports first
- **Example**: Same vulnerability, same impact

### 8. "Late Report"
- **Why**: After bounty period
- **Fix**: Report during bounty period
- **Example**: After fix deployed

### 9. "Unprofessional"
- **Why**: Poor quality report
- **Fix**: Improve report quality
- **Example**: Vague description, no code

### 10. "Insufficient Detail"
- **Why**: Missing sections
- **Fix**: Complete all sections
- **Example**: No root cause, no recommendation

---

## Reviewer Simulation Checklist

### Before Submission
- [ ] Vulnerability is real (not theoretical)
- [ ] Impact is quantified (dollar amount)
- [ ] PoC works (actually runs)
- [ ] Severity matches matrix
- [ ] Report is clear
- [ ] In scope
- [ ] Novel (not known)
- [ ] Actionable (fix exists)
- [ ] Timely (during bounty period)
- [ ] Professional (clear language)

### During Review
- [ ] Can I run the PoC?
- [ ] Can I verify the impact?
- [ ] Can I understand the root cause?
- [ ] Can I verify the severity?
- [ ] Can I verify the scope?

### After Review
- [ ] Would I accept this report?
- [ ] Would I reject this report?
- [ ] What would I ask for clarification?
- [ ] What would I request as additional evidence?

---

## Quality Standards

### Report Quality
- **Clarity**: 9/10
- **Completeness**: 10/10
- **Accuracy**: 10/10
- **Professionalism**: 9/10

### PoC Quality
- **Working**: 10/10
- **Minimal**: 9/10
- **Clear**: 9/10
- **Reproducible**: 10/10

### Impact Quality
- **Quantified**: 10/10
- **Accurate**: 10/10
- **Realistic**: 9/10
- **Verifiable**: 10/10

---

## Final Check

Before submitting, ask yourself:

1. **Would I accept this report?**
2. **Would I reject this report?**
3. **What would I improve?**
4. **Is this production-ready?**

If the answer to #1 is "yes" and #2 is "no", submit.
If the answer to #1 is "no" or #2 is "yes", improve first.

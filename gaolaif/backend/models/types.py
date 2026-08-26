import uuid
from dataclasses import dataclass, field
from typing import Optional
import dataclasses
from enum import Enum


class PoCExecutionStatus(Enum):
    """Execution status for PoC testing."""
    COMPILATION_FAILED = "compilation_failed"
    COMPILATION_SUCCEEDED = "compilation_succeeded"
    TEST_FAILED = "test_failed"
    TEST_PASSED = "test_passed"
    EXPLOIT_CONFIRMED = "exploit_confirmed"
    EXPLOIT_REJECTED = "exploit_rejected"
    TIMEOUT = "timeout"
    ERROR = "error"


class VerificationStatus(str, Enum):
    """Honest verification ladder — only CONFIRMED if all gates pass."""
    HYPOTHESIS = "hypothesis"
    POC_GENERATED = "poc_generated"
    COMPILED = "compiled"
    EXECUTED = "executed"
    EXPLOIT_REPRODUCED = "exploit_reproduced"
    CONFIRMED = "confirmed"
    COMPILATION_FAILED = "compilation_failed"
    EXECUTION_FAILED = "execution_failed"
    NOT_REPRODUCED = "not_reproduced"
    NEEDS_REVIEW = "needs_review"


class ErrorCategory(Enum):
    """Category of error for proper handling."""
    COMPILATION = "compilation"
    RUNTIME = "runtime"
    LOGIC = "logic"
    ENVIRONMENT = "environment"
    UNKNOWN = "unknown"


class TerminalState(str, Enum):
    """
    Canonical terminal states for a completed audit.

    Policy:
      CONFIRMED           — at least one finding verified by independent execution
                            (Forge) and no unverified findings remain.
      UNVERIFIED          — analysis ran but the verifier could not adjudicate
                            (e.g., Forge unavailable), or coverage policy not met.
      FAILED              — pipeline error, or every PoC failed generation/compile.
      DEGRADED            — analysis completed with partial verification
                            (some findings needs_review due to environment).
      CLEAN_WITH_COVERAGE — no hypothesis reproduced AND every hypothesis received
                            a real executed verification attempt (no skips-only).
    Never use a generic 'success' for these distinct outcomes.
    """
    CONFIRMED = "confirmed"
    UNVERIFIED = "unverified"
    FAILED = "failed"
    DEGRADED = "degraded"
    CLEAN_WITH_COVERAGE = "clean_with_coverage"


@dataclass
class PoCExecutionResult:
    """Structured result from PoC execution pipeline."""
    status: PoCExecutionStatus
    success: bool
    poc_code: str = ""
    forge_output: str = ""
    compilation_output: str = ""
    error_category: ErrorCategory = ErrorCategory.UNKNOWN
    error_message: str = ""
    money_flow: Optional[dict] = None
    attack_vector: str = ""
    target_function: str = ""
    test_duration_ms: float = 0.0
    llm_verified: bool = False
    workspace_path: str = ""
    retry_count: int = 0
    compilation_attempts: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "status": self.status.value,
            "success": self.success,
            "poc_code": self.poc_code,
            "forge_output": self.forge_output,
            "compilation_output": self.compilation_output,
            "error_category": self.error_category.value,
            "error_message": self.error_message,
            "money_flow": self.money_flow,
            "attack_vector": self.attack_vector,
            "target_function": self.target_function,
            "test_duration_ms": self.test_duration_ms,
            "llm_verified": self.llm_verified,
            "workspace_path": self.workspace_path,
            "retry_count": self.retry_count,
            "compilation_attempts": self.compilation_attempts,
        }


@dataclass
class ProtocolMap:
    functions: list[str] = field(default_factory=list)
    state_variables: list[str] = field(default_factory=list)
    modifiers: list[str] = field(default_factory=list)
    invariants: list[str] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)


@dataclass
class AttackScenario:
    name: str
    description: str
    entry_point: str
    attack_vector: str
    preconditions: list[str] = field(default_factory=list)
    exploit_steps: list[str] = field(default_factory=list)
    estimated_impact: str = ""
    scenario_type: str = "reentrancy"

    # Alias so both `scenario.impact` and `scenario.estimated_impact` work
    @property
    def impact(self) -> str:
        return self.estimated_impact


@dataclass
class ForgeTestResult:
    """Structured result of a single Forge test execution."""
    test_name: str = ""
    passed: bool = False
    gas_used: int = 0
    error_message: str = ""


@dataclass
class ExploitResult:
    """
    The complete, traceable result of an exploit verification.
    Every gate must pass before confirmed=True.
    """
    verification_status: VerificationStatus = VerificationStatus.HYPOTHESIS
    hypothesis: str = ""
    attack_vector: str = ""
    target_function: str = ""

    # Gate 1: PoC generated
    poc_generated: bool = False
    poc_code: str = ""

    # Gate 2: Compilation
    compiled: bool = False
    compilation_output: str = ""
    compile_attempts: int = 0

    # Gate 3: Execution
    executed: bool = False
    forge_tests: list[ForgeTestResult] = field(default_factory=list)
    forge_output: str = ""
    execution_duration_ms: float = 0.0

    # Gate 4: Exploit reproduced
    exploit_reproduced: bool = False
    attacker_profit: Optional[dict] = None
    money_flow: Optional[dict] = None
    state_changes: list[str] = field(default_factory=list)

    # Gate 5: Evidence verified
    evidence: list[str] = field(default_factory=list)
    confirmed: bool = False
    needs_review: bool = False
    review_reason: str = ""


@dataclass
class SimulationProof:
    confirmed: bool = False
    poc_code: str = ""
    forge_output: str = ""
    money_flow: Optional[dict] = None
    attack_vector: str = ""
    target_function: str = ""
    estimated_impact: str = ""
    test_duration_ms: float = 0.0
    llm_verified: bool = False
    exploit_result: Optional[ExploitResult] = None


@dataclass
class EnvFailureResult:
    failure_type: str = ""
    simulated: bool = False
    description: str = ""
    forge_output: str = ""


@dataclass
class Finding:
    id: str = ""
    title: str = ""
    severity: str = ""          # always stored UPPERCASE (normalised on creation)
    description: str = ""
    affected_functions: list[str] = field(default_factory=list)
    attack_scenario: Optional[AttackScenario] = None
    simulation: Optional[SimulationProof] = None
    exploit_result: Optional[ExploitResult] = None
    env_failure: Optional[EnvFailureResult] = None
    confirmed: bool = False
    needs_review: bool = False
    category: str = ""
    remediation: str = ""
    evidence_id: str = ""       # link to EvidencePack (Core v0.1)

    def __post_init__(self):
        if not self.id:
            self.id = f"finding-{uuid.uuid4().hex[:12]}"
        self.severity = self.severity.upper()
        if self.exploit_result is not None:
            self.confirmed = self.exploit_result.confirmed
            self.needs_review = self.exploit_result.needs_review


@dataclass
class Hypothesis:
    """A reasoned attack hypothesis. AI/heuristic output is a HYPOTHESIS,
    never a security finding on its own."""
    id: str = ""
    name: str = ""
    category: str = ""              # attack_vector, e.g. reentrancy
    target_contract: str = ""       # contract under test
    target: str = ""                # entry_point function
    rationale: str = ""             # why this could be exploitable
    discovery_evidence: list[str] = field(default_factory=list)  # what discovery observed
    attack_objective: str = ""      # estimated impact if hypothesis holds
    preconditions: list[str] = field(default_factory=list)
    exploit_steps: list[str] = field(default_factory=list)
    source_mode: str = "HEURISTIC"  # HEURISTIC | LLM_ASSISTED (never hidden in UI)
    confidence: str = ""            # heuristic estimate only, labeled as such
    limitations: list[str] = field(default_factory=list)         # e.g. no PoC template
    scenario: Optional[AttackScenario] = None

    def __post_init__(self):
        if not self.id:
            self.id = f"hyp-{uuid.uuid4().hex[:12]}"


@dataclass
class AttackPath:
    """Inspectable path from entry point to expected impact for one hypothesis."""
    hypothesis_id: str = ""
    entry_point: str = ""
    preconditions: list[str] = field(default_factory=list)
    attacker_actions: list[str] = field(default_factory=list)
    vulnerable_transition: str = ""
    expected_impact: str = ""
    state_assertions: list[str] = field(default_factory=list)


@dataclass
class VerificationRecord:
    """Structured record of one independent verification attempt."""
    verifier: str = "forge"
    verifier_version: str = ""
    compile_status: str = "not_run"     # not_run|passed|failed
    test_status: str = "not_run"        # not_run|passed|failed|timeout|error|skipped
    executed_test_count: int = 0
    relevant_test_name: str = ""
    relevant_test_passed: Optional[bool] = None
    process_exit_code: Optional[int] = None
    duration_ms: float = 0.0
    raw_output_ref: str = ""            # workspace path when preserved
    stdout_excerpt: str = ""
    stderr_excerpt: str = ""

    def to_dict(self) -> dict:
        return dataclasses.asdict(self)


@dataclass
class EvidencePack:
    """
    Canonical, persistable, exportable evidence chain:

      audit → hypothesis → attack_path → poc → verification → observation → finding
    """
    id: str = ""
    audit_id: str = ""
    finding_id: str = ""
    source_hash: str = ""               # sha256 of analyzed source
    target_file: str = ""
    contract_name: str = ""
    function_name: str = ""
    hypothesis_id: str = ""
    vulnerability_hypothesis: str = ""
    attack_path: Optional[AttackPath] = None
    preconditions: list[str] = field(default_factory=list)
    poc_source: str = ""
    poc_hash: str = ""                  # sha256 of the exact generated PoC
    verification: Optional[VerificationRecord] = None
    verified_at: float = 0.0           # timestamp of the verification attempt
    observed_impact: str = ""
    reproduction_instructions: str = ""
    environmental_limitations: list[str] = field(default_factory=list)
    created_at: float = 0.0

    def __post_init__(self):
        import time as _t
        if not self.id:
            self.id = f"evd-{uuid.uuid4().hex[:12]}"
        if not self.created_at:
            self.created_at = _t.time()

    def to_dict(self) -> dict:
        d = dataclasses.asdict(self)
        return d


@dataclass
class AuditSession:
    session_id: str
    source_code: str
    language: str = "solidity"
    file_path: str = ""
    file_name: str = ""
    protocol_map: Optional[ProtocolMap] = None
    scenarios: list[AttackScenario] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    status: str = "created"
    error: Optional[str] = None
    warnings: list[str] = field(default_factory=list)
    # ── Core v0.1 evidence extensions ──
    hypotheses: list[Hypothesis] = field(default_factory=list)
    evidence_packs: list[EvidencePack] = field(default_factory=list)
    verification_records: list[VerificationRecord] = field(default_factory=list)
    terminal_state: str = ""            # TerminalState value when finished
    reasoning_mode: str = "HEURISTIC"   # HEURISTIC | LLM_ASSISTED
    discovery_summary: dict = field(default_factory=dict)
    source_hash: str = ""
    report_markdown: str = ""
    started_at: float = 0.0
    finished_at: float = 0.0

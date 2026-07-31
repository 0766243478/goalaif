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

    def __post_init__(self):
        if not self.id:
            self.id = f"finding-{uuid.uuid4().hex[:12]}"
        self.severity = self.severity.upper()
        if self.exploit_result is not None:
            self.confirmed = self.exploit_result.confirmed
            self.needs_review = self.exploit_result.needs_review


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

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ProtocolMap:
    functions: list[str] = field(default_factory=list)
    state_variables: list[str] = field(default_factory=list)
    modifiers: list[str] = field(default_factory=list)
    invariants: list[str] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)


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


@dataclass
class EnvFailureResult:
    failure_type: str = ""
    simulated: bool = False
    description: str = ""
    forge_output: str = ""


@dataclass
class Finding:
    title: str
    severity: str
    description: str
    affected_functions: list[str] = field(default_factory=list)
    attack_scenario: Optional[AttackScenario] = None
    simulation: Optional[SimulationProof] = None
    env_failure: Optional[EnvFailureResult] = None
    confirmed: bool = False
    category: str = ""
    remediation: str = ""


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

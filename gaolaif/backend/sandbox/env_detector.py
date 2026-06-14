import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class LanguageDetect:
    language: str = "unknown"
    confidence: float = 0.0
    frameworks: list[str] = field(default_factory=list)
    has_foundry_toml: bool = False
    has_move_toml: bool = False


SOLIDITY_EXTENSIONS = {".sol", ".vy"}
MOVE_EXTENSIONS = {".move"}


SOLIDITY_KEYWORDS = {
    "solidity", "pragma solidity", "contract ", "interface ", "library ",
    "mapping(", "function ", "modifier ", "event ", "require(",
}

MOVE_KEYWORDS = {
    "module ", "script ", "fun ", "let ", "move<", "copy ", "borrow_global",
    "acquires ", "has ", "friend ", "public(",
}


def detect_language(file_path: str, content: str = "") -> LanguageDetect:
    detect = LanguageDetect()
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext in SOLIDITY_EXTENSIONS:
        detect.language = "solidity"
        detect.confidence = 0.9
        detect.frameworks = ["foundry"]
    elif ext in MOVE_EXTENSIONS:
        detect.language = "move"
        detect.confidence = 0.9
        detect.frameworks = ["sui", "aptos"]

    parent = path.parent
    if (parent / "foundry.toml").exists():
        detect.has_foundry_toml = True
        detect.language = "solidity"
        detect.confidence = max(detect.confidence, 0.95)
        if "foundry" not in detect.frameworks:
            detect.frameworks.append("foundry")

    if (parent / "Move.toml").exists():
        detect.has_move_toml = True
        detect.language = "move"
        detect.confidence = max(detect.confidence, 0.95)
        if "sui" not in detect.frameworks:
            detect.frameworks.append("sui")

    if not content:
        try:
            content = Path(file_path).read_text(encoding="utf-8", errors="ignore")[:2000]
        except Exception:
            content = ""

    if content:
        sol_score = sum(1 for kw in SOLIDITY_KEYWORDS if kw in content.lower())
        move_score = sum(1 for kw in MOVE_KEYWORDS if kw in content)
        if sol_score > move_score and sol_score >= 2:
            detect.language = "solidity"
            detect.confidence = min(0.5 + sol_score * 0.1, 0.99)
        elif move_score > sol_score and move_score >= 2:
            detect.language = "move"
            detect.confidence = min(0.5 + move_score * 0.1, 0.99)

    return detect


def is_solidity(file_path: str, content: str = "") -> bool:
    return detect_language(file_path, content).language == "solidity"


def is_move(file_path: str, content: str = "") -> bool:
    return detect_language(file_path, content).language == "move"


from dataclasses import field

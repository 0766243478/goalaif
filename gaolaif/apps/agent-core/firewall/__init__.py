from .dlp_guard import DLPGuard
from .sanitizer import Sanitizer, SanitizedContext
from .virus_inspector import VirusInspector

# Backward compat alias
PromptSanitizer = Sanitizer

__all__ = ["DLPGuard", "Sanitizer", "SanitizedContext", "PromptSanitizer", "VirusInspector"]

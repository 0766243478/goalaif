"""Local API authentication for the SIREEN backend.

Threat model
------------
The backend listens on loopback only, but loopback is not a security boundary:
any local process — or a browser page abusing DNS rebinding — can reach
``127.0.0.1:7432``. CORS stops the browser case, not the local-process case, and
``/audit/start`` forwards contract source to OpenRouter. A shared bearer token
closes that gap.

Token resolution (first match wins)
-----------------------------------
1. ``SIREEN_API_TOKEN``            — explicit value, nothing is written to disk.
2. ``SIREEN_TOKEN_FILE``           — path to read/create.
3. ``~/.sireen/api-token``         — default, created with 0600 on first use.

``SIREEN_AUTH_DISABLED=1`` turns the check off. It exists for throwaway local
runs and CI; it is never the default.
"""

import os
import secrets
import subprocess
from pathlib import Path

ENV_TOKEN = "SIREEN_API_TOKEN"
ENV_TOKEN_FILE = "SIREEN_TOKEN_FILE"
ENV_DISABLED = "SIREEN_AUTH_DISABLED"

# Unauthenticated endpoints: liveness plus capability booleans. Neither
# exposes contract data, credentials, or the ability to start work.
PUBLIC_PATHS = frozenset({"/health", "/config/status"})


def auth_disabled() -> bool:
    return os.environ.get(ENV_DISABLED, "").strip().lower() in {"1", "true", "yes", "on"}


def token_file_path() -> Path:
    configured = os.environ.get(ENV_TOKEN_FILE, "").strip()
    if configured:
        return Path(configured).expanduser()
    return Path.home() / ".sireen" / "api-token"


def _read_token_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def _windows_current_user_sid() -> str:
    import ctypes
    from ctypes import wintypes

    class _SidAndAttributes(ctypes.Structure):
        _fields_ = [("sid", ctypes.c_void_p), ("attributes", wintypes.DWORD)]

    class _TokenUser(ctypes.Structure):
        _fields_ = [("user", _SidAndAttributes)]

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
    kernel32.GetCurrentProcess.restype = wintypes.HANDLE
    advapi32.OpenProcessToken.restype = wintypes.BOOL
    advapi32.OpenProcessToken.argtypes = [
        wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)
    ]
    advapi32.GetTokenInformation.restype = wintypes.BOOL
    advapi32.GetTokenInformation.argtypes = [
        wintypes.HANDLE, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD,
        ctypes.POINTER(wintypes.DWORD),
    ]
    kernel32.CloseHandle.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    advapi32.ConvertSidToStringSidW.restype = wintypes.BOOL
    advapi32.ConvertSidToStringSidW.argtypes = [
        ctypes.c_void_p, ctypes.POINTER(wintypes.LPWSTR)
    ]

    token = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(kernel32.GetCurrentProcess(), 0x0008, ctypes.byref(token)):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        size = wintypes.DWORD()
        advapi32.GetTokenInformation(token, 1, None, 0, ctypes.byref(size))
        if not size.value:
            raise ctypes.WinError(ctypes.get_last_error())
        buffer = ctypes.create_string_buffer(size.value)
        if not advapi32.GetTokenInformation(
            token, 1, buffer, size.value, ctypes.byref(size)
        ):
            raise ctypes.WinError(ctypes.get_last_error())

        sid_text = wintypes.LPWSTR()
        sid = ctypes.cast(buffer, ctypes.POINTER(_TokenUser)).contents.user.sid
        if not advapi32.ConvertSidToStringSidW(sid, ctypes.byref(sid_text)):
            raise ctypes.WinError(ctypes.get_last_error())
        try:
            return sid_text.value
        finally:
            kernel32.LocalFree(ctypes.cast(sid_text, ctypes.c_void_p))
    finally:
        kernel32.CloseHandle(token)


def _secure_windows_token_file(path: Path) -> None:
    sid = _windows_current_user_sid()
    for args in (
        ("/reset",),
        ("/inheritance:r", "/grant:r", f"*{sid}:F"),
        ("/setowner", f"*{sid}"),
    ):
        result = subprocess.run(
            ["icacls", str(path), *args],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            detail = (result.stderr or result.stdout).strip()
            raise OSError(
                result.returncode,
                f"icacls failed to secure token file: {detail}",
                str(path),
            )


def _write_token_file(path: Path, token: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    if os.name == "nt":
        os.close(fd)
        _secure_windows_token_file(path)
        fd = os.open(str(path), os.O_WRONLY | os.O_TRUNC)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(token + "\n")
    if os.name != "nt":
        # mkdir/umask can widen the mode; enforce owner-only explicitly.
        os.chmod(str(path), 0o600)


def resolve_token(create: bool = True) -> str:
    """Return the token this process expects clients to present.

    ``create=False`` never writes to disk — used by clients that only want to
    read an existing token.
    """
    explicit = os.environ.get(ENV_TOKEN, "").strip()
    if explicit:
        return explicit

    path = token_file_path()
    existing = _read_token_file(path)
    if existing:
        return existing
    if not create:
        return ""

    token = secrets.token_urlsafe(32)
    try:
        _write_token_file(path, token)
    except OSError:
        # A read-only home must not stop the backend from starting. The token
        # stays in memory, so callers that cannot read the file can still pass
        # SIREEN_API_TOKEN explicitly.
        return token
    return token


def extract_bearer(header_value: str) -> str:
    if not header_value:
        return ""
    scheme, _, value = header_value.partition(" ")
    if scheme.lower() != "bearer":
        return ""
    return value.strip()


def is_public_path(path: str) -> bool:
    return path.rstrip("/") in PUBLIC_PATHS or path == "/"


def token_matches(presented: str, expected: str) -> bool:
    if not presented or not expected:
        return False
    return secrets.compare_digest(presented, expected)

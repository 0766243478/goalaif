"""Local API authentication tests.

The backend binds loopback only, but loopback is reachable by every local
process. These tests assert the token gate actually blocks unauthenticated
callers, rather than trusting the CORS policy to do a job it cannot do.

Run: pytest tests/test_api_auth.py -v
"""

import os
import stat

import pytest
from fastapi.testclient import TestClient

import api_auth
import main as sireen_main


TOKEN = "test-token-abc123"


def _windows_file_security_sddl(path):
    import ctypes
    from ctypes import wintypes

    advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    advapi32.GetNamedSecurityInfoW.restype = wintypes.DWORD
    advapi32.GetNamedSecurityInfoW.argtypes = [
        wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
        ctypes.POINTER(ctypes.c_void_p), ctypes.POINTER(ctypes.c_void_p),
        ctypes.POINTER(ctypes.c_void_p), ctypes.POINTER(ctypes.c_void_p),
        ctypes.POINTER(ctypes.c_void_p),
    ]
    advapi32.ConvertSecurityDescriptorToStringSecurityDescriptorW.restype = wintypes.BOOL
    advapi32.ConvertSecurityDescriptorToStringSecurityDescriptorW.argtypes = [
        ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD,
        ctypes.POINTER(wintypes.LPWSTR), ctypes.POINTER(wintypes.DWORD),
    ]
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]

    owner = ctypes.c_void_p()
    dacl = ctypes.c_void_p()
    descriptor = ctypes.c_void_p()
    status = advapi32.GetNamedSecurityInfoW(
        str(path), 1, 0x00000001 | 0x00000004,
        ctypes.byref(owner), None, ctypes.byref(dacl), None,
        ctypes.byref(descriptor),
    )
    if status:
        raise ctypes.WinError(status)
    try:
        sddl = wintypes.LPWSTR()
        length = wintypes.DWORD()
        if not advapi32.ConvertSecurityDescriptorToStringSecurityDescriptorW(
            descriptor, 1, 0x00000001 | 0x00000004,
            ctypes.byref(sddl), ctypes.byref(length),
        ):
            raise ctypes.WinError(ctypes.get_last_error())
        try:
            return sddl.value
        finally:
            kernel32.LocalFree(ctypes.cast(sddl, ctypes.c_void_p))
    finally:
        kernel32.LocalFree(descriptor)


@pytest.fixture
def auth_on(monkeypatch):
    """Re-enable the gate (the shared conftest turns it off)."""
    monkeypatch.delenv("SIREEN_AUTH_DISABLED", raising=False)
    monkeypatch.setenv("SIREEN_API_TOKEN", TOKEN)
    monkeypatch.setattr(sireen_main, "API_TOKEN", TOKEN)
    yield
    monkeypatch.setattr(sireen_main, "API_TOKEN", "")


@pytest.fixture
def client():
    with TestClient(sireen_main.app) as c:
        yield c


class TestTokenGate:
    def test_health_is_public(self, auth_on, client):
        assert client.get("/health").status_code == 200

    def test_config_status_is_public_but_exposes_no_secret(self, auth_on, client):
        r = client.get("/config/status")
        assert r.status_code == 200
        body = r.json()
        for key in ("api_configured", "forge_available", "qdrant_available", "auth_required"):
            assert isinstance(body[key], bool)
        assert body["memory_mode"] in {"auto", "qdrant", "memory", "off"}
        assert "sk-or-" not in str(body).lower()

    def test_protected_endpoint_rejects_missing_token(self, auth_on, client):
        r = client.post("/audit/start", json={"code": "contract C {}"})
        assert r.status_code == 401
        assert "token" in r.json()["error"].lower()

    def test_protected_endpoint_rejects_wrong_token(self, auth_on, client):
        r = client.post(
            "/audit/start",
            json={"code": "contract C {}"},
            headers={"Authorization": "Bearer wrong-token"},
        )
        assert r.status_code == 401

    def test_protected_endpoint_accepts_correct_token(self, auth_on, client):
        r = client.post(
            "/audit/start",
            json={"code": "contract C { function f() public {} }"},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
        assert r.status_code == 200

    def test_read_endpoints_are_also_protected(self, auth_on, client):
        assert client.get("/audits").status_code == 401
        assert client.get("/sessions/list").status_code == 401

    def test_non_bearer_scheme_is_rejected(self, auth_on, client):
        r = client.post(
            "/audit/start",
            json={"code": "contract C {}"},
            headers={"Authorization": f"Basic {TOKEN}"},
        )
        assert r.status_code == 401


class TestTokenResolution:
    def test_explicit_env_token_wins(self, monkeypatch):
        monkeypatch.setenv("SIREEN_API_TOKEN", "explicit-value")
        monkeypatch.setenv("SIREEN_TOKEN_FILE", "/nonexistent/should-not-be-read")
        assert api_auth.resolve_token() == "explicit-value"

    def test_token_file_is_created_owner_only(self, monkeypatch, tmp_path):
        monkeypatch.delenv("SIREEN_API_TOKEN", raising=False)
        token_file = tmp_path / "nested" / "api-token"
        monkeypatch.setenv("SIREEN_TOKEN_FILE", str(token_file))

        token = api_auth.resolve_token()

        assert token
        assert token_file.read_text(encoding="utf-8").strip() == token
        if os.name == "nt":
            sddl = _windows_file_security_sddl(token_file)
            owner_sid, dacl = sddl[2:].split("D:", 1)
            assert dacl == f"P(A;;FA;;;{owner_sid})", f"token file ACL was {sddl}"
        else:
            mode = stat.S_IMODE(token_file.stat().st_mode)
            assert mode == 0o600, f"token file mode was {oct(mode)}"

    def test_existing_token_file_is_reused(self, monkeypatch, tmp_path):
        monkeypatch.delenv("SIREEN_API_TOKEN", raising=False)
        token_file = tmp_path / "api-token"
        token_file.write_text("persisted-token\n", encoding="utf-8")
        monkeypatch.setenv("SIREEN_TOKEN_FILE", str(token_file))
        assert api_auth.resolve_token() == "persisted-token"

    def test_create_false_never_writes(self, monkeypatch, tmp_path):
        monkeypatch.delenv("SIREEN_API_TOKEN", raising=False)
        token_file = tmp_path / "absent-token"
        monkeypatch.setenv("SIREEN_TOKEN_FILE", str(token_file))
        assert api_auth.resolve_token(create=False) == ""
        assert not token_file.exists()

    def test_auth_disabled_is_opt_in_only(self, monkeypatch):
        monkeypatch.delenv("SIREEN_AUTH_DISABLED", raising=False)
        assert api_auth.auth_disabled() is False
        monkeypatch.setenv("SIREEN_AUTH_DISABLED", "1")
        assert api_auth.auth_disabled() is True


class TestHelpers:
    @pytest.mark.parametrize("header,expected", [
        ("Bearer abc", "abc"),
        ("bearer abc", "abc"),
        ("Bearer  abc  ", "abc"),
        ("Basic abc", ""),
        ("", ""),
        ("Bearer", ""),
    ])
    def test_extract_bearer(self, header, expected):
        assert api_auth.extract_bearer(header) == expected

    def test_public_paths(self):
        assert api_auth.is_public_path("/health")
        assert api_auth.is_public_path("/config/status")
        assert api_auth.is_public_path("/")
        assert not api_auth.is_public_path("/audit/start")
        assert not api_auth.is_public_path("/audits")

    def test_token_matches_is_exact(self):
        assert api_auth.token_matches("abc", "abc")
        assert not api_auth.token_matches("abc", "abd")
        assert not api_auth.token_matches("", "abc")
        assert not api_auth.token_matches("abc", "")

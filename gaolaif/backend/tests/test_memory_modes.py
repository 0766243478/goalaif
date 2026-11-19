"""Memory-mode tests.

`SmartMemory` previously had one implicit mode: try Qdrant, silently fall back
to a process-local dict. That made "memory is working" unfalsifiable — a user
could not tell durable recall from a dict that dies with the process. These
tests pin the four explicit modes.

Run: pytest tests/test_memory_modes.py -v
"""

import pytest

from memory.smart_memory import MemoryMode, SmartMemory, resolve_mode


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for var in ("SIREEN_MEMORY_MODE", "QDRANT_HOST", "QDRANT_PORT", "QDRANT_API_KEY"):
        monkeypatch.delenv(var, raising=False)


class TestModeResolution:
    def test_default_is_auto(self):
        assert resolve_mode() is MemoryMode.AUTO

    @pytest.mark.parametrize("value,expected", [
        ("auto", MemoryMode.AUTO),
        ("qdrant", MemoryMode.QDRANT),
        ("memory", MemoryMode.MEMORY),
        ("off", MemoryMode.OFF),
        ("MEMORY", MemoryMode.MEMORY),
        ("  off  ", MemoryMode.OFF),
    ])
    def test_explicit_modes_parse(self, monkeypatch, value, expected):
        monkeypatch.setenv("SIREEN_MEMORY_MODE", value)
        assert resolve_mode() is expected

    def test_unknown_value_falls_back_to_auto(self, monkeypatch):
        monkeypatch.setenv("SIREEN_MEMORY_MODE", "not-a-mode")
        assert resolve_mode() is MemoryMode.AUTO


class TestMemoryMode:
    def test_memory_mode_never_touches_network(self, monkeypatch):
        """MEMORY must not attempt a Qdrant connection at all."""
        monkeypatch.setenv("SIREEN_MEMORY_MODE", "memory")
        import qdrant_client

        def _explode(*_a, **_kw):
            raise AssertionError("MEMORY mode must not construct a QdrantClient")

        monkeypatch.setattr(qdrant_client, "QdrantClient", _explode)

        mem = SmartMemory()
        mem.init()

        assert mem.mode == "memory"
        assert mem.describe()["backend"] == "memory"

    def test_memory_mode_round_trips_in_process(self, monkeypatch):
        monkeypatch.setenv("SIREEN_MEMORY_MODE", "memory")
        mem = SmartMemory()
        mem.init()

        mem.save("k1", "[ABSTRACT] reentrancy on external call before state update")
        results = mem.search("reentrancy")

        assert [r.key for r in results] == ["k1"]
        assert mem.get("k1") is not None

    def test_off_mode_stores_nothing_and_returns_nothing(self, monkeypatch):
        monkeypatch.setenv("SIREEN_MEMORY_MODE", "off")
        mem = SmartMemory()
        mem.init()

        mem.save("k1", "[ABSTRACT] reentrancy pattern")

        assert mem.mode == "off"
        assert mem.search("reentrancy") == []
        assert mem.get("k1") is None

    def test_qdrant_mode_raises_instead_of_degrading_silently(self, monkeypatch):
        """Explicitly requesting Qdrant and not getting it must be an error."""
        monkeypatch.setenv("SIREEN_MEMORY_MODE", "qdrant")
        monkeypatch.setenv("QDRANT_HOST", "127.0.0.1")
        monkeypatch.setenv("QDRANT_PORT", "1")  # nothing listens here

        mem = SmartMemory()
        with pytest.raises(Exception):
            mem.init()
        assert mem.describe()["degraded"] is True

    def test_auto_mode_degrades_without_raising(self, monkeypatch):
        monkeypatch.setenv("SIREEN_MEMORY_MODE", "auto")
        monkeypatch.setenv("QDRANT_HOST", "127.0.0.1")
        monkeypatch.setenv("QDRANT_PORT", "1")

        mem = SmartMemory()
        mem.init()  # must not raise

        assert mem.describe()["backend"] == "memory"
        assert mem.describe()["degraded"] is False

    def test_describe_reports_real_backend(self, monkeypatch):
        monkeypatch.setenv("SIREEN_MEMORY_MODE", "memory")
        mem = SmartMemory()
        mem.init()
        described = mem.describe()
        assert described["mode"] == "memory"
        assert described["backend"] == "memory"
        assert described["init_error"] == ""

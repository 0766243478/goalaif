import docker
import os
import time
import socket
from dataclasses import dataclass
from typing import Optional


@dataclass
class SandboxInfo:
    container_id: str
    rpc_url: str
    language: str


class DockerSandbox:
    def __init__(self):
        self.client = docker.from_env()
        self.active_containers: dict[str, docker.models.containers.Container] = {}

    def start_for_language(self, language: str, session_id: str,
                           fork_url: str = "", fork_block: int = 0) -> SandboxInfo:
        if language == "solidity":
            return self._start_evm_sandbox(session_id, fork_url, fork_block)
        elif language == "move":
            return self._start_move_sandbox(session_id)
        raise ValueError(f"Unknown language: {language}")

    def _start_evm_sandbox(self, session_id: str,
                           fork_url: str, fork_block: int) -> SandboxInfo:
        port = self._get_free_port()
        cmd = ["anvil", "--host", "0.0.0.0", "--port", "8545", "--silent"]
        if fork_url:
            cmd += ["--fork-url", fork_url]
        if fork_block:
            cmd += ["--fork-block-number", str(fork_block)]

        try:
            container = self.client.containers.run(
                image="ghcr.io/foundry-rs/foundry:latest",
                command=" ".join(cmd),
                ports={"8545/tcp": port},
                detach=True,
                remove=True,
                name=f"gaolaif-evm-{session_id[:12]}",
            )
        except docker.errors.ImageNotFound:
            import subprocess
            subprocess.run(["docker", "pull", "ghcr.io/foundry-rs/foundry:latest"], check=True)
            container = self.client.containers.run(
                image="ghcr.io/foundry-rs/foundry:latest",
                command=" ".join(cmd),
                ports={"8545/tcp": port},
                detach=True,
                remove=True,
                name=f"gaolaif-evm-{session_id[:12]}",
            )

        self.active_containers[session_id] = container
        time.sleep(3)
        return SandboxInfo(
            container_id=container.id,
            rpc_url=f"http://localhost:{port}",
            language="solidity",
        )

    def _start_move_sandbox(self, session_id: str) -> SandboxInfo:
        try:
            container = self.client.containers.run(
                image="gaolaif/move-sandbox:latest",
                command="sleep infinity",
                detach=True,
                remove=True,
                name=f"gaolaif-move-{session_id[:12]}",
            )
        except docker.errors.ImageNotFound:
            raise RuntimeError(
                "Move sandbox image not found. Build it first:\n"
                "  docker build -t gaolaif/move-sandbox:latest -f sandbox/docker/move/Dockerfile ."
            )

        self.active_containers[session_id] = container
        return SandboxInfo(
            container_id=container.id,
            rpc_url="",
            language="move",
        )

    def exec_in_sandbox(self, session_id: str, cmd: str) -> tuple[int, str]:
        container = self.active_containers.get(session_id)
        if not container:
            raise RuntimeError(f"No sandbox for session {session_id}")
        result = container.exec_run(cmd, demux=True)
        stdout = result.output[0].decode() if result.output[0] else ""
        stderr = result.output[1].decode() if result.output[1] else ""
        return result.exit_code, stdout + stderr

    def fund_whale_account(self, session_id: str, address: str, amount_eth: int = 10000):
        cmd = f'cast rpc anvil_setBalance {address} {hex(amount_eth * 10**18)}'
        self.exec_in_sandbox(session_id, cmd)

    def stop_sandbox(self, session_id: str):
        container = self.active_containers.pop(session_id, None)
        if container:
            try:
                container.kill()
            except Exception:
                pass

    def stop_all(self):
        for sid in list(self.active_containers.keys()):
            self.stop_sandbox(sid)

    def _get_free_port(self) -> int:
        with socket.socket() as s:
            s.bind(('', 0))
            return s.getsockname()[1]

import os
import time
import json
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ContainerInfo:
    container_id: str = ""
    rpc_url: str = ""
    language: str = "solidity"
    started: bool = False
    error: Optional[str] = None


@dataclass
class DockerConfig:
    evm_image: str = "gaolaif/evm-sandbox:latest"
    move_image: str = "gaolaif/move-sandbox:latest"
    fork_url: str = ""
    fork_block: int = 0
    rpc_port: int = 8545
    container_name_prefix: str = "gaolaif-"


class DockerRunner:
    def __init__(self, config: Optional[DockerConfig] = None):
        self.config = config or DockerConfig()
        self._docker_available = False
        self._check_docker()

    def _check_docker(self):
        import shutil
        self._docker_available = shutil.which("docker") is not None

    def is_available(self) -> bool:
        return self._docker_available

    def start(self, language: str = "solidity", session_id: str = "", fork_url: str = "") -> ContainerInfo:
        if not self._docker_available:
            return ContainerInfo(error="Docker is not available on this system")

        info = ContainerInfo(language=language)

        image = self.config.evm_image if language == "solidity" else self.config.move_image
        name = f"{self.config.container_name_prefix}{session_id or int(time.time())}"
        fork = fork_url or self.config.fork_url

        import subprocess
        try:
            # Check whether the image exists locally first
            inspect = subprocess.run(
                ["docker", "image", "inspect", image],
                capture_output=True, text=True, timeout=10,
            )
            if inspect.returncode != 0:
                return ContainerInfo(
                    error=f"Docker image '{image}' not found locally. "
                          f"Run 'docker pull {image}' or build the sandbox image first."
                )

            result = subprocess.run(
                ["docker", "run", "--rm", "-d",
                 "--name", name,
                 "-p", f"{self.config.rpc_port}:8545",
                 "-e", f"FORK_URL={fork}",
                 "-e", f"FORK_BLOCK={self.config.fork_block}",
                 image],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return ContainerInfo(error=f"Docker start failed: {result.stderr[:200]}")

            cid = result.stdout.strip()
            info.container_id = cid
            info.rpc_url = f"http://127.0.0.1:{self.config.rpc_port}"
            info.started = True

        except subprocess.TimeoutExpired:
            return ContainerInfo(error="Docker start timed out")
        except FileNotFoundError:
            return ContainerInfo(error="Docker binary not found")
        except Exception as e:
            return ContainerInfo(error=str(e))

        return info

    def stop(self, container_id: str) -> bool:
        if not self._docker_available:
            return False
        import subprocess
        try:
            result = subprocess.run(
                ["docker", "stop", container_id],
                capture_output=True, text=True, timeout=15,
            )
            return result.returncode == 0
        except Exception:
            return False

    def exec(self, container_id: str, cmd: list[str]) -> tuple[str, str]:
        import subprocess
        try:
            result = subprocess.run(
                ["docker", "exec", container_id] + cmd,
                capture_output=True, text=True, timeout=60,
            )
            return result.stdout, result.stderr
        except Exception as e:
            return "", str(e)

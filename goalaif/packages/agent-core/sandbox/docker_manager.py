import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional


class DockerManager:
    CONTAINER_IMAGES = {
        "solidity": "ghcr.io/foundry-rs/foundry:latest",
        "move": "mysten/sui-tools:latest",
    }

    def detect_project_type(self, project_path: str) -> Optional[str]:
        p = Path(project_path)
        if (p / "foundry.toml").exists() or (p / "hardhat.config.ts").exists() or (p / "hardhat.config.js").exists():
            return "solidity"
        if (p / "Move.toml").exists():
            return "move"
        return None

    def check_docker_available(self) -> bool:
        try:
            r = subprocess.run(["docker", "--version"], capture_output=True, timeout=5)
            return r.returncode == 0
        except Exception:
            return False

    def start_container(self, project_path: str, rpc_port: int = 8545) -> Dict[str, Any]:
        if not self.check_docker_available():
            return {"success": False, "error": "Docker not available"}

        project_type = self.detect_project_type(project_path)
        if not project_type:
            return {"success": False, "error": "Unknown project type"}

        image = self.CONTAINER_IMAGES.get(project_type)
        if not image:
            return {"success": False, "error": f"No image for {project_type}"}

        abs_path = str(Path(project_path).resolve())
        container_name = f"goalaif-{Path(project_path).stem}"

        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)

        cmd = [
            "docker", "run", "-d",
            "--name", container_name,
            "-v", f"{abs_path}:/workspace:ro",
            "-p", f"{rpc_port}:8545",
            "--entrypoint", "sleep",
            image, "infinity",
        ]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if r.returncode != 0:
                return {"success": False, "error": r.stderr}
            return {"success": True, "container_id": container_name, "project_type": project_type,
                    "rpc_port": rpc_port}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def stop_container(self, container_id: str):
        try:
            subprocess.run(["docker", "stop", container_id], capture_output=True, timeout=10)
            subprocess.run(["docker", "rm", container_id], capture_output=True, timeout=10)
        except Exception:
            pass

    def exec_command(self, container_id: str, cmd: list) -> Dict[str, Any]:
        try:
            full_cmd = ["docker", "exec", container_id] + cmd
            r = subprocess.run(full_cmd, capture_output=True, text=True, timeout=120)
            return {"success": r.returncode == 0, "stdout": r.stdout, "stderr": r.stderr}
        except Exception as e:
            return {"success": False, "error": str(e)}

class MoveSandbox:
    """
    Manages Move-based sandbox for Sui/Aptos smart contract testing.
    """

    def __init__(self, docker_sandbox, session_id: str):
        self.docker = docker_sandbox
        self.session_id = session_id

    def compile(self, project_path: str = ".") -> str:
        code, out = self.docker.exec_in_sandbox(
            self.session_id,
            f'sui move build --path {project_path}'
        )
        return out

    def test(self, project_path: str = ".") -> str:
        code, out = self.docker.exec_in_sandbox(
            self.session_id,
            f'sui move test --path {project_path}'
        )
        return out

    def aptos_compile(self, project_path: str = ".") -> str:
        code, out = self.docker.exec_in_sandbox(
            self.session_id,
            f'aptos move compile --package-dir {project_path}'
        )
        return out

    def aptos_test(self, project_path: str = ".") -> str:
        code, out = self.docker.exec_in_sandbox(
            self.session_id,
            f'aptos move test --package-dir {project_path}'
        )
        return out

    def fund_account(self, address: str) -> str:
        on_sui = f'sui client faucet --address {address}'
        return self.docker.exec_in_sandbox(self.session_id, on_sui)

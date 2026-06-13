// ──────────────────────────────────────────────
// Gaolaif — First-Run Setup Wizard
// ──────────────────────────────────────────────
// Installs Ollama, Foundry, Docker, PostgreSQL,
// and pulls required AI models.
// Emits progress events to the frontend via Tauri.
// ──────────────────────────────────────────────

use serde::Serialize;
use std::process::Command;
use tauri::{Manager, Window};

#[derive(Clone, Serialize)]
pub struct SetupStep {
    pub name: String,
    pub status: String,
    pub message: String,
}

#[tauri::command]
pub async fn run_setup_wizard(window: Window) -> Result<(), String> {
    let steps: Vec<(&str, fn() -> Result<String, String>)> = vec![
        ("ollama", check_and_install_ollama),
        ("foundry", check_and_install_foundry),
        ("docker", check_and_install_docker),
        ("postgres", start_postgres_container),
        ("models", pull_ollama_models),
    ];

    for (name, installer) in steps {
        let _ = window.emit(
            "setup-progress",
            SetupStep {
                name: name.to_string(),
                status: "running".to_string(),
                message: format!("Installing {}...", name),
            },
        );

        match installer() {
            Ok(msg) => {
                let _ = window.emit(
                    "setup-progress",
                    SetupStep {
                        name: name.to_string(),
                        status: "done".to_string(),
                        message: msg,
                    },
                );
            }
            Err(e) => {
                let _ = window.emit(
                    "setup-progress",
                    SetupStep {
                        name: name.to_string(),
                        status: "error".to_string(),
                        message: e.clone(),
                    },
                );
                return Err(e);
            }
        }
    }
    Ok(())
}

fn check_and_install_ollama() -> Result<String, String> {
    if Command::new("ollama").arg("--version").output().is_ok() {
        return Ok("Ollama already installed".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("brew")
            .args(["install", "ollama"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("sh")
            .args(["-c", "curl -fsSL https://ollama.ai/install.sh | sh"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("winget")
            .args(["install", "Ollama.Ollama", "--silent"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    Ok("Ollama installed successfully".to_string())
}

fn check_and_install_foundry() -> Result<String, String> {
    if Command::new("forge").arg("--version").output().is_ok() {
        return Ok("Foundry already installed".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("powershell")
            .args(["-Command", "iwr https://raw.githubusercontent.com/foundry-rs/foundry/master/foundryup/install.ps1 -OutFile install.ps1; powershell -File install.ps1; foundryup"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("sh")
            .args(["-c", "curl -L https://foundry.paradigm.xyz | bash && foundryup"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    Ok("Foundry installed successfully".to_string())
}

fn check_and_install_docker() -> Result<String, String> {
    if Command::new("docker").arg("--version").output().is_ok() {
        return Ok("Docker already installed".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("brew")
            .args(["--cask", "install", "docker"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("sh")
            .args(["-c", "curl -fsSL https://get.docker.com | sh"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("winget")
            .args(["install", "Docker.DockerDesktop", "--silent"])
            .status()
            .map_err(|e| e.to_string())?;
    }
    Ok("Docker installed successfully".to_string())
}

fn start_postgres_container() -> Result<String, String> {
    let check = Command::new("docker")
        .args(["container", "inspect", "gaolaif-db"])
        .output();
    if let Ok(out) = check {
        if out.status.success() {
            return Ok("PostgreSQL container already running".to_string());
        }
    }
    Command::new("docker")
        .args([
            "run", "-d",
            "--name", "gaolaif-db",
            "-e", "POSTGRES_USER=gaolaif",
            "-e", "POSTGRES_PASSWORD=gaolaif_local_only",
            "-e", "POSTGRES_DB=gaolaif",
            "-p", "5432:5432",
            "pgvector/pgvector:pg16",
        ])
        .status()
        .map_err(|e| format!("Failed to start PostgreSQL: {}", e))?;
    Ok("PostgreSQL container started".to_string())
}

fn pull_ollama_models() -> Result<String, String> {
    for model in &["nomic-embed-text", "deepseek-coder:6.7b", "codellama:13b"] {
        let status = Command::new("ollama")
            .args(["pull", model])
            .status()
            .map_err(|e| format!("Failed to pull {}: {}", model, e))?;
        if !status.success() {
            return Err(format!("Failed to pull model {}", model));
        }
    }
    Ok("All AI models ready".to_string())
}

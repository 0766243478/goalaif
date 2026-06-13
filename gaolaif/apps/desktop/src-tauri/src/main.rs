// ──────────────────────────────────────────────
// Gaolaif — Tauri Desktop Shell (Rust)
// ──────────────────────────────────────────────
// Commands:
//  - ingest_contract: reads file, validates, sends to agent-core
//  - get_audit_status: polls agent-core for AuditState
//  - apply_patch: sends patch to PatchVerifierAgent
//  - export_report: generates PDF/Markdown report
//  - run_setup_wizard: first-run dependency installer
// ──────────────────────────────────────────────

mod setup;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::Manager;

const AGENT_CORE_URL: &str = "http://localhost:8000";

// ── Structs ──────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
struct IngestResponse {
    session_id: String,
    status: String,
    findings_count: usize,
    exploit_count: usize,
    patch_validated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AuditStatusResponse {
    session_id: String,
    status: String,
    current_agent: String,
    iteration_count: u32,
    contract_name: String,
    findings_count: usize,
    exploit_count: usize,
    patch_validated: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct FindingsResponse {
    findings: Vec<Finding>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Finding {
    title: String,
    severity: String,
    category: String,
    location: String,
    confidence: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExploitProofsResponse {
    proofs: Vec<ExploitProof>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExploitProof {
    finding_id: String,
    confirmed: bool,
    attack_vector: String,
    estimated_impact: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PatchResponse {
    verified: bool,
    report: Option<String>,
    new_findings: Vec<Finding>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportResponse {
    #[serde(default)]
    report: Option<String>,
    #[serde(default)]
    findings: Option<Vec<Finding>>,
    #[serde(default)]
    proof_of_concepts: Option<Vec<ExploitProof>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct IngestPayload {
    contract_path: String,
    fork_url: String,
    target_address: String,
    chain: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PatchPayload {
    session_id: String,
    patch_content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ExportPayload {
    session_id: String,
    format: String,
}

// ── Tauri Commands ──────────────────────────

#[tauri::command]
async fn ingest_contract(
    contract_path: String,
    fork_url: Option<String>,
    target_address: Option<String>,
    chain: Option<String>,
) -> Result<IngestResponse, String> {
    let client = reqwest::Client::new();
    let payload = IngestPayload {
        contract_path,
        fork_url: fork_url.unwrap_or_else(|| "http://localhost:8545".into()),
        target_address: target_address.unwrap_or_default(),
        chain: chain.unwrap_or_else(|| "ethereum".into()),
    };

    let resp = client
        .post(format!("{}/ingest", AGENT_CORE_URL))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to agent-core: {}", e))?;

    let status = resp.status();
    let body = resp.text().await.map_err(|e| format!("Read error: {}", e))?;

    if status.is_success() {
        serde_json::from_str(&body).map_err(|e| format!("Parse error: {}", e))
    } else {
        Err(format!("Agent-core error ({}): {}", status, body))
    }
}

#[tauri::command]
async fn get_audit_status(session_id: String) -> Result<AuditStatusResponse, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/audit/{}", AGENT_CORE_URL, session_id))
        .send()
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    let body = resp.text().await.map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&body).map_err(|e| format!("Parse error: {}", e))
}

#[tauri::command]
async fn get_findings(session_id: String) -> Result<FindingsResponse, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/audit/{}/findings", AGENT_CORE_URL, session_id))
        .send()
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    let body = resp.text().await.map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&body).map_err(|e| format!("Parse error: {}", e))
}

#[tauri::command]
async fn get_exploit_proofs(session_id: String) -> Result<ExploitProofsResponse, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/audit/{}/proofs", AGENT_CORE_URL, session_id))
        .send()
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    let body = resp.text().await.map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&body).map_err(|e| format!("Parse error: {}", e))
}

#[tauri::command]
async fn apply_patch(session_id: String, patch_content: String) -> Result<PatchResponse, String> {
    let client = reqwest::Client::new();
    let payload = PatchPayload {
        session_id,
        patch_content,
    };

    let resp = client
        .post(format!("{}/audit/{}/patch", AGENT_CORE_URL, &payload.session_id))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    let body = resp.text().await.map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&body).map_err(|e| format!("Parse error: {}", e))
}

#[tauri::command]
async fn export_report(session_id: String, format: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let payload = ExportPayload {
        session_id,
        format: format.clone(),
    };

    let resp = client
        .post(format!("{}/export/{}", AGENT_CORE_URL, &payload.session_id))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    let body = resp.text().await.map_err(|e| format!("Read error: {}", e))?;

    if format == "json" {
        Ok(body)
    } else {
        Ok(body)
    }
}

// ── App Entry ────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            ingest_contract,
            get_audit_status,
            get_findings,
            get_exploit_proofs,
            apply_patch,
            export_report,
            setup::run_setup_wizard,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Gaolaif");
}

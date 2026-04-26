// src-tauri/src/sync.rs
use crate::{AppState, commands::QrSyncData};

pub async fn generate_pairing_qr() -> Result<QrSyncData, String> {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let session_id = format!("taby-{:x}", ts);
    Ok(QrSyncData {
        qr_data:    format!("taby://sync?session={}&v=1", session_id),
        session_id,
        expires_at: ts + 300,
    })
}

pub async fn accept_device(_session_id: String, _device_key: String) -> Result<bool, String> {
    Ok(true)
}

pub async fn push_state(
    _state_json: String,
    _state: &tauri::State<'_, AppState>,
) -> Result<(), String> {
    Ok(())
}

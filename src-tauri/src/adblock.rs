// src-tauri/src/adblock.rs
use crate::AppState;
pub fn init_rules(_state: &tauri::State<AppState>) {
    // Rules already initialized in AppState via load_adblock_rules()
    log::info!("Taby AdBlock initialized");
}

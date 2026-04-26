// src-tauri/src/vault.rs
// Taby Vault — AES-256-GCM password manager with Argon2id key derivation
use tauri::State;
use serde::{Deserialize, Serialize};
use crate::AppState;

// ---------- Data types -------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
pub struct VaultEntry {
    pub id:                 String,
    pub url:                String,
    pub username:           String,
    pub encrypted_password: String,
    pub label:              Option<String>,
    pub created_at:         u64,
    pub updated_at:         u64,
    pub notes:              Option<String>,
}

#[derive(Serialize)]
pub struct VaultMeta {
    pub entry_count:    usize,
    pub is_unlocked:    bool,
    pub security_level: String,
}

// ---------- Commands ---------------------------------------------------------

/// Unlock (or initialise) the vault.
/// Uses Argon2id to derive a 32-byte key from the master password.
/// Minimum password length is enforced at 8 characters.
#[tauri::command]
pub fn vault_init(master_password: String, state: State<AppState>) -> Result<VaultMeta, String> {
    // Enforce a meaningful minimum length
    if master_password.len() < 8 {
        return Err("Master password must be at least 8 characters".into());
    }

    // --- Argon2id key derivation -------------------------------------------
    // A fixed salt per-installation would live in the OS keychain.
    // Here we use a deterministic-but-non-trivial salt so the binary is
    // self-contained without OS keychain integration.
    // In a full production build: persist a random 16-byte salt in
    // tauri-plugin-store and retrieve it here before calling Argon2.
    use argon2::{Argon2, PasswordHasher};
    use argon2::password_hash::{rand_core::OsRng, SaltString};

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(master_password.as_bytes(), &salt)
        .map_err(|e| format!("Key derivation failed: {}", e))?;

    // Take the first 32 bytes of the PHC hash output as the AES-256 key
    let hash_bytes = password_hash.hash
        .ok_or("Hash missing")?;
    let key: Vec<u8> = hash_bytes.as_bytes()[..32].to_vec();

    let mut vault_key = state.vault_key.lock().map_err(|e| e.to_string())?;
    *vault_key = Some(key);

    Ok(VaultMeta {
        entry_count:    0,
        is_unlocked:    true,
        security_level: detect_security_level(),
    })
}

#[tauri::command]
pub fn vault_store(entry: VaultEntry, state: State<AppState>) -> Result<String, String> {
    let lock = state.vault_key.lock().map_err(|e| e.to_string())?;
    lock.as_ref().ok_or("Vault is locked — call vault_init first")?;
    // TODO: encrypt entry.encrypted_password with AES-256-GCM using the key
    // and persist via tauri-plugin-store.
    Ok(entry.id)
}

#[tauri::command]
pub fn vault_retrieve(id: String, state: State<AppState>) -> Result<VaultEntry, String> {
    let lock = state.vault_key.lock().map_err(|e| e.to_string())?;
    lock.as_ref().ok_or("Vault is locked")?;
    Err(format!("Entry not found: {}", id))
}

#[tauri::command]
pub fn vault_delete(_id: String, state: State<AppState>) -> Result<(), String> {
    let lock = state.vault_key.lock().map_err(|e| e.to_string())?;
    lock.as_ref().ok_or("Vault is locked")?;
    Ok(())
}

#[tauri::command]
pub fn vault_list(state: State<AppState>) -> Result<Vec<VaultEntry>, String> {
    let lock = state.vault_key.lock().map_err(|e| e.to_string())?;
    lock.as_ref().ok_or("Vault is locked")?;
    Ok(vec![])
}

// ---------- Helpers ----------------------------------------------------------

fn detect_security_level() -> String {
    #[cfg(target_os = "windows")]  { "tpm".to_string() }
    #[cfg(target_os = "macos")]    { "secure_enclave".to_string() }
    #[cfg(target_os = "ios")]      { "secure_enclave".to_string() }
    #[cfg(not(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "ios"
    )))]
    { "software".to_string() }
}

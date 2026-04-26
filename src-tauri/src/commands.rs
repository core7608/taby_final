// src-tauri/src/commands.rs
use tauri::State;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use crate::AppState;

// ── File info ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct FileInfo {
    pub name:       String,
    pub extension:  String,
    pub size:       u64,
    pub mime_type:  String,
    pub is_binary:  bool,
    pub path:       String,
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<FileInfo, String> {
    let p   = PathBuf::from(&path);
    if !p.exists() { return Err(format!("Not found: {}", path)); }
    let meta = std::fs::metadata(&p).map_err(|e| e.to_string())?;
    let ext  = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    Ok(FileInfo {
        name:      p.file_name().unwrap_or_default().to_string_lossy().into(),
        mime_type: detect_mime(&ext),
        is_binary: is_binary_ext(&ext),
        size:      meta.len(),
        extension: ext,
        path,
    })
}

#[tauri::command]
pub async fn read_text_file(path: String, max_bytes: Option<usize>) -> Result<String, String> {
    let bytes  = std::fs::read(&path).map_err(|e| e.to_string())?;
    let limit  = max_bytes.unwrap_or(5 * 1024 * 1024);
    Ok(String::from_utf8_lossy(&bytes[..bytes.len().min(limit)]).into_owned())
}

#[tauri::command]
pub async fn get_file_info(path: String) -> Result<FileInfo, String> {
    open_file(path).await
}

// ── Archive ───────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ArchiveEntry {
    pub name:            String,
    pub path:            String,
    pub size:            u64,
    pub is_dir:          bool,
    pub compressed_size: u64,
}

#[tauri::command]
pub async fn list_archive(path: String) -> Result<Vec<ArchiveEntry>, String> {
    let ext = PathBuf::from(&path)
        .extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    match ext.as_str() {
        "zip" => list_zip(&path),
        _     => Err(format!("Unsupported archive: {}", ext)),
    }
}

fn list_zip(path: &str) -> Result<Vec<ArchiveEntry>, String> {
    use std::fs::File;
    let f       = File::open(path).map_err(|e| e.to_string())?;
    let mut arc = zip::ZipArchive::new(f).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for i in 0..arc.len() {
        let e = arc.by_index(i).map_err(|e| e.to_string())?;
        // Security: reject path-traversal entries
        let name = e.name();
        if name.contains("..") || name.starts_with('/') || name.starts_with('\\') {
            return Err(format!("Unsafe archive entry: {}", name));
        }
        out.push(ArchiveEntry {
            name:            name.split('/').last().unwrap_or(name).into(),
            path:            name.into(),
            size:            e.size(),
            is_dir:          e.is_dir(),
            compressed_size: e.compressed_size(),
        });
    }
    Ok(out)
}

/// Extract a ZIP archive to `dest`, guarding against path-traversal attacks.
#[tauri::command]
pub async fn extract_archive(path: String, dest: String) -> Result<String, String> {
    let dest_path = Path::new(&dest).canonicalize()
        .unwrap_or_else(|_| PathBuf::from(&dest));
    std::fs::create_dir_all(&dest_path).map_err(|e| e.to_string())?;

    let ext = PathBuf::from(&path)
        .extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();

    match ext.as_str() {
        "zip" => {
            let f   = std::fs::File::open(&path).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(f).map_err(|e| e.to_string())?;

            for i in 0..archive.len() {
                let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
                let entry_name = entry.name().to_string();

                // ── Path-traversal guard ──────────────────────────────────
                if entry_name.contains("..") || entry_name.starts_with('/') || entry_name.starts_with('\\') {
                    return Err(format!("Unsafe path in archive: {}", entry_name));
                }

                let out_path = dest_path.join(&entry_name);

                // Ensure the resolved path is still inside dest
                let canonical = out_path.canonicalize()
                    .unwrap_or_else(|_| out_path.clone());
                if !canonical.starts_with(&dest_path) {
                    return Err(format!("Path traversal detected: {}", entry_name));
                }
                // ─────────────────────────────────────────────────────────

                if entry.is_dir() {
                    std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
                } else {
                    if let Some(parent) = out_path.parent() {
                        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                    }
                    let mut outfile = std::fs::File::create(&out_path)
                        .map_err(|e| e.to_string())?;
                    std::io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
                }
            }
            Ok(format!("Extracted to {}", dest))
        }
        _ => Err(format!("Unsupported: {}", ext)),
    }
}

// ── Network ───────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct FetchResponse {
    pub status:   u16,
    pub headers:  std::collections::HashMap<String, String>,
    pub body:     String,
    pub time_ms:  u64,
}

#[derive(Deserialize)]
pub struct FetchOptions {
    pub url:     String,
    pub method:  String,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub body:    Option<String>,
}

/// Fetch a URL. Only http/https schemes are permitted.
#[tauri::command]
pub async fn fetch_url(options: FetchOptions) -> Result<FetchResponse, String> {
    // Scheme validation — reject file://, javascript:, etc.
    let url_lower = options.url.to_lowercase();
    if !url_lower.starts_with("http://") && !url_lower.starts_with("https://") {
        return Err("Only http and https URLs are allowed".into());
    }

    use std::time::Instant;
    let start  = Instant::now();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build().map_err(|e| e.to_string())?;

    let method = match options.method.to_uppercase().as_str() {
        "POST"   => reqwest::Method::POST,
        "PUT"    => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH"  => reqwest::Method::PATCH,
        "HEAD"   => reqwest::Method::HEAD,
        _        => reqwest::Method::GET,
    };

    let mut req = client.request(method, &options.url);
    if let Some(hdrs) = options.headers {
        for (k, v) in hdrs { req = req.header(k, v); }
    }
    if let Some(b) = options.body { req = req.body(b); }

    let res    = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let mut resp_headers = std::collections::HashMap::new();
    for (k, v) in res.headers() {
        resp_headers.insert(k.to_string(), v.to_str().unwrap_or("").into());
    }
    let body = res.text().await.map_err(|e| e.to_string())?;

    Ok(FetchResponse { status, headers: resp_headers, body, time_ms: start.elapsed().as_millis() as u64 })
}

#[derive(Serialize)]
pub struct TunnelInfo { pub public_url: String, pub tunnel_id: String }

#[tauri::command]
pub async fn start_tunnel(local_port: u16) -> Result<TunnelInfo, String> {
    Ok(TunnelInfo {
        public_url: format!("https://taby-{}.bore.pub", local_port),
        tunnel_id:  uuid::Uuid::new_v4().to_string(),
    })
}

#[tauri::command]
pub async fn stop_tunnel(_tunnel_id: String) -> Result<(), String> { Ok(()) }

// ── System ────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct SystemInfo { pub os: String, pub arch: String, pub cpu_count: usize }

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        os:        std::env::consts::OS.into(),
        arch:      std::env::consts::ARCH.into(),
        cpu_count: num_cpus::get(),
    }
}

/// DevTools only available in debug builds — no-op in release.
#[tauri::command]
pub fn open_devtools(window: tauri::WebviewWindow) {
    #[cfg(debug_assertions)]
    window.open_devtools();
    #[cfg(not(debug_assertions))]
    let _ = window; // suppress unused-variable warning in release
}

// ── AdBlock ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn check_adblock(url: String, state: State<AppState>) -> bool {
    let rules = state.adblock_rules.lock().unwrap();
    rules.iter().any(|rule| {
        let domain = rule.trim_start_matches("||").split('^').next().unwrap_or("");
        url.contains(domain)
    })
}

#[tauri::command]
pub fn reload_adblock_rules(state: State<AppState>) -> usize {
    let mut rules = state.adblock_rules.lock().unwrap();
    *rules = crate::load_adblock_rules();
    rules.len()
}

// ── Browser importer ─────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct DetectedBrowser {
    pub name:          String,
    pub version:       String,
    pub profile_path:  String,
    pub has_bookmarks: bool,
    pub has_history:   bool,
    pub has_passwords: bool,
}

#[tauri::command]
pub fn detect_browsers() -> Vec<DetectedBrowser> {
    crate::importer::find_installed_browsers()
}

#[derive(Deserialize)]
pub struct ImportOptions {
    pub browser:           String,
    pub profile_path:      String,
    pub import_bookmarks:  bool,
    pub import_history:    bool,
    pub import_passwords:  bool,
}

#[derive(Serialize)]
pub struct ImportResult {
    pub bookmarks:      Vec<serde_json::Value>,
    pub history:        Vec<serde_json::Value>,
    pub password_count: usize,
}

#[tauri::command]
pub async fn import_from_browser(options: ImportOptions) -> Result<ImportResult, String> {
    crate::importer::import_browser_data(options).await
}

// ── Sync ──────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct QrSyncData { pub qr_data: String, pub session_id: String, pub expires_at: u64 }

#[tauri::command]
pub async fn generate_sync_qr() -> Result<QrSyncData, String> {
    crate::sync::generate_pairing_qr().await
}

#[tauri::command]
pub async fn sync_accept_connection(session_id: String, device_key: String) -> Result<bool, String> {
    crate::sync::accept_device(session_id, device_key).await
}

#[tauri::command]
pub async fn sync_push_state(
    state_json: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    crate::sync::push_state(state_json, &state).await
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn detect_mime(ext: &str) -> String {
    match ext {
        "pdf"  => "application/pdf",
        "zip"  => "application/zip",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "json" => "application/json",
        "xml"  => "application/xml",
        "html" => "text/html",
        "css"  => "text/css",
        "js" | "ts" => "text/javascript",
        "py"   => "text/x-python",
        "rs"   => "text/x-rust",
        "md"   => "text/markdown",
        "txt"  => "text/plain",
        _      => "application/octet-stream",
    }.to_string()
}

fn is_binary_ext(ext: &str) -> bool {
    matches!(ext,
        "pdf"|"zip"|"rar"|"docx"|"xlsx"|"pptx"|
        "jpg"|"jpeg"|"png"|"gif"|"webp"|
        "mp4"|"mp3"|"exe"|"dmg"|"deb"|"apk")
}

// src-tauri/src/lib.rs
// Shared entry point for Desktop + Mobile (Android & iOS)
// Pattern: https://v2.tauri.app/start/project-structure/

pub mod commands;
pub mod universal_viewer;
pub mod vault;
pub mod sync;
pub mod adblock;
pub mod importer;
pub mod updater;

use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;

pub struct AppState {
    pub adblock_rules: Mutex<Vec<String>>,
    pub vault_key:     Mutex<Option<Vec<u8>>>,
    pub sync_key:      Mutex<Option<Vec<u8>>>,
}

pub fn load_adblock_rules() -> Vec<String> {
    vec![
        "||doubleclick.net^".into(),
        "||googlesyndication.com^".into(),
        "||googletagmanager.com^".into(),
        "||facebook.com/tr^".into(),
        "||analytics.google.com^".into(),
        "||scorecardresearch.com^".into(),
        "||outbrain.com^".into(),
        "||taboola.com^".into(),
        "||quantserve.com^".into(),
        "||ads.youtube.com^".into(),
    ]
}

// ── Mobile entry point ────────────────────────────────────────────────────────
// #[cfg_attr(mobile, tauri::mobile_entry_point)] exports the symbols that
// Tauri's Gradle (Android) and Xcode (iOS) build scripts look for in the .so/.a
// Without this: "does not include required runtime symbols"
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ── FIX: cfg on method chains is invalid Rust syntax.
    // Solution: build the app in setup() and add desktop-only plugins there.
    // The updater plugin is desktop-only — add it conditionally inside setup.
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            adblock_rules: Mutex::new(load_adblock_rules()),
            vault_key:     Mutex::new(None),
            sync_key:      Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::read_text_file,
            commands::list_archive,
            commands::extract_archive,
            commands::get_file_info,
            commands::fetch_url,
            commands::start_tunnel,
            commands::stop_tunnel,
            vault::vault_init,
            vault::vault_store,
            vault::vault_retrieve,
            vault::vault_delete,
            vault::vault_list,
            commands::generate_sync_qr,
            commands::sync_accept_connection,
            commands::sync_push_state,
            commands::check_adblock,
            commands::reload_adblock_rules,
            commands::detect_browsers,
            commands::import_from_browser,
            commands::get_system_info,
            commands::open_devtools,
            updater::check_for_updates,
            updater::install_update,
        ])
        .setup(|app| {
            // Desktop-only: updater auto-check + tray icon
            // Using setup() is the correct way to do conditional init in Tauri 2
            #[cfg(desktop)]
            {
                // Add updater plugin at runtime (desktop only)
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;

                // Auto-check for updates 3s after launch
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                    let _ = handle.emit("check-update", ());
                });

                // System tray
                setup_tray(app)?;
            }
            Ok(())
        });

    builder
        .run(tauri::generate_context!())
        .expect("error while running Taby");
}

// ── Desktop-only: system tray ─────────────────────────────────────────────────
#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::TrayIconBuilder;

    let show = MenuItemBuilder::new("Show Taby").id("show").build(app)?;
    let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
    let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Taby Browser")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => app.exit(0),
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

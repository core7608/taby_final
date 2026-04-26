// src-tauri/src/updater.rs
// Desktop-only — tauri-plugin-updater is not available on Android/iOS
// Mobile updates go through the App Store / Google Play

#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(desktop)]
    {
        let updater = app.updater_builder()
            .build()
            .map_err(|e| e.to_string())?;
        let update = updater.check().await.map_err(|e| e.to_string())?;
        Ok(update.is_some())
    }
    #[cfg(not(desktop))]
    {
        let _ = app;
        // On mobile, updates are managed by the platform store
        Ok(false)
    }
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let updater = app.updater_builder()
            .build()
            .map_err(|e| e.to_string())?;
        if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
            update
                .download_and_install(|_, _| {}, || {})
                .await
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    #[cfg(not(desktop))]
    {
        let _ = app;
        Ok(())
    }
}

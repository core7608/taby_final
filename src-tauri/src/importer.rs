// src-tauri/src/importer.rs
use crate::commands::{DetectedBrowser, ImportOptions, ImportResult};
use std::path::Path;

pub fn find_installed_browsers() -> Vec<DetectedBrowser> {
    let mut browsers = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let paths = [
            (format!("{}\\Google\\Chrome\\User Data\\Default", local), "Google Chrome"),
            (format!("{}\\Microsoft\\Edge\\User Data\\Default",  local), "Microsoft Edge"),
            (format!("{}\\BraveSoftware\\Brave-Browser\\User Data\\Default", local), "Brave"),
        ];
        for (p, name) in &paths {
            if Path::new(p).exists() {
                browsers.push(DetectedBrowser {
                    name:          name.to_string(),
                    version:       "latest".into(),
                    profile_path:  p.clone(),
                    has_bookmarks: true,
                    has_history:   true,
                    has_passwords: false,
                });
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        let paths = [
            (format!("{}/Library/Application Support/Google/Chrome/Default", home), "Google Chrome"),
            (format!("{}/Library/Application Support/Microsoft Edge/Default", home), "Microsoft Edge"),
            (format!("{}/Library/Application Support/BraveSoftware/Brave-Browser/Default", home), "Brave"),
            (format!("{}/Library/Application Support/Firefox/Profiles", home), "Firefox"),
        ];
        for (p, name) in &paths {
            if Path::new(p).exists() {
                browsers.push(DetectedBrowser {
                    name:          name.to_string(),
                    version:       "latest".into(),
                    profile_path:  p.clone(),
                    has_bookmarks: true,
                    has_history:   true,
                    has_passwords: false,
                });
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        let paths = [
            (format!("{}/.config/google-chrome/Default", home), "Google Chrome"),
            (format!("{}/.config/chromium/Default", home), "Chromium"),
            (format!("{}/.mozilla/firefox", home), "Firefox"),
        ];
        for (p, name) in &paths {
            if Path::new(p).exists() {
                browsers.push(DetectedBrowser {
                    name:          name.to_string(),
                    version:       "latest".into(),
                    profile_path:  p.clone(),
                    has_bookmarks: true,
                    has_history:   true,
                    has_passwords: false,
                });
            }
        }
    }

    browsers
}

pub async fn import_browser_data(options: ImportOptions) -> Result<ImportResult, String> {
    // Security: validate that profile_path resolves inside the user's home dir
    validate_profile_path(&options.profile_path)?;

    let bookmarks = if options.import_bookmarks {
        read_chrome_bookmarks(&options.profile_path).unwrap_or_default()
    } else { vec![] };

    Ok(ImportResult {
        bookmarks,
        history:        vec![],
        password_count: 0,
    })
}

/// Reject profile paths that escape the user's home directory.
fn validate_profile_path(profile: &str) -> Result<(), String> {
    // Must not contain path traversal
    if profile.contains("..") {
        return Err("Invalid profile path: path traversal not allowed".into());
    }

    // Must be an existing directory
    let p = Path::new(profile);
    if !p.is_dir() {
        return Err(format!("Profile path is not a directory: {}", profile));
    }

    // Must live under the user's home directory
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    if !home.is_empty() && !profile.starts_with(&home) {
        return Err("Profile path is outside the user home directory".into());
    }

    Ok(())
}

fn read_chrome_bookmarks(profile: &str) -> Result<Vec<serde_json::Value>, String> {
    let path = format!("{}/Bookmarks", profile);
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Cannot read {}: {}", path, e))?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;
    let mut results = vec![];
    if let Some(items) = json["roots"]["bookmark_bar"]["children"].as_array() {
        for item in items {
            if item["type"] == "url" {
                results.push(serde_json::json!({
                    "title": item["name"],
                    "url":   item["url"],
                    "addedAt": item["date_added"]
                }));
            }
        }
    }
    Ok(results)
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Desktop entry point — delegates to lib.rs run()
// This is the official Tauri 2 pattern per:
// https://v2.tauri.app/start/project-structure/
fn main() {
    taby_lib::run();
}

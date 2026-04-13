
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;

/// Basic diagnostic information returned to the frontend via Tauri IPC.
#[derive(Serialize)]
struct Diagnostics {
  app_version: String,
  os: String,
  arch: String,
}

/// Returns lightweight system diagnostics that can be surfaced in the UI.
#[tauri::command]
fn get_diagnostics() -> Diagnostics {
  Diagnostics {
    app_version: env!("CARGO_PKG_VERSION").to_string(),
    os: std::env::consts::OS.to_string(),
    arch: std::env::consts::ARCH.to_string(),
  }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_diagnostics])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

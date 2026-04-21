//! Studio's Tauri shell — a thin binding that pins Studio's branding
//! (`tauri.conf.json`) and delegates all runtime plumbing to `desktop_lib`.
//!
//! To add a Tauri plugin or command for Listo, change `desktop_lib` —
//! never add a handler here, otherwise it won't be shared with other
//! front-ends that consume the same shell.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    desktop_lib::run_with_context(tauri::generate_context!());
}

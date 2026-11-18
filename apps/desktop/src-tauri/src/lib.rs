//! FLASHRECOVERY AI — Tauri backend.
//!
//! This layer is intentionally thin: it owns the database connection and
//! exposes a small, explicit set of commands. All validation and business
//! rules live in `flashrecovery-core` so they are unit-tested independently.
//!
//! Stage 1 exposes **no** commands that touch storage devices.

mod commands;

use std::sync::Mutex;
use tauri::Manager;

use flashrecovery_core::{audit, db, settings};

pub struct AppState {
    pub conn: Mutex<db::Connection>,
    pub db_path: std::path::PathBuf,
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let db_path = dir.join("flashrecovery.db");
            let mut conn = db::open(&db_path).map_err(|e| format!("failed to open database: {e}"))?;
            let actor = settings::operator(&conn)?;
            let schema_version = db::schema_version(&conn)?;
            audit::record(
                &mut conn,
                &actor,
                "app.started",
                "",
                serde_json::json!({
                    "version": env!("CARGO_PKG_VERSION"),
                    "os": std::env::consts::OS,
                    "arch": std::env::consts::ARCH,
                    "schema_version": schema_version,
                }),
            )?;
            app.manage(AppState {
                conn: Mutex::new(conn),
                db_path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::dashboard_summary,
            commands::settings_get_all,
            commands::settings_set,
            commands::cases_list,
            commands::case_get,
            commands::case_create,
            commands::case_update,
            commands::case_delete,
            commands::audit_list,
            commands::audit_verify,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FLASHRECOVERY AI");
}

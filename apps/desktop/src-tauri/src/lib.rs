//! FLASHRECOVERY AI — Tauri backend.
//!
//! This layer is intentionally thin: it owns the database connection and
//! exposes a small, explicit set of commands. All validation and business
//! rules live in `flashrecovery-core` so they are unit-tested independently.
//!
//! Stage 1 exposes **no** commands that touch storage devices.

mod applog;
mod commands;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

use flashrecovery_core::{audit, db, settings, CoreResult};

pub struct AppState {
    /// `None` when the database could not be opened at startup. The window
    /// still opens so the reason can be shown; every data command then fails
    /// with `startup_error` instead of the app silently exiting.
    pub conn: Mutex<Option<db::Connection>>,
    pub startup_error: Option<String>,
    pub db_path: PathBuf,
    pub log_dir: Option<PathBuf>,
}

/// Open the database and record `app.started`.
fn open_database(db_path: &std::path::Path) -> CoreResult<db::Connection> {
    let mut conn = db::open(db_path)?;
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
    Ok(conn)
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let log_dir = app.path().app_log_dir().ok();
            let (conn, startup_error, db_path) = match app.path().app_data_dir() {
                Ok(dir) => {
                    let db_path = dir.join("flashrecovery.db");
                    match open_database(&db_path) {
                        Ok(c) => (Some(c), None, db_path),
                        Err(e) => {
                            let detail = match &e {
                                flashrecovery_core::CoreError::Database(inner) => format!("{e}: {inner}"),
                                _ => e.to_string(),
                            };
                            applog::error(
                                log_dir.as_deref(),
                                &format!("startup: database {} could not be opened: {detail}", db_path.display()),
                            );
                            (None, Some(e.to_string()), db_path)
                        }
                    }
                }
                Err(e) => {
                    applog::error(
                        log_dir.as_deref(),
                        &format!("startup: no application data directory: {e}"),
                    );
                    (
                        None,
                        Some("the application data folder could not be located".into()),
                        PathBuf::new(),
                    )
                }
            };
            app.manage(AppState {
                conn: Mutex::new(conn),
                startup_error,
                db_path,
                log_dir,
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

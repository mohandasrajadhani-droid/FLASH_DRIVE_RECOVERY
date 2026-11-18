//! Tauri commands. Each command:
//!   1. takes typed arguments (deserialised by Tauri — no shell, no string SQL),
//!   2. delegates to `flashrecovery-core`, which validates every input,
//!   3. returns `Result<T, CoreError>`, serialised to the UI as `{kind, message}`.

use serde::Serialize;
use tauri::State;

use flashrecovery_core::{audit, cases, db, settings, summary, CoreError, CoreResult};

use crate::AppState;

fn with_conn<T>(state: &State<'_, AppState>, f: impl FnOnce(&mut db::Connection) -> CoreResult<T>) -> CoreResult<T> {
    let mut guard = state
        .conn
        .lock()
        .map_err(|_| CoreError::Internal("database lock poisoned; restart the application".into()))?;
    let res = f(&mut guard);
    if let Err(CoreError::Database(e)) = &res {
        // Full detail goes to the local log only; the UI gets a generic message.
        eprintln!("[flashrecovery] database error: {e}");
    }
    res
}

#[derive(Serialize)]
pub struct AppInfo {
    pub name: &'static str,
    pub version: &'static str,
    pub os: &'static str,
    pub arch: &'static str,
    pub debug_build: bool,
    pub database_path: String,
    pub schema_version: i64,
    pub sqlite_version: &'static str,
}

#[tauri::command]
pub fn app_info(state: State<'_, AppState>) -> CoreResult<AppInfo> {
    with_conn(&state, |c| {
        Ok(AppInfo {
            name: "FLASHRECOVERY AI",
            version: env!("CARGO_PKG_VERSION"),
            os: std::env::consts::OS,
            arch: std::env::consts::ARCH,
            debug_build: cfg!(debug_assertions),
            database_path: state.db_path.display().to_string(),
            schema_version: db::schema_version(c)?,
            sqlite_version: db::sqlite_version(),
        })
    })
}

#[tauri::command]
pub fn dashboard_summary(state: State<'_, AppState>) -> CoreResult<summary::DashboardSummary> {
    with_conn(&state, |c| summary::dashboard(c))
}

#[tauri::command]
pub fn settings_get_all(state: State<'_, AppState>) -> CoreResult<Vec<settings::Setting>> {
    with_conn(&state, |c| settings::get_all(c))
}

#[tauri::command]
pub fn settings_set(state: State<'_, AppState>, key: String, value: String) -> CoreResult<settings::Setting> {
    let key = settings::SettingKey::parse(&key)?;
    with_conn(&state, |c| settings::set(c, key, &value))
}

#[tauri::command]
pub fn cases_list(
    state: State<'_, AppState>,
    status: Option<String>,
    search: Option<String>,
) -> CoreResult<Vec<cases::Case>> {
    with_conn(&state, |c| cases::list(c, status.as_deref(), search.as_deref(), None))
}

#[tauri::command]
pub fn case_get(state: State<'_, AppState>, id: String) -> CoreResult<cases::Case> {
    with_conn(&state, |c| cases::get(c, &id))
}

#[tauri::command]
pub fn case_create(state: State<'_, AppState>, input: cases::CaseInput) -> CoreResult<cases::Case> {
    with_conn(&state, |c| cases::create(c, &input))
}

#[tauri::command]
pub fn case_update(state: State<'_, AppState>, id: String, input: cases::CaseInput) -> CoreResult<cases::Case> {
    with_conn(&state, |c| cases::update(c, &id, &input))
}

#[tauri::command]
pub fn case_delete(state: State<'_, AppState>, id: String) -> CoreResult<()> {
    with_conn(&state, |c| cases::delete(c, &id))
}

#[tauri::command]
pub fn audit_list(
    state: State<'_, AppState>,
    limit: Option<u32>,
    before_seq: Option<i64>,
) -> CoreResult<Vec<audit::AuditEvent>> {
    with_conn(&state, |c| audit::list(c, limit, before_seq))
}

#[tauri::command]
pub fn audit_verify(state: State<'_, AppState>) -> CoreResult<audit::ChainVerification> {
    with_conn(&state, |c| audit::verify_chain(c))
}

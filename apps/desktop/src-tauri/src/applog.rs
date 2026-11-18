//! Minimal local error log.
//!
//! Release builds on Windows run without a console (`windows_subsystem =
//! "windows"`), so anything written to stderr is lost. Errors that must be
//! diagnosable on a customer machine are appended here as well:
//! `<app log dir>/flashrecovery.log` (on Windows:
//! `%LOCALAPPDATA%\ai.flashrecovery.desktop\logs\flashrecovery.log`).
//!
//! The log never contains customer data: callers pass error messages only.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Rotate to `flashrecovery.log.old` once the log passes this size.
const MAX_BYTES: u64 = 1024 * 1024;

pub fn log_path(dir: &Path) -> PathBuf {
    dir.join("flashrecovery.log")
}

/// Append one timestamped line. Logging must never take the app down, so
/// every I/O failure here is ignored after a best-effort stderr message.
pub fn error(dir: Option<&Path>, msg: &str) {
    eprintln!("[flashrecovery] {msg}");
    let Some(dir) = dir else { return };
    if let Err(e) = append(dir, msg) {
        eprintln!("[flashrecovery] could not write log file: {e}");
    }
}

fn append(dir: &Path, msg: &str) -> std::io::Result<()> {
    std::fs::create_dir_all(dir)?;
    let path = log_path(dir);
    if std::fs::metadata(&path).map(|m| m.len() > MAX_BYTES).unwrap_or(false) {
        std::fs::rename(&path, dir.join("flashrecovery.log.old"))?;
    }
    let ts = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let line = msg.replace(['\r', '\n'], " ");
    let mut f = OpenOptions::new().create(true).append(true).open(&path)?;
    writeln!(f, "{ts} ERROR {line}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn appends_single_line_entries() {
        let dir = std::env::temp_dir().join(format!("fr-log-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        error(Some(&dir), "first\nwith newline");
        error(Some(&dir), "second");
        let text = std::fs::read_to_string(log_path(&dir)).unwrap();
        let lines: Vec<_> = text.lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].ends_with("ERROR first with newline"));
        assert!(lines[1].ends_with("ERROR second"));
        std::fs::remove_dir_all(&dir).unwrap();
    }
}

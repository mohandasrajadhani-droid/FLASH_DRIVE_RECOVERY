//! SQLite connection setup and checksummed, forward-only migrations.

pub use rusqlite::Connection;
use rusqlite::{params, OptionalExtension};
use sha2::{Digest, Sha256};
use std::path::Path;

use crate::{now_rfc3339, CoreError, CoreResult};

/// A migration compiled into the binary. Order matters; versions must be
/// strictly increasing and never reused.
pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub sql: &'static str,
}

pub const MIGRATIONS: &[Migration] = &[Migration {
    version: 1,
    name: "initial_schema",
    sql: include_str!("../../database/migrations/0001_initial_schema.sql"),
}];

pub fn latest_schema_version() -> i64 {
    MIGRATIONS.last().map(|m| m.version).unwrap_or(0)
}

/// SHA-256 of the migration text with line endings normalised to LF, so a
/// checkout with CRLF endings (Git for Windows `core.autocrlf=true`) yields
/// the same checksum as an LF checkout. Without this, a database created by
/// one build would be rejected as "modified" by a build from another checkout.
fn checksum(sql: &str) -> String {
    hex::encode(Sha256::digest(sql.replace("\r\n", "\n").as_bytes()))
}

/// Open (or create) the application database at `path` and apply pending
/// migrations. Parent directories are created if missing.
pub fn open(path: &Path) -> CoreResult<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| CoreError::Validation(format!("cannot create database directory: {e}")))?;
    }
    let conn = Connection::open(path)?;
    configure(&conn)?;
    migrate(&conn)?;
    Ok(conn)
}

/// In-memory database with the full schema — used by tests.
pub fn open_in_memory() -> CoreResult<Connection> {
    let conn = Connection::open_in_memory()?;
    configure(&conn)?;
    migrate(&conn)?;
    Ok(conn)
}

fn configure(conn: &Connection) -> CoreResult<()> {
    conn.pragma_update(None, "foreign_keys", "ON")?;
    // WAL is not available for in-memory DBs; ignore the returned mode.
    let _: String = conn.query_row("PRAGMA journal_mode = WAL", [], |r| r.get(0))?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    conn.pragma_update(None, "secure_delete", "ON")?;
    conn.busy_timeout(std::time::Duration::from_secs(5))?;
    Ok(())
}

/// Apply all pending migrations. Each runs in its own transaction.
/// Fails with [`CoreError::Integrity`] if an already-applied migration's
/// checksum no longer matches, or if the database is newer than this build.
pub fn migrate(conn: &Connection) -> CoreResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version     INTEGER PRIMARY KEY NOT NULL,
            name        TEXT NOT NULL,
            checksum    TEXT NOT NULL,
            applied_at  TEXT NOT NULL
        );",
    )?;

    let db_max: i64 = conn.query_row("SELECT COALESCE(MAX(version),0) FROM schema_migrations", [], |r| {
        r.get(0)
    })?;
    if db_max > latest_schema_version() {
        return Err(CoreError::Integrity(format!(
            "database schema version {db_max} is newer than this application supports ({})",
            latest_schema_version()
        )));
    }

    for m in MIGRATIONS {
        let expected = checksum(m.sql);
        let applied: Option<String> = conn
            .query_row(
                "SELECT checksum FROM schema_migrations WHERE version = ?1",
                params![m.version],
                |r| r.get(0),
            )
            .optional()?;
        match applied {
            Some(stored) if stored == expected => continue,
            Some(_) => {
                return Err(CoreError::Integrity(format!(
                    "migration {} ({}) was modified after being applied",
                    m.version, m.name
                )))
            }
            None => {
                let tx = conn.unchecked_transaction()?;
                tx.execute_batch(m.sql)?;
                tx.execute(
                    "INSERT INTO schema_migrations(version,name,checksum,applied_at) VALUES (?1,?2,?3,?4)",
                    params![m.version, m.name, expected, now_rfc3339()],
                )?;
                tx.commit()?;
            }
        }
    }
    Ok(())
}

pub fn schema_version(conn: &Connection) -> CoreResult<i64> {
    Ok(
        conn.query_row("SELECT COALESCE(MAX(version),0) FROM schema_migrations", [], |r| {
            r.get(0)
        })?,
    )
}

pub fn sqlite_version() -> &'static str {
    rusqlite::version()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_apply_and_are_idempotent() {
        let conn = open_in_memory().unwrap();
        assert_eq!(schema_version(&conn).unwrap(), latest_schema_version());
        migrate(&conn).unwrap(); // second run is a no-op
        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, MIGRATIONS.len() as i64);
    }

    #[test]
    fn tampered_migration_is_rejected() {
        let conn = open_in_memory().unwrap();
        conn.execute(
            "UPDATE schema_migrations SET checksum = 'deadbeef' WHERE version = 1",
            [],
        )
        .unwrap();
        assert!(matches!(migrate(&conn), Err(CoreError::Integrity(_))));
    }

    #[test]
    fn checksum_ignores_line_endings() {
        let lf = "CREATE TABLE a (x INTEGER);\nCREATE TABLE b (y TEXT);\n";
        let crlf = lf.replace('\n', "\r\n");
        assert_eq!(checksum(lf), checksum(&crlf));
        // Every shipped migration hashes the same in either form.
        for m in MIGRATIONS {
            assert_eq!(
                checksum(m.sql),
                checksum(&m.sql.replace("\r\n", "\n").replace('\n', "\r\n"))
            );
        }
        assert_ne!(checksum(lf), checksum("CREATE TABLE a (x INTEGER);\n"));
    }

    #[test]
    fn newer_database_is_rejected() {
        let conn = open_in_memory().unwrap();
        conn.execute(
            "INSERT INTO schema_migrations(version,name,checksum,applied_at) VALUES (999,'future','x','now')",
            [],
        )
        .unwrap();
        assert!(matches!(migrate(&conn), Err(CoreError::Integrity(_))));
    }

    #[test]
    fn file_database_persists_across_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("app.db");
        {
            let c = open(&path).unwrap();
            c.execute("INSERT INTO app_meta(key,value) VALUES ('k','v')", [])
                .unwrap();
        }
        let c = open(&path).unwrap();
        let v: String = c
            .query_row("SELECT value FROM app_meta WHERE key='k'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(v, "v");
        let mode: String = c.query_row("PRAGMA journal_mode", [], |r| r.get(0)).unwrap();
        assert_eq!(mode.to_lowercase(), "wal");
    }
}

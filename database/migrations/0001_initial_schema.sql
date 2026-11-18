-- FLASHRECOVERY AI — migration 0001: initial schema
-- Applied once, inside a transaction, by recovery-service/src/db.rs.
-- NEVER edit an applied migration: the runner stores a SHA-256 checksum of
-- this file and refuses to start if it changes. Add a new migration instead.

CREATE TABLE app_meta (
    key         TEXT PRIMARY KEY NOT NULL,
    value       TEXT NOT NULL
);

-- Whitelisted, typed application settings (validated in Rust before write).
CREATE TABLE settings (
    key         TEXT PRIMARY KEY NOT NULL,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- Customer / technician cases (Stage 1: basic CRUD; extended in Stage 7).
CREATE TABLE cases (
    id                  TEXT PRIMARY KEY NOT NULL,       -- UUID v4
    case_number         TEXT NOT NULL UNIQUE,            -- e.g. FR-2026-0001
    customer_name       TEXT NOT NULL,
    customer_contact    TEXT NOT NULL DEFAULT '',
    device_description  TEXT NOT NULL DEFAULT '',
    status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','in_progress','awaiting_customer','completed','closed')),
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_updated ON cases(updated_at);

-- Tamper-evident, append-only audit trail.
-- Each row's hash = SHA-256(prev_hash | seq | ts | actor | action | target | details).
CREATE TABLE audit_log (
    seq         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT NOT NULL,
    actor       TEXT NOT NULL,
    action      TEXT NOT NULL,
    target      TEXT NOT NULL DEFAULT '',
    details     TEXT NOT NULL DEFAULT '{}',
    prev_hash   TEXT NOT NULL,
    hash        TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_audit_ts ON audit_log(ts);

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(ABORT, 'audit_log is append-only');
END;

//! FLASHRECOVERY AI — core library.
//!
//! This crate is deliberately platform-independent so it can be unit-tested
//! on any OS. It owns everything that does not touch storage hardware:
//!
//! * [`db`]         – SQLite connection setup and checksummed migrations
//! * [`audit`]      – append-only, hash-chained audit trail
//! * [`settings`]   – whitelisted, typed application settings
//! * [`cases`]      – customer case CRUD (Stage 1 basic CRUD)
//! * [`validation`] – input validation shared by every command
//! * [`summary`]    – read-only aggregates for the Overview Dashboard
//!
//! Device access, imaging and recovery engines arrive in later stages and
//! will live in separate modules with their own safety reviews.

pub mod audit;
pub mod cases;
pub mod db;
pub mod error;
pub mod settings;
pub mod summary;
pub mod validation;

pub use error::{CoreError, CoreResult};

/// Current UTC time as RFC 3339 with millisecond precision.
pub(crate) fn now_rfc3339() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

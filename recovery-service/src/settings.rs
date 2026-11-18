//! Whitelisted, typed application settings.
//!
//! Only keys defined in [`SettingKey`] can be read or written; every value is
//! validated against its key's rules. Every change is audited atomically.

use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::Serialize;

use crate::{audit, now_rfc3339, validation, CoreError, CoreResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettingKey {
    /// "easy" | "professional"
    UiMode,
    /// "true" | "false"
    UiReduceMotion,
    /// Name recorded as the actor in the audit trail.
    OperatorName,
}

impl SettingKey {
    pub const ALL: [SettingKey; 3] = [SettingKey::UiMode, SettingKey::UiReduceMotion, SettingKey::OperatorName];

    pub fn as_str(self) -> &'static str {
        match self {
            SettingKey::UiMode => "ui.mode",
            SettingKey::UiReduceMotion => "ui.reduce_motion",
            SettingKey::OperatorName => "operator.name",
        }
    }

    pub fn parse(s: &str) -> CoreResult<Self> {
        Self::ALL.into_iter().find(|k| k.as_str() == s).ok_or_else(|| {
            CoreError::Validation(format!("unknown setting '{}'", s.chars().take(64).collect::<String>()))
        })
    }

    pub fn default_value(self) -> &'static str {
        match self {
            SettingKey::UiMode => "easy",
            SettingKey::UiReduceMotion => "false",
            SettingKey::OperatorName => "local-user",
        }
    }

    fn validate(self, value: &str) -> CoreResult<String> {
        match self {
            SettingKey::UiMode => match value {
                "easy" | "professional" => Ok(value.into()),
                _ => Err(CoreError::Validation("ui.mode must be 'easy' or 'professional'".into())),
            },
            SettingKey::UiReduceMotion => match value {
                "true" | "false" => Ok(value.into()),
                _ => Err(CoreError::Validation(
                    "ui.reduce_motion must be 'true' or 'false'".into(),
                )),
            },
            SettingKey::OperatorName => validation::single_line("operator name", value, 64, true),
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub is_default: bool,
}

pub fn get(conn: &Connection, key: SettingKey) -> CoreResult<Setting> {
    let stored: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key.as_str()],
            |r| r.get(0),
        )
        .optional()?;
    Ok(match stored {
        Some(value) => Setting {
            key: key.as_str().into(),
            value,
            is_default: false,
        },
        None => Setting {
            key: key.as_str().into(),
            value: key.default_value().into(),
            is_default: true,
        },
    })
}

pub fn get_all(conn: &Connection) -> CoreResult<Vec<Setting>> {
    SettingKey::ALL.into_iter().map(|k| get(conn, k)).collect()
}

pub fn operator(conn: &Connection) -> CoreResult<String> {
    Ok(get(conn, SettingKey::OperatorName)?.value)
}

/// Validate and store a setting, recording old → new in the audit log.
pub fn set(conn: &mut Connection, key: SettingKey, value: &str) -> CoreResult<Setting> {
    let value = key.validate(value.trim())?;
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let old = get(&tx, key)?;
    let actor = operator(&tx)?;
    if old.value != value || old.is_default {
        tx.execute(
            "INSERT INTO settings(key,value,updated_at) VALUES (?1,?2,?3)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            params![key.as_str(), value, now_rfc3339()],
        )?;
        audit::append(
            &tx,
            &actor,
            "settings.changed",
            key.as_str(),
            serde_json::json!({ "from": old.value, "to": value }),
        )?;
    }
    tx.commit()?;
    get(conn, key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn defaults_then_set_and_audit() {
        let mut c = open_in_memory().unwrap();
        let s = get(&c, SettingKey::UiMode).unwrap();
        assert_eq!((s.value.as_str(), s.is_default), ("easy", true));

        let s = set(&mut c, SettingKey::UiMode, "professional").unwrap();
        assert_eq!((s.value.as_str(), s.is_default), ("professional", false));

        let ev = audit::list(&c, Some(1), None).unwrap();
        assert_eq!(ev[0].action, "settings.changed");
        assert_eq!(ev[0].details["from"], "easy");
        assert_eq!(ev[0].details["to"], "professional");
    }

    #[test]
    fn unchanged_value_is_not_re_audited() {
        let mut c = open_in_memory().unwrap();
        set(&mut c, SettingKey::UiMode, "professional").unwrap();
        set(&mut c, SettingKey::UiMode, "professional").unwrap();
        assert_eq!(audit::count(&c).unwrap(), 1);
    }

    #[test]
    fn invalid_values_and_keys_rejected() {
        let mut c = open_in_memory().unwrap();
        assert!(set(&mut c, SettingKey::UiMode, "expert").is_err());
        assert!(set(&mut c, SettingKey::UiReduceMotion, "yes").is_err());
        assert!(set(&mut c, SettingKey::OperatorName, "  ").is_err());
        assert!(SettingKey::parse("ai.cloud_upload").is_err());
        assert_eq!(audit::count(&c).unwrap(), 0);
    }

    #[test]
    fn operator_name_becomes_audit_actor() {
        let mut c = open_in_memory().unwrap();
        set(&mut c, SettingKey::OperatorName, "Technician A").unwrap();
        set(&mut c, SettingKey::UiMode, "professional").unwrap();
        let ev = audit::list(&c, Some(1), None).unwrap();
        assert_eq!(ev[0].actor, "Technician A");
    }
}

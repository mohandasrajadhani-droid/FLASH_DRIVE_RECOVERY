use serde::Serialize;

pub type CoreResult<T> = Result<T, CoreError>;

/// Errors returned by the core. Serialised to the UI as `{ kind, message }`.
///
/// Raw database errors are *not* forwarded verbatim to the UI: they are
/// reported as a generic `database` error so internal SQL is never exposed.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("{0}")]
    Validation(String),
    #[error("{0} was not found")]
    NotFound(String),
    #[error("{0}")]
    Conflict(String),
    #[error("integrity check failed: {0}")]
    Integrity(String),
    #[error("database error")]
    Database(#[from] rusqlite::Error),
    #[error("serialisation error")]
    Serde(#[from] serde_json::Error),
    #[error("internal error: {0}")]
    Internal(String),
}

impl CoreError {
    pub fn kind(&self) -> &'static str {
        match self {
            CoreError::Validation(_) => "validation",
            CoreError::NotFound(_) => "not_found",
            CoreError::Conflict(_) => "conflict",
            CoreError::Integrity(_) => "integrity",
            CoreError::Database(_) => "database",
            CoreError::Serde(_) | CoreError::Internal(_) => "internal",
        }
    }
}

impl Serialize for CoreError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut st = s.serialize_struct("CoreError", 2)?;
        st.serialize_field("kind", self.kind())?;
        st.serialize_field("message", &self.to_string())?;
        st.end()
    }
}

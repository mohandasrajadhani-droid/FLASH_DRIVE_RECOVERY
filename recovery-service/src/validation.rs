//! Input validation. Every value that crosses the UI → backend boundary is
//! checked here before it touches the database or (in later stages) the OS.

use crate::{CoreError, CoreResult};

/// Trim and validate a single-line text field.
/// Rejects all control characters. Empty is allowed only if `required` is false.
pub fn single_line(field: &str, value: &str, max_chars: usize, required: bool) -> CoreResult<String> {
    let v = value.trim();
    if required && v.is_empty() {
        return Err(CoreError::Validation(format!("{field} is required")));
    }
    if v.chars().count() > max_chars {
        return Err(CoreError::Validation(format!(
            "{field} must be at most {max_chars} characters"
        )));
    }
    if v.chars().any(char::is_control) {
        return Err(CoreError::Validation(format!(
            "{field} contains invalid control characters"
        )));
    }
    Ok(v.to_string())
}

/// Validate a multi-line text field. Allows `\n`, `\r` and `\t` only.
pub fn multi_line(field: &str, value: &str, max_chars: usize) -> CoreResult<String> {
    let v = value.trim();
    if v.chars().count() > max_chars {
        return Err(CoreError::Validation(format!(
            "{field} must be at most {max_chars} characters"
        )));
    }
    if v.chars().any(|c| c.is_control() && !matches!(c, '\n' | '\r' | '\t')) {
        return Err(CoreError::Validation(format!(
            "{field} contains invalid control characters"
        )));
    }
    Ok(v.to_string())
}

/// Case numbers: 3–32 chars, uppercase letters, digits and hyphens,
/// must start with a letter or digit. Input is upper-cased first.
pub fn case_number(value: &str) -> CoreResult<String> {
    let v = value.trim().to_ascii_uppercase();
    let ok_len = (3..=32).contains(&v.len());
    let ok_chars = v
        .chars()
        .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '-');
    let ok_start = v.chars().next().is_some_and(|c| c.is_ascii_alphanumeric());
    if ok_len && ok_chars && ok_start {
        Ok(v)
    } else {
        Err(CoreError::Validation(
            "case number must be 3–32 characters: letters, digits and hyphens, starting with a letter or digit".into(),
        ))
    }
}

/// Parse a UUID string strictly and return it in canonical hyphenated form.
pub fn uuid(field: &str, value: &str) -> CoreResult<String> {
    uuid::Uuid::parse_str(value.trim())
        .map(|u| u.hyphenated().to_string())
        .map_err(|_| CoreError::Validation(format!("{field} is not a valid identifier")))
}

/// Bound a caller-supplied page size.
pub fn limit(value: Option<u32>, default: u32, max: u32) -> u32 {
    value.unwrap_or(default).clamp(1, max)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_line_rules() {
        assert_eq!(single_line("n", "  Asha  ", 10, true).unwrap(), "Asha");
        assert!(single_line("n", "   ", 10, true).is_err());
        assert_eq!(single_line("n", "", 10, false).unwrap(), "");
        assert!(single_line("n", "abc\u{0}def", 10, true).is_err());
        assert!(single_line("n", "line\nbreak", 20, true).is_err());
        assert!(single_line("n", "ആശ", 2, true).is_ok(), "counts chars not bytes");
        assert!(single_line("n", "ആശാ", 2, true).is_err());
    }

    #[test]
    fn multi_line_rules() {
        assert!(multi_line("notes", "a\nb\tc", 100).is_ok());
        assert!(multi_line("notes", "bell\u{7}", 100).is_err());
        assert!(multi_line("notes", &"x".repeat(101), 100).is_err());
    }

    #[test]
    fn case_number_rules() {
        assert_eq!(case_number(" fr-2026-0001 ").unwrap(), "FR-2026-0001");
        for bad in ["", "AB", "-ABC", "AB C", "AB_C", "Ä123", &"A".repeat(33), "AB;DROP"] {
            assert!(case_number(bad).is_err(), "{bad:?} should be rejected");
        }
    }

    #[test]
    fn uuid_rules() {
        let u = uuid::Uuid::new_v4().to_string();
        assert_eq!(uuid("id", &u.to_uppercase()).unwrap(), u);
        assert!(uuid("id", "not-a-uuid").is_err());
        assert!(uuid("id", "' OR 1=1 --").is_err());
    }

    #[test]
    fn limit_is_clamped() {
        assert_eq!(limit(None, 50, 500), 50);
        assert_eq!(limit(Some(0), 50, 500), 1);
        assert_eq!(limit(Some(10_000), 50, 500), 500);
    }
}

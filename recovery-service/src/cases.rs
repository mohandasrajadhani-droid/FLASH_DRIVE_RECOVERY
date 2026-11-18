//! Customer case CRUD. Every mutation is audited in the same transaction.

use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};

use crate::{audit, now_rfc3339, settings, validation, CoreError, CoreResult};

pub const STATUSES: [&str; 5] = ["open", "in_progress", "awaiting_customer", "completed", "closed"];

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Case {
    pub id: String,
    pub case_number: String,
    pub customer_name: String,
    pub customer_contact: String,
    pub device_description: String,
    pub status: String,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Fields supplied by the UI when creating or updating a case.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct CaseInput {
    /// Optional on create — generated as `FR-<year>-<nnnn>` when empty.
    #[serde(default)]
    pub case_number: Option<String>,
    pub customer_name: String,
    #[serde(default)]
    pub customer_contact: String,
    #[serde(default)]
    pub device_description: String,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub notes: String,
}

struct Clean {
    case_number: Option<String>,
    customer_name: String,
    customer_contact: String,
    device_description: String,
    status: String,
    notes: String,
}

fn clean(input: &CaseInput) -> CoreResult<Clean> {
    let status = input.status.as_deref().unwrap_or("open").trim().to_string();
    if !STATUSES.contains(&status.as_str()) {
        return Err(CoreError::Validation(format!(
            "status must be one of: {}",
            STATUSES.join(", ")
        )));
    }
    Ok(Clean {
        case_number: match input.case_number.as_deref().map(str::trim) {
            None | Some("") => None,
            Some(n) => Some(validation::case_number(n)?),
        },
        customer_name: validation::single_line("customer name", &input.customer_name, 120, true)?,
        customer_contact: validation::single_line("customer contact", &input.customer_contact, 160, false)?,
        device_description: validation::single_line("device description", &input.device_description, 200, false)?,
        status,
        notes: validation::multi_line("notes", &input.notes, 10_000)?,
    })
}

fn row_to_case(r: &rusqlite::Row<'_>) -> rusqlite::Result<Case> {
    Ok(Case {
        id: r.get(0)?,
        case_number: r.get(1)?,
        customer_name: r.get(2)?,
        customer_contact: r.get(3)?,
        device_description: r.get(4)?,
        status: r.get(5)?,
        notes: r.get(6)?,
        created_at: r.get(7)?,
        updated_at: r.get(8)?,
    })
}

const COLS: &str =
    "id,case_number,customer_name,customer_contact,device_description,status,notes,created_at,updated_at";

fn next_case_number(conn: &Connection) -> CoreResult<String> {
    let year = chrono::Utc::now().format("%Y").to_string();
    let prefix = format!("FR-{year}-");
    let max: Option<i64> = conn.query_row(
        "SELECT MAX(CAST(substr(case_number, ?2) AS INTEGER)) FROM cases
         WHERE case_number LIKE ?1 || '%' AND substr(case_number, ?2) GLOB '[0-9]*'",
        params![prefix, (prefix.len() + 1) as i64],
        |r| r.get(0),
    )?;
    Ok(format!("{prefix}{:04}", max.unwrap_or(0) + 1))
}

fn map_unique(e: rusqlite::Error, number: &str) -> CoreError {
    match &e {
        rusqlite::Error::SqliteFailure(f, _) if f.code == rusqlite::ErrorCode::ConstraintViolation => {
            CoreError::Conflict(format!("case number {number} already exists"))
        }
        _ => CoreError::Database(e),
    }
}

pub fn create(conn: &mut Connection, input: &CaseInput) -> CoreResult<Case> {
    let c = clean(input)?;
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let number = match c.case_number {
        Some(n) => n,
        None => next_case_number(&tx)?,
    };
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_rfc3339();
    tx.execute(
        &format!("INSERT INTO cases({COLS}) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)"),
        params![
            id,
            number,
            c.customer_name,
            c.customer_contact,
            c.device_description,
            c.status,
            c.notes,
            now
        ],
    )
    .map_err(|e| map_unique(e, &number))?;
    let actor = settings::operator(&tx)?;
    audit::append(
        &tx,
        &actor,
        "case.created",
        &number,
        serde_json::json!({ "case_id": id }),
    )?;
    tx.commit()?;
    get(conn, &id)
}

pub fn get(conn: &Connection, id: &str) -> CoreResult<Case> {
    let id = validation::uuid("case id", id)?;
    conn.query_row(
        &format!("SELECT {COLS} FROM cases WHERE id = ?1"),
        params![id],
        row_to_case,
    )
    .optional()?
    .ok_or_else(|| CoreError::NotFound("case".into()))
}

/// List cases, newest activity first. Optional exact status filter and
/// case-insensitive substring search over number / customer / device.
pub fn list(
    conn: &Connection,
    status: Option<&str>,
    search: Option<&str>,
    limit: Option<u32>,
) -> CoreResult<Vec<Case>> {
    if let Some(s) = status {
        if !STATUSES.contains(&s) {
            return Err(CoreError::Validation("unknown status filter".into()));
        }
    }
    let search = match search {
        Some(s) => validation::single_line("search", s, 100, false)?,
        None => String::new(),
    };
    // Escape LIKE wildcards so user input is matched literally.
    let pattern = format!(
        "%{}%",
        search.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_")
    );
    let limit = validation::limit(limit, 200, 1000);
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLS} FROM cases
         WHERE (?1 IS NULL OR status = ?1)
           AND (?2 = '%%' OR case_number LIKE ?2 ESCAPE '\\' OR customer_name LIKE ?2 ESCAPE '\\'
                OR device_description LIKE ?2 ESCAPE '\\')
         ORDER BY updated_at DESC LIMIT ?3"
    ))?;
    let rows = stmt
        .query_map(params![status, pattern, limit], row_to_case)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn update(conn: &mut Connection, id: &str, input: &CaseInput) -> CoreResult<Case> {
    let id = validation::uuid("case id", id)?;
    let c = clean(input)?;
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let before = get(&tx, &id)?;
    let number = c.case_number.unwrap_or_else(|| before.case_number.clone());
    let mut changed = Vec::new();
    for (field, old, new) in [
        ("case_number", &before.case_number, &number),
        ("customer_name", &before.customer_name, &c.customer_name),
        ("customer_contact", &before.customer_contact, &c.customer_contact),
        ("device_description", &before.device_description, &c.device_description),
        ("status", &before.status, &c.status),
        ("notes", &before.notes, &c.notes),
    ] {
        if old != new {
            changed.push(field);
        }
    }
    if changed.is_empty() {
        tx.commit()?;
        return Ok(before);
    }
    tx.execute(
        "UPDATE cases SET case_number=?2, customer_name=?3, customer_contact=?4, device_description=?5,
         status=?6, notes=?7, updated_at=?8 WHERE id=?1",
        params![
            id,
            number,
            c.customer_name,
            c.customer_contact,
            c.device_description,
            c.status,
            c.notes,
            now_rfc3339()
        ],
    )
    .map_err(|e| map_unique(e, &number))?;
    let actor = settings::operator(&tx)?;
    let mut details = serde_json::json!({ "case_id": id, "fields_changed": changed });
    if before.status != c.status {
        details["status_from"] = before.status.clone().into();
        details["status_to"] = c.status.clone().into();
    }
    // Field *names* are audited, not customer PII values.
    audit::append(&tx, &actor, "case.updated", &number, details)?;
    tx.commit()?;
    get(conn, &id)
}

pub fn delete(conn: &mut Connection, id: &str) -> CoreResult<()> {
    let id = validation::uuid("case id", id)?;
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let before = get(&tx, &id)?;
    tx.execute("DELETE FROM cases WHERE id = ?1", params![id])?;
    let actor = settings::operator(&tx)?;
    audit::append(
        &tx,
        &actor,
        "case.deleted",
        &before.case_number,
        serde_json::json!({ "case_id": id }),
    )?;
    tx.commit()?;
    Ok(())
}

pub fn count_by_status(conn: &Connection) -> CoreResult<Vec<(String, i64)>> {
    let mut stmt = conn.prepare("SELECT status, COUNT(*) FROM cases GROUP BY status")?;
    let found: Vec<(String, i64)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<Result<_, _>>()?;
    Ok(STATUSES
        .iter()
        .map(|s| {
            (
                s.to_string(),
                found.iter().find(|(k, _)| k == s).map(|(_, n)| *n).unwrap_or(0),
            )
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    fn input(name: &str) -> CaseInput {
        CaseInput {
            customer_name: name.into(),
            ..Default::default()
        }
    }

    #[test]
    fn full_crud_cycle_with_audit() {
        let mut c = open_in_memory().unwrap();
        let created = create(&mut c, &input("Asha")).unwrap();
        assert!(created.case_number.starts_with("FR-"));
        assert_eq!(created.status, "open");

        let mut upd = input("Asha K");
        upd.status = Some("in_progress".into());
        let updated = update(&mut c, &created.id, &upd).unwrap();
        assert_eq!(updated.customer_name, "Asha K");
        assert_eq!(updated.case_number, created.case_number, "number kept when omitted");

        assert_eq!(list(&c, None, None, None).unwrap().len(), 1);
        delete(&mut c, &created.id).unwrap();
        assert!(matches!(get(&c, &created.id), Err(CoreError::NotFound(_))));

        let actions: Vec<String> = audit::list(&c, None, None)
            .unwrap()
            .into_iter()
            .map(|e| e.action)
            .collect();
        assert_eq!(actions, vec!["case.deleted", "case.updated", "case.created"]);
        assert!(audit::verify_chain(&c).unwrap().ok);
    }

    #[test]
    fn audit_does_not_store_customer_values() {
        let mut c = open_in_memory().unwrap();
        let k = create(&mut c, &input("Secret Name")).unwrap();
        update(&mut c, &k.id, &input("Other Secret")).unwrap();
        for e in audit::list(&c, None, None).unwrap() {
            let s = e.details.to_string();
            assert!(!s.contains("Secret"), "PII leaked into audit: {s}");
        }
    }

    #[test]
    fn sequential_case_numbers() {
        let mut c = open_in_memory().unwrap();
        let a = create(&mut c, &input("A")).unwrap();
        let b = create(&mut c, &input("B")).unwrap();
        let na: i64 = a.case_number.rsplit('-').next().unwrap().parse().unwrap();
        let nb: i64 = b.case_number.rsplit('-').next().unwrap().parse().unwrap();
        assert_eq!(nb, na + 1);
    }

    #[test]
    fn duplicate_number_is_conflict_and_rolls_back() {
        let mut c = open_in_memory().unwrap();
        let mut i = input("A");
        i.case_number = Some("CASE-1".into());
        create(&mut c, &i).unwrap();
        let before = audit::count(&c).unwrap();
        assert!(matches!(create(&mut c, &i), Err(CoreError::Conflict(_))));
        assert_eq!(audit::count(&c).unwrap(), before, "failed create must not audit");
    }

    #[test]
    fn validation_failures() {
        let mut c = open_in_memory().unwrap();
        assert!(create(&mut c, &input("")).is_err());
        let mut bad = input("A");
        bad.status = Some("hacked".into());
        assert!(create(&mut c, &bad).is_err());
        assert!(get(&c, "1 OR 1=1").is_err());
        assert!(list(&c, Some("bogus"), None, None).is_err());
    }

    #[test]
    fn search_treats_wildcards_literally() {
        let mut c = open_in_memory().unwrap();
        create(&mut c, &input("100% Studio")).unwrap();
        create(&mut c, &input("Plain Name")).unwrap();
        assert_eq!(list(&c, None, Some("%"), None).unwrap().len(), 1);
        assert_eq!(list(&c, None, Some("studio"), None).unwrap().len(), 1);
        assert_eq!(list(&c, None, Some(""), None).unwrap().len(), 2);
        assert_eq!(list(&c, Some("open"), None, None).unwrap().len(), 2);
        assert_eq!(list(&c, Some("closed"), None, None).unwrap().len(), 0);
    }

    #[test]
    fn noop_update_not_audited() {
        let mut c = open_in_memory().unwrap();
        let k = create(&mut c, &input("A")).unwrap();
        update(&mut c, &k.id, &input("A")).unwrap();
        assert_eq!(audit::count(&c).unwrap(), 1);
    }
}

//! Append-only, hash-chained audit trail.
//!
//! Each entry stores the SHA-256 of the previous entry, forming a chain.
//! SQLite triggers (migration 0001) block UPDATE and DELETE. A chain that
//! has been edited outside the application — e.g. with a SQLite editor
//! after dropping the triggers — is detected by [`verify_chain`].
//!
//! This is tamper-*evident*, not tamper-*proof*: someone with full write
//! access to the file can rebuild the whole chain. Stage 8 may add
//! periodic anchoring (e.g. signed exports) if stronger guarantees are needed.

use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::{now_rfc3339, validation, CoreResult};

pub const GENESIS_HASH: &str = "0000000000000000000000000000000000000000000000000000000000000000";

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct AuditEvent {
    pub seq: i64,
    pub ts: String,
    pub actor: String,
    pub action: String,
    pub target: String,
    pub details: serde_json::Value,
    pub prev_hash: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ChainVerification {
    pub ok: bool,
    pub entries_checked: i64,
    pub first_bad_seq: Option<i64>,
    pub reason: Option<String>,
}

/// Length-prefixed field hashing, so no choice of field contents can make
/// two different entries share a pre-image.
fn compute_hash(prev: &str, seq: i64, ts: &str, actor: &str, action: &str, target: &str, details: &str) -> String {
    let mut h = Sha256::new();
    for part in [prev, &seq.to_string(), ts, actor, action, target, details] {
        h.update((part.len() as u64).to_be_bytes());
        h.update(part.as_bytes());
    }
    hex::encode(h.finalize())
}

/// Append an audit event in its own IMMEDIATE transaction.
pub fn record(
    conn: &mut Connection,
    actor: &str,
    action: &str,
    target: &str,
    details: serde_json::Value,
) -> CoreResult<AuditEvent> {
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let ev = append(&tx, actor, action, target, details)?;
    tx.commit()?;
    Ok(ev)
}

/// Append an audit event using a connection that **already holds a write
/// transaction** (pass `&tx`). Used so a data change and its audit entry
/// commit or roll back together.
pub(crate) fn append(
    conn: &Connection,
    actor: &str,
    action: &str,
    target: &str,
    details: serde_json::Value,
) -> CoreResult<AuditEvent> {
    let actor = validation::single_line("audit actor", actor, 64, true)?;
    let action = validation::single_line("audit action", action, 64, true)?;
    let target = validation::single_line("audit target", target, 256, false)?;
    let details_s = serde_json::to_string(&details)?;

    let last: Option<(i64, String)> = conn
        .query_row("SELECT seq, hash FROM audit_log ORDER BY seq DESC LIMIT 1", [], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .optional()?;
    let (seq, prev_hash) = match last {
        Some((s, h)) => (s + 1, h),
        None => (1, GENESIS_HASH.to_string()),
    };
    let ts = now_rfc3339();
    let hash = compute_hash(&prev_hash, seq, &ts, &actor, &action, &target, &details_s);
    conn.execute(
        "INSERT INTO audit_log(seq,ts,actor,action,target,details,prev_hash,hash) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
        params![seq, ts, actor, action, target, details_s, prev_hash, hash],
    )?;
    Ok(AuditEvent {
        seq,
        ts,
        actor,
        action,
        target,
        details,
        prev_hash,
        hash,
    })
}

fn row_to_event(r: &rusqlite::Row<'_>) -> rusqlite::Result<(AuditEvent, String)> {
    let details_s: String = r.get(5)?;
    let details = serde_json::from_str(&details_s).unwrap_or(serde_json::Value::String(details_s.clone()));
    Ok((
        AuditEvent {
            seq: r.get(0)?,
            ts: r.get(1)?,
            actor: r.get(2)?,
            action: r.get(3)?,
            target: r.get(4)?,
            details,
            prev_hash: r.get(6)?,
            hash: r.get(7)?,
        },
        details_s,
    ))
}

/// Most recent events first. `before_seq` enables paging.
pub fn list(conn: &Connection, limit: Option<u32>, before_seq: Option<i64>) -> CoreResult<Vec<AuditEvent>> {
    let limit = validation::limit(limit, 50, 500);
    let mut stmt = conn.prepare(
        "SELECT seq,ts,actor,action,target,details,prev_hash,hash FROM audit_log
         WHERE seq < ?1 ORDER BY seq DESC LIMIT ?2",
    )?;
    let rows = stmt
        .query_map(params![before_seq.unwrap_or(i64::MAX), limit], row_to_event)?
        .map(|r| r.map(|(e, _)| e))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn count(conn: &Connection) -> CoreResult<i64> {
    Ok(conn.query_row("SELECT COUNT(*) FROM audit_log", [], |r| r.get(0))?)
}

/// Walk the whole chain from the first entry and recompute every hash.
pub fn verify_chain(conn: &Connection) -> CoreResult<ChainVerification> {
    let mut stmt =
        conn.prepare("SELECT seq,ts,actor,action,target,details,prev_hash,hash FROM audit_log ORDER BY seq ASC")?;
    let mut rows = stmt.query([])?;
    let mut expected_prev = GENESIS_HASH.to_string();
    let mut expected_seq = 1_i64;
    let mut checked = 0_i64;

    let fail = |seq: i64, checked: i64, why: &str| ChainVerification {
        ok: false,
        entries_checked: checked,
        first_bad_seq: Some(seq),
        reason: Some(why.to_string()),
    };

    while let Some(r) = rows.next()? {
        let (ev, details_s) = row_to_event(r)?;
        if ev.seq != expected_seq {
            return Ok(fail(ev.seq, checked, "sequence gap — an entry is missing"));
        }
        if ev.prev_hash != expected_prev {
            return Ok(fail(ev.seq, checked, "previous-hash link is broken"));
        }
        let recomputed = compute_hash(
            &ev.prev_hash,
            ev.seq,
            &ev.ts,
            &ev.actor,
            &ev.action,
            &ev.target,
            &details_s,
        );
        if recomputed != ev.hash {
            return Ok(fail(ev.seq, checked, "entry contents do not match its hash"));
        }
        checked += 1;
        expected_prev = ev.hash;
        expected_seq += 1;
    }
    Ok(ChainVerification {
        ok: true,
        entries_checked: checked,
        first_bad_seq: None,
        reason: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use serde_json::json;

    #[test]
    fn chain_links_and_verifies() {
        let mut c = open_in_memory().unwrap();
        let a = record(&mut c, "tech", "app.started", "", json!({})).unwrap();
        let b = record(&mut c, "tech", "case.created", "FR-1", json!({"x":1})).unwrap();
        assert_eq!(a.prev_hash, GENESIS_HASH);
        assert_eq!(b.prev_hash, a.hash);
        assert_eq!(b.seq, 2);
        let v = verify_chain(&c).unwrap();
        assert!(v.ok);
        assert_eq!(v.entries_checked, 2);
    }

    #[test]
    fn empty_chain_verifies() {
        let c = open_in_memory().unwrap();
        assert!(verify_chain(&c).unwrap().ok);
    }

    #[test]
    fn update_and_delete_are_blocked_by_triggers() {
        let mut c = open_in_memory().unwrap();
        record(&mut c, "tech", "a", "", json!({})).unwrap();
        assert!(c.execute("UPDATE audit_log SET actor='evil'", []).is_err());
        assert!(c.execute("DELETE FROM audit_log", []).is_err());
        assert_eq!(count(&c).unwrap(), 1);
    }

    #[test]
    fn tampering_is_detected() {
        let mut c = open_in_memory().unwrap();
        for i in 0..5 {
            record(&mut c, "tech", "evt", &format!("t{i}"), json!({"i": i})).unwrap();
        }
        // Simulate an attacker who drops the protection trigger and edits a row.
        c.execute_batch("DROP TRIGGER audit_log_no_update").unwrap();
        c.execute("UPDATE audit_log SET details='{\"i\":99}' WHERE seq=3", [])
            .unwrap();
        let v = verify_chain(&c).unwrap();
        assert!(!v.ok);
        assert_eq!(v.first_bad_seq, Some(3));
        assert_eq!(v.entries_checked, 2);
    }

    #[test]
    fn deletion_is_detected() {
        let mut c = open_in_memory().unwrap();
        for _ in 0..4 {
            record(&mut c, "tech", "evt", "", json!({})).unwrap();
        }
        c.execute_batch("DROP TRIGGER audit_log_no_delete").unwrap();
        c.execute("DELETE FROM audit_log WHERE seq=2", []).unwrap();
        let v = verify_chain(&c).unwrap();
        assert!(!v.ok);
        assert_eq!(v.first_bad_seq, Some(3));
    }

    #[test]
    fn invalid_actor_rejected_and_nothing_written() {
        let mut c = open_in_memory().unwrap();
        assert!(record(&mut c, "", "a", "", json!({})).is_err());
        assert!(record(&mut c, "x\u{0}", "a", "", json!({})).is_err());
        assert_eq!(count(&c).unwrap(), 0);
    }

    #[test]
    fn list_pages_newest_first() {
        let mut c = open_in_memory().unwrap();
        for _ in 0..7 {
            record(&mut c, "tech", "evt", "", json!({})).unwrap();
        }
        let p1 = list(&c, Some(3), None).unwrap();
        assert_eq!(p1.iter().map(|e| e.seq).collect::<Vec<_>>(), vec![7, 6, 5]);
        let p2 = list(&c, Some(3), Some(5)).unwrap();
        assert_eq!(p2.iter().map(|e| e.seq).collect::<Vec<_>>(), vec![4, 3, 2]);
    }
}

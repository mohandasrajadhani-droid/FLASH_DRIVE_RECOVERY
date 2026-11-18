//! Read-only aggregates for the Overview Dashboard. Everything here is
//! computed from the real database — there is no sample or placeholder data.

use rusqlite::{params, Connection};
use serde::Serialize;

use crate::{audit, cases, db, CoreResult};

#[derive(Debug, Clone, Serialize)]
pub struct DayCount {
    pub day: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardSummary {
    pub schema_version: i64,
    pub sqlite_version: String,
    pub total_cases: i64,
    pub cases_by_status: Vec<StatusCount>,
    pub audit_event_count: i64,
    pub audit_chain: audit::ChainVerification,
    pub audit_activity_14d: Vec<DayCount>,
    pub recent_events: Vec<audit::AuditEvent>,
}

/// Audit events per UTC day for the last `days` days (oldest first),
/// including days with zero events so charts have a continuous axis.
pub fn activity_by_day(conn: &Connection, days: u32) -> CoreResult<Vec<DayCount>> {
    let days = days.clamp(1, 366) as i64;
    let mut stmt = conn.prepare(
        "WITH RECURSIVE d(day, n) AS (
             SELECT date('now', ?1), 0
             UNION ALL SELECT date(day, '+1 day'), n + 1 FROM d WHERE n + 1 < ?2
         )
         SELECT d.day, COUNT(a.seq) FROM d
         LEFT JOIN audit_log a ON substr(a.ts, 1, 10) = d.day
         GROUP BY d.day ORDER BY d.day",
    )?;
    let offset = format!("-{} days", days - 1);
    let rows = stmt
        .query_map(params![offset, days], |r| {
            Ok(DayCount {
                day: r.get(0)?,
                count: r.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn dashboard(conn: &Connection) -> CoreResult<DashboardSummary> {
    let by_status = cases::count_by_status(conn)?;
    Ok(DashboardSummary {
        schema_version: db::schema_version(conn)?,
        sqlite_version: db::sqlite_version().to_string(),
        total_cases: by_status.iter().map(|(_, n)| n).sum(),
        cases_by_status: by_status
            .into_iter()
            .map(|(status, count)| StatusCount { status, count })
            .collect(),
        audit_event_count: audit::count(conn)?,
        audit_chain: audit::verify_chain(conn)?,
        audit_activity_14d: activity_by_day(conn, 14)?,
        recent_events: audit::list(conn, Some(8), None)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn empty_database_summary_is_all_zero() {
        let c = open_in_memory().unwrap();
        let s = dashboard(&c).unwrap();
        assert_eq!(s.total_cases, 0);
        assert_eq!(s.audit_event_count, 0);
        assert!(s.audit_chain.ok);
        assert_eq!(s.audit_activity_14d.len(), 14);
        assert!(s.audit_activity_14d.iter().all(|d| d.count == 0));
        assert_eq!(s.cases_by_status.len(), cases::STATUSES.len());
    }

    #[test]
    fn summary_reflects_real_rows() {
        let mut c = open_in_memory().unwrap();
        cases::create(
            &mut c,
            &cases::CaseInput {
                customer_name: "A".into(),
                ..Default::default()
            },
        )
        .unwrap();
        let s = dashboard(&c).unwrap();
        assert_eq!(s.total_cases, 1);
        assert_eq!(s.audit_event_count, 1);
        assert_eq!(s.audit_activity_14d.last().unwrap().count, 1, "today's event counted");
    }
}

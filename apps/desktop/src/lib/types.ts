// Mirrors the serialised Rust types in recovery-service/src. Keep in sync.

export type UiMode = "easy" | "professional";

export interface AppInfo {
  name: string;
  version: string;
  os: string;
  arch: string;
  debug_build: boolean;
  database_path: string;
  schema_version: number;
  sqlite_version: string;
}

export interface AuditEvent {
  seq: number;
  ts: string;
  actor: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
  prev_hash: string;
  hash: string;
}

export interface ChainVerification {
  ok: boolean;
  entries_checked: number;
  first_bad_seq: number | null;
  reason: string | null;
}

export interface DashboardSummary {
  schema_version: number;
  sqlite_version: string;
  total_cases: number;
  cases_by_status: { status: CaseStatus; count: number }[];
  audit_event_count: number;
  audit_chain: ChainVerification;
  audit_activity_14d: { day: string; count: number }[];
  recent_events: AuditEvent[];
}

export interface Setting {
  key: string;
  value: string;
  is_default: boolean;
}

export const CASE_STATUSES = ["open", "in_progress", "awaiting_customer", "completed", "closed"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export interface Case {
  id: string;
  case_number: string;
  customer_name: string;
  customer_contact: string;
  device_description: string;
  status: CaseStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CaseInput {
  case_number?: string | null;
  customer_name: string;
  customer_contact: string;
  device_description: string;
  status?: CaseStatus;
  notes: string;
}

/** Shape of every error returned by a backend command. */
export interface BackendError {
  kind: "validation" | "not_found" | "conflict" | "integrity" | "database" | "internal" | "unavailable";
  message: string;
}

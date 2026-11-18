// Typed wrappers around Tauri commands. This is the ONLY place the UI talks
// to the backend. Outside the desktop shell (e.g. `npm run dev` in a normal
// browser) every call rejects with kind "unavailable" — the UI then shows
// an explicit notice instead of inventing data.

import { invoke, isTauri } from "@tauri-apps/api/core";
import type {
  AppInfo,
  AuditEvent,
  BackendError,
  Case,
  CaseInput,
  CaseStatus,
  ChainVerification,
  DashboardSummary,
  Setting,
} from "./types";

export const backendAvailable = (): boolean => isTauri();

function toBackendError(e: unknown): BackendError {
  if (e && typeof e === "object" && "kind" in e && "message" in e) {
    return e as BackendError;
  }
  return { kind: "internal", message: typeof e === "string" ? e : "Unexpected error" };
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!backendAvailable()) {
    throw {
      kind: "unavailable",
      message: "The FLASHRECOVERY AI backend is not running. Launch the desktop application to use this screen.",
    } satisfies BackendError;
  }
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    throw toBackendError(e);
  }
}

export const api = {
  appInfo: () => call<AppInfo>("app_info"),
  dashboardSummary: () => call<DashboardSummary>("dashboard_summary"),

  settingsGetAll: () => call<Setting[]>("settings_get_all"),
  settingsSet: (key: string, value: string) => call<Setting>("settings_set", { key, value }),

  casesList: (status?: CaseStatus | null, search?: string) =>
    call<Case[]>("cases_list", { status: status ?? null, search: search ?? null }),
  caseGet: (id: string) => call<Case>("case_get", { id }),
  caseCreate: (input: CaseInput) => call<Case>("case_create", { input }),
  caseUpdate: (id: string, input: CaseInput) => call<Case>("case_update", { id, input }),
  caseDelete: (id: string) => call<void>("case_delete", { id }),

  auditList: (limit?: number, beforeSeq?: number) =>
    call<AuditEvent[]>("audit_list", { limit: limit ?? null, beforeSeq: beforeSeq ?? null }),
  auditVerify: () => call<ChainVerification>("audit_verify"),
};

export function errorMessage(e: unknown): string {
  return toBackendError(e).message;
}

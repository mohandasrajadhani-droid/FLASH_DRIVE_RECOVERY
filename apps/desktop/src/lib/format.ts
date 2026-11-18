export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (Number.isNaN(s)) return iso;
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return formatDateTime(iso);
}

const ACTION_LABELS: Record<string, string> = {
  "app.started": "Application started",
  "settings.changed": "Setting changed",
  "case.created": "Case created",
  "case.updated": "Case updated",
  "case.deleted": "Case deleted",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function shortHash(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Briefcase,
  CheckCircle2,
  Circle,
  CircleDot,
  Database,
  Fingerprint,
  HardDriveDownload,
  ListChecks,
  Lock,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Usb,
} from "lucide-react";
import { api } from "../lib/api";
import { actionLabel, formatRelative, shortHash, statusLabel } from "../lib/format";
import { CURRENT_STAGE, ROADMAP } from "../lib/modules";
import { useAsync } from "../lib/useAsync";
import { BackendErrorNotice, Badge, PageHeader, Panel, Stat, cx } from "../components/ui";
import { useSettings } from "../components/SettingsContext";

const PRINCIPLES = [
  { icon: Lock, text: "Source devices will be opened read-only (from Stage 2)" },
  { icon: HardDriveDownload, text: "Recovered files will go to a separate destination drive (Stage 4–5)" },
  { icon: Fingerprint, text: "Disk images will be hashed with SHA-256 and verified (Stage 3)" },
  { icon: ShieldAlert, text: "No automatic CHKDSK, formatting or partition writes" },
];

export function DashboardPage() {
  const { mode } = useSettings();
  // Reload when the mode changes: a mode switch is itself an audited event.
  const summary = useAsync(() => api.dashboardSummary(), [mode]);
  const info = useAsync(() => api.appInfo());
  const s = summary.data;

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Overview"
        subtitle={
          mode === "easy"
            ? "Your recovery workspace. Everything here keeps your original drive safe."
            : "Application health, audit-trail integrity and recent activity."
        }
      />

      {/* Safety hero */}
      <section className="panel animate-in relative mb-6 overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Badge tone="accent">Safety rules · built in from Stage 2</Badge>
            <h2 className="mt-3 font-display text-xl font-semibold text-text">Protect the original. Recover to a separate drive.</h2>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
              Recovery success depends on overwriting, TRIM, encryption, controller behaviour and physical condition. FLASHRECOVERY AI
              reports results honestly and never guarantees recovery.
            </p>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: I, text }) => (
              <li key={text} className="flex items-start gap-2.5 rounded-lg border border-line bg-ink-950/40 p-3 text-[12.5px] text-muted">
                <I size={16} className="mt-0.5 shrink-0 text-accent-2" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {summary.error && (
        <div className="mb-6">
          <BackendErrorNotice error={summary.error} />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Usb size={18} />} label="Connected devices" value={<span className="text-base text-faint">—</span>} hint="Detection arrives in Stage 2" />
        <Stat icon={<Briefcase size={18} />} label="Cases" value={s ? s.total_cases : summary.error ? "—" : "…"} hint="Stored locally" />
        <Stat icon={<ScrollText size={18} />} label="Audit events" value={s ? s.audit_event_count : summary.error ? "—" : "…"} hint="Append-only, hash-chained" />
        <Stat
          icon={s?.audit_chain.ok === false ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
          label="Audit integrity"
          value={
            !s ? (summary.error ? "—" : "…") : s.audit_chain.ok ? <span className="text-ok">Verified</span> : <span className="text-danger">Broken</span>
          }
          hint={
            s
              ? s.audit_chain.ok
                ? `${s.audit_chain.entries_checked} entries checked`
                : `At entry #${s.audit_chain.first_bad_seq}: ${s.audit_chain.reason}`
              : undefined
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Activity — last 14 days" icon={<ListChecks size={16} />}>
          {s ? (
            <div className="h-56" aria-label="Audit events per day">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.audit_activity_14d} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="#1d2b47" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(d: string) => d.slice(5)}
                    tick={{ fill: "#62728d", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "#62728d", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgb(56 189 248 / 0.06)" }}
                    contentStyle={{ background: "#0d1424", border: "1px solid #28395c", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#93a3bd" }}
                    formatter={(v) => [v, "Audit events"]}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyLine text={summary.loading ? "Loading…" : "No data — backend not connected."} />
          )}
        </Panel>

        <Panel title="Recent activity" icon={<ScrollText size={16} />}>
          {s && s.recent_events.length > 0 ? (
            <ol className="space-y-3">
              {s.recent_events.map((e) => (
                <li key={e.seq} className="flex items-start gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] text-text">
                        {actionLabel(e.action)}
                        {e.target && <span className="text-muted"> · {e.target}</span>}
                      </span>
                      <span className="shrink-0 text-[11px] text-faint">{formatRelative(e.ts)}</span>
                    </div>
                    {mode === "professional" && (
                      <div className="font-mono text-[10.5px] text-faint">
                        #{e.seq} {shortHash(e.hash)} · {e.actor}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyLine text={s ? "No activity recorded yet." : summary.loading ? "Loading…" : "No data — backend not connected."} />
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Development roadmap" icon={<CircleDot size={16} />}>
          <ol className="grid gap-2 sm:grid-cols-3">
            {ROADMAP.map((r) => {
              const state = r.stage < CURRENT_STAGE ? "done" : r.stage === CURRENT_STAGE ? "current" : "todo";
              return (
                <li
                  key={r.stage}
                  className={cx(
                    "flex items-center gap-2.5 rounded-lg border p-2.5 text-[12.5px]",
                    state === "current" ? "border-accent/40 bg-accent/5 text-text" : "border-line text-muted",
                  )}
                >
                  {state === "done" ? (
                    <CheckCircle2 size={15} className="text-ok" />
                  ) : state === "current" ? (
                    <CircleDot size={15} className="text-accent" />
                  ) : (
                    <Circle size={15} className="text-faint" />
                  )}
                  <span className="text-faint">S{r.stage}</span>
                  <span className="truncate">{r.title}</span>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel title="System" icon={<Database size={16} />}>
          {info.data ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12.5px]">
              <dt className="text-faint">Version</dt>
              <dd className="text-text">
                {info.data.version} {info.data.debug_build && <Badge tone="warn">debug build</Badge>}
              </dd>
              <dt className="text-faint">Platform</dt>
              <dd className="text-text">
                {info.data.os} / {info.data.arch}
              </dd>
              <dt className="text-faint">Database</dt>
              <dd className="text-text">
                schema v{info.data.schema_version} · SQLite {info.data.sqlite_version}
              </dd>
              {mode === "professional" && (
                <>
                  <dt className="text-faint">Location</dt>
                  <dd className="break-all font-mono text-[11px] text-muted">{info.data.database_path}</dd>
                </>
              )}
              {s && (
                <>
                  <dt className="text-faint">Cases</dt>
                  <dd className="text-muted">
                    {s.cases_by_status
                      .filter((c) => c.count > 0)
                      .map((c) => `${statusLabel(c.status)} ${c.count}`)
                      .join(" · ") || "none"}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <EmptyLine text={info.loading ? "Loading…" : "Not connected to the desktop backend."} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="grid h-24 place-items-center text-[13px] text-faint">{text}</div>;
}

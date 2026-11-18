import { useEffect, useState } from "react";
import { Accessibility, ScrollText, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { actionLabel, formatDateTime, shortHash } from "../lib/format";
import type { AuditEvent, ChainVerification } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { validateSingleLine } from "../lib/validation";
import { useSettings } from "../components/SettingsContext";
import { BackendErrorNotice, Badge, Button, Notice, PageHeader, Panel, cx } from "../components/ui";

export function SettingsPage() {
  const { mode, reduceMotion, operatorName, setSetting, backend } = useSettings();
  const [name, setName] = useState(operatorName);
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  useEffect(() => setName(operatorName), [operatorName]);

  const save = async (key: string, value: string, label: string) => {
    setMsg(null);
    try {
      await setSetting(key, value);
      setMsg({ tone: "ok", text: `${label} saved.` });
    } catch (e) {
      setMsg({ tone: "danger", text: errorMessage(e) });
    }
  };

  const nameError = validateSingleLine("Operator name", name, 64, true);

  return (
    <div className="mx-auto max-w-[1040px]">
      <PageHeader title="Settings" subtitle="Stored locally. Every change is written to the audit trail." />
      {!backend && (
        <div className="mb-5">
          <BackendErrorNotice error={{ kind: "unavailable", message: "" }} />
        </div>
      )}
      {msg && (
        <div className="mb-5">
          <Notice tone={msg.tone} title={msg.text} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Interface mode" icon={<SlidersHorizontal size={16} />}>
          <div className="grid gap-3">
            {(
              [
                ["easy", "Easy Mode", "Guided steps and plain language for everyday users."],
                ["professional", "Professional Mode", "All modules, technical detail, hashes and case management."],
              ] as const
            ).map(([v, t, d]) => (
              <label
                key={v}
                className={cx(
                  "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors",
                  mode === v ? "border-accent/50 bg-accent/5" : "border-line hover:border-line-strong",
                  !backend && "pointer-events-none opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  className="mt-1 accent-sky-400"
                  checked={mode === v}
                  onChange={() => save("ui.mode", v, "Interface mode")}
                  disabled={!backend}
                />
                <div>
                  <div className="text-[13px] font-medium text-text">{t}</div>
                  <div className="text-[12px] text-muted">{d}</div>
                </div>
              </label>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel title="Operator" icon={<UserRound size={16} />}>
            <label className="label" htmlFor="op-name">
              Name recorded in the audit trail
            </label>
            <div className="flex gap-2">
              <input
                id="op-name"
                className="field"
                value={name}
                maxLength={64}
                onChange={(e) => setName(e.target.value)}
                disabled={!backend}
              />
              <Button
                variant="primary"
                disabled={!backend || !!nameError || name.trim() === operatorName}
                onClick={() => save("operator.name", name, "Operator name")}
              >
                Save
              </Button>
            </div>
            {name && nameError && <div className="mt-1 text-[12px] text-danger">{nameError}</div>}
          </Panel>

          <Panel title="Accessibility" icon={<Accessibility size={16} />}>
            <label className={cx("flex items-center justify-between gap-3", !backend && "opacity-50")}>
              <span className="text-[13px] text-text">Reduce motion</span>
              <input
                type="checkbox"
                className="size-4 accent-sky-400"
                checked={reduceMotion}
                disabled={!backend}
                onChange={(e) => save("ui.reduce_motion", String(e.target.checked), "Reduce motion")}
              />
            </label>
          </Panel>
        </div>
      </div>

      <div className="mt-6">{backend && <AuditLogPanel />}</div>
    </div>
  );
}

function AuditLogPanel() {
  const first = useAsync(() => api.auditList(50));
  const [extra, setExtra] = useState<AuditEvent[]>([]);
  const [done, setDone] = useState(false);
  const [verify, setVerify] = useState<ChainVerification | null>(null);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const events = [...(first.data ?? []), ...extra];

  const more = async () => {
    const last = events[events.length - 1];
    if (!last) return;
    const page = await api.auditList(50, last.seq);
    setExtra((x) => [...x, ...page]);
    if (page.length < 50) setDone(true);
  };

  const runVerify = async () => {
    setBusy(true);
    setVerifyErr(null);
    try {
      setVerify(await api.auditVerify());
    } catch (e) {
      setVerifyErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Audit log"
      icon={<ScrollText size={16} />}
      action={
        <Button onClick={runVerify} disabled={busy}>
          <ShieldCheck size={14} /> {busy ? "Verifying…" : "Verify integrity"}
        </Button>
      }
    >
      {verify && (
        <div className="mb-4">
          {verify.ok ? (
            <Notice tone="ok" title={`Audit chain verified — ${verify.entries_checked} entries intact.`} />
          ) : (
            <Notice tone="danger" title="Audit chain integrity failure">
              Entry #{verify.first_bad_seq}: {verify.reason}. {verify.entries_checked} earlier entries are intact. The database may have
              been modified outside FLASHRECOVERY AI.
            </Notice>
          )}
        </div>
      )}
      {verifyErr && (
        <div className="mb-4">
          <Notice tone="danger" title="Verification failed">{verifyErr}</Notice>
        </div>
      )}
      {first.error && <BackendErrorNotice error={first.error} />}
      {events.length > 0 && (
        <div className="-mx-5 -mb-5 max-h-[420px] overflow-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 border-b border-line bg-ink-850 text-[11px] tracking-wide text-faint uppercase">
              <tr>
                <th className="px-5 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Time</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Actor</th>
                <th className="px-5 py-2.5 font-medium">Hash</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.seq} className="border-b border-line/50 align-top">
                  <td className="px-5 py-2 font-mono text-faint">{e.seq}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">{formatDateTime(e.ts)}</td>
                  <td className="px-3 py-2">
                    <div className="text-text">
                      {actionLabel(e.action)} {e.target && <Badge>{e.target}</Badge>}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] break-all text-faint">{JSON.stringify(e.details)}</div>
                  </td>
                  <td className="px-3 py-2 text-muted">{e.actor}</td>
                  <td className="px-5 py-2 font-mono text-[11px] text-faint" title={e.hash}>
                    {shortHash(e.hash)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!done && (first.data?.length ?? 0) >= 50 && (
            <div className="p-3 text-center">
              <Button variant="ghost" onClick={more}>
                Load older entries
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

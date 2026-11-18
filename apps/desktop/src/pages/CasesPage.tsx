import { useEffect, useState, type FormEvent } from "react";
import { Briefcase, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { formatDateTime, statusLabel } from "../lib/format";
import { CASE_STATUSES, type Case, type CaseInput, type CaseStatus } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { validateCaseNumber, validateMultiLine, validateSingleLine } from "../lib/validation";
import { BackendErrorNotice, Badge, Button, Notice, PageHeader, Panel } from "../components/ui";

const STATUS_TONE: Record<CaseStatus, "accent" | "warn" | "ok" | "neutral"> = {
  open: "accent",
  in_progress: "accent",
  awaiting_customer: "warn",
  completed: "ok",
  closed: "neutral",
};

const EMPTY: CaseInput = { case_number: "", customer_name: "", customer_contact: "", device_description: "", status: "open", notes: "" };

export function CasesPage() {
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<Case | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Case | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const list = useAsync(() => api.casesList(status || null, debounced), [status, debounced]);

  const doDelete = async (c: Case) => {
    setActionError(null);
    try {
      await api.caseDelete(c.id);
      setConfirmDelete(null);
      list.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Customer Cases"
        subtitle="Basic case records (Stage 1). Linking devices, images and recovery jobs to cases arrives in Stage 7."
        actions={
          <Button variant="primary" onClick={() => setEditing("new")} disabled={!!list.error}>
            <Plus size={15} /> New case
          </Button>
        }
      />

      {list.error && (
        <div className="mb-5">
          <BackendErrorNotice error={list.error} />
        </div>
      )}
      {actionError && (
        <div className="mb-5">
          <Notice tone="danger" title="Action failed">{actionError}</Notice>
        </div>
      )}

      {editing && (
        <CaseForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}

      <Panel
        title="Cases"
        icon={<Briefcase size={16} />}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
              <input
                aria-label="Search cases"
                className="field w-56 py-1.5 pl-8 text-[13px]"
                placeholder="Search number, customer, device"
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              aria-label="Filter by status"
              className="field w-44 py-1.5 text-[13px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus | "")}
            >
              <option value="">All statuses</option>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {list.data && list.data.length === 0 && (
          <div className="py-10 text-center text-[13px] text-faint">
            {debounced || status ? "No cases match these filters." : "No cases yet. Create one to get started."}
          </div>
        )}
        {list.data && list.data.length > 0 && (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line text-[11px] tracking-wide text-faint uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Case</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Device</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.data.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-ink-800/50">
                    <td className="px-5 py-3 font-mono text-[12px] text-text">{c.case_number}</td>
                    <td className="px-3 py-3">
                      <div className="text-text">{c.customer_name}</div>
                      {c.customer_contact && <div className="text-[12px] text-faint">{c.customer_contact}</div>}
                    </td>
                    <td className="px-3 py-3 text-muted">{c.device_description || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge tone={STATUS_TONE[c.status]}>{statusLabel(c.status)}</Badge>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-faint">{formatDateTime(c.updated_at)}</td>
                    <td className="px-5 py-3">
                      {confirmDelete?.id === c.id ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="danger" onClick={() => doDelete(c)}>
                            Delete {c.case_number}
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" aria-label={`Edit ${c.case_number}`} onClick={() => setEditing(c)}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" aria-label={`Delete ${c.case_number}`} onClick={() => setConfirmDelete(c)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.loading && !list.data && !list.error && <div className="py-10 text-center text-[13px] text-faint">Loading…</div>}
      </Panel>
    </div>
  );
}

function CaseForm({ initial, onCancel, onSaved }: { initial: Case | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CaseInput>(initial ? { ...initial } : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CaseInput>(k: K, v: CaseInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const add = (k: string, m: string | null) => m && (errs[k] = m);
    add("case_number", validateCaseNumber(form.case_number ?? ""));
    add("customer_name", validateSingleLine("Customer name", form.customer_name, 120, true));
    add("customer_contact", validateSingleLine("Contact", form.customer_contact, 160, false));
    add("device_description", validateSingleLine("Device", form.device_description, 200, false));
    add("notes", validateMultiLine("Notes", form.notes, 10000));
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const payload: CaseInput = { ...form, case_number: form.case_number?.trim() || null };
      if (initial) await api.caseUpdate(initial.id, payload);
      else await api.caseCreate(payload);
      onSaved();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof CaseInput, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label className="label" htmlFor={`f-${k}`}>
        {label}
      </label>
      <input
        id={`f-${k}`}
        className="field"
        value={(form[k] as string) ?? ""}
        onChange={(e) => set(k, e.target.value as never)}
        aria-invalid={!!errors[k]}
        {...props}
      />
      {errors[k] && <div className="mt-1 text-[12px] text-danger">{errors[k]}</div>}
    </div>
  );

  return (
    <Panel
      className="mb-6"
      title={initial ? `Edit ${initial.case_number}` : "New case"}
      icon={<Briefcase size={16} />}
      action={
        <Button variant="ghost" aria-label="Close" onClick={onCancel}>
          <X size={15} />
        </Button>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
        {field("customer_name", "Customer name *", { maxLength: 120, autoFocus: true })}
        {field("customer_contact", "Contact (phone / email)", { maxLength: 160 })}
        {field("device_description", "Device description", { maxLength: 200, placeholder: "e.g. 32 GB SanDisk Cruzer, blue" })}
        {field("case_number", "Case number", { maxLength: 32, placeholder: initial ? "" : "Leave blank to auto-generate" })}
        <div>
          <label className="label" htmlFor="f-status">
            Status
          </label>
          <select id="f-status" className="field" value={form.status} onChange={(e) => set("status", e.target.value as CaseStatus)}>
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="f-notes">
            Notes
          </label>
          <textarea
            id="f-notes"
            rows={4}
            className="field resize-y"
            maxLength={10000}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
          {errors.notes && <div className="mt-1 text-[12px] text-danger">{errors.notes}</div>}
        </div>
        {submitError && (
          <div className="md:col-span-2">
            <Notice tone="danger" title="Could not save">{submitError}</Notice>
          </div>
        )}
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Create case"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
